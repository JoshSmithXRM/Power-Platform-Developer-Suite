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
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { ExecuteSqlQueryUseCase } from '../../application/useCases/ExecuteSqlQueryUseCase';
import type { ExecuteFetchXmlQueryUseCase } from '../../application/useCases/ExecuteFetchXmlQueryUseCase';
import type { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';
import { SqlParseErrorViewModelMapper } from '../../application/mappers/SqlParseErrorViewModelMapper';
import { FetchXmlValidationError } from '../../domain/errors/FetchXmlValidationError';
import type { QueryResult } from '../../domain/entities/QueryResult';
import { VisualQueryBuilderSection } from '../sections/VisualQueryBuilderSection';
import type { EntityOption } from '../views/visualQueryBuilderView';
import { DataverseRecordUrlService } from '../../../../shared/infrastructure/services/DataverseRecordUrlService';
import { CsvExportService, type TabularData } from '../../../../shared/infrastructure/services/CsvExportService';
import type { DataExplorerIntelliSenseServices } from '../initialization/registerDataExplorerIntelliSense';
import { openQueryInNotebook } from '../../notebooks/registerNotebooks';
import { VisualQuery, FetchXmlGenerator, FetchXmlToSqlTranspiler, QueryColumn } from '../../application/types';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import { ColumnOptionViewModelMapper } from '../../application/mappers/ColumnOptionViewModelMapper';

/**
 * Commands supported by Data Explorer panel.
 */
type DataExplorerCommands =
	| 'executeQuery'
	| 'exportCsv'
	| 'openInNotebook'
	| 'environmentChange'
	| 'selectEntity'
	| 'selectColumns'
	| 'openRecord'
	| 'copyRecordUrl'
	| 'warningModalResponse'
	| 'copySuccess'
	| 'webviewReady';

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
	private readonly fetchXmlGenerator: FetchXmlGenerator;
	private readonly fetchXmlToSqlTranspiler: FetchXmlToSqlTranspiler;
	private currentEnvironmentId: string;
	private currentVisualQuery: VisualQuery | null = null;
	private currentEntities: readonly EntityOption[] = [];
	private isLoadingEntities: boolean = false;
	private currentResult: QueryResult | null = null;
	private currentAvailableColumns: readonly AttributeSuggestion[] = [];
	private isLoadingColumns: boolean = false;
	private readonly columnMapper: ColumnOptionViewModelMapper;

	/** Monotonic counter for query execution to discard stale results. */
	private querySequence: number = 0;
	/** AbortController for the current query execution. */
	private currentAbortController: AbortController | null = null;
	/** Resolver for pending warning modal response. */
	private pendingModalResolver: ((action: WarningModalAction) => void) | null =
		null;

	private constructor(
		private readonly panel: SafeWebviewPanel,
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
		private readonly intelliSenseServices: DataExplorerIntelliSenseServices,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.errorMapper = new SqlParseErrorViewModelMapper();
		this.recordUrlService = new DataverseRecordUrlService();
		this.csvExportService = new CsvExportService(logger);
		this.fetchXmlGenerator = new FetchXmlGenerator();
		this.fetchXmlToSqlTranspiler = new FetchXmlToSqlTranspiler();
		this.columnMapper = new ColumnOptionViewModelMapper();
		logger.debug('DataExplorerPanel: Initialized with visual query builder');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri],
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		// Set initial environment for IntelliSense context
		this.intelliSenseServices.contextService.setActiveEnvironment(environmentId);

		// Cleanup on panel dispose
		panel.onDidDispose(() => {
			if (this.pendingModalResolver) {
				this.pendingModalResolver('cancel');
				this.pendingModalResolver = null;
			}
			// Clear active environment when panel closes
			this.intelliSenseServices.contextService.setActiveEnvironment(null);
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
		intelliSenseServices: DataExplorerIntelliSenseServices,
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
						intelliSenseServices,
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

		// Load persisted state (selected entity and columns)
		try {
			const state = await this.panelStateRepository.load({
				panelType: DataExplorerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId,
			});
			const savedEntity = state?.['selectedEntity'];
			if (savedEntity && typeof savedEntity === 'string') {
				this.currentVisualQuery = new VisualQuery(savedEntity);

				// Restore column selection if not "select all"
				const isSelectAll = state?.['isSelectAll'];
				const savedColumns = state?.['selectedColumns'];
				if (isSelectAll === false && Array.isArray(savedColumns) && savedColumns.length > 0) {
					const queryColumns = savedColumns
						.filter((name): name is string => typeof name === 'string')
						.map(name => new QueryColumn(name));
					this.currentVisualQuery = this.currentVisualQuery.withSpecificColumns(queryColumns);
				}

				this.logger.debug('Loaded persisted query state', {
					environmentId: this.currentEnvironmentId,
					entity: savedEntity,
					isSelectAll: this.currentVisualQuery.isSelectAll(),
					columnCount: this.currentVisualQuery.getColumnCount(),
				});
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted query state', error);
		}

		// Initialize coordinator with environments
		this.isLoadingEntities = true;
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			customData: this.buildCustomData(),
		});

		// Don't load entities here - wait for webviewReady signal
		// This prevents race conditions where entities are sent before JS is ready
	}

	/**
	 * Builds customData for the visual query builder section.
	 */
	private buildCustomData(): Record<string, unknown> {
		const fetchXml = this.currentVisualQuery
			? this.fetchXmlGenerator.generate(this.currentVisualQuery)
			: '';
		const sql = this.generateSqlFromVisualQuery();

		return {
			entities: this.currentEntities,
			selectedEntity: this.currentVisualQuery?.entityName ?? null,
			isLoadingEntities: this.isLoadingEntities,
			generatedFetchXml: fetchXml,
			generatedSql: sql,
		};
	}

	/**
	 * Generates SQL from the current visual query.
	 */
	private generateSqlFromVisualQuery(): string {
		if (!this.currentVisualQuery) {
			return '';
		}

		const fetchXml = this.fetchXmlGenerator.generate(this.currentVisualQuery);
		const result = this.fetchXmlToSqlTranspiler.transpile(fetchXml);
		return result.success ? result.sql : '';
	}

	/**
	 * Loads entities for the current environment.
	 */
	private async loadEntitiesForEnvironment(): Promise<void> {
		this.isLoadingEntities = true;
		await this.panel.postMessage({
			command: 'setLoadingEntities',
			data: { isLoading: true },
		});

		try {
			const entitySuggestions = await this.intelliSenseServices.metadataCache.getEntitySuggestions(
				this.currentEnvironmentId
			);

			// Map to EntityOption format and sort by display name
			this.currentEntities = entitySuggestions
				.map((e) => ({
					logicalName: e.logicalName,
					displayName: e.displayName,
					isCustomEntity: e.isCustomEntity,
				}))
				.sort((a, b) => a.displayName.localeCompare(b.displayName));

			this.logger.debug('Loaded entities for environment', {
				environmentId: this.currentEnvironmentId,
				entityCount: this.currentEntities.length,
			});

			// Send entities to webview
			await this.panel.postMessage({
				command: 'entitiesLoaded',
				data: {
					entities: this.currentEntities,
					selectedEntity: this.currentVisualQuery?.entityName ?? null,
				},
			});
		} catch (error) {
			this.logger.error('Failed to load entities', error);
			await this.panel.postMessage({
				command: 'showError',
				data: { message: 'Failed to load entities. Please try again.' },
			});
		} finally {
			this.isLoadingEntities = false;
			await this.panel.postMessage({
				command: 'setLoadingEntities',
				data: { isLoading: false },
			});
		}
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<DataExplorerCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		const environmentSelector = new EnvironmentSelectorSection();
		const visualQueryBuilderSection = new VisualQueryBuilderSection();

		// Note: Button IDs must match command names registered in registerCommandHandlers()
		const actionButtons = new ActionButtonsSection(
			{
				buttons: [
					{ id: 'executeQuery', label: 'Execute Query' },
					{ id: 'openInNotebook', label: 'Open in Notebook' },
					{ id: 'exportCsv', label: 'Export CSV' },
				],
			},
			SectionPosition.Toolbar
		);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, environmentSelector, visualQueryBuilderSection],
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
							'VisualQueryBuilderBehavior.js'
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
			this.panel,
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

		// Execute query using the current visual query
		this.coordinator.registerHandler('executeQuery', async () => {
			await this.handleExecuteVisualQuery();
		});

		// Open current query in a notebook
		this.coordinator.registerHandler('openInNotebook', async () => {
			await this.handleOpenInNotebook();
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Select entity from picker
		this.coordinator.registerHandler('selectEntity', async (data) => {
			const entityLogicalName = (data as { entityLogicalName?: string | null })?.entityLogicalName;
			await this.handleSelectEntity(entityLogicalName ?? null);
		});

		// Select columns for query
		this.coordinator.registerHandler('selectColumns', async (data) => {
			const { selectAll, columns } = data as { selectAll?: boolean; columns?: string[] };
			await this.handleSelectColumns(selectAll ?? true, columns ?? []);
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

		// Copy success notification from KeyboardSelectionBehavior
		this.coordinator.registerHandler('copySuccess', async (data) => {
			const payload = data as { count?: number } | undefined;
			const count = payload?.count ?? 0;
			await vscode.window.showInformationMessage(`${count} rows copied to clipboard`);
		});

		// Webview ready - send entities to webview
		this.coordinator.registerHandler('webviewReady', async () => {
			this.logger.debug('Webview ready, sending entities');
			await this.sendEntitiesToWebview();
		});
	}

	/**
	 * Sends the current entities to the webview.
	 * Called when webview signals it's ready.
	 */
	private async sendEntitiesToWebview(): Promise<void> {
		// Always load entities - this is the single entry point for entity loading
		await this.loadEntitiesForEnvironment();

		// If entity was restored from persisted state, also load its columns
		if (this.currentVisualQuery) {
			await this.updateQueryPreview();
			await this.loadAttributesForEntity(this.currentVisualQuery.entityName);
		}
	}

	/**
	 * Handles entity selection from the picker.
	 */
	private async handleSelectEntity(entityLogicalName: string | null): Promise<void> {
		this.logger.debug('Entity selected', { entityLogicalName });

		// Ignore empty selections (placeholder or loading state)
		if (entityLogicalName === null || entityLogicalName === '') {
			// Only clear if we had a previous selection
			if (this.currentVisualQuery !== null) {
				this.currentVisualQuery = null;
				this.currentAvailableColumns = [];
				await this.updateQueryPreview();
				// Clear column picker
				await this.panel.postMessage({
					command: 'attributesLoaded',
					data: { columns: [], isSelectAll: true },
				});
			}
			return;
		}

		// Create new visual query for the selected entity
		this.currentVisualQuery = new VisualQuery(entityLogicalName);
		this.logger.debug('Created VisualQuery', { entityName: this.currentVisualQuery.entityName });

		// Update query preview
		await this.updateQueryPreview();

		// Load attributes for column picker
		await this.loadAttributesForEntity(entityLogicalName);

		// Persist selection
		void this.saveQueryStateToStorage();
	}

	/**
	 * Loads attributes for the selected entity and sends to webview.
	 */
	private async loadAttributesForEntity(entityLogicalName: string): Promise<void> {
		this.isLoadingColumns = true;
		await this.panel.postMessage({
			command: 'setLoadingColumns',
			data: { isLoading: true },
		});

		try {
			this.currentAvailableColumns =
				await this.intelliSenseServices.metadataCache.getAttributeSuggestions(
					this.currentEnvironmentId,
					entityLogicalName
				);

			const isSelectAll = this.currentVisualQuery?.isSelectAll() ?? true;
			const selectedColumnNames = this.currentVisualQuery?.getColumnNames() ?? [];

			const columnViewModels = this.columnMapper.toViewModels(
				this.currentAvailableColumns,
				selectedColumnNames
			);

			await this.panel.postMessage({
				command: 'attributesLoaded',
				data: { columns: columnViewModels, isSelectAll },
			});

			this.logger.debug('Loaded attributes for entity', {
				entityLogicalName,
				attributeCount: this.currentAvailableColumns.length,
			});
		} catch (error) {
			this.logger.error('Failed to load attributes', error);
			await this.panel.postMessage({
				command: 'showError',
				data: { message: 'Failed to load columns. Please try again.' },
			});
		} finally {
			this.isLoadingColumns = false;
			await this.panel.postMessage({
				command: 'setLoadingColumns',
				data: { isLoading: false },
			});
		}
	}

	/**
	 * Handles column selection changes from the webview.
	 */
	private async handleSelectColumns(selectAll: boolean, columnNames: string[]): Promise<void> {
		if (this.currentVisualQuery === null) {
			return;
		}

		if (selectAll) {
			this.currentVisualQuery = this.currentVisualQuery.withAllColumns();
		} else {
			const queryColumns = columnNames.map((name) => new QueryColumn(name));
			this.currentVisualQuery = this.currentVisualQuery.withSpecificColumns(queryColumns);
		}

		this.logger.debug('Columns updated', {
			selectAll,
			columnCount: columnNames.length,
			isSelectAll: this.currentVisualQuery.isSelectAll(),
		});

		await this.updateQueryPreview();
		void this.saveQueryStateToStorage();
	}

	/**
	 * Updates the query preview in the webview.
	 */
	private async updateQueryPreview(): Promise<void> {
		const fetchXml = this.currentVisualQuery
			? this.fetchXmlGenerator.generate(this.currentVisualQuery)
			: '';
		const sql = this.generateSqlFromVisualQuery();

		await this.panel.postMessage({
			command: 'queryPreviewUpdated',
			data: { fetchXml, sql },
		});
	}

	/**
	 * Executes the current visual query.
	 */
	private async handleExecuteVisualQuery(): Promise<void> {
		if (!this.currentVisualQuery) {
			vscode.window.showWarningMessage('Please select an entity first');
			return;
		}

		const fetchXml = this.fetchXmlGenerator.generate(this.currentVisualQuery);
		await this.handleExecuteFetchXmlQuery(fetchXml);
	}

	/**
	 * Persists current query state (selected entity) to panel state.
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
					selectedEntity: this.currentVisualQuery?.entityName ?? null,
					isSelectAll: this.currentVisualQuery?.isSelectAll() ?? true,
					selectedColumns: this.currentVisualQuery?.getColumnNames() ?? [],
					lastUpdated: new Date().toISOString(),
				}
			);
		} catch (error) {
			this.logger.warn('Failed to persist query state', error);
		}
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		this.setButtonLoading('executeQuery', true);

		try {
			const oldEnvironmentId = this.currentEnvironmentId;
			this.currentEnvironmentId = environmentId;

			// Update IntelliSense context for the new environment
			this.intelliSenseServices.contextService.setActiveEnvironment(environmentId);

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

			// Clear previous results and reset visual query
			this.currentResult = null;
			this.currentVisualQuery = null;
			await this.panel.postMessage({
				command: 'clearResults',
			});

			// Load persisted state for the NEW environment
			await this.loadPersistedStateForEnvironment(environmentId);

			// Reload entities for the new environment
			await this.loadEntitiesForEnvironment();
		} finally {
			this.setButtonLoading('executeQuery', false);
		}
	}

	/**
	 * Loads persisted query state for a specific environment and updates the UI.
	 */
	private async loadPersistedStateForEnvironment(environmentId: string): Promise<void> {
		// Reset to defaults first
		this.currentVisualQuery = null;

		try {
			const state = await this.panelStateRepository.load({
				panelType: DataExplorerPanelComposed.viewType,
				environmentId,
			});

			if (state) {
				const savedEntity = state['selectedEntity'];
				if (savedEntity && typeof savedEntity === 'string') {
					this.currentVisualQuery = new VisualQuery(savedEntity);

					// Restore column selection if not "select all"
					const isSelectAll = state['isSelectAll'];
					const savedColumns = state['selectedColumns'];
					if (isSelectAll === false && Array.isArray(savedColumns) && savedColumns.length > 0) {
						const queryColumns = savedColumns
							.filter((name): name is string => typeof name === 'string')
							.map(name => new QueryColumn(name));
						this.currentVisualQuery = this.currentVisualQuery.withSpecificColumns(queryColumns);
					}

					this.logger.debug('Loaded persisted state for environment', {
						environmentId,
						entity: savedEntity,
						isSelectAll: this.currentVisualQuery.isSelectAll(),
						columnCount: this.currentVisualQuery.getColumnCount(),
					});
				}
			}
		} catch (error) {
			this.logger.warn('Failed to load persisted state for environment', { environmentId, error });
		}

		// Update query preview with loaded state
		await this.updateQueryPreview();
	}

	/**
	 * Executes a FetchXML query.
	 * Uses query token pattern to prevent stale results from overwriting newer ones.
	 * @param fetchXml - The FetchXML query to execute
	 */
	private async handleExecuteFetchXmlQuery(fetchXml: string): Promise<void> {
		const trimmedFetchXml = fetchXml.trim();
		if (trimmedFetchXml === '') {
			this.logger.warn('Execute query called with empty FetchXML');
			vscode.window.showWarningMessage('Please select an entity first');
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

		this.logger.debug('Executing FetchXML query', {
			environmentId: this.currentEnvironmentId,
			fetchXmlLength: trimmedFetchXml.length,
			queryId,
		});

		// Show loading state
		this.setButtonLoading('executeQuery', true);
		await this.panel.postMessage({
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
			await this.panel.postMessage({
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
				await this.panel.postMessage({
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
				await this.panel.postMessage({
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

				await this.panel.postMessage({
					command: 'queryError',
					data: errorViewModel,
				});
			}

			vscode.window.showErrorMessage(`Query failed: ${errorMessage}`);
		} finally {
			// Only reset loading state if this is still the current query
			if (queryId === this.querySequence) {
				this.setButtonLoading('executeQuery', false);
				await this.panel.postMessage({
					command: 'setLoadingState',
					data: { isLoading: false },
				});
			}
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

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.logger.debug('Setting button loading state', { buttonId, isLoading });
		void this.panel.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}

	/**
	 * Opens the current query in a new Dataverse SQL Notebook.
	 * The notebook inherits the currently selected environment.
	 */
	private async handleOpenInNotebook(): Promise<void> {
		if (!this.currentVisualQuery) {
			vscode.window.showWarningMessage('Please select an entity first');
			return;
		}

		this.logger.debug('Opening current query in notebook');

		try {
			// Get environment info for display and record links
			const environmentInfo = await this.getEnvironmentById(this.currentEnvironmentId);
			const environmentName = environmentInfo?.name ?? 'Unknown Environment';

			// Generate SQL from visual query
			const sql = this.generateSqlFromVisualQuery();

			const options = {
				sql,
				environmentId: this.currentEnvironmentId,
				environmentName,
				...(environmentInfo?.dataverseUrl && { environmentUrl: environmentInfo.dataverseUrl }),
			};
			await openQueryInNotebook(options);

			this.logger.info('Opened query in notebook', {
				environmentId: this.currentEnvironmentId,
				sqlLength: sql.length,
			});
		} catch (error) {
			this.logger.error('Failed to open query in notebook', error);
			await vscode.window.showErrorMessage('Failed to open query in notebook');
		}
	}
}
