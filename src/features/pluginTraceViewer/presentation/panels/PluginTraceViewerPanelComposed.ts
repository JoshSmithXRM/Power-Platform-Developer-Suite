/**
 * Presentation layer panel for Plugin Trace Viewer.
 * Uses new PanelCoordinator architecture with split panel layout.
 *
 * NO business logic - delegates all operations to use cases.
 */

/* eslint-disable max-lines -- Panel coordinator with 11 simple command handlers */

import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
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
	| 'restoreDetailPanelWidth';

/**
 * Plugin Trace Viewer panel using new PanelCoordinator architecture.
 * Features split panel layout with trace list and detail view.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class PluginTraceViewerPanelComposed extends EnvironmentScopedPanel<PluginTraceViewerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';
	private static panels = new Map<string, PluginTraceViewerPanelComposed>();

	// Named constants for time-based operations
	private static readonly DEFAULT_DELETE_OLD_DAYS = 30;
	private static readonly MILLISECONDS_PER_SECOND = 1000;
	private static readonly ONE_HOUR_IN_MS = 60 * 60 * 1000;
	private static readonly TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

	private readonly coordinator: PanelCoordinator<PluginTraceViewerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly detailSection: PluginTraceDetailSection;

	// Behaviors (encapsulate panel operations)
	private readonly exportBehavior: PluginTraceExportBehavior;
	private readonly deleteBehavior: PluginTraceDeleteBehavior;
	private readonly autoRefreshBehavior: PluginTraceAutoRefreshBehavior;
	private readonly detailPanelBehavior: PluginTraceDetailPanelBehavior;
	private readonly filterManagementBehavior: PluginTraceFilterManagementBehavior;

	private currentEnvironmentId: string;
	private traces: readonly PluginTrace[] = [];
	private currentTraceLevel: TraceLevel | null = null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
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
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		logger.debug('PluginTraceViewerPanel: Initialized with new architecture');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;
		this.detailSection = result.detailSection;

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
			async () => this.saveFilterCriteria()
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
		panelStateRepository?: IPanelStateRepository
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

		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: [],
			isLoading: true,
			state: {
				traceLevel: this.currentTraceLevel?.value,
				autoRefreshInterval: this.autoRefreshBehavior.getInterval(),
				filterCriteria: this.filterManagementBehavior.getFilterCriteria(),
				detailPanelWidth: this.detailPanelBehavior.getDetailPanelWidth()
			}
		});

		await this.handleRefresh();

		await this.loadTraceLevel();

		// Send detail panel width to webview if it was persisted
		const detailPanelWidth = this.detailPanelBehavior.getDetailPanelWidth();
		if (detailPanelWidth !== null) {
			await this.panel.webview.postMessage({
				command: 'restoreDetailPanelWidth',
				data: { width: detailPanelWidth }
			});
		}

		const viewModels = this.traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

		await this.scaffoldingBehavior.refresh({
			tableData: viewModels,
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			state: {
				traceLevel: this.currentTraceLevel?.value,
				autoRefreshInterval: this.autoRefreshBehavior.getInterval(),
				filterCriteria: this.filterManagementBehavior.getFilterCriteria()
			}
		});

		// Explicitly update dropdown state to ensure button label shows correct value
		await this.panel.webview.postMessage({
			command: 'updateDropdownState',
			data: {
				dropdownId: 'autoRefreshDropdown',
				selectedId: this.autoRefreshBehavior.getInterval().toString()
			}
		});

		// Send reconstructed quick filter checkbox state to webview
		const reconstructedQuickFilterIds = this.filterManagementBehavior.getReconstructedQuickFilterIds();
		if (reconstructedQuickFilterIds.length > 0) {
			await this.panel.webview.postMessage({
				command: 'updateQuickFilterState',
				data: { quickFilterIds: reconstructedQuickFilterIds }
			});
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
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'PluginTraceViewerBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Plugin Traces',
			customJavaScript: `window.FILTER_CONFIG = ${filterConfigJson};`
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
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
				PluginTraceViewerPanelComposed.DEFAULT_DELETE_OLD_DAYS
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
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: PluginTraceViewerPanelComposed.viewType,
			title: 'Plugin Traces',
			dataCommand: 'tracesData',
			defaultSortColumn: 'createdOn',
			defaultSortDirection: 'desc',
			columns: [
				{ key: 'status', label: 'Status' },
				{ key: 'createdOn', label: 'Started' },
				{ key: 'duration', label: 'Duration' },
				{ key: 'operationType', label: 'Operation' },
				{ key: 'entityName', label: 'Entity' },
				{ key: 'messageName', label: 'Message' },
				{ key: 'pluginName', label: 'Plugin' },
				{ key: 'depth', label: 'Depth' },
				{ key: 'mode', label: 'Mode' }
			],
			searchPlaceholder: '🔍 Search plugin traces...',
			noDataMessage: 'No plugin traces found. Adjust your trace level to start logging.',
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing plugin traces');

		try {
			// Get current filter criteria from behavior
			const filterCriteria = this.filterManagementBehavior.getFilterCriteria();

			// Map filter criteria to domain filter
			const mapper = new FilterCriteriaMapper();
			const filter = mapper.toDomain(filterCriteria);

			const traces = await this.getPluginTracesUseCase.execute(this.currentEnvironmentId, filter);
			this.traces = traces;

			const viewModels = traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

			this.logger.info('Plugin traces loaded successfully', { count: viewModels.length });

			// Data-driven update: Send ViewModels to frontend
			await this.panel.webview.postMessage({
				command: 'updateTableData',
				data: {
					viewModels,
					columns: this.getTableConfig().columns,
					isLoading: false
				}
			});
		} catch (error) {
			this.logger.error('Failed to load plugin traces', error);
			await vscode.window.showErrorMessage('Failed to load plugin traces');
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

		this.setButtonLoading('refresh', true);
		this.clearTable();

		try {
			const oldEnvironmentId = this.currentEnvironmentId;
			this.currentEnvironmentId = environmentId;

			// Reregister panel with new environment in singleton map
			this.reregisterPanel(PluginTraceViewerPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Plugin Traces - ${environment.name}`;
			}

			await this.loadTraceLevel();
			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
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

			this.logger.info('Setting trace level', { level: level.value });

			await this.setTraceLevelUseCase.execute(this.currentEnvironmentId, level);
			this.currentTraceLevel = level;

			await vscode.window.showInformationMessage(`Trace level set to: ${TraceLevelFormatter.getDisplayName(level)}`);

			// Data-driven update: Send dropdown state change to frontend
			await this.panel.webview.postMessage({
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
	 * Clears the table by sending empty data to the webview.
	 * Provides immediate visual feedback during environment switches.
	 */
	private clearTable(): void {
		this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: [],
				columns: this.getTableConfig().columns
			}
		});
	}

	/**
	 * Sets button loading state via webview message.
	 * Disables button and shows spinner during async operations.
	 */
	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}
}
