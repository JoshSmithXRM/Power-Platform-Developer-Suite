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
import type { ExecuteFetchXmlQueryUseCase } from '../../application/useCases/ExecuteFetchXmlQueryUseCase';
import type { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';
import { SqlParseErrorViewModelMapper } from '../../application/mappers/SqlParseErrorViewModelMapper';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import { FetchXmlValidationError } from '../../domain/errors/FetchXmlValidationError';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { QueryEditorSection } from '../sections/QueryEditorSection';
import type { QueryMode, TranspilationWarning } from '../views/queryEditorView';
import { DataverseRecordUrlService } from '../../../../shared/infrastructure/services/DataverseRecordUrlService';
import { CsvExportService, type TabularData } from '../../../../shared/infrastructure/services/CsvExportService';

/**
 * Commands supported by Data Explorer panel.
 */
type DataExplorerCommands =
	| 'executeQuery'
	| 'exportCsv'
	| 'environmentChange'
	| 'updateSqlQuery'
	| 'updateFetchXmlQuery'
	| 'switchQueryMode'
	| 'openRecord'
	| 'copyRecordUrl'
	| 'warningModalResponse'
	| 'copySuccess';

/**
 * Type-safe actions for the row limit warning modal.
 */
type WarningModalAction = 'addTop100' | 'continueAnyway' | 'cancel';

/**
 * Data Explorer panel using PanelCoordinator architecture.
 * Allows SQL/FetchXML query execution against Dataverse with bidirectional preview.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class DataExplorerPanelComposed extends EnvironmentScopedPanel<DataExplorerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.dataExplorer';
	private static panels = new Map<string, DataExplorerPanelComposed>();

	private readonly coordinator: PanelCoordinator<DataExplorerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly errorMapper: SqlParseErrorViewModelMapper;
	private readonly recordUrlService: DataverseRecordUrlService;
	private readonly csvExportService: CsvExportService;
	private currentEnvironmentId: string;
	private currentSqlQuery: string = '';
	private currentFetchXml: string = '';
	private currentQueryMode: QueryMode = 'sql';
	private currentTranspilationWarnings: readonly TranspilationWarning[] = [];
	private currentResult: QueryResult | null = null;

	/** Monotonic counter for query execution to discard stale results. */
	private querySequence: number = 0;
	/** AbortController for the current query execution. */
	private currentAbortController: AbortController | null = null;
	/** Resolver for pending warning modal response. */
	private pendingModalResolver: ((action: WarningModalAction) => void) | null =
		null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (
			envId: string
		) => Promise<EnvironmentInfo | null>,
		private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
		private readonly executeFetchXmlUseCase: ExecuteFetchXmlQueryUseCase,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly panelStateRepository: IPanelStateRepository,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.errorMapper = new SqlParseErrorViewModelMapper();
		this.recordUrlService = new DataverseRecordUrlService();
		this.csvExportService = new CsvExportService(logger);
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

		// Cleanup pending modal resolver on panel dispose to avoid memory leaks
		panel.onDidDispose(() => {
			if (this.pendingModalResolver) {
				this.pendingModalResolver('cancel');
				this.pendingModalResolver = null;
			}
		});

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
		executeFetchXmlUseCase: ExecuteFetchXmlQueryUseCase,
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
						executeFetchXmlUseCase,
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

		// Load persisted state (SQL query and mode)
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
			const savedFetchXml = state?.['fetchXmlQuery'];
			if (savedFetchXml && typeof savedFetchXml === 'string') {
				this.currentFetchXml = savedFetchXml;
			}
			const savedMode = state?.['queryMode'];
			if (savedMode === 'sql' || savedMode === 'fetchxml') {
				this.currentQueryMode = savedMode;
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted query state', error);
		}

		// Initialize coordinator with environments
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			customData: {
				sql: this.currentSqlQuery,
				fetchXml: this.currentFetchXml,
				queryMode: this.currentQueryMode,
				transpilationWarnings: this.currentTranspilationWarnings,
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
		// customHandler: true prevents messaging.js from attaching a generic click handler,
		// since DataExplorerBehavior.js attaches its own handler that sends SQL data
		const actionButtons = new ActionButtonsSection(
			{
				buttons: [
					{ id: 'executeQuery', label: 'Execute Query', customHandler: true },
					{ id: 'exportCsv', label: 'Export CSV' },
				],
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
							'DataTableBehavior.js'
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
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'resources',
							'webview',
							'js',
							'behaviors',
							'KeyboardSelectionBehavior.js'
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

		// Execute query (handles both SQL and FetchXML modes)
		this.coordinator.registerHandler('executeQuery', async (data) => {
			if (this.currentQueryMode === 'fetchxml') {
				// In FetchXML mode, execute FetchXML directly
				const fetchXml =
					(data as { fetchXml?: string })?.fetchXml ?? this.currentFetchXml;
				await this.handleExecuteFetchXmlQuery(fetchXml);
			} else {
				// In SQL mode, transpile and execute
				const sql = (data as { sql?: string })?.sql ?? this.currentSqlQuery;
				await this.handleExecuteSqlQuery(sql);
			}
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
				void this.saveQueryStateToStorage();
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

		// Export results to CSV - disable automatic loading state since we manage it manually
		this.coordinator.registerHandler(
			'exportCsv',
			async () => {
				await this.handleExportCsv();
			},
			{ disableOnExecute: false }
		);

		// Handle warning modal response from webview
		this.coordinator.registerHandler('warningModalResponse', async (data) => {
			const rawAction = (data as { action?: string })?.action;
			// Validate action is one of the expected values, default to cancel
			const action: WarningModalAction =
				rawAction === 'addTop100' || rawAction === 'continueAnyway'
					? rawAction
					: 'cancel';
			this.logger.debug('Warning modal response received', { action });
			if (this.pendingModalResolver) {
				this.pendingModalResolver(action);
				this.pendingModalResolver = null;
			}
		});

		// Switch query mode (SQL ↔ FetchXML)
		this.coordinator.registerHandler('switchQueryMode', async (data) => {
			const mode = (data as { mode?: QueryMode })?.mode;
			if (mode === 'sql' || mode === 'fetchxml') {
				await this.handleSwitchQueryMode(mode);
			}
		});

		// Update FetchXML query (for SQL preview in FetchXML mode)
		this.coordinator.registerHandler('updateFetchXmlQuery', async (data) => {
			const fetchXml = (data as { fetchXml?: string })?.fetchXml;
			if (fetchXml !== undefined) {
				this.currentFetchXml = fetchXml;
				this.logger.trace('FetchXML query updated for preview', {
					fetchXmlLength: fetchXml.length,
				});
				await this.updateSqlPreview();

				// Persist FetchXML to state (already debounced by webview)
				void this.saveQueryStateToStorage();
			}
		});

		// Copy success notification from KeyboardSelectionBehavior
		this.coordinator.registerHandler('copySuccess', async (data) => {
			const payload = data as { count?: number } | undefined;
			const count = payload?.count ?? 0;
			await vscode.window.showInformationMessage(`${count} rows copied to clipboard`);
		});
	}

	/**
	 * Persists current query state (SQL, FetchXML, mode) to panel state.
	 */
	private async saveQueryStateToStorage(): Promise<void> {
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
					fetchXmlQuery: this.currentFetchXml,
					queryMode: this.currentQueryMode,
					lastUpdated: new Date().toISOString(),
				}
			);
		} catch (error) {
			this.logger.warn('Failed to persist query state', error);
		}
	}

	/**
	 * Executes a SQL query (SQL mode).
	 * Uses query token pattern to prevent stale results from overwriting newer ones.
	 * @param sql - The SQL query to execute
	 */
	private async handleExecuteSqlQuery(sql: string): Promise<void> {
		const trimmedSql = sql.trim();
		if (trimmedSql === '') {
			this.logger.warn('Execute query called with empty SQL');
			vscode.window.showWarningMessage('Please enter a SQL query');
			return;
		}

		// Check for row limit and warn user about potentially large result sets
		const transpileResult = this.executeSqlUseCase.transpileToFetchXml(trimmedSql);
		if (transpileResult.success && !transpileResult.hasRowLimit) {
			// Show warning modal in webview (testable, accessible)
			const choice = await this.showRowLimitWarningModal();

			if (choice === 'addTop100') {
				// Modify SQL to add TOP 100
				const modifiedSql = this.addTopClause(trimmedSql, 100);
				// Update the SQL editor in the webview with the modified query
				// Check panel is still alive before posting (could be disposed during modal)
				try {
					await this.panel.webview.postMessage({
						command: 'updateSqlEditor',
						data: { sql: modifiedSql },
					});
				} catch {
					// Panel was disposed during modal interaction
					return;
				}
				return this.handleExecuteSqlQuery(modifiedSql);
			}

			if (choice === 'cancel') {
				// User cancelled
				return;
			}
			// choice === 'continueAnyway' - proceed with original query
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

		this.logger.debug('Executing SQL query', {
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

			this.logger.debug('SQL query executed successfully', {
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

			// Load persisted state for the NEW environment (Option A: Fresh Start)
			// This ensures each environment maintains its own independent query state
			await this.loadPersistedStateForEnvironment(environmentId);
		} finally {
			this.setButtonLoading('executeQuery', false);
		}
	}

	/**
	 * Loads persisted query state for a specific environment and updates the UI.
	 * Called during environment switch to restore the target environment's saved state.
	 */
	private async loadPersistedStateForEnvironment(environmentId: string): Promise<void> {
		// Reset to defaults first
		this.currentSqlQuery = '';
		this.currentFetchXml = '';
		this.currentQueryMode = 'sql';
		this.currentTranspilationWarnings = [];

		try {
			const state = await this.panelStateRepository.load({
				panelType: DataExplorerPanelComposed.viewType,
				environmentId,
			});

			if (state) {
				const savedSql = state['sqlQuery'];
				if (savedSql && typeof savedSql === 'string') {
					this.currentSqlQuery = savedSql;
				}
				const savedFetchXml = state['fetchXmlQuery'];
				if (savedFetchXml && typeof savedFetchXml === 'string') {
					this.currentFetchXml = savedFetchXml;
				}
				const savedMode = state['queryMode'];
				if (savedMode === 'sql' || savedMode === 'fetchxml') {
					this.currentQueryMode = savedMode;
				}

				this.logger.debug('Loaded persisted state for environment', {
					environmentId,
					hasSql: this.currentSqlQuery.length > 0,
					hasFetchXml: this.currentFetchXml.length > 0,
					queryMode: this.currentQueryMode,
				});
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted state for environment', { environmentId, error });
		}

		// Update webview with loaded state
		await this.panel.webview.postMessage({
			command: 'queryModeChanged',
			data: {
				mode: this.currentQueryMode,
				sql: this.currentSqlQuery,
				fetchXml: this.currentFetchXml,
				transpilationWarnings: this.currentTranspilationWarnings,
			},
		});
	}

	/**
	 * Handles switching between SQL and FetchXML query modes.
	 * Refreshes the panel to render the appropriate editor.
	 */
	private async handleSwitchQueryMode(mode: QueryMode): Promise<void> {
		if (this.currentQueryMode === mode) {
			return;
		}

		this.logger.debug('Switching query mode', { from: this.currentQueryMode, to: mode });
		this.currentQueryMode = mode;

		// Clear any previous errors
		await this.panel.webview.postMessage({ command: 'clearError' });

		// Send mode change to webview to update UI
		await this.panel.webview.postMessage({
			command: 'queryModeChanged',
			data: {
				mode,
				sql: this.currentSqlQuery,
				fetchXml: this.currentFetchXml,
				transpilationWarnings: this.currentTranspilationWarnings,
			},
		});

		// Persist mode to state
		void this.saveQueryStateToStorage();
	}

	/**
	 * Executes a FetchXML query directly (FetchXML mode).
	 * @param fetchXml - The FetchXML query to execute
	 */
	private async handleExecuteFetchXmlQuery(fetchXml: string): Promise<void> {
		const trimmedFetchXml = fetchXml.trim();
		if (trimmedFetchXml === '') {
			this.logger.warn('Execute query called with empty FetchXML');
			vscode.window.showWarningMessage('Please enter a FetchXML query');
			return;
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

		// Update stored FetchXML
		this.currentFetchXml = trimmedFetchXml;

		this.logger.debug('Executing FetchXML query', {
			environmentId: this.currentEnvironmentId,
			fetchXmlLength: trimmedFetchXml.length,
			queryId,
		});

		// Show loading state
		this.setButtonLoading('executeQuery', true);
		await this.panel.webview.postMessage({
			command: 'setLoadingState',
			data: { isLoading: true },
		});

		try {
			// Execute query via use case (validates and executes)
			const result = await this.executeFetchXmlUseCase.execute(
				this.currentEnvironmentId,
				trimmedFetchXml,
				signal
			);

			// Discard stale results
			if (queryId !== this.querySequence) {
				this.logger.debug('Discarding stale query result', {
					queryId,
					currentSequence: this.querySequence,
				});
				return;
			}

			this.currentResult = result;

			// Map to ViewModel
			const viewModel = this.resultMapper.toViewModel(result);

			this.logger.debug('FetchXML query executed successfully', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
				queryId,
			});

			// Send results to webview
			await this.panel.webview.postMessage({
				command: 'queryResultsUpdated',
				data: viewModel,
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
				this.logger.debug('Discarding stale query error', {
					queryId,
					currentSequence: this.querySequence,
				});
				return;
			}

			this.logger.error('FetchXML query execution failed', error);

			// Map error to ViewModel
			let errorMessage: string;
			if (error instanceof FetchXmlValidationError) {
				errorMessage = error.message;
				await this.panel.webview.postMessage({
					command: 'queryError',
					data: {
						message: error.getFormattedErrors(),
						position: error.errors[0]?.line
							? { line: error.errors[0].line, column: 1 }
							: undefined,
					},
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
	 * Updates SQL preview when FetchXML query changes (FetchXML mode).
	 */
	private async updateSqlPreview(): Promise<void> {
		if (this.currentFetchXml.trim() === '') {
			this.currentSqlQuery = '';
			this.currentTranspilationWarnings = [];
			await this.panel.webview.postMessage({
				command: 'sqlPreviewUpdated',
				data: { sql: '', warnings: [] },
			});
			return;
		}

		// Use FetchXML use case method for transpilation
		const result = this.executeFetchXmlUseCase.transpileToSql(this.currentFetchXml);

		if (result.success) {
			this.currentSqlQuery = result.sql;
			this.currentTranspilationWarnings = result.warnings;

			// Send to webview
			await this.panel.webview.postMessage({
				command: 'sqlPreviewUpdated',
				data: { sql: result.sql, warnings: result.warnings },
			});

			// Clear any previous error
			await this.panel.webview.postMessage({
				command: 'clearError',
			});
		} else {
			// Show validation error in preview mode
			await this.panel.webview.postMessage({
				command: 'parseErrorPreview',
				data: { message: result.error },
			});
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

	/**
	 * Exports current query results to CSV file.
	 */
	private async handleExportCsv(): Promise<void> {
		if (!this.currentResult) {
			await vscode.window.showWarningMessage('No query results to export. Please execute a query first.');
			return;
		}

		const rowCount = this.currentResult.getRowCount();
		if (rowCount === 0) {
			await vscode.window.showWarningMessage('No data to export. Query returned 0 rows.');
			return;
		}

		this.logger.debug('Exporting query results to CSV', { rowCount });
		this.setButtonLoading('exportCsv', true);

		try {
			// Map QueryResult to TabularData
			const viewModel = this.resultMapper.toViewModel(this.currentResult);
			const tabularData: TabularData = {
				headers: viewModel.columns.map((col) => col.header),
				rows: viewModel.rows.map((row) =>
					viewModel.columns.map((col) => row[col.name] ?? '')
				),
			};

			// Generate CSV content
			const csvContent = this.csvExportService.toCsv(tabularData);

			// Generate suggested filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const entityName = viewModel.entityLogicalName ?? 'query';
			const suggestedFilename = `${entityName}_export_${timestamp}.csv`;

			// Save to file
			const savedPath = await this.csvExportService.saveToFile(csvContent, suggestedFilename);

			// Show notification without awaiting - don't block on user dismissing toast
			void vscode.window.showInformationMessage(
				`Exported ${rowCount} rows to ${savedPath}`
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is expected - don't show error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('CSV export cancelled by user');
				return;
			}

			this.logger.error('Failed to export CSV', error);
			await vscode.window.showErrorMessage(`Failed to export CSV: ${errorMessage}`);
		} finally {
			this.setButtonLoading('exportCsv', false);
		}
	}

	/**
	 * Shows an in-webview warning modal for queries without row limits.
	 * Waits for user response: 'addTop100', 'continueAnyway', or 'cancel'.
	 *
	 * Modal is rendered in webview (not VS Code native) for E2E testability.
	 *
	 * @returns User's choice action
	 */
	private async showRowLimitWarningModal(): Promise<WarningModalAction> {
		return new Promise((resolve) => {
			// Store resolver to be called when webview responds
			this.pendingModalResolver = resolve;

			// Send modal configuration to webview
			this.panel.webview.postMessage({
				command: 'showWarningModal',
				data: {
					message:
						'This query has no row limit and may return up to 5000 records. Large result sets may take longer to load.',
					primaryLabel: 'Add TOP 100',
					primaryAction: 'addTop100',
					secondaryLabel: 'Continue Anyway',
					secondaryAction: 'continueAnyway',
				},
			});
		});
	}

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.logger.debug('Setting button loading state', { buttonId, isLoading });
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
