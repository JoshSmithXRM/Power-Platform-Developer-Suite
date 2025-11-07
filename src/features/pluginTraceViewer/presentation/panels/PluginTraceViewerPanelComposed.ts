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
import type { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { TraceLevelFormatter } from '../utils/TraceLevelFormatter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { ExportFormat } from '../../domain/types/ExportFormat';
import { TraceLevel } from '../../application/types';
import { PluginTraceDetailSection } from '../sections/PluginTraceDetailSection';
import { ExportDropdownSection } from '../sections/ExportDropdownSection';
import { DeleteDropdownSection } from '../sections/DeleteDropdownSection';
import { TraceLevelDropdownSection } from '../sections/TraceLevelDropdownSection';
import { AutoRefreshDropdownSection } from '../sections/AutoRefreshDropdownSection';
import { FilterPanelSection } from '../sections/FilterPanelSection';
import { FilterCriteriaMapper } from '../mappers/FilterCriteriaMapper';
import type { FilterCriteriaViewModel } from '../../application/viewModels/FilterCriteriaViewModel';

/**
 * Commands supported by Plugin Trace Viewer panel.
 */
type PluginTraceViewerCommands =
	| 'refresh'
	| 'openMaker'
	| 'environmentChange'
	| 'viewDetail'
	| 'closeDetail'
	| 'deleteSelected'
	| 'deleteAll'
	| 'deleteOld'
	| 'exportCsv'
	| 'exportJson'
	| 'setTraceLevel'
	| 'setAutoRefresh'
	| 'loadRelatedTraces'
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
	private currentEnvironmentId: string;
	private traces: readonly PluginTrace[] = [];
	private currentTraceLevel: TraceLevel | null = null;
	private autoRefreshInterval: number = 0;
	private autoRefreshTimer: NodeJS.Timeout | null = null;
	private filterCriteria: FilterCriteriaViewModel;

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
		private readonly viewModelMapper: PluginTraceViewModelMapper,
		private readonly logger: ILogger,
		private readonly panelStateRepository: IPanelStateRepository | null,
		environmentId: string
	) {
		this.currentEnvironmentId = environmentId;
		this.filterCriteriaMapper = new FilterCriteriaMapper();
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
			`Plugin Trace Viewer - ${environmentName}`,
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

		// Load persisted filter criteria before initial render
		await this.loadFilterCriteria();

		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: [],
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
				{ id: 'refresh', label: 'Refresh' },
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'deleteSelected', label: 'Delete Selected' }
			]
		}, SectionPosition.Toolbar);

		const tableSection = new DataTableSection(config);
		const detailSection = new PluginTraceDetailSection();

		const compositionBehavior = new SectionCompositionBehavior(
			[
				exportDropdown,
				deleteDropdown,
				traceLevelDropdown,
				autoRefreshDropdown,
				actionButtons,
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
			title: 'Plugin Trace Viewer'
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
					columns: this.getTableConfig().columns
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
				this.panel.title = `Plugin Trace Viewer - ${environment.name}`;
			}

			await this.loadTraceLevel();
			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	private async handleViewDetail(traceId: string): Promise<void> {
		try {
			this.logger.info('HandleViewDetail called', { traceId, tracesCount: this.traces.length });

			const trace = this.traces.find(t => t.id === traceId);
			if (!trace) {
				this.logger.warn('Trace not found', { traceId, availableIds: this.traces.map(t => t.id) });
				await vscode.window.showWarningMessage('Trace not found');
				return;
			}

			this.logger.info('Found trace, mapping to detail view', { traceId });

			const detailViewModel = this.viewModelMapper.toDetailViewModel(trace);

			this.detailSection.setTrace(detailViewModel);

			this.logger.info('Detail section updated, sending data to frontend');

			// Data-driven update: Send detail panel data to frontend
			await this.panel.webview.postMessage({
				command: 'updateDetailPanel',
				data: {
					trace: detailViewModel
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

		this.detailSection.setTrace(null);

		await this.panel.webview.postMessage({
			command: 'hideDetailPanel'
		});
	}

	private async handleDeleteSelected(traceIds: string[]): Promise<void> {
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
			this.logger.debug('Loading related traces', { correlationId });

			// Filter traces by correlation ID
			const relatedTraces = this.traces.filter(t =>
				t.hasCorrelationId() && t.correlationId?.value === correlationId
			);

			const relatedViewModels = relatedTraces.map(t => this.viewModelMapper.toDetailViewModel(t));

			await vscode.window.showInformationMessage(`Found ${relatedViewModels.length} related trace(s)`);
		} catch (error) {
			this.logger.error('Failed to load related traces', error);
			await vscode.window.showErrorMessage('Failed to load related traces');
		}
	}

	private async handleApplyFilters(filterData: Partial<FilterCriteriaViewModel>): Promise<void> {
		try {
			this.logger.debug('Applying filters', { filterData });

			// Merge partial filter data with current filter criteria
			this.filterCriteria = {
				...this.filterCriteria,
				...filterData
			};

			// Persist filter criteria
			await this.saveFilterCriteria();

			// Refresh traces with new filter (uses data-driven update)
			await this.handleRefresh();

			this.logger.info('Filters applied successfully', {
				filterCount: this.filterCriteriaMapper.toDomain(this.filterCriteria).getActiveFilterCount()
			});
		} catch (error) {
			this.logger.error('Failed to apply filters', error);
			await vscode.window.showErrorMessage('Failed to apply filters');
		}
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
	 * Load persisted filter criteria from storage for the current environment.
	 */
	private async loadFilterCriteria(): Promise<void> {
		if (!this.panelStateRepository) {
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

			if (state?.filterCriteria) {
				// Validate that the stored data matches our ViewModel structure
				const stored = state.filterCriteria as FilterCriteriaViewModel;
				if (stored.conditions && Array.isArray(stored.conditions)) {
					this.filterCriteria = stored;
					this.logger.info('Filter criteria loaded from storage', {
						environmentId: this.currentEnvironmentId,
						conditionCount: stored.conditions.length,
						conditions: stored.conditions
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
		} catch (error) {
			this.logger.error('Failed to load filter criteria from storage', error);
			// Don't throw - use default empty filter if loading fails
		}
	}

	/**
	 * Save current filter criteria to storage for the current environment.
	 */
	private async saveFilterCriteria(): Promise<void> {
		if (!this.panelStateRepository) {
			return;
		}

		try {
			this.logger.debug('Saving filter criteria to storage', {
				environmentId: this.currentEnvironmentId,
				conditionCount: this.filterCriteria.conditions.length
			});

			// Load existing state to preserve other properties (like selectedSolutionId)
			const existingState = await this.panelStateRepository.load({
				panelType: PluginTraceViewerPanelComposed.viewType,
				environmentId: this.currentEnvironmentId
			});

			const newState = {
				selectedSolutionId: existingState?.selectedSolutionId || 'default',
				lastUpdated: new Date().toISOString(),
				filterCriteria: this.filterCriteria
			};

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
				await vscode.window.showInformationMessage(
					`Auto-refresh enabled: every ${interval} seconds`
				);
			} else {
				this.logger.info('Auto-refresh disabled');
				await vscode.window.showInformationMessage('Auto-refresh disabled');
			}

			// Data-driven update: Send dropdown state change to frontend
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
