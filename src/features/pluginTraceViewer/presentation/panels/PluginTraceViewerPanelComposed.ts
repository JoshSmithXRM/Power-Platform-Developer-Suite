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
import { TimelineViewModelMapper } from '../mappers/TimelineViewModelMapper';
import { PluginTraceSerializer } from '../serializers/PluginTraceSerializer';
import { TraceLevelFormatter } from '../utils/TraceLevelFormatter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { TimelineNode } from '../../domain/valueObjects/TimelineNode';
import type { ExportFormat } from '../../domain/types/ExportFormat';
import { TraceLevel } from '../../application/types';
import { PluginTraceDetailSection } from '../sections/PluginTraceDetailSection';
import { ExportDropdownSection } from '../sections/ExportDropdownSection';
import { DeleteDropdownSection } from '../sections/DeleteDropdownSection';
import { TraceLevelDropdownSection } from '../sections/TraceLevelDropdownSection';
import { AutoRefreshDropdownSection } from '../sections/AutoRefreshDropdownSection';
import { FilterPanelSection } from '../sections/FilterPanelSection';
import { FilterCriteriaMapper } from '../mappers/FilterCriteriaMapper';
import type { FilterCriteriaViewModel, FilterConditionViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { DateTimeFilter } from '../../application/types';
import { QUICK_FILTER_DEFINITIONS } from '../constants/QuickFilterDefinitions';

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
	| 'loadRelatedTraces'
	| 'loadTimeline'
	| 'applyFilters'
	| 'clearFilters';

/**
 * Plugin Trace Viewer panel using new PanelCoordinator architecture.
 * Features split panel layout with trace list and detail view.
 */
export class PluginTraceViewerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';
	private static panels = new Map<string, PluginTraceViewerPanelComposed>();

	private readonly coordinator: PanelCoordinator<PluginTraceViewerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly detailSection: PluginTraceDetailSection;
	private readonly filterCriteriaMapper: FilterCriteriaMapper;
	private readonly timelineViewModelMapper: TimelineViewModelMapper;
	private readonly traceSerializer: PluginTraceSerializer;
	private currentEnvironmentId: string;
	private traces: readonly PluginTrace[] = [];
	private relatedTracesCache: readonly PluginTrace[] = [];
	private currentTraceLevel: TraceLevel | null = null;
	private autoRefreshInterval: number = 0;
	private autoRefreshTimer: NodeJS.Timeout | null = null;
	private filterCriteria: FilterCriteriaViewModel;
	private reconstructedQuickFilterIds: string[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
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
		this.currentEnvironmentId = environmentId;
		this.filterCriteriaMapper = new FilterCriteriaMapper();
		this.timelineViewModelMapper = new TimelineViewModelMapper();
		this.traceSerializer = new PluginTraceSerializer();
		this.filterCriteria = FilterCriteriaMapper.empty();
		logger.debug('PluginTraceViewerPanel: Initialized with new architecture');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;
		this.detailSection = result.detailSection;

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
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
		const column = vscode.ViewColumn.One;

		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		const existingPanel = PluginTraceViewerPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			PluginTraceViewerPanelComposed.viewType,
			`Plugin Traces - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new PluginTraceViewerPanelComposed(
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
			targetEnvironmentId
		);

		PluginTraceViewerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		const envId = targetEnvironmentId;
		panel.onDidDispose(() => {
			PluginTraceViewerPanelComposed.panels.delete(envId);
			if (newPanel.autoRefreshTimer) {
				clearInterval(newPanel.autoRefreshTimer);
				newPanel.autoRefreshTimer = null;
			}
		});

		return newPanel;
	}

	private async initializeAndLoadData(): Promise<void> {
		const environments = await this.getEnvironments();

		// Load persisted filter criteria and auto-refresh interval before initial render
		await this.loadFilterCriteria();

		this.logger.debug('Initializing with auto-refresh interval', { interval: this.autoRefreshInterval });

		// Start auto-refresh timer if interval was persisted
		if (this.autoRefreshInterval > 0) {
			this.autoRefreshTimer = setInterval(() => {
				void this.handleRefresh();
			}, this.autoRefreshInterval * 1000);
			this.logger.info('Auto-refresh restored from storage', { interval: this.autoRefreshInterval });
		}

		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: [],
			isLoading: true,
			state: {
				traceLevel: this.currentTraceLevel?.value,
				autoRefreshInterval: this.autoRefreshInterval,
				filterCriteria: this.filterCriteria
			}
		});

		await this.handleRefresh();

		await this.loadTraceLevel();

		const viewModels = this.traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

		await this.scaffoldingBehavior.refresh({
			tableData: viewModels,
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			state: {
				traceLevel: this.currentTraceLevel?.value,
				autoRefreshInterval: this.autoRefreshInterval,
				filterCriteria: this.filterCriteria
			}
		});

		// Explicitly update dropdown state to ensure button label shows correct value
		await this.panel.webview.postMessage({
			command: 'updateDropdownState',
			data: {
				dropdownId: 'autoRefreshDropdown',
				selectedId: this.autoRefreshInterval.toString()
			}
		});

		// Send reconstructed quick filter checkbox state to webview
		if (this.reconstructedQuickFilterIds.length > 0) {
			await this.panel.webview.postMessage({
				command: 'updateQuickFilterState',
				data: { quickFilterIds: this.reconstructedQuickFilterIds }
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
			title: 'Plugin Traces'
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
				await this.handleViewDetail(traceId);
			} else {
				this.logger.warn('ViewDetail called but no traceId in data', { data });
			}
		});

		this.coordinator.registerHandler('viewTrace', async (data) => {
			this.logger.info('ViewTrace command received', { data });
			const traceId = (data as { traceId?: string })?.traceId;
			if (traceId) {
				await this.handleViewDetail(traceId);
			} else {
				this.logger.warn('ViewTrace called but no traceId in data', { data });
			}
		});

		this.coordinator.registerHandler('closeDetail', async () => {
			await this.handleCloseDetail();
		});

		this.coordinator.registerHandler('deleteSelected', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds;
			if (traceIds) {
				await this.handleDeleteSelected(traceIds);
			}
		});

		this.coordinator.registerHandler('deleteAll', async () => {
			await this.handleDeleteAll();
		});

		this.coordinator.registerHandler('deleteOld', async () => {
			await this.handleDeleteOld(30);
		});

		this.coordinator.registerHandler('exportCsv', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds || this.traces.map(t => t.id);
			await this.handleExport(traceIds, 'csv');
		});

		this.coordinator.registerHandler('exportJson', async (data) => {
			const traceIds = (data as { traceIds?: string[] })?.traceIds || this.traces.map(t => t.id);
			await this.handleExport(traceIds, 'json');
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
				await this.handleSetAutoRefresh(interval);
			}
		});

		this.coordinator.registerHandler('loadRelatedTraces', async (data) => {
			const correlationId = (data as { correlationId?: string })?.correlationId;
			if (correlationId) {
				await this.handleLoadRelatedTraces(correlationId);
			}
		});

		this.coordinator.registerHandler('loadTimeline', async (data) => {
			const correlationId = (data as { correlationId?: string })?.correlationId ?? null;
			await this.handleLoadTimeline(correlationId);
		});

		this.coordinator.registerHandler('applyFilters', async (data) => {
			const filterData = data as Partial<FilterCriteriaViewModel>;
			await this.handleApplyFilters(filterData);
		});

		this.coordinator.registerHandler('clearFilters', async () => {
			await this.handleClearFilters();
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
			// Build filter from current filter criteria
			const filter = this.filterCriteriaMapper.toDomain(this.filterCriteria);

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
			this.currentEnvironmentId = environmentId;

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

	private async handleViewDetail(traceId: string): Promise<void> {
		try {
			this.logger.info('HandleViewDetail called - fetching full trace from Dataverse', { traceId });

			// Fetch the complete trace record from Dataverse to get all fields
			const trace = await this.getPluginTracesUseCase.getTraceById(
				this.currentEnvironmentId,
				traceId
			);

			if (!trace) {
				this.logger.warn('Trace not found in Dataverse', { traceId });
				await vscode.window.showWarningMessage('Trace not found');
				return;
			}

			this.logger.info('Fetched full trace from Dataverse', {
				traceId,
				hasCorrelationId: !!trace.correlationId
			});

			// If trace has correlationId, fetch all related traces from Dataverse
			if (trace.correlationId) {
				this.logger.info('Fetching related traces by correlationId', {
					correlationId: trace.correlationId.value
				});

				this.relatedTracesCache = await this.getPluginTracesUseCase.getTracesByCorrelationId(
					this.currentEnvironmentId,
					trace.correlationId,
					1000
				);

				this.logger.info('Fetched related traces from Dataverse', {
					count: this.relatedTracesCache.length,
					correlationId: trace.correlationId.value
				});
			} else {
				// No correlation ID - clear cache
				this.relatedTracesCache = [];
				this.logger.info('No correlationId - cleared related traces cache');
			}

			const detailViewModel = this.viewModelMapper.toDetailViewModel(trace);

			this.logger.info('Detail view model created, sending data to frontend');

			// Data-driven update: Send detail panel data to frontend
			// Include both the ViewModel (for display) and raw entity (for Raw Data tab)
			await this.panel.webview.postMessage({
				command: 'updateDetailPanel',
				data: {
					trace: detailViewModel,
					rawEntity: this.traceSerializer.serializeToRaw(trace)
				}
			});

			this.logger.info('Detail data sent, showing detail panel');

			await this.panel.webview.postMessage({
				command: 'showDetailPanel'
			});

			// Highlight the selected row (no refresh needed, so selection persists)
			await this.panel.webview.postMessage({
				command: 'selectRow',
				traceId: traceId
			});

			this.logger.info('ShowDetailPanel and selectRow messages sent to webview');
		} catch (error) {
			this.logger.error('Failed to view trace detail', error);
			await vscode.window.showErrorMessage('Failed to load trace detail');
		}
	}

	private async handleCloseDetail(): Promise<void> {
		this.logger.debug('Closing trace detail');

		await this.panel.webview.postMessage({
			command: 'hideDetailPanel'
		});
	}

	private async handleDeleteSelected(traceIds: string[]): Promise<void> {
		if (traceIds.length === 0) {
			await vscode.window.showWarningMessage('No traces selected for deletion');
			return;
		}

		const confirmed = await vscode.window.showWarningMessage(
			`Delete ${traceIds.length} selected trace(s)? This cannot be undone.`,
			{ modal: true },
			'Delete',
			'Cancel'
		);

		if (confirmed !== 'Delete') {
			return;
		}

		try {
			this.logger.info('Deleting selected traces', { count: traceIds.length });

			const deletedCount = await this.deleteTracesUseCase.deleteMultiple(this.currentEnvironmentId, traceIds);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);
			await this.handleRefresh();
		} catch (error) {
			this.logger.error('Failed to delete traces', error);
			await vscode.window.showErrorMessage('Failed to delete traces');
		}
	}

	private async handleDeleteAll(): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			'Delete ALL plugin traces? This cannot be undone.',
			{ modal: true },
			'Delete All',
			'Cancel'
		);

		if (confirmed !== 'Delete All') {
			return;
		}

		try {
			this.logger.info('Deleting all traces');

			const deletedCount = await this.deleteTracesUseCase.deleteAll(this.currentEnvironmentId);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);
			await this.handleRefresh();
		} catch (error) {
			this.logger.error('Failed to delete all traces', error);
			await vscode.window.showErrorMessage('Failed to delete all traces');
		}
	}

	private async handleDeleteOld(olderThanDays: number): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			`Delete all traces older than ${olderThanDays} days? This cannot be undone.`,
			{ modal: true },
			'Delete',
			'Cancel'
		);

		if (confirmed !== 'Delete') {
			return;
		}

		try {
			this.logger.info('Deleting old traces', { olderThanDays });

			const deletedCount = await this.deleteTracesUseCase.deleteOldTraces(this.currentEnvironmentId, olderThanDays);

			if (deletedCount === 0) {
				await vscode.window.showInformationMessage(`No traces found older than ${olderThanDays} days`);
			} else {
				await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s) older than ${olderThanDays} days`);
			}

			await this.handleRefresh();
		} catch (error) {
			this.logger.error('Failed to delete old traces', error);
			await vscode.window.showErrorMessage('Failed to delete old traces');
		}
	}

	private async handleExport(traceIds: string[], format: ExportFormat): Promise<void> {
		try {
			this.logger.info('Exporting traces', { count: traceIds.length, format });

			const tracesToExport = this.traces.filter(t => traceIds.includes(t.id));

			if (tracesToExport.length === 0) {
				await vscode.window.showWarningMessage('No traces selected for export');
				return;
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `plugin-traces-${timestamp}.${format}`;

			if (format === 'csv') {
				await this.exportTracesUseCase.exportToCsv(tracesToExport, filename);
			} else if (format === 'json') {
				await this.exportTracesUseCase.exportToJson(tracesToExport, filename);
			}

			await vscode.window.showInformationMessage(`Exported ${tracesToExport.length} trace(s) as ${format.toUpperCase()}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// User cancellation is not an error - just log and return
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('Export cancelled by user');
				return;
			}

			// Actual errors should be logged and shown
			this.logger.error('Failed to export traces', error);
			await vscode.window.showErrorMessage('Failed to export traces');
		}
	}

	private async handleSetTraceLevel(levelString: string): Promise<void> {
		try {
			const level = TraceLevel.fromString(levelString);

			if (level.isPerformanceIntensive()) {
				const confirmed = await vscode.window.showWarningMessage(
					'Setting trace level to "All" will log all plugin executions and may impact performance. Continue?',
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

	private async handleLoadRelatedTraces(correlationId: string): Promise<void> {
		try {
			this.logger.debug('Loading related traces from cache', {
				correlationId,
				cacheSize: this.relatedTracesCache.length
			});

			// Use the pre-fetched related traces from cache
			const relatedViewModels = this.relatedTracesCache.map(t =>
				this.viewModelMapper.toDetailViewModel(t)
			);

			this.logger.info('Related traces loaded', { count: relatedViewModels.length });

			await vscode.window.showInformationMessage(`Found ${relatedViewModels.length} related trace(s)`);
		} catch (error) {
			this.logger.error('Failed to load related traces', error);
			await vscode.window.showErrorMessage('Failed to load related traces');
		}
	}

	private async handleLoadTimeline(correlationId: string | null): Promise<void> {
		try {
			this.logger.debug('Loading timeline from related traces cache', {
				correlationId,
				cacheSize: this.relatedTracesCache.length
			});

			// Build timeline hierarchy from pre-fetched related traces
			const timelineNodes = this.buildTimelineUseCase.execute(this.relatedTracesCache, correlationId);

			// Calculate total duration for the timeline
			const totalDurationMs = this.calculateTotalDuration(timelineNodes);

			// Map to view model
			const timelineViewModel = this.timelineViewModelMapper.toViewModel(
				timelineNodes,
				correlationId,
				totalDurationMs
			);

			// Send timeline data to webview
			await this.panel.webview.postMessage({
				command: 'updateTimeline',
				data: timelineViewModel
			});

			this.logger.info('Timeline loaded successfully', {
				correlationId,
				traceCount: timelineViewModel.traceCount
			});
		} catch (error) {
			this.logger.error('Failed to load timeline', error);
			await vscode.window.showErrorMessage('Failed to load timeline');
		}
	}

	private calculateTotalDuration(timelineNodes: readonly TimelineNode[]): number {
		if (timelineNodes.length === 0) {
			return 0;
		}

		// Get all traces from the tree (including children)
		const allTraces: PluginTrace[] = [];
		const collectTraces = (nodes: readonly TimelineNode[]): void => {
			for (const node of nodes) {
				allTraces.push(node.trace);
				collectTraces(node.children);
			}
		};
		collectTraces(timelineNodes);

		// Find earliest and latest timestamps
		const timestamps = allTraces.map(t => t.createdOn.getTime());
		const earliest = Math.min(...timestamps);
		const latest = Math.max(...timestamps);

		return latest - earliest;
	}

	private async handleApplyFilters(filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] }): Promise<void> {
		try {
			this.logger.debug('Applying filters', { filterData });

			// Expand quick filter IDs to conditions
			const expandedFilterData = this.expandQuickFilters(filterData);

			// Convert local datetime values to UTC ISO before storing/processing
			const normalizedFilterData = this.normalizeFilterDateTimes(expandedFilterData);

			// Merge partial filter data with current filter criteria
			this.filterCriteria = {
				...this.filterCriteria,
				...normalizedFilterData
			};

			// Persist filter criteria
			await this.saveFilterCriteria();

			// Build OData query preview from current filter criteria
			const domainFilter = this.filterCriteriaMapper.toDomain(this.filterCriteria);
			const odataQuery = domainFilter.toODataFilter() || 'No filters applied';

			// Send OData query preview to webview
			await this.panel.webview.postMessage({
				command: 'updateODataPreview',
				data: { query: odataQuery }
			});

			// Refresh traces with new filter (uses data-driven update)
			await this.handleRefresh();

			this.logger.info('Filters applied successfully', {
				filterCount: domainFilter.getActiveFilterCount()
			});
		} catch (error) {
			this.logger.error('Failed to apply filters', error);
			await vscode.window.showErrorMessage('Failed to apply filters');
		}
	}

	/**
	 * Detects if a condition matches a quick filter definition (reverse mapping).
	 * Returns the quick filter ID if match found, null otherwise.
	 *
	 * Matching logic:
	 * - Static filters (exceptions, success, asyncOnly, syncOnly, recursive): match field + operator + value
	 * - Date filters (lastHour, last24Hours, today): match field + operator only (value is dynamic)
	 */
	private detectQuickFilterFromCondition(condition: FilterConditionViewModel): string | null {
		// All quick filters have exactly one condition, so we compare against the first condition
		for (const quickFilter of QUICK_FILTER_DEFINITIONS) {
			const qfCondition = quickFilter.conditions[0];
			if (!qfCondition) {
				continue;
			}

			// Field and operator must always match
			if (condition.field !== qfCondition.field || condition.operator !== qfCondition.operator) {
				continue;
			}

			// For date filters (Created On field), match on field + operator only (value is dynamic)
			if (condition.field === 'Created On') {
				return quickFilter.id;
			}

			// For static filters, value must also match
			if (condition.value === qfCondition.value) {
				return quickFilter.id;
			}
		}

		return null;
	}

	/**
	 * Expands quick filter IDs to their corresponding filter conditions.
	 * Merges quick filter conditions with advanced filter conditions.
	 */
	private expandQuickFilters(filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] }): Partial<FilterCriteriaViewModel> {
		const { quickFilterIds, conditions = [], ...rest } = filterData;

		if (!quickFilterIds || quickFilterIds.length === 0) {
			return { ...rest, conditions };
		}

		// Expand quick filter IDs to conditions
		const quickFilterConditions: FilterConditionViewModel[] = [];

		for (const filterId of quickFilterIds) {
			const quickFilter = QUICK_FILTER_DEFINITIONS.find(qf => qf.id === filterId);
			if (!quickFilter) {
				continue;
			}

			// Clone conditions and set dynamic values for date filters
			const expandedConditions = quickFilter.conditions.map(condition => {
				const cloned = { ...condition };

				// Set dynamic datetime values for relative date filters
				if (condition.field === 'Created On') {
					const now = new Date();
					if (filterId === 'lastHour') {
						const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
						cloned.value = this.formatDateTimeLocal(oneHourAgo);
					} else if (filterId === 'last24Hours') {
						const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
						cloned.value = this.formatDateTimeLocal(twentyFourHoursAgo);
					} else if (filterId === 'today') {
						const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
						cloned.value = this.formatDateTimeLocal(startOfToday);
					}
				}

				return cloned;
			});

			quickFilterConditions.push(...expandedConditions);
		}

		// Merge quick filter conditions with advanced conditions
		const mergedConditions = [...quickFilterConditions, ...conditions];

		return {
			...rest,
			conditions: mergedConditions
		};
	}

	/**
	 * Formats a Date object for datetime-local input.
	 */
	private formatDateTimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	/**
	 * Converts local datetime values from webview to UTC ISO format.
	 * This is the presentation layer's responsibility - converting from UI format to domain format.
	 */
	private normalizeFilterDateTimes(filterData: Partial<FilterCriteriaViewModel>): Partial<FilterCriteriaViewModel> {
		if (!filterData.conditions) {
			return filterData;
		}

		const normalizedConditions = filterData.conditions.map(condition => {
			// Only convert datetime values for date fields
			if (condition.field === 'Created On' && condition.value) {
				try {
					// Check if value is already in UTC ISO format
					if (condition.value.includes('Z') || condition.value.includes('+')) {
						return condition; // Already normalized
					}

					// Convert local datetime to UTC ISO
					const dateFilter = DateTimeFilter.fromLocalDateTime(condition.value);
					return {
						...condition,
						value: dateFilter.getUtcIso()
					};
				} catch (error) {
					this.logger.warn('Failed to convert datetime filter', { condition, error });
					return condition; // Keep original if conversion fails
				}
			}

			return condition;
		});

		return {
			...filterData,
			conditions: normalizedConditions
		};
	}

	private async handleClearFilters(): Promise<void> {
		try {
			this.logger.debug('Clearing filters');

			// Reset to empty filter criteria
			this.filterCriteria = FilterCriteriaMapper.empty();

			// Persist empty filter criteria
			await this.saveFilterCriteria();

			// Update filter panel UI to remove all conditions
			this.panel.webview.postMessage({
				command: 'clearFilterPanel'
			});

			// Clear OData preview
			await this.panel.webview.postMessage({
				command: 'updateODataPreview',
				data: { query: 'No filters applied' }
			});

			// Refresh traces with cleared filter (uses data-driven update)
			await this.handleRefresh();

			this.logger.info('Filters cleared successfully');
		} catch (error) {
			this.logger.error('Failed to clear filters', error);
			await vscode.window.showErrorMessage('Failed to clear filters');
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
	 * Load persisted filter criteria and auto-refresh from storage for the current environment.
	 */
	private async loadFilterCriteria(): Promise<void> {
		if (!this.panelStateRepository) {
			this.logger.warn('No panelStateRepository available');
			return;
		}

		try {
			this.logger.debug('Loading filter criteria from storage', {
				environmentId: this.currentEnvironmentId
			});

			const state = await this.panelStateRepository.load({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			});

			this.logger.debug('Loaded state from storage', {
				hasState: !!state,
				stateKeys: state ? Object.keys(state) : []
			});

			if (state?.filterCriteria) {
				// Validate that the stored data matches our ViewModel structure
				const stored = state.filterCriteria as FilterCriteriaViewModel;
				if (stored.conditions && Array.isArray(stored.conditions)) {
					// Smart reconstruction: Detect which conditions match quick filters
					const reconstructedQuickFilterIds: string[] = [];
					const advancedFilterConditions: FilterConditionViewModel[] = [];

					// Type-safe iteration over conditions
					const conditions = stored.conditions as FilterConditionViewModel[];
					for (const condition of conditions) {
						const matchedQuickFilterId = this.detectQuickFilterFromCondition(condition);
						if (matchedQuickFilterId) {
							// This condition matches a quick filter - add to reconstructed IDs
							reconstructedQuickFilterIds.push(matchedQuickFilterId);
						} else {
							// This is a custom/modified condition - keep as advanced filter
							advancedFilterConditions.push(condition);
						}
					}

					// Store reconstructed state
					this.reconstructedQuickFilterIds = reconstructedQuickFilterIds;
					this.filterCriteria = {
						...stored,
						conditions: advancedFilterConditions
					};

					this.logger.info('Filter criteria loaded and reconstructed', {
						environmentId: this.currentEnvironmentId,
						totalConditions: conditions.length,
						quickFilters: reconstructedQuickFilterIds,
						advancedFilters: advancedFilterConditions.length
					});
				} else {
					this.logger.warn('Invalid filter criteria in storage', { stored });
				}
			} else {
				this.logger.info('No filter criteria found in storage', {
					environmentId: this.currentEnvironmentId,
					hasState: !!state
				});
			}

			// Load auto-refresh interval if persisted
			if (state && typeof state === 'object' && 'autoRefreshInterval' in state) {
				const interval = state.autoRefreshInterval as number;
				this.logger.debug('Found autoRefreshInterval in state', { interval, type: typeof interval });
				if (typeof interval === 'number' && interval >= 0) {
					this.autoRefreshInterval = interval;
					this.logger.info('Auto-refresh interval loaded from storage', { interval });
				} else {
					this.logger.warn('Invalid autoRefreshInterval in state', { interval, type: typeof interval });
				}
			} else {
				this.logger.debug('No autoRefreshInterval in state', {
					hasState: !!state,
					hasKey: state && 'autoRefreshInterval' in state
				});
			}
		} catch (error) {
			this.logger.error('Failed to load filter criteria from storage', error);
			// Don't throw - use default empty filter if loading fails
		}
	}

	/**
	 * Save current filter criteria and auto-refresh to storage for the current environment.
	 */
	private async saveFilterCriteria(): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			this.logger.debug('Saving filter criteria to storage', {
				environmentId: this.currentEnvironmentId,
				conditionCount: this.filterCriteria.conditions.length,
				autoRefreshInterval: this.autoRefreshInterval
			});

			// Load existing state to preserve other properties (like selectedSolutionId)
			const existingState = await this.panelStateRepository.load({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			});

			const newState = {
				selectedSolutionId: existingState?.selectedSolutionId || 'default',
				lastUpdated: new Date().toISOString(),
				filterCriteria: this.filterCriteria,
				autoRefreshInterval: this.autoRefreshInterval
			};

			this.logger.debug('Saving state', {
				stateKeys: Object.keys(newState),
				autoRefreshInterval: newState.autoRefreshInterval
			});

			await this.panelStateRepository.save({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			}, newState);

			this.logger.debug('Filter criteria saved to storage');
		} catch (error) {
			this.logger.error('Failed to save filter criteria to storage', error);
			// Don't throw - persistence failure shouldn't block filter application
		}
	}

	private async handleSetAutoRefresh(interval: number): Promise<void> {
		try {
			this.logger.info('Setting auto-refresh interval', { interval });

			this.autoRefreshInterval = interval;

			// Clear existing timer
			if (this.autoRefreshTimer) {
				clearInterval(this.autoRefreshTimer);
				this.autoRefreshTimer = null;
			}

			// Start new timer if interval > 0
			if (interval > 0) {
				this.autoRefreshTimer = setInterval(() => {
					void this.handleRefresh();
				}, interval * 1000);

				this.logger.info('Auto-refresh enabled', { interval });
			} else {
				this.logger.info('Auto-refresh disabled');
			}

			// Persist auto-refresh interval
			await this.saveFilterCriteria();

			// Data-driven update: Send dropdown state change to frontend (button label updates to show current state)
			await this.panel.webview.postMessage({
				command: 'updateDropdownState',
				data: {
					dropdownId: 'autoRefreshDropdown',
					selectedId: interval.toString()
				}
			});
		} catch (error) {
			this.logger.error('Failed to set auto-refresh', error);
			await vscode.window.showErrorMessage('Failed to set auto-refresh');
		}
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
