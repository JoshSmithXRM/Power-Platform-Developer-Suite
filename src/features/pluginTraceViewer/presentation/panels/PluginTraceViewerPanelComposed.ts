/**
 * Presentation layer panel for Plugin Trace Viewer.
 * Uses composition pattern with DataTablePanelCoordinator.
 *
 * NO business logic - delegates all operations to use cases.
 * Maps domain entities → ViewModels using injected mapper.
 *
 * Implements comprehensive security measures (OData injection prevention, XSS protection, payload validation).
 */

import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import type { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import type { EnvironmentOption, DataTableConfig } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { PanelTrackingBehavior } from '../../../../shared/infrastructure/ui/behaviors/PanelTrackingBehavior';
import { HtmlRenderingBehavior, type HtmlCustomization } from '../../../../shared/infrastructure/ui/behaviors/HtmlRenderingBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { SolutionFilterBehavior } from '../../../../shared/infrastructure/ui/behaviors/SolutionFilterBehavior';
import { MessageRoutingBehavior } from '../../../../shared/infrastructure/ui/behaviors/MessageRoutingBehavior';
import { DataTableBehaviorRegistry } from '../../../../shared/infrastructure/ui/behaviors/DataTableBehaviorRegistry';
import { DataTablePanelCoordinator, type CoordinatorDependencies } from '../../../../shared/infrastructure/ui/coordinators/DataTablePanelCoordinator';
import { GetPluginTracesUseCase } from '../../application/useCases/GetPluginTracesUseCase';
import { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';
import { ExportTracesUseCase } from '../../application/useCases/ExportTracesUseCase';
import { GetTraceLevelUseCase } from '../../application/useCases/GetTraceLevelUseCase';
import { SetTraceLevelUseCase } from '../../application/useCases/SetTraceLevelUseCase';
import { PluginTraceViewModelMapper } from '../mappers/PluginTraceViewModelMapper';
import { PluginTracesDataLoader } from '../dataLoaders/PluginTracesDataLoader';
import { TraceLevelFormatter } from '../utils/TraceLevelFormatter';
import type { PluginTrace } from '../../domain/entities/PluginTrace';
import type { ExportFormat } from '../../domain/types/ExportFormat';
import { TraceLevel, TraceFilter } from '../../application/types';

/**
 * Type guards for webview messages
 */
interface WebviewMessage {
	command: string;
	data?: unknown;
}

interface ViewDetailMessage extends WebviewMessage {
	command: 'viewDetail';
	data: { traceId: string };
}

interface DeleteSelectedMessage extends WebviewMessage {
	command: 'deleteSelected';
	data: { traceIds: readonly string[] };
}

interface DeleteOldMessage extends WebviewMessage {
	command: 'deleteOld';
	data: { olderThanDays: number };
}

interface ExportMessage extends WebviewMessage {
	command: 'export';
	data: { traceIds: readonly string[]; format: ExportFormat };
}

interface SetTraceLevelMessage extends WebviewMessage {
	command: 'setTraceLevel';
	data: { level: string };
}

function isViewDetailMessage(message: WebviewMessage): message is ViewDetailMessage {
	return message.command === 'viewDetail' &&
		typeof message.data === 'object' &&
		message.data !== null &&
		'traceId' in message.data &&
		typeof (message.data as {traceId: unknown}).traceId === 'string';
}

function isDeleteSelectedMessage(message: WebviewMessage): message is DeleteSelectedMessage {
	return message.command === 'deleteSelected' &&
		typeof message.data === 'object' &&
		message.data !== null &&
		'traceIds' in message.data &&
		Array.isArray((message.data as {traceIds: unknown}).traceIds);
}

function isDeleteOldMessage(message: WebviewMessage): message is DeleteOldMessage {
	return message.command === 'deleteOld' &&
		typeof message.data === 'object' &&
		message.data !== null &&
		'olderThanDays' in message.data &&
		typeof (message.data as {olderThanDays: unknown}).olderThanDays === 'number';
}

function isExportMessage(message: WebviewMessage): message is ExportMessage {
	return message.command === 'export' &&
		typeof message.data === 'object' &&
		message.data !== null &&
		'traceIds' in message.data &&
		'format' in message.data &&
		Array.isArray((message.data as {traceIds: unknown}).traceIds);
}

function isSetTraceLevelMessage(message: WebviewMessage): message is SetTraceLevelMessage {
	return message.command === 'setTraceLevel' &&
		typeof message.data === 'object' &&
		message.data !== null &&
		'level' in message.data &&
		typeof (message.data as {level: unknown}).level === 'string';
}

/**
 * Presentation layer panel for Plugin Trace Viewer.
 * Uses composition pattern with specialized behaviors instead of inheritance.
 */
export class PluginTraceViewerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.pluginTraceViewer';
	private static panels = new Map<string, PluginTraceViewerPanelComposed>();

	private readonly coordinator: DataTablePanelCoordinator;
	private readonly registry: DataTableBehaviorRegistry;
	private traces: readonly PluginTrace[] = [];
	private currentTraceLevel: TraceLevel | null = null;

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
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		logger.debug('PluginTraceViewerPanel: Initialized');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		this.registry = this.createBehaviorRegistry(environmentId);
		this.coordinator = this.createCoordinator();
		this.registerPanelCommands();

		void this.coordinator.initialize();
		void this.loadTraceLevel();
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

		// Get target environment
		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Reuse existing panel if open for this environment
		const existingPanel = PluginTraceViewerPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		// Create new panel
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
			targetEnvironmentId,
			panelStateRepository
		);

		PluginTraceViewerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
		const config = this.getConfig();
		const customization = this.getCustomization();

		const panelTrackingBehavior = new PanelTrackingBehavior(
			PluginTraceViewerPanelComposed.panels
		);

		const htmlRenderingBehavior = new HtmlRenderingBehavior(
			this.panel.webview,
			this.extensionUri,
			config,
			customization
		);

		const messageRoutingBehavior = new MessageRoutingBehavior(
			this.panel.webview,
			this.logger
		);

		const environmentBehavior = new EnvironmentBehavior(
			this.panel.webview,
			this.getEnvironments,
			this.getEnvironmentById,
			async () => {
				// Coordinator handles reload, but also reload trace level
				await this.loadTraceLevel();
			},
			this.logger,
			environmentId
		);

		// Solution filter disabled (not needed for traces)
		const solutionFilterBehavior = new SolutionFilterBehavior(
			this.panel.webview,
			'pluginTraceViewer',
			environmentBehavior,
			async () => [],
			this.panelStateRepository,
			async () => { /* Coordinator handles reload */ },
			this.logger,
			false  // Disabled
		);

		// Custom data loader - wraps to capture traces
		const baseDataLoader = new PluginTracesDataLoader(
			() => environmentBehavior.getCurrentEnvironmentId(),
			this.getPluginTracesUseCase,
			this.viewModelMapper,
			this.logger
		);

		// Wrap data loader to capture traces
		const wrappedDataLoader: IDataLoader = {
			load: async (cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> => {
				// Load traces via use case (capture domain entities)
				const envId = environmentBehavior.getCurrentEnvironmentId();
				if (!envId) {
					this.traces = [];
					return [];
				}

				const filter = TraceFilter.create({
					top: 100,
					orderBy: 'createdon desc',
					odataFilter: ''
				});
				const traces = await this.getPluginTracesUseCase.execute(envId, filter);
				this.traces = traces;

				// Use base data loader for transformation
				return baseDataLoader.load(cancellationToken);
			}
		};

		const dataBehavior = new DataBehavior(
			this.panel.webview,
			config,
			wrappedDataLoader,
			this.logger
		);

		return new DataTableBehaviorRegistry(
			environmentBehavior,
			solutionFilterBehavior,
			dataBehavior,
			messageRoutingBehavior,
			htmlRenderingBehavior,
			panelTrackingBehavior
		);
	}

	private createCoordinator(): DataTablePanelCoordinator {
		const dependencies: CoordinatorDependencies = {
			panel: this.panel,
			getEnvironmentById: this.getEnvironmentById,
			logger: this.logger
		};

		return new DataTablePanelCoordinator(this.registry, dependencies);
	}

	private registerPanelCommands(): void {
		// Open in Maker
		this.registry.messageRoutingBehavior.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		// View trace detail
		this.registry.messageRoutingBehavior.registerHandler('viewDetail', async (message) => {
			if (isViewDetailMessage(message)) {
				await this.handleViewDetail(message.data.traceId);
			}
		});

		// Delete selected traces
		this.registry.messageRoutingBehavior.registerHandler('deleteSelected', async (message) => {
			if (isDeleteSelectedMessage(message)) {
				await this.handleDeleteSelected(message.data.traceIds);
			}
		});

		// Delete all traces
		this.registry.messageRoutingBehavior.registerHandler('deleteAll', async () => {
			await this.handleDeleteAll();
		});

		// Delete old traces
		this.registry.messageRoutingBehavior.registerHandler('deleteOld', async (message) => {
			if (isDeleteOldMessage(message)) {
				await this.handleDeleteOld(message.data.olderThanDays);
			}
		});

		// Export traces
		this.registry.messageRoutingBehavior.registerHandler('export', async (message) => {
			if (isExportMessage(message)) {
				await this.handleExport(message.data.traceIds, message.data.format);
			}
		});

		// Get trace level
		this.registry.messageRoutingBehavior.registerHandler('getTraceLevel', async () => {
			await this.loadTraceLevel();
		});

		// Set trace level
		this.registry.messageRoutingBehavior.registerHandler('setTraceLevel', async (message) => {
			if (isSetTraceLevelMessage(message)) {
				await this.handleSetTraceLevel(message.data.level);
			}
		});
	}

	/**
	 * Opens the current environment in Power Platform Maker portal.
	 */
	private async handleOpenMaker(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		try {
			const environment = await this.getEnvironmentById(envId);
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

	private getConfig(): DataTableConfig {
		return {
			viewType: PluginTraceViewerPanelComposed.viewType,
			title: 'Plugin Trace Viewer',
			dataCommand: 'tracesData',
			defaultSortColumn: 'createdOn',
			defaultSortDirection: 'desc',
			columns: [
				{ key: 'status', label: 'Status' },
				{ key: 'createdOn', label: 'Created On' },
				{ key: 'pluginName', label: 'Plugin Name' },
				{ key: 'entity', label: 'Entity' },
				{ key: 'message', label: 'Message' },
				{ key: 'mode', label: 'Mode' },
				{ key: 'duration', label: 'Duration (ms)' },
				{ key: 'depth', label: 'Depth' }
			],
			searchPlaceholder: '🔍 Search plugin traces...',
			noDataMessage: 'No plugin traces found. Adjust your trace level to start logging.',
			enableSolutionFilter: false,
			toolbarButtons: [
				{ id: 'refreshBtn', label: '🔄 Refresh', command: 'refresh', position: 'left' },
				{ id: 'openMakerBtn', label: 'Open in Maker', command: 'openMaker', position: 'left' },
				{ id: 'deleteSelectedBtn', label: 'Delete Selected', command: 'deleteSelected', position: 'right' },
				{ id: 'deleteAllBtn', label: 'Delete All', command: 'deleteAll', position: 'right' },
				{ id: 'deleteOldBtn', label: 'Delete Old (30 days)', command: 'deleteOld', position: 'right' },
				{ id: 'exportCsvBtn', label: 'Export CSV', command: 'export', position: 'right' },
				{ id: 'exportJsonBtn', label: 'Export JSON', command: 'export', position: 'right' }
			]
		};
	}

	private getCustomization(): HtmlCustomization {
		return {
			customCss: this.getCustomCss(),
			filterLogic: this.getFilterLogic(),
			customJavaScript: this.getCustomJavaScript()
		};
	}

	private getCustomCss(): string {
		return `
			/* Trace level section */
			.trace-level-section {
				padding: 12px 16px;
				background: var(--vscode-editor-background);
				border-bottom: 1px solid var(--vscode-panel-border);
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
			}
			.trace-level-label {
				font-size: 13px;
				color: var(--vscode-foreground);
			}
			.trace-level-value {
				font-weight: 600;
				color: var(--vscode-textLink-foreground);
			}
			.trace-level-btn {
				padding: 6px 12px;
				font-size: 12px;
			}

			/* Status colors in table */
			.status-success {
				color: var(--vscode-testing-iconPassed);
				font-weight: 600;
			}
			.status-exception {
				color: var(--vscode-testing-iconFailed);
				font-weight: 600;
			}
		`;
	}

	private getFilterLogic(): string {
		return `
			// Trace-specific filtering
			filtered = allData.filter(row => {
				const searchLower = query.toLowerCase();
				const matchesSearch = (
					(row.pluginName || '').toLowerCase().includes(searchLower) ||
					(row.entity || '').toLowerCase().includes(searchLower) ||
					(row.message || '').toLowerCase().includes(searchLower) ||
					(row.status || '').toLowerCase().includes(searchLower)
				);
				return matchesSearch;
			});
		`;
	}

	private getCustomJavaScript(): string {
		return `
			// Wait for DOM to be ready
			function initializeTraceViewer() {
				// Trace level section initialization
				const tableContainer = document.querySelector('.data-table-container');
				if (tableContainer && !document.getElementById('traceLevelSection')) {
					const traceLevelSection = document.createElement('div');
					traceLevelSection.id = 'traceLevelSection';
					traceLevelSection.className = 'trace-level-section';

					const labelDiv = document.createElement('div');
					const labelSpan = document.createElement('span');
					labelSpan.className = 'trace-level-label';
					labelSpan.textContent = 'Current Trace Level: ';
					const valueSpan = document.createElement('span');
					valueSpan.className = 'trace-level-value';
					valueSpan.id = 'currentTraceLevel';
					valueSpan.textContent = 'Loading...';
					labelDiv.appendChild(labelSpan);
					labelDiv.appendChild(valueSpan);

					const changeBtn = document.createElement('button');
					changeBtn.className = 'trace-level-btn';
					changeBtn.id = 'changeLevelBtn';
					changeBtn.textContent = 'Change Level';

					traceLevelSection.appendChild(labelDiv);
					traceLevelSection.appendChild(changeBtn);
					tableContainer.parentNode.insertBefore(traceLevelSection, tableContainer);

					// Change level button handler
					document.getElementById('changeLevelBtn').addEventListener('click', () => {
						const levels = ['Off', 'Exception', 'All'];
						const currentLevel = document.getElementById('currentTraceLevel').textContent;
						const currentIndex = levels.indexOf(currentLevel);
						const nextIndex = (currentIndex + 1) % levels.length;
						const nextLevel = levels[nextIndex];

						vscode.postMessage({
							command: 'setTraceLevel',
							data: { level: nextLevel }
						});
					});
				}

				// Apply status styling to table cells
				const statusCells = document.querySelectorAll('td[data-column="status"]');
				statusCells.forEach(cell => {
					const status = cell.textContent.trim().toLowerCase();
					if (status.includes('success') || status === 'success') {
						cell.classList.add('status-success');
					} else if (status.includes('exception') || status === 'exception') {
						cell.classList.add('status-exception');
					}
				});
			}

			// Initialize on DOM ready
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', initializeTraceViewer);
			} else {
				initializeTraceViewer();
			}

			// Re-apply styling when table data changes
			const observer = new MutationObserver(() => {
				initializeTraceViewer();
			});

			// Start observing once body exists
			if (document.body) {
				observer.observe(document.body, { childList: true, subtree: true });
			}

			// Listen for trace level updates
			window.addEventListener('message', (event) => {
				const message = event.data;
				if (message.command === 'traceLevelLoaded' && message.data) {
					const levelElement = document.getElementById('currentTraceLevel');
					if (levelElement) {
						levelElement.textContent = message.data.level;
					}
				}
			});
		`;
	}

	/**
	 * Loads and displays current trace level.
	 */
	private async loadTraceLevel(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		try {
			this.logger.debug('Loading trace level', { envId });

			const level = await this.getTraceLevelUseCase.execute(envId);
			this.currentTraceLevel = level;

			await this.panel.webview.postMessage({
				command: 'traceLevelLoaded',
				data: { level: TraceLevelFormatter.getDisplayName(level) }
			});

			this.logger.debug('Trace level loaded', { envId, level: level.value });
		} catch (error) {
			this.logger.error('Failed to load trace level', error);
		}
	}

	/**
	 * Views trace detail (currently shows in VS Code info message).
	 * TODO: Implement detail panel in future enhancement.
	 */
	private async handleViewDetail(traceId: string): Promise<void> {
		try {
			this.logger.debug('Viewing trace detail', { traceId });

			// Find trace in cached array
			const trace = this.traces.find(t => t.id === traceId);
			if (!trace) {
				await vscode.window.showWarningMessage('Trace not found');
				return;
			}

			// Map to detail ViewModel
			const detailViewModel = this.viewModelMapper.toDetailViewModel(trace);

			// TODO: Send to detail panel (future enhancement)
			// For now, show basic info
			await vscode.window.showInformationMessage(
				`Trace: ${detailViewModel.pluginName} - ${detailViewModel.status}`
			);
		} catch (error) {
			this.logger.error('Failed to view trace detail', error);
			await vscode.window.showErrorMessage('Failed to load trace detail');
		}
	}

	/**
	 * Deletes selected traces.
	 */
	private async handleDeleteSelected(traceIds: readonly string[]): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		try {
			this.logger.info('Deleting selected traces', { envId, count: traceIds.length });

			const deletedCount = await this.deleteTracesUseCase.deleteMultiple(envId, traceIds);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);

			// Refresh table
			await this.registry.dataBehavior.loadData();
		} catch (error) {
			this.logger.error('Failed to delete traces', error);
			await vscode.window.showErrorMessage('Failed to delete traces');
		}
	}

	/**
	 * Deletes all traces with confirmation.
	 */
	private async handleDeleteAll(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		// User confirmation
		const confirmed = await vscode.window.showWarningMessage(
			'Delete ALL plugin traces? This cannot be undone.',
			{ modal: true },
			'Delete All',
			'Cancel'
		);

		if (confirmed !== 'Delete All') {
			this.logger.debug('User cancelled delete all');
			return;
		}

		try {
			this.logger.info('Deleting all traces', { envId });

			const deletedCount = await this.deleteTracesUseCase.deleteAll(envId);

			await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s)`);

			// Refresh table
			await this.registry.dataBehavior.loadData();
		} catch (error) {
			this.logger.error('Failed to delete all traces', error);
			await vscode.window.showErrorMessage('Failed to delete all traces');
		}
	}

	/**
	 * Deletes traces older than specified days.
	 */
	private async handleDeleteOld(olderThanDays: number): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		try {
			this.logger.info('Deleting old traces', { envId, olderThanDays });

			const deletedCount = await this.deleteTracesUseCase.deleteOldTraces(envId, olderThanDays);

			if (deletedCount === 0) {
				await vscode.window.showInformationMessage(`No traces found older than ${olderThanDays} days`);
			} else {
				await vscode.window.showInformationMessage(`Deleted ${deletedCount} trace(s) older than ${olderThanDays} days`);
			}

			// Refresh table
			await this.registry.dataBehavior.loadData();
		} catch (error) {
			this.logger.error('Failed to delete old traces', error);
			await vscode.window.showErrorMessage('Failed to delete old traces');
		}
	}

	/**
	 * Exports traces to file.
	 */
	private async handleExport(traceIds: readonly string[], format: ExportFormat): Promise<void> {
		try {
			this.logger.info('Exporting traces', { count: traceIds.length, format });

			// Filter traces by IDs
			const tracesToExport = this.traces.filter(t => traceIds.includes(t.id));

			if (tracesToExport.length === 0) {
				await vscode.window.showWarningMessage('No traces selected for export');
				return;
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `plugin-traces-${timestamp}`;

			if (format === 'csv') {
				await this.exportTracesUseCase.exportToCsv(tracesToExport, filename);
			} else if (format === 'json') {
				await this.exportTracesUseCase.exportToJson(tracesToExport, filename);
			} else {
				throw new Error(`Unsupported export format: ${format}`);
			}

			await vscode.window.showInformationMessage(`Exported ${tracesToExport.length} trace(s) as ${format.toUpperCase()}`);
		} catch (error) {
			this.logger.error('Failed to export traces', error);
			await vscode.window.showErrorMessage('Failed to export traces');
		}
	}

	/**
	 * Sets trace level with performance warning for "All" level.
	 */
	private async handleSetTraceLevel(levelString: string): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return;
		}

		try {
			// Convert string to domain value object
			const level = TraceLevel.fromString(levelString);

			// Ask domain if this level may impact performance (business logic in domain)
			if (level.isPerformanceIntensive()) {
				const confirmed = await vscode.window.showWarningMessage(
					'Setting trace level to "All" will log all plugin executions and may impact performance. Continue?',
					'Yes',
					'No'
				);

				if (confirmed !== 'Yes') {
					this.logger.debug('User cancelled trace level change', { level: level.value });
					return;
				}
			}

			this.logger.info('Setting trace level', { envId, level: level.value });

			await this.setTraceLevelUseCase.execute(envId, level);

			this.currentTraceLevel = level;

			await vscode.window.showInformationMessage(
				`Trace level set to: ${TraceLevelFormatter.getDisplayName(level)}`
			);

			// Notify webview
			await this.panel.webview.postMessage({
				command: 'traceLevelLoaded',
				data: { level: TraceLevelFormatter.getDisplayName(level) }
			});
		} catch (error) {
			this.logger.error('Failed to set trace level', error);
			await vscode.window.showErrorMessage('Failed to set trace level');
		}
	}
}
