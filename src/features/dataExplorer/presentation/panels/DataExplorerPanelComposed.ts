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
import type { ExecuteSqlQueryUseCase } from '../../application/useCases/ExecuteSqlQueryUseCase';
import type { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';
import { SqlParseErrorViewModelMapper } from '../../application/mappers/SqlParseErrorViewModelMapper';
import { SqlParseError } from '../../domain/errors/SqlParseError';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { QueryEditorSection } from '../sections/QueryEditorSection';

/**
 * Commands supported by Data Explorer panel.
 */
type DataExplorerCommands =
	| 'executeQuery'
	| 'environmentChange'
	| 'updateSqlQuery';

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
	private currentEnvironmentId: string;
	private currentSqlQuery: string = '';
	private currentFetchXml: string = '';
	private currentResult: QueryResult | null = null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (
			envId: string
		) => Promise<EnvironmentInfo | null>,
		private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
		private readonly resultMapper: QueryResultViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.errorMapper = new SqlParseErrorViewModelMapper();
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
			}
		});
	}

	/**
	 * Executes a SQL query.
	 * @param sql - The SQL query to execute
	 */
	private async handleExecuteQuery(sql: string): Promise<void> {
		const trimmedSql = sql.trim();
		if (trimmedSql === '') {
			this.logger.warn('Execute query called with empty SQL');
			vscode.window.showWarningMessage('Please enter a SQL query');
			return;
		}

		// Update stored SQL
		this.currentSqlQuery = trimmedSql;

		this.logger.info('Executing SQL query', {
			environmentId: this.currentEnvironmentId,
			sqlLength: trimmedSql.length,
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
				trimmedSql
			);

			this.currentResult = result;
			this.currentFetchXml = result.executedFetchXml;

			// Map to ViewModel
			const viewModel = this.resultMapper.toViewModel(result);

			this.logger.info('SQL query executed successfully', {
				rowCount: result.getRowCount(),
				executionTimeMs: result.executionTimeMs,
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
			// Hide loading state
			this.setButtonLoading('executeQuery', false);
			await this.panel.webview.postMessage({
				command: 'setLoadingState',
				data: { isLoading: false },
			});
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

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}
}
