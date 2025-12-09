/* eslint-disable max-lines -- Panel coordinator with 25 command handlers across 4 feature areas:
 * 1. Query execution (FetchXML/SQL, result handling, abort/discard stale queries)
 * 2. Environment management (environment change, entity/attribute loading via metadata loader)
 * 3. Visual Query Builder (entity/column/filter/sort/options via query builder coordinator)
 * 4. Export/Import operations (CSV, JSON, FetchXML, SQL, notebook via export/import coordinator)
 *
 * Delegates most logic to coordinators (DataExplorerMetadataLoader, DataExplorerExportImportCoordinator,
 * VisualQueryBuilderCoordinator) but requires all command handler registrations in single location.
 * Splitting further would create artificial boundaries between tightly-coupled command handlers.
 */
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
import { DataExplorerExportDropdownSection } from '../sections/DataExplorerExportDropdownSection';
import { DataExplorerImportDropdownSection } from '../sections/DataExplorerImportDropdownSection';
import { DataverseRecordUrlService } from '../../../../shared/infrastructure/services/DataverseRecordUrlService';
import { CsvExportService } from '../../../../shared/infrastructure/services/CsvExportService';
import type { DataExplorerIntelliSenseServices } from '../initialization/registerDataExplorerIntelliSense';
import {
	FetchXmlGenerator,
	FetchXmlParser,
	FetchXmlToSqlTranspiler,
	SqlParser,
	SqlToFetchXmlTranspiler,
} from '../../application/types';
import { ColumnOptionViewModelMapper } from '../../application/mappers/ColumnOptionViewModelMapper';
import {
	DataExplorerMetadataLoader,
	type MetadataLoaderPanelContext,
} from '../coordinators/DataExplorerMetadataLoader';
import {
	DataExplorerExportImportCoordinator,
	type ExportImportPanelContext,
} from '../coordinators/DataExplorerExportImportCoordinator';
import {
	VisualQueryBuilderCoordinator,
	type VisualQueryBuilderPanelContext,
} from '../coordinators/VisualQueryBuilderCoordinator';

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
	| 'addFilterCondition'
	| 'removeFilterCondition'
	| 'updateFilterCondition'
	| 'updateSort'
	| 'clearSort'
	| 'updateQueryOptions'
	| 'clearQuery'
	| 'openRecord'
	| 'copyRecordUrl'
	| 'warningModalResponse'
	| 'copySuccess'
	| 'webviewReady'
	// Export commands
	| 'exportResultsCsv'
	| 'exportResultsJson'
	| 'exportQueryFetchXml'
	| 'exportQuerySql'
	| 'exportQueryNotebook'
	// Import commands
	| 'importFetchXml'
	| 'importSql';

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
	private readonly columnMapper: ColumnOptionViewModelMapper;
	private currentEnvironmentId: string;
	private currentResult: QueryResult | null = null;

	// Coordinators
	private readonly metadataLoader: DataExplorerMetadataLoader;
	private readonly exportImportCoordinator: DataExplorerExportImportCoordinator;
	private readonly queryBuilderCoordinator: VisualQueryBuilderCoordinator;

	// Transpilers for external query loading
	private readonly sqlParser: SqlParser;
	private readonly sqlToFetchXmlTranspiler: SqlToFetchXmlTranspiler;

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
		this.columnMapper = new ColumnOptionViewModelMapper();
		this.sqlParser = new SqlParser();
		this.sqlToFetchXmlTranspiler = new SqlToFetchXmlTranspiler();
		logger.debug('DataExplorerPanel: Initialized with visual query builder');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri],
		};

		// Create coordinator instances with panel context implementations
		this.queryBuilderCoordinator = new VisualQueryBuilderCoordinator(
			panel,
			this.columnMapper,
			panelStateRepository,
			this.createQueryBuilderPanelContext(),
			logger
		);

		this.metadataLoader = new DataExplorerMetadataLoader(
			panel,
			intelliSenseServices,
			this.columnMapper,
			this.createMetadataLoaderPanelContext(),
			logger
		);

		this.exportImportCoordinator = new DataExplorerExportImportCoordinator(
			panel,
			this.csvExportService,
			resultMapper,
			new FetchXmlGenerator(),
			new FetchXmlToSqlTranspiler(),
			new FetchXmlParser(),
			this.sqlParser,
			this.sqlToFetchXmlTranspiler,
			this.createExportImportPanelContext(),
			logger
		);

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

	protected getCurrentEnvironmentId(): string {
		return this.currentEnvironmentId;
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

	// ============================================
	// PANEL CONTEXT IMPLEMENTATIONS
	// ============================================

	private createMetadataLoaderPanelContext(): MetadataLoaderPanelContext {
		return {
			getCurrentEnvironmentId: (): string => this.currentEnvironmentId,
			getCurrentVisualQueryEntityName: (): string | null => this.queryBuilderCoordinator.getCurrentVisualQueryEntityName(),
			getSelectedColumnNames: (): readonly string[] => this.queryBuilderCoordinator.getSelectedColumnNames(),
			isSelectAll: (): boolean => this.queryBuilderCoordinator.isSelectAll(),
			onAttributesLoaded: (attributes): void => {
				this.queryBuilderCoordinator.setAvailableColumns(attributes);
			},
			onColumnsLoadedRebuildFilters: async (): Promise<void> => {
				await this.queryBuilderCoordinator.rebuildVisualQueryFilters();
			},
			onSendFiltersUpdate: async (): Promise<void> => {
				await this.queryBuilderCoordinator.sendFiltersUpdate();
			},
			onSendSortUpdate: async (): Promise<void> => {
				await this.queryBuilderCoordinator.sendSortUpdate();
			},
			onSendQueryOptionsUpdate: async (): Promise<void> => {
				await this.queryBuilderCoordinator.sendQueryOptionsUpdate();
			},
		};
	}

	private createExportImportPanelContext(): ExportImportPanelContext {
		return {
			getCurrentEnvironmentId: (): string => this.currentEnvironmentId,
			getCurrentVisualQuery: () => this.queryBuilderCoordinator.getCurrentVisualQuery(),
			getCurrentResult: () => this.currentResult,
			getEnvironmentById: async (envId): Promise<{ name: string; dataverseUrl?: string } | null> => this.getEnvironmentById(envId),
			loadVisualQueryFromFetchXml: async (fetchXml): Promise<void> => {
				await this.loadVisualQueryFromFetchXml(fetchXml);
			},
			generateSqlFromVisualQuery: (): string => this.queryBuilderCoordinator.generateSqlFromVisualQuery(),
			setButtonLoading: (buttonId, isLoading): void => this.setButtonLoading(buttonId, isLoading),
		};
	}

	private createQueryBuilderPanelContext(): VisualQueryBuilderPanelContext {
		return {
			getCurrentEnvironmentId: (): string => this.currentEnvironmentId,
			getViewType: (): string => DataExplorerPanelComposed.viewType,
			loadAttributesForEntity: async (entityLogicalName): Promise<void> => {
				const attributes = await this.metadataLoader.loadAttributesForEntity(entityLogicalName);
				this.queryBuilderCoordinator.setAvailableColumns(attributes);
			},
			clearCurrentResult: (): void => {
				this.currentResult = null;
			},
			entityExists: (entityLogicalName): boolean => this.metadataLoader.entityExists(entityLogicalName),
			sendEntitySelectionUpdate: async (selectedEntity): Promise<void> => {
				await this.metadataLoader.sendEntitySelectionUpdate(selectedEntity);
			},
		};
	}

	// ============================================
	// INITIALIZATION
	// ============================================

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		// Load persisted state (selected entity, columns, and filters)
		await this.queryBuilderCoordinator.loadInitialState(this.currentEnvironmentId);

		// Initialize coordinator with environments
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
		return this.queryBuilderCoordinator.buildCustomData(
			this.metadataLoader.getEntities(),
			this.metadataLoader.getIsLoadingEntities()
		);
	}

	// ============================================
	// COORDINATOR SETUP
	// ============================================

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
					{ id: 'executeQuery', label: 'Execute' },
					{ id: 'clearQuery', label: 'Clear' },
				],
			},
			SectionPosition.Toolbar
		);

		const exportDropdown = new DataExplorerExportDropdownSection();
		const importDropdown = new DataExplorerImportDropdownSection();

		// Toolbar order: Execute, Clear, Export, Import, Environment (anchored right)
		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, exportDropdown, importDropdown, environmentSelector, visualQueryBuilderSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs', 'dropdown'],
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
							'resources',
							'webview',
							'js',
							'components',
							'DropdownComponent.js'
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
							'CellSelectionBehavior.js'
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
							'resources',
							'webview',
							'js',
							'renderers',
							'VirtualTableRenderer.js'
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

	// ============================================
	// COMMAND HANDLERS
	// ============================================

	private registerCommandHandlers(): void {
		this.logger.debug('Registering Data Explorer command handlers');

		// Execute query using the current visual query
		this.coordinator.registerHandler('executeQuery', async () => {
			await this.handleExecuteVisualQuery();
		});

		// Open current query in a notebook
		this.coordinator.registerHandler('openInNotebook', async () => {
			await this.exportImportCoordinator.handleOpenInNotebook();
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Select entity from picker - delegate to query builder
		this.coordinator.registerHandler('selectEntity', async (data) => {
			const entityLogicalName = (data as { entityLogicalName?: string | null })?.entityLogicalName;
			await this.queryBuilderCoordinator.handleSelectEntity(entityLogicalName ?? null);
		});

		// Select columns for query - delegate to query builder
		this.coordinator.registerHandler('selectColumns', async (data) => {
			const { selectAll, columns } = data as { selectAll?: boolean; columns?: string[] };
			await this.queryBuilderCoordinator.handleSelectColumns(selectAll ?? true, columns ?? []);
		});

		// Add filter condition - delegate to query builder
		this.coordinator.registerHandler('addFilterCondition', async () => {
			await this.queryBuilderCoordinator.handleAddFilterCondition();
		});

		// Remove filter condition - delegate to query builder
		this.coordinator.registerHandler('removeFilterCondition', async (data) => {
			const { conditionId } = data as { conditionId?: string };
			if (conditionId) {
				await this.queryBuilderCoordinator.handleRemoveFilterCondition(conditionId);
			}
		});

		// Update filter condition - delegate to query builder
		this.coordinator.registerHandler('updateFilterCondition', async (data) => {
			const payload = data as {
				conditionId?: string;
				field?: 'attribute' | 'operator' | 'value';
				attribute?: string;
				attributeType?: string;
				operator?: string;
				value?: string;
			};
			if (payload.conditionId !== undefined && payload.field !== undefined) {
				await this.queryBuilderCoordinator.handleUpdateFilterCondition({
					conditionId: payload.conditionId,
					field: payload.field,
					attribute: payload.attribute,
					attributeType: payload.attributeType,
					operator: payload.operator,
					value: payload.value,
				});
			}
		});

		// Update sort configuration - delegate to query builder
		this.coordinator.registerHandler('updateSort', async (data) => {
			const payload = data as { attribute?: string; descending?: boolean };
			await this.queryBuilderCoordinator.handleUpdateSort(payload);
		});

		// Clear sort configuration - delegate to query builder
		this.coordinator.registerHandler('clearSort', async () => {
			await this.queryBuilderCoordinator.handleClearSort();
		});

		// Update query options (Top N, Distinct) - delegate to query builder
		this.coordinator.registerHandler('updateQueryOptions', async (data) => {
			const payload = data as { topN?: number | null; distinct?: boolean };
			await this.queryBuilderCoordinator.handleUpdateQueryOptions(payload);
		});

		// Clear query (reset columns, filters, sort, options, results - keep entity) - delegate to query builder
		this.coordinator.registerHandler('clearQuery', async () => {
			await this.queryBuilderCoordinator.handleClearQuery();
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

		// Export results to CSV - delegate to export coordinator
		this.coordinator.registerHandler(
			'exportCsv',
			async () => {
				await this.exportImportCoordinator.handleExportCsv();
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

		// Webview ready - delegate to metadata loader
		this.coordinator.registerHandler('webviewReady', async () => {
			this.logger.debug('Webview ready, sending entities');
			await this.metadataLoader.sendEntitiesToWebview();
		});

		// Export Results as CSV - delegate to export coordinator
		this.coordinator.registerHandler('exportResultsCsv', async () => {
			await this.exportImportCoordinator.handleExportCsv();
		});

		// Export Results as JSON - delegate to export coordinator
		this.coordinator.registerHandler('exportResultsJson', async () => {
			await this.exportImportCoordinator.handleExportResultsJson();
		});

		// Export Query as FetchXML - delegate to export coordinator
		this.coordinator.registerHandler('exportQueryFetchXml', async () => {
			await this.exportImportCoordinator.handleExportQueryFetchXml();
		});

		// Export Query as SQL - delegate to export coordinator
		this.coordinator.registerHandler('exportQuerySql', async () => {
			await this.exportImportCoordinator.handleExportQuerySql();
		});

		// Export Query as Notebook - delegate to export coordinator
		this.coordinator.registerHandler('exportQueryNotebook', async () => {
			await this.exportImportCoordinator.handleOpenInNotebook();
		});

		// Import FetchXML file - delegate to export coordinator
		this.coordinator.registerHandler('importFetchXml', async () => {
			await this.exportImportCoordinator.handleImportFetchXml();
		});

		// Import SQL file - delegate to export coordinator
		this.coordinator.registerHandler('importSql', async () => {
			await this.exportImportCoordinator.handleImportSql();
		});
	}

	// ============================================
	// QUERY EXECUTION
	// ============================================

	/**
	 * Executes the current visual query.
	 */
	private async handleExecuteVisualQuery(): Promise<void> {
		const visualQuery = this.queryBuilderCoordinator.getCurrentVisualQuery();
		if (!visualQuery) {
			vscode.window.showWarningMessage('Please select an entity first');
			return;
		}

		const fetchXml = this.queryBuilderCoordinator.generateFetchXml();
		await this.handleExecuteFetchXmlQuery(fetchXml);
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

		// Show loading state (handled by webview action bar)
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
				await this.panel.postMessage({
					command: 'setLoadingState',
					data: { isLoading: false },
				});
			}
		}
	}

	// ============================================
	// ENVIRONMENT CHANGE
	// ============================================

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

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
		await this.panel.postMessage({
			command: 'clearResults',
		});

		// Load persisted state for the NEW environment via coordinator
		await this.queryBuilderCoordinator.loadPersistedStateForEnvironment(environmentId);

		// Reload entities for the new environment
		await this.metadataLoader.loadEntitiesForEnvironment();
	}

	// ============================================
	// RECORD OPERATIONS
	// ============================================

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

	// ============================================
	// IMPORT SUPPORT
	// ============================================

	/**
	 * Loads a FetchXML string into the Visual Query Builder.
	 * Parses the FetchXML and updates the UI state.
	 * Shared between import coordinator and external loading.
	 */
	private async loadVisualQueryFromFetchXml(fetchXml: string): Promise<void> {
		try {
			await this.queryBuilderCoordinator.loadVisualQueryFromFetchXml(fetchXml);

			const entityName = this.queryBuilderCoordinator.getCurrentVisualQueryEntityName();
			void vscode.window.showInformationMessage(
				`Imported query for "${entityName}"`
			);
		} catch (error) {
			await vscode.window.showErrorMessage(
				error instanceof Error ? error.message : String(error)
			);
		}
	}

	/**
	 * Loads a query from an external source (e.g., notebook cell) into the Visual Query Builder.
	 * Handles both SQL and FetchXML input.
	 *
	 * @param query - The query string (SQL or FetchXML)
	 * @param language - The query language ('sql' or 'fetchxml')
	 */
	public async loadQueryFromExternal(query: string, language: 'sql' | 'fetchxml'): Promise<void> {
		// Ensure entities are loaded (handles case where panel just opened and hasn't finished init)
		if (this.metadataLoader.getEntities().length === 0) {
			try {
				await this.metadataLoader.loadEntitiesForEnvironment();
			} catch (error) {
				this.logger.error('Failed to load entities for external query', error);
				await vscode.window.showErrorMessage('Failed to load entity metadata. Please try again.');
				return;
			}
		}

		try {
			await this.queryBuilderCoordinator.loadQueryFromExternal(
				query,
				language,
				this.sqlParser,
				this.sqlToFetchXmlTranspiler
			);

			const entityName = this.queryBuilderCoordinator.getCurrentVisualQueryEntityName();
			void vscode.window.showInformationMessage(
				`Loaded query for "${entityName}"`
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await vscode.window.showErrorMessage(`Failed to load query: ${errorMessage}`);
		}
	}

	// ============================================
	// UTILITY METHODS
	// ============================================

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.logger.debug('Setting button loading state', { buttonId, isLoading });
		void this.panel.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}
}
