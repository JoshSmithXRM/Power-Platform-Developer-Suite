import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import {
	HtmlScaffoldingBehavior,
	type HtmlScaffoldingConfig,
} from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import {
	EnvironmentScopedPanel,
	type EnvironmentInfo,
} from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { ExecuteSqlQueryUseCase } from '../../application/useCases/ExecuteSqlQueryUseCase';
import type { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';
import { SqlParseErrorViewModelMapper } from '../../application/mappers/SqlParseErrorViewModelMapper';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { QueryEditorSection } from '../sections/QueryEditorSection';
import { DataverseRecordUrlService } from '../../../../shared/infrastructure/services/DataverseRecordUrlService';

/**
 * Commands supported by Data Explorer panel.
 */
type DataExplorerCommands =
	| 'executeQuery'
	| 'environmentChange'
	| 'updateSqlQuery'
	| 'openRecord'
	| 'copyRecordUrl';

/**
 * Data Explorer panel using PanelCoordinator architecture.
 * Allows SQL query execution against Dataverse with FetchXML preview.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class DataExplorerPanelComposed extends EnvironmentScopedPanel<DataExplorerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.dataExplorer';
	private static panels = new Map<string, DataExplorerPanelComposed>();

	private readonly coordinator: PanelCoordinator<DataExplorerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly errorMapper: SqlParseErrorViewModelMapper;
	private readonly recordUrlService: DataverseRecordUrlService;
	private currentEnvironmentId: string;
	private currentSqlQuery: string = '';
	private currentFetchXml: string = '';
	private currentResult: QueryResult | null = null;

	/** Monotonic counter for query execution to discard stale results. */
	private querySequence: number = 0;
	/** AbortController for the current query execution. */
	private currentAbortController: AbortController | null = null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (
			envId: string
		) => Promise<EnvironmentInfo | null>,
		private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly panelStateRepository: IPanelStateRepository,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.errorMapper = new SqlParseErrorViewModelMapper();
		this.recordUrlService = new DataverseRecordUrlService();
		logger.debug('DataExplorerPanel: Initialized with new architecture');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri],
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		executeSqlUseCase: ExecuteSqlQueryUseCase,
		resultMapper: QueryResultViewModelMapper,
		panelStateRepository: IPanelStateRepository,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<DataExplorerPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel(
			{
				viewType: DataExplorerPanelComposed.viewType,
				titlePrefix: 'Data Explorer',
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				initialEnvironmentId,
				panelFactory: (panel, envId) =>
					new DataExplorerPanelComposed(
						panel,
						extensionUri,
						getEnvironments,
						getEnvironmentById,
						executeSqlUseCase,
						resultMapper,
						panelStateRepository,
						logger,
						envId
					),
				webviewOptions: {
					enableScripts: true,
					localResourceRoots: [extensionUri],
					retainContextWhenHidden: true,
					enableFindWidget: true,
				},
			},
			DataExplorerPanelComposed.panels
		);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		// Load persisted SQL from state
		try {
			const state = await this.panelStateRepository.load({
				panelType: DataExplorerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId,
			});
			const savedSql = state?.['sqlQuery'];
			if (savedSql && typeof savedSql === 'string') {
				this.currentSqlQuery = savedSql;
				this.logger.debug('Loaded persisted SQL query', {
					environmentId: this.currentEnvironmentId,
					sqlLength: this.currentSqlQuery.length,
				});
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted SQL query', error);
		}

		// Initialize coordinator with environments
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			customData: {
				sql: this.currentSqlQuery,
				fetchXml: this.currentFetchXml,
			},
		});
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<DataExplorerCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		const environmentSelector = new EnvironmentSelectorSection();
		const queryEditorSection = new QueryEditorSection();

		// Note: Button IDs must match command names registered in registerCommandHandlers()
		const actionButtons = new ActionButtonsSection(
			{
				buttons: [{ id: 'executeQuery', label: 'Execute Query' }],
			},
			SectionPosition.Toolbar
		);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, environmentSelector, queryEditorSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'action-buttons', 'datatable'],
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview
			.asWebviewUri(
				vscode.Uri.joinPath(
					this.extensionUri,
					'resources',
					'webview',
					'css',
					'features',
					'data-explorer.css'
				)
			)
			.toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'resources',
							'webview',
							'js',
							'messaging.js'
						)
					)
					.toString(),
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'dist',
							'webview',
							'TableRenderer.js'
						)
					)
					.toString(),
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'dist',
							'webview',
							'DataExplorerBehavior.js'
						)
					)
					.toString(),
			],
			cspNonce: getNonce(),
			title: 'Data Explorer',
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<DataExplorerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger,
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		this.logger.debug('Registering Data Explorer command handlers');

		// Execute SQL query
		this.coordinator.registerHandler('executeQuery', async (data) => {
			// SQL can be sent directly with the command or use the stored value
			const sql = (data as { sql?: string })?.sql ?? this.currentSqlQuery;
			await this.handleExecuteQuery(sql);
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Update SQL query (for FetchXML preview)
		this.coordinator.registerHandler('updateSqlQuery', async (data) => {
			const sql = (data as { sql?: string })?.sql;
			if (sql !== undefined) {
				this.currentSqlQuery = sql;
				this.logger.trace('SQL query updated for preview', { sqlLength: sql.length });
				await this.updateFetchXmlPreview();

				// Persist SQL to state (already debounced by webview)
				void this.saveSqlToState();
			}
		});

		// Open record in browser
		this.coordinator.registerHandler('openRecord', async (data) => {
			const { entityType, recordId } = data as { entityType?: string; recordId?: string };
			if (entityType && recordId) {
				await this.handleOpenRecord(entityType, recordId);
			}
		});

		// Copy record URL to clipboard
		this.coordinator.registerHandler('copyRecordUrl', async (data) => {
			const { entityType, recordId } = data as { entityType?: string; recordId?: string };
			if (entityType && recordId) {
				await this.handleCopyRecordUrl(entityType, recordId);
			}
		});
	}

	/**
	 * Persists current SQL query to panel state.
	 */
	private async saveSqlToState(): Promise<void> {
		try {
			const existingState = await this.panelStateRepository.load({
				panelType: DataExplorerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId,
			});

			await this.panelStateRepository.save(
				{
					panelType: DataExplorerPanelComposed.viewType,
					environmentId: this.currentEnvironmentId,
				},
				{
					...existingState,
					sqlQuery: this.currentSqlQuery,
					lastUpdated: new Date().toISOString(),
				}
			);
		} catch (error) {
			this.logger.warn('Failed to persist SQL query', error);
		}
	}

	/**
	 * Executes a SQL query.
	 * Uses query token pattern to prevent stale results from overwriting newer ones.
	 * @param sql - The SQL query to execute
	 */
	private async handleExecuteQuery(sql: string): Promise<void> {
		const trimmedSql = sql.trim();
		if (trimmedSql === '') {
			this.logger.warn('Execute query called with empty SQL');
			vscode.window.showWarningMessage('Please enter a SQL query');
			return;
		}

		// Check for row limit and warn user about potentially large result sets
		const transpileResult = this.executeSqlUseCase.transpileToFetchXml(trimmedSql);
		if (transpileResult.success && !transpileResult.hasRowLimit) {
			const choice = await vscode.window.showWarningMessage(
				'This query has no row limit and may return up to 5000 records. Large result sets may take longer to load.',
				{ modal: true },
				'Add TOP 100',
				'Continue Anyway'
			);

			if (choice === 'Add TOP 100') {
				// Modify SQL to add TOP 100
				const modifiedSql = this.addTopClause(trimmedSql, 100);
				return this.handleExecuteQuery(modifiedSql);
			}

			if (choice !== 'Continue Anyway') {
				// User cancelled
				return;
			}
		}

		// Abort any in-flight query
		if (this.currentAbortController) {
			this.currentAbortController.abort();
			this.logger.debug('Aborted previous query');
		}

		// Create new query token
		const queryId = ++this.querySequence;
		this.currentAbortController = new AbortController();
		const signal = this.currentAbortController.signal;

		// Update stored SQL
		this.currentSqlQuery = trimmedSql;

		this.logger.info('Executing SQL query', {
			environmentId: this.currentEnvironmentId,
			sqlLength: trimmedSql.length,
			queryId,
		});

		// Show loading state
		this.setButtonLoading('executeQuery', true);
		await this.panel.webview.postMessage({
			command: 'setLoadingState',
			data: { isLoading: true },
		});

		try {
			// Execute query via use case
			const result = await this.executeSqlUseCase.execute(
				this.currentEnvironmentId,
				trimmedSql,
				signal
			);

			// Discard stale results
			if (queryId !== this.querySequence) {
				this.logger.debug('Discarding stale query result', { queryId, currentSequence: this.querySequence });
				return;
			}

			this.currentResult = result;
			this.currentFetchXml = result.executedFetchXml;

			// Map to ViewModel
			const viewModel = this.resultMapper.toViewModel(result);

			this.logger.info('SQL query executed successfully', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
				queryId,
			});

			// Send results to webview
			await this.panel.webview.postMessage({
				command: 'queryResultsUpdated',
				data: viewModel,
			});

			// Update FetchXML preview
			await this.panel.webview.postMessage({
				command: 'fetchXmlPreviewUpdated',
				data: { fetchXml: this.currentFetchXml },
			});

			vscode.window.showInformationMessage(
				`Query executed: ${result.getRowCount()} rows in ${result.executionTimeMs}ms`
			);
		} catch (error: unknown) {
			// Ignore aborted queries
			if (error instanceof Error && error.name === 'AbortError') {
				this.logger.debug('Query was aborted', { queryId });
				await this.panel.webview.postMessage({
					command: 'queryAborted',
				});
				return;
			}

			// Discard stale errors
			if (queryId !== this.querySequence) {
				this.logger.debug('Discarding stale query error', { queryId, currentSequence: this.querySequence });
				return;
			}

			this.logger.error('SQL query execution failed', error);

			// Map error to ViewModel
			let errorMessage: string;
			if (error instanceof SqlParseError) {
				const errorViewModel = this.errorMapper.toViewModel(error);
				errorMessage = errorViewModel.message;

				// Send parse error with position to webview
				await this.panel.webview.postMessage({
					command: 'queryError',
					data: errorViewModel,
				});
			} else {
				errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				const errorViewModel =
					this.errorMapper.genericErrorToViewModel(
						error instanceof Error ? error : new Error(errorMessage)
					);

				await this.panel.webview.postMessage({
					command: 'queryError',
					data: errorViewModel,
				});
			}

			vscode.window.showErrorMessage(`Query failed: ${errorMessage}`);
		} finally {
			// Only reset loading state if this is still the current query
			if (queryId === this.querySequence) {
				this.setButtonLoading('executeQuery', false);
				await this.panel.webview.postMessage({
					command: 'setLoadingState',
					data: { isLoading: false },
				});
			}
		}
	}

	/**
	 * Updates FetchXML preview when SQL query changes.
	 */
	private async updateFetchXmlPreview(): Promise<void> {
		if (this.currentSqlQuery.trim() === '') {
			this.currentFetchXml = '';
			await this.panel.webview.postMessage({
				command: 'fetchXmlPreviewUpdated',
				data: { fetchXml: '' },
			});
			return;
		}

		// Use use case method for transpilation
		const result = this.executeSqlUseCase.transpileToFetchXml(
			this.currentSqlQuery
		);

		if (result.success) {
			this.currentFetchXml = result.fetchXml;

			// Send to webview
			await this.panel.webview.postMessage({
				command: 'fetchXmlPreviewUpdated',
				data: { fetchXml: result.fetchXml },
			});

			// Clear any previous error
			await this.panel.webview.postMessage({
				command: 'clearError',
			});
		} else {
			// Show parse error in preview mode (don't show VS Code error message)
			const errorViewModel = this.errorMapper.toViewModel(result.error);
			await this.panel.webview.postMessage({
				command: 'parseErrorPreview',
				data: errorViewModel,
			});
		}
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		this.setButtonLoading('executeQuery', true);

		try {
			const oldEnvironmentId = this.currentEnvironmentId;
			this.currentEnvironmentId = environmentId;

			// Re-register panel in map for new environment
			this.reregisterPanel(
				DataExplorerPanelComposed.panels,
				oldEnvironmentId,
				this.currentEnvironmentId
			);

			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Data Explorer - ${environment.name}`;
			}

			// Clear previous results
			this.currentResult = null;
			await this.panel.webview.postMessage({
				command: 'clearResults',
			});
		} finally {
			this.setButtonLoading('executeQuery', false);
		}
	}

	/**
	 * Opens a Dataverse record in the browser.
	 * @param entityType - The entity logical name (e.g., "contact", "account")
	 * @param recordId - The record GUID
	 */
	private async handleOpenRecord(entityType: string, recordId: string): Promise<void> {
		this.logger.debug('Opening record in browser', { entityType, recordId });

		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (!environment?.dataverseUrl) {
				await vscode.window.showWarningMessage('Environment does not have a Dataverse URL configured');
				return;
			}

			await this.recordUrlService.openRecord(environment.dataverseUrl, entityType, recordId);
		} catch (error) {
			this.logger.error('Failed to open record in browser', error);
			await vscode.window.showErrorMessage('Failed to open record in browser');
		}
	}

	/**
	 * Copies a Dataverse record URL to the clipboard.
	 * @param entityType - The entity logical name (e.g., "contact", "account")
	 * @param recordId - The record GUID
	 */
	private async handleCopyRecordUrl(entityType: string, recordId: string): Promise<void> {
		this.logger.debug('Copying record URL to clipboard', { entityType, recordId });

		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (!environment?.dataverseUrl) {
				await vscode.window.showWarningMessage('Environment does not have a Dataverse URL configured');
				return;
			}

			await this.recordUrlService.copyRecordUrlWithFeedback(environment.dataverseUrl, entityType, recordId);
		} catch (error) {
			this.logger.error('Failed to copy record URL', error);
			await vscode.window.showErrorMessage('Failed to copy record URL');
		}
	}

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}

	/**
	 * Adds a TOP clause to a SQL SELECT statement.
	 * Inserts "TOP n" after "SELECT" keyword.
	 */
	private addTopClause(sql: string, limit: number): string {
		// Case-insensitive regex to find SELECT and insert TOP after it
		const selectRegex = /^(\s*SELECT\s+)/i;
		const match = sql.match(selectRegex);
		const selectPart = match?.[1];

		if (selectPart) {
			const afterSelect = sql.substring(selectPart.length);
			return `${selectPart}TOP ${limit} ${afterSelect}`;
		}

		// Fallback: just prepend (shouldn't happen with valid SQL)
		return `SELECT TOP ${limit} ${sql}`;
	}
}
