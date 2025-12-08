/**
 * Presentation layer panel for Plugin Trace Viewer.
 * Uses new PanelCoordinator architecture with split panel layout.
 *
 * NO business logic - delegates all operations to use cases.
 */

 

import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IConfigurationService } from '../../../../shared/domain/services/IConfigurationService';
import type { DataTableConfig, EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import type { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import type { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';
import type { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';
import type { GetTraceLevelUseCase } from '../../application/useCases/GetTraceLevelUseCase';
import type { SetTraceLevelUseCase } from '../../application/useCases/SetTraceLevelUseCase';
import type { BuildTimelineUseCase } from '../../application/useCases/BuildTimelineUseCase';
import type { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { TraceLevelFormatter } from '../utils/TraceLevelFormatter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import { TraceLevel } from '../../application/types';
import { PluginTraceDetailSection } from '../sections/PluginTraceDetailSection';
import { ExportDropdownSection } from '../sections/ExportDropdownSection';
import { DeleteDropdownSection } from '../sections/DeleteDropdownSection';
import { TraceLevelDropdownSection } from '../sections/TraceLevelDropdownSection';
import { AutoRefreshDropdownSection } from '../sections/AutoRefreshDropdownSection';
import { FilterPanelSection } from '../sections/FilterPanelSection';
import { FilterCriteriaMapper } from '../mappers/FilterCriteriaMapper';
import type { FilterCriteriaViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { FilterField } from '../../application/types';
import { FILTER_ENUM_OPTIONS } from '../constants/FilterFieldConfiguration';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';
import { PluginTraceExportBehavior } from '../behaviors/PluginTraceExportBehavior';
import { PluginTraceDeleteBehavior } from '../behaviors/PluginTraceDeleteBehavior';
import { PluginTraceAutoRefreshBehavior } from '../behaviors/PluginTraceAutoRefreshBehavior';
import { PluginTraceDetailPanelBehavior } from '../behaviors/PluginTraceDetailPanelBehavior';
import { PluginTraceFilterManagementBehavior } from '../behaviors/PluginTraceFilterManagementBehavior';

/**
 * Commands supported by Plugin Trace Viewer panel.
 */
type PluginTraceViewerCommands =
	| 'refresh'
	| 'openMaker'
	| 'environmentChange'
	| 'viewDetail'
	| 'viewTrace'
	| 'closeDetail'
	| 'deleteSelected'
	| 'deleteAll'
	| 'deleteOld'
	| 'exportCsv'
	| 'exportJson'
	| 'setTraceLevel'
	| 'setAutoRefresh'
	| 'applyFilters'
	| 'clearFilters'
	| 'saveDetailPanelWidth'
	| 'showDetailPanel'
	| 'hideDetailPanel'
	| 'restoreDetailPanelWidth'
	| 'saveFilterPanelHeight'
	| 'restoreFilterPanelHeight'
	| 'saveFilterPanelCollapsed'
	| 'restoreFilterPanelCollapsed'
	| 'copySuccess';

/**
 * Plugin Trace Viewer panel using new PanelCoordinator architecture.
 * Features split panel layout with trace list and detail view.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class PluginTraceViewerPanelComposed extends EnvironmentScopedPanel<PluginTraceViewerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';
	private static panels = new Map<string, PluginTraceViewerPanelComposed>();

	/** Default value for delete old days (configurable via pluginTrace.defaultDeleteOldDays) */
	private static readonly DEFAULT_DELETE_OLD_DAYS = 30;

	// Named constants for time-based operations
	private static readonly MILLISECONDS_PER_SECOND = 1000;
	private static readonly ONE_HOUR_IN_MS = 60 * 60 * 1000;
	private static readonly TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

	private readonly coordinator: PanelCoordinator<PluginTraceViewerCommands>;

	/** Configured default days for "delete old traces" operation */
	private readonly defaultDeleteOldDays: number;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly detailSection: PluginTraceDetailSection;

	// Behaviors (encapsulate panel operations)
	private readonly loadingBehavior: LoadingStateBehavior;
	private readonly exportBehavior: PluginTraceExportBehavior;
	private readonly deleteBehavior: PluginTraceDeleteBehavior;
	private readonly autoRefreshBehavior: PluginTraceAutoRefreshBehavior;
	private readonly detailPanelBehavior: PluginTraceDetailPanelBehavior;
	private readonly filterManagementBehavior: PluginTraceFilterManagementBehavior;

	private currentEnvironmentId: string;
	private traces: readonly PluginTrace[] = [];
	private currentTraceLevel: TraceLevel | null = null;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly getPluginTracesUseCase: GetPluginTracesUseCase,
		private readonly deleteTracesUseCase: DeleteTracesUseCase,
		private readonly exportTracesUseCase: ExportTracesUseCase,
		private readonly getTraceLevelUseCase: GetTraceLevelUseCase,
		private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
		private readonly buildTimelineUseCase: BuildTimelineUseCase,
		private readonly viewModelMapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger,
		private readonly panelStateRepository: IPanelStateRepository | null,
		private readonly configService: IConfigurationService | undefined,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.defaultDeleteOldDays = configService?.get('pluginTrace.defaultDeleteOldDays', PluginTraceViewerPanelComposed.DEFAULT_DELETE_OLD_DAYS)
			?? PluginTraceViewerPanelComposed.DEFAULT_DELETE_OLD_DAYS;
		logger.debug('PluginTraceViewerPanel: Initialized with new architecture');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;
		this.detailSection = result.detailSection;

		// Initialize loading behavior for toolbar buttons
		// All buttons must be included so they get re-enabled after scaffold renders with isLoading: true
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(['openMaker', 'refresh']),
			logger
		);

		// Initialize behaviors (encapsulate panel operations)
		this.exportBehavior = new PluginTraceExportBehavior(exportTracesUseCase, logger);

		this.deleteBehavior = new PluginTraceDeleteBehavior(
			deleteTracesUseCase,
			logger,
			async () => this.handleRefresh()
		);

		this.autoRefreshBehavior = new PluginTraceAutoRefreshBehavior(
			logger,
			async () => this.handleRefresh(),
			async () => this.saveFilterCriteria(),
			panel.webview
		);

		this.detailPanelBehavior = new PluginTraceDetailPanelBehavior(
			panel.webview,
			getPluginTracesUseCase,
			buildTimelineUseCase,
			viewModelMapper,
			logger,
			panelStateRepository,
			PluginTraceViewerPanelComposed.viewType
		);

		this.filterManagementBehavior = new PluginTraceFilterManagementBehavior(
			panel.webview,
			logger,
			panelStateRepository,
			PluginTraceViewerPanelComposed.viewType,
			async () => this.handleRefresh(),
			async () => this.saveFilterCriteria(),
			configService
		);

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	/**
	 * Reveals the panel in the specified column.
	 * Required by EnvironmentScopedPanel base class.
	 */
	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		getPluginTracesUseCase: GetPluginTracesUseCase,
		deleteTracesUseCase: DeleteTracesUseCase,
		exportTracesUseCase: ExportTracesUseCase,
		getTraceLevelUseCase: GetTraceLevelUseCase,
		setTraceLevelUseCase: SetTraceLevelUseCase,
		buildTimelineUseCase: BuildTimelineUseCase,
		viewModelMapper: PluginTraceViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository,
		configService?: IConfigurationService
	): Promise<PluginTraceViewerPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: PluginTraceViewerPanelComposed.viewType,
			titlePrefix: 'Plugin Traces',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new PluginTraceViewerPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				getPluginTracesUseCase,
				deleteTracesUseCase,
				exportTracesUseCase,
				getTraceLevelUseCase,
				setTraceLevelUseCase,
				buildTimelineUseCase,
				viewModelMapper,
				logger,
				panelStateRepository || null,
				configService,
				envId
			),
			webviewOptions: {
				enableScripts: true,
				retainContextWhenHidden: true,
				enableFindWidget: true
			},
			onDispose: (panelInstance) => {
				// Required: Clean up auto-refresh timer to prevent memory leaks.
				// The auto-refresh behavior maintains an active setInterval that must
				// be cleared when the panel is disposed, otherwise it will continue
				// running and attempting to refresh a disposed panel.
				panelInstance.autoRefreshBehavior.dispose();
			}
		}, PluginTraceViewerPanelComposed.panels);
	}

	private async initializeAndLoadData(): Promise<void> {
		const environments = await this.getEnvironments();

		// Load persisted state from repository once, then distribute to behaviors
		let filterPanelHeight: number | null = null;
		let filterPanelCollapsed: boolean | null = null;
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: PluginTraceViewerPanelComposed.viewType,
					environmentId: this.currentEnvironmentId
				});

				if (state) {
					// Set auto-refresh interval
					if (state.autoRefreshInterval && typeof state.autoRefreshInterval === 'number' && state.autoRefreshInterval > 0) {
						this.autoRefreshBehavior.setInterval(state.autoRefreshInterval);
					}

					// Set detail panel width
					if (state.detailPanelWidth && typeof state.detailPanelWidth === 'number') {
						this.detailPanelBehavior.setDetailPanelWidth(state.detailPanelWidth);
					}

					// Store filter panel height to restore later
					if (state['filterPanelHeight'] && typeof state['filterPanelHeight'] === 'number') {
						filterPanelHeight = state['filterPanelHeight'];
					}

					// Store filter panel collapsed state to restore later
					if (state['filterPanelCollapsed'] !== undefined && typeof state['filterPanelCollapsed'] === 'boolean') {
						filterPanelCollapsed = state['filterPanelCollapsed'];
					}
				}
			} catch (error) {
				this.logger.warn('Failed to load panel state from storage', { error });
			}
		}

		// Load persisted filter criteria (may also load from repository if available)
		await this.filterManagementBehavior.loadFilterCriteria(
			this.currentEnvironmentId
		);

		this.logger.debug('Initializing with auto-refresh interval', {
			interval: this.autoRefreshBehavior.getInterval()
		});

		// Start auto-refresh timer if interval was persisted
		this.autoRefreshBehavior.startIfEnabled();

		// Get reconstructed quick filter IDs before initial render
		const reconstructedQuickFilterIds = this.filterManagementBehavior.getReconstructedQuickFilterIds();

		// Single scaffold render with all persisted state included
		// No second render needed - handleRefresh() uses data-driven updateTableData
		// isLoading: true renders spinner in table and disables all buttons
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: [],
			isLoading: true,
			state: {
				traceLevel: this.currentTraceLevel?.value,
				autoRefreshInterval: this.autoRefreshBehavior.getInterval(),
				filterCriteria: this.filterManagementBehavior.getFilterCriteria(),
				detailPanelWidth: this.detailPanelBehavior.getDetailPanelWidth(),
				filterPanelCollapsed,
				filterPanelHeight,
				quickFilterIds: reconstructedQuickFilterIds
			}
		});

		// Disable all buttons during initial load (scaffold rendered them disabled, this syncs state)
		await this.loadingBehavior.setLoading(true);

		try {
			// Build and send OData query preview for loaded filters
			const loadedFilterCriteria = this.filterManagementBehavior.getAppliedFilterCriteria();
			const filterMapper = new FilterCriteriaMapper(this.configService);
			const domainFilter = filterMapper.toDomain(loadedFilterCriteria);
			const odataQuery = domainFilter.buildFilterExpression() || 'No filters applied';
			await this.panel.postMessage({
				command: 'updateODataPreview',
				data: { query: odataQuery }
			});

			// Load data - handleRefresh() manages refresh button spinner
			await this.handleRefresh();

			// Load trace level (updates dropdown via message)
			await this.loadTraceLevel();
		} finally {
			// Re-enable all buttons after load completes
			await this.loadingBehavior.setLoading(false);
		}
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<PluginTraceViewerCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
		detailSection: PluginTraceDetailSection;
	} {
		const config = this.getTableConfig();

		const environmentSelector = new EnvironmentSelectorSection();
		const exportDropdown = new ExportDropdownSection();
		const deleteDropdown = new DeleteDropdownSection();
		const traceLevelDropdown = new TraceLevelDropdownSection();
		const autoRefreshDropdown = new AutoRefreshDropdownSection();
		const filterPanel = new FilterPanelSection();
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' }
			]
		}, SectionPosition.Toolbar);

		const tableSection = new DataTableSection(config);
		const detailSection = new PluginTraceDetailSection();

		const compositionBehavior = new SectionCompositionBehavior(
			[
				actionButtons,
				traceLevelDropdown,
				autoRefreshDropdown,
				exportDropdown,
				deleteDropdown,
				environmentSelector,
				filterPanel,
				tableSection,
				detailSection
			],
			PanelLayout.SplitHorizontal
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs', 'split-panel', 'dropdown'],
				sections: ['environment-selector', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'plugin-trace-viewer.css')
		).toString();

		// Pass filter configuration to webview for JavaScript to use
		// This ensures JavaScript uses the same field definitions as TypeScript domain model
		const filterConfig = {
			fields: FilterField.All.map(f => f.displayName),
			fieldTypes: Object.fromEntries(
				FilterField.All.map(f => [f.displayName, f.fieldType])
			),
			enumOptions: FILTER_ENUM_OPTIONS
		};
		const filterConfigJson = JSON.stringify(filterConfig);

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'CellSelectionBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'components', 'DropdownComponent.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DetailPanelRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'KeyboardSelectionBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'PluginTraceViewerBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Plugin Traces',
			customJavaScript: `window.FILTER_CONFIG = ${filterConfigJson};`
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<PluginTraceViewerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior, detailSection };
	}

	private registerCommandHandlers(): void {
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		this.coordinator.registerHandler('viewDetail', async (data) => {
			this.logger.info('ViewDetail command received', { data });
			const traceId = (data as { traceId?: string })?.traceId;
			if (traceId) {
				await this.detailPanelBehavior.viewDetail(this.currentEnvironmentId, traceId);
			} else {
				this.logger.warn('ViewDetail called but no traceId in data', { data });
			}
		}, { disableOnExecute: false }); // Link in table, not a button

		this.coordinator.registerHandler('viewTrace', async (data) => {
			this.logger.info('ViewTrace command received', { data });
			const traceId = (data as { traceId?: string })?.traceId;
			if (traceId) {
				await this.detailPanelBehavior.viewDetail(this.currentEnvironmentId, traceId);
			} else {
				this.logger.warn('ViewTrace called but no traceId in data', { data });
			}
		}, { disableOnExecute: false }); // Link in timeline/related traces, not a button

		this.coordinator.registerHandler('closeDetail', async () => {
			await this.detailPanelBehavior.closeDetail();
		});

		this.coordinator.registerHandler('deleteSelected', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds;
			if (traceIds) {
				await this.deleteBehavior.deleteSelected(this.currentEnvironmentId, traceIds);
			}
		});

		this.coordinator.registerHandler('deleteAll', async () => {
			await this.deleteBehavior.deleteAll(this.currentEnvironmentId);
		});

		this.coordinator.registerHandler('deleteOld', async () => {
			await this.deleteBehavior.deleteOld(
				this.currentEnvironmentId,
				this.defaultDeleteOldDays
			);
		});

		this.coordinator.registerHandler('exportCsv', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds || this.traces.map(t => t.id);
			await this.exportBehavior.exportTraces(this.traces, traceIds, 'csv');
		});

		this.coordinator.registerHandler('exportJson', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds || this.traces.map(t => t.id);
			await this.exportBehavior.exportTraces(this.traces, traceIds, 'json');
		});

		this.coordinator.registerHandler('setTraceLevel', async (data) => {
			const level = (data as { level?: string })?.level;
			if (level) {
				await this.handleSetTraceLevel(level);
			}
		});

		this.coordinator.registerHandler('setAutoRefresh', async (data) => {
			const interval = (data as { interval?: number })?.interval;
			if (interval !== undefined) {
				await this.autoRefreshBehavior.setAutoRefresh(interval);
			}
		});

		// Related traces and timeline are now sent with updateDetailPanel (no lazy loading needed)

		this.coordinator.registerHandler('applyFilters', async (data) => {
			const filterData = data as Partial<FilterCriteriaViewModel>;
			await this.filterManagementBehavior.applyFilters(filterData);
		});

		this.coordinator.registerHandler('clearFilters', async () => {
			await this.filterManagementBehavior.clearFilters();
		});

		this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
			const width = (data as { width?: number })?.width;
			if (width !== undefined) {
				await this.detailPanelBehavior.saveDetailPanelWidth(width, this.currentEnvironmentId);
			}
		});

		this.coordinator.registerHandler('saveFilterPanelHeight', async (data) => {
			const height = (data as { height?: number })?.height;
			if (height !== undefined) {
				await this.saveFilterPanelHeight(height);
			}
		});

		this.coordinator.registerHandler('saveFilterPanelCollapsed', async (data) => {
			const collapsed = (data as { collapsed?: boolean })?.collapsed;
			if (collapsed !== undefined) {
				await this.saveFilterPanelCollapsed(collapsed);
			}
		});

		this.coordinator.registerHandler('copySuccess', async (data) => {
			const payload = data as { count?: number } | undefined;
			const count = payload?.count ?? 0;
			await vscode.window.showInformationMessage(`${count} rows copied to clipboard`);
		});
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: PluginTraceViewerPanelComposed.viewType,
			title: 'Plugin Traces',
			dataCommand: 'tracesData',
			defaultSortColumn: 'createdOn',
			defaultSortDirection: 'desc',
			columns: [
				{ key: 'status', label: 'Status', type: 'status' },
				{ key: 'createdOn', label: 'Started', type: 'datetime' },
				{ key: 'duration', label: 'Duration', type: 'status' },
				{ key: 'operationType', label: 'Operation', type: 'status' },
				{ key: 'pluginName', label: 'Plugin', type: 'name' },
				{ key: 'entityName', label: 'Entity', type: 'identifier' },
				{ key: 'messageName', label: 'Message', type: 'identifier' },
				{ key: 'depth', label: 'Depth', type: 'numeric' },
				{ key: 'mode', label: 'Mode', type: 'status' }
			],
			searchPlaceholder: '🔍 Search plugin traces...',
			noDataMessage: 'No plugin traces found. Adjust your trace level to start logging.',
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing plugin traces');

		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			// Get expanded filter criteria (includes quick filters) from behavior
			const filterCriteria = this.filterManagementBehavior.getAppliedFilterCriteria();

			// Map filter criteria to domain filter
			const mapper = new FilterCriteriaMapper();
			const filter = mapper.toDomain(filterCriteria);

			const traces = await this.getPluginTracesUseCase.execute(this.currentEnvironmentId, filter);
			this.traces = traces;

			const viewModels = traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

			this.logger.info('Plugin traces loaded successfully', { count: viewModels.length });

			const config = this.getTableConfig();

			// Data-driven update: Send ViewModels to frontend
			await this.panel.postMessage({
				command: 'updateTableData',
				data: {
					viewModels,
					columns: config.columns,
					noDataMessage: config.noDataMessage,
					isLoading: false
				}
			});
		} catch (error) {
			this.logger.error('Failed to load plugin traces', error);
			await vscode.window.showErrorMessage('Failed to load plugin traces');
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	private async handleOpenMaker(): Promise<void> {
		try {
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			if (environment?.powerPlatformEnvironmentId) {
				const makerUrl = `https://make.powerapps.com/environments/${environment.powerPlatformEnvironmentId}/home`;
				await vscode.env.openExternal(vscode.Uri.parse(makerUrl));
			} else {
				await vscode.window.showWarningMessage('Environment does not have a Power Platform environment ID');
			}
		} catch (error) {
			this.logger.error('Failed to open Maker portal', error);
			await vscode.window.showErrorMessage('Failed to open Maker portal');
		}
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;

		// Reregister panel with new environment in singleton map
		this.reregisterPanel(PluginTraceViewerPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Plugin Traces - ${environment.name}`;
		}

		// Load persisted state for the NEW environment (Option A: Fresh Start)
		// This ensures each environment maintains its own independent filter/settings state
		await this.loadPersistedStateForEnvironment(environmentId);

		await this.loadTraceLevel();
		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	/**
	 * Loads persisted state for a specific environment and updates the UI.
	 * Called during environment switch to restore the target environment's saved state.
	 */
	private async loadPersistedStateForEnvironment(environmentId: string): Promise<void> {
		// Reset behaviors to defaults first
		this.autoRefreshBehavior.setInterval(0);

		// Load filter criteria for the new environment
		await this.filterManagementBehavior.loadFilterCriteria(environmentId);

		// Load auto-refresh interval and panel widths from storage
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: PluginTraceViewerPanelComposed.viewType,
					environmentId
				});

				if (state) {
					// Set auto-refresh interval
					if (state.autoRefreshInterval && typeof state.autoRefreshInterval === 'number' && state.autoRefreshInterval > 0) {
						this.autoRefreshBehavior.setInterval(state.autoRefreshInterval);
					}

					// Set detail panel width
					if (state.detailPanelWidth && typeof state.detailPanelWidth === 'number') {
						this.detailPanelBehavior.setDetailPanelWidth(state.detailPanelWidth);
					}

					this.logger.debug('Loaded persisted state for environment', {
						environmentId,
						autoRefreshInterval: state.autoRefreshInterval,
						detailPanelWidth: state.detailPanelWidth
					});
				}
			} catch (error) {
				this.logger.warn('Failed to load persisted state for environment', { environmentId, error });
			}
		}

		// Update webview with loaded filter state
		const filterCriteria = this.filterManagementBehavior.getFilterCriteria();
		const reconstructedQuickFilterIds = this.filterManagementBehavior.getReconstructedQuickFilterIds();

		await this.panel.postMessage({
			command: 'updateFilterState',
			data: {
				filterCriteria,
				quickFilterIds: reconstructedQuickFilterIds,
				autoRefreshInterval: this.autoRefreshBehavior.getInterval()
			}
		});

		// Build and send OData query preview for loaded filters
		const loadedFilterCriteria = this.filterManagementBehavior.getAppliedFilterCriteria();
		const filterMapper = new FilterCriteriaMapper(this.configService);
		const domainFilter = filterMapper.toDomain(loadedFilterCriteria);
		const odataQuery = domainFilter.buildFilterExpression() || 'No filters applied';
		await this.panel.postMessage({
			command: 'updateODataPreview',
			data: { query: odataQuery }
		});

		// Restart auto-refresh timer if interval was persisted
		this.autoRefreshBehavior.startIfEnabled();
	}


	private async handleSetTraceLevel(levelString: string): Promise<void> {
		try {
			const level = TraceLevel.fromString(levelString);

			if (level.isPerformanceIntensive()) {
				const confirmed = await vscode.window.showWarningMessage(
					'Setting trace level to "All" will log all plugin executions and may impact performance. Continue?',
					{ modal: true },
					'Yes',
					'No'
				);

				if (confirmed !== 'Yes') {
					return;
				}
			}

			this.logger.debug('Setting trace level', { level: level.value });

			await this.setTraceLevelUseCase.execute(this.currentEnvironmentId, level);
			this.currentTraceLevel = level;

			await vscode.window.showInformationMessage(`Trace level set to: ${TraceLevelFormatter.getDisplayName(level)}`);

			// Data-driven update: Send dropdown state change to frontend
			await this.panel.postMessage({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'traceLevelDropdown',
					selectedId: level.value.toString()
				}
			});
		} catch (error) {
			this.logger.error('Failed to set trace level', error);
			await vscode.window.showErrorMessage('Failed to set trace level');
		}
	}


	private async loadTraceLevel(): Promise<void> {
		try {
			this.logger.debug('Loading trace level');

			const level = await this.getTraceLevelUseCase.execute(this.currentEnvironmentId);
			this.currentTraceLevel = level;

			this.logger.debug('Trace level loaded', { level: level.value });

			// Update the dropdown in the webview to show current selection
			await this.panel.postMessage({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'traceLevelDropdown',
					selectedId: level.value.toString()
				}
			});
		} catch (error) {
			this.logger.error('Failed to load trace level', error);
		}
	}

	/**
	 * Coordinator: Load persisted filter criteria and auto-refresh from storage.
	 * Delegates to behaviors for actual loading.
	 */
	private async loadFilterCriteria(): Promise<void> {
		// Load filter criteria via behavior
		await this.filterManagementBehavior.loadFilterCriteria(this.currentEnvironmentId);

		// Load auto-refresh interval and detail panel width from storage
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: PluginTraceViewerPanelComposed.viewType,
					environmentId: this.currentEnvironmentId
				});

				// Load auto-refresh interval
				if (state && typeof state === 'object' && 'autoRefreshInterval' in state) {
					const interval = state.autoRefreshInterval;
					if (typeof interval === 'number' && interval >= 0) {
						this.autoRefreshBehavior.setInterval(interval);
						this.logger.info('Auto-refresh interval loaded from storage', { interval });
					}
				}

				// Load detail panel width
				if (state?.detailPanelWidth && typeof state.detailPanelWidth === 'number') {
					this.detailPanelBehavior.setDetailPanelWidth(state.detailPanelWidth);
					this.logger.info('Detail panel width loaded from storage', { width: state.detailPanelWidth });
				}
			} catch (error) {
				this.logger.error('Failed to load auto-refresh/detail panel state', error);
			}
		}
	}

	/**
	 * Coordinator: Save filter criteria and auto-refresh to storage.
	 * Delegates to behavior for actual saving.
	 */
	private async saveFilterCriteria(): Promise<void> {
		await this.filterManagementBehavior.saveFilterCriteria(
			this.currentEnvironmentId,
			this.autoRefreshBehavior.getInterval()
		);
	}


	/**
	 * Saves filter panel height to persistent storage.
	 *
	 * @param height - Filter panel height in pixels
	 */
	private async saveFilterPanelHeight(height: number): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			// Load existing state to preserve other properties
			const existingState = await this.panelStateRepository.load({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			});

			// Save filter panel height + other preserved state
			await this.panelStateRepository.save(
				{
					panelType: PluginTraceViewerPanelComposed.viewType,
					environmentId: this.currentEnvironmentId
				},
				{
					...existingState,
					filterPanelHeight: height
				}
			);

			this.logger.debug('Filter panel height saved', { height });
		} catch (error) {
			this.logger.error('Failed to save filter panel height', error);
		}
	}

	/**
	 * Saves filter panel collapsed state to persistent storage.
	 *
	 * @param collapsed - Whether filter panel is collapsed
	 */
	private async saveFilterPanelCollapsed(collapsed: boolean): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			// Load existing state to preserve other properties
			const existingState = await this.panelStateRepository.load({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			});

			// Save filter panel collapsed state + other preserved state
			await this.panelStateRepository.save(
				{
					panelType: PluginTraceViewerPanelComposed.viewType,
					environmentId: this.currentEnvironmentId
				},
				{
					...existingState,
					filterPanelCollapsed: collapsed
				}
			);

			this.logger.debug('Filter panel collapsed state saved', { collapsed });
		} catch (error) {
			this.logger.error('Failed to save filter panel collapsed state', error);
		}
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment switches.
	 */
	private showTableLoading(): void {
		void this.panel.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: [],
				columns: this.getTableConfig().columns,
				isLoading: true
			}
		});
	}
}
