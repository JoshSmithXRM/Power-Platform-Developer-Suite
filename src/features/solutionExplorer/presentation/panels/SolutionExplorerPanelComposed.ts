import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { DataTableConfig, EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { VirtualDataTableSection } from '../../../../shared/infrastructure/ui/sections/VirtualDataTableSection';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { VirtualTableCacheManager, VirtualTableConfig } from '../../../../shared/application';
import type { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import type { Solution } from '../../domain/entities/Solution';
import { SolutionDataProviderAdapter } from '../../infrastructure/adapters/SolutionDataProviderAdapter';
import type { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';

/**
 * Commands supported by Solution Explorer panel.
 */
type SolutionExplorerCommands = 'refresh' | 'openMaker' | 'openInMaker' | 'environmentChange' | 'copySuccess';

/**
 * Solution Explorer panel using new PanelCoordinator architecture.
 * Displays list of solutions for a specific environment.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class SolutionExplorerPanelComposed extends EnvironmentScopedPanel<SolutionExplorerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.solutionExplorer';
	private static panels = new Map<string, SolutionExplorerPanelComposed>();

	private readonly coordinator: PanelCoordinator<SolutionExplorerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly loadingBehavior: LoadingStateBehavior;
	private readonly virtualTableConfig: VirtualTableConfig;
	private currentEnvironmentId: string;
	private cacheManager: VirtualTableCacheManager<Solution>;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: SolutionViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		logger.debug('SolutionExplorerPanel: Initialized with virtual table architecture');

		// Configure virtual table: 100 initial, up to 5000 cached (plenty for ~1200 solutions)
		this.virtualTableConfig = VirtualTableConfig.create(100, 5000, 500, true);

		// Create cache manager with adapter binding environment
		const provider = new SolutionDataProviderAdapter(solutionRepository, environmentId);
		this.cacheManager = new VirtualTableCacheManager(provider, this.virtualTableConfig, logger);

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Initialize loading behavior for toolbar buttons
		// Note: openMaker excluded - it only needs environmentId which is already known
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(['refresh']),
			logger
		);

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
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: SolutionViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<SolutionExplorerPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: SolutionExplorerPanelComposed.viewType,
			titlePrefix: 'Solutions',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new SolutionExplorerPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				solutionRepository,
				urlBuilder,
				viewModelMapper,
				logger,
				envId
			),
			webviewOptions: {
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		}, SolutionExplorerPanelComposed.panels);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		// Initial render - openMaker stays enabled (only needs environmentId)
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: []
		});

		// Disable refresh button during initial load (shows spinner)
		await this.loadingBehavior.setLoading(true);
		this.showTableLoading();

		try {
			// Load initial page of solutions using cache manager
			const result = await this.cacheManager.loadInitialPage();
			const cacheState = this.cacheManager.getCacheState();

			// Map to ViewModels and sort
			const viewModels = result.getItems()
				.map(s => this.viewModelMapper.toViewModel(s))
				.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

			this.logger.info('Solutions loaded with virtual table', {
				initialCount: viewModels.length,
				totalCount: cacheState.getTotalRecordCount()
			});

			// Re-render with actual data and pagination state
			await this.scaffoldingBehavior.refresh({
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				tableData: viewModels,
				pagination: {
					cachedCount: cacheState.getCachedRecordCount(),
					totalCount: cacheState.getTotalRecordCount(),
					isLoading: cacheState.getIsLoading(),
					currentPage: cacheState.getCurrentPage(),
					isFullyCached: cacheState.isFullyCached()
				}
			});
		} finally {
			// Re-enable buttons after load completes
			await this.loadingBehavior.setLoading(false);
		}

		// Set up callback to update UI during background loading
		this.cacheManager.onStateChange((state, cachedRecords) => {
			const updatedViewModels = cachedRecords
				.map(s => this.viewModelMapper.toViewModel(s))
				.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

			// Send updated data to webview (fire-and-forget, errors logged)
			this.panel.postMessage({
				command: 'updateVirtualTable',
				data: {
					rows: updatedViewModels,
					pagination: {
						cachedCount: state.getCachedRecordCount(),
						totalCount: state.getTotalRecordCount(),
						isLoading: state.getIsLoading(),
						currentPage: state.getCurrentPage(),
						isFullyCached: state.isFullyCached()
					}
				}
			}).then(
				() => { /* success */ },
				(error) => this.logger.error('Failed to send virtual table update', error)
			);
		});
	}

	private createCoordinator(): { coordinator: PanelCoordinator<SolutionExplorerCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const config = this.getTableConfig();

		const environmentSelector = new EnvironmentSelectorSection();
		// Use VirtualDataTableSection for virtual scrolling support
		const tableSection = new VirtualDataTableSection(config);
		// Note: Button IDs must match command names registered in registerCommandHandlers()
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' }
			]
		}, SectionPosition.Toolbar);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'solutions.css')
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
				).toString(),
				// Use VirtualTableRenderer instead of DataTableBehavior for virtual scrolling
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'VirtualTableRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'SolutionExplorerBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'KeyboardSelectionBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Solutions'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<SolutionExplorerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh solutions
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open solutions list in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMakerSolutionsList();
		});

		// Open individual solution in Maker
		this.coordinator.registerHandler('openInMaker', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId) {
				await this.handleOpenInMaker(solutionId);
			}
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Copy success notification from KeyboardSelectionBehavior
		this.coordinator.registerHandler('copySuccess', async (data) => {
			const payload = data as { count?: number } | undefined;
			const count = payload?.count ?? 0;
			await vscode.window.showInformationMessage(`${count} rows copied to clipboard`);
		});
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: SolutionExplorerPanelComposed.viewType,
			title: 'Solutions',
			dataCommand: 'solutionsData',
			defaultSortColumn: 'friendlyName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'friendlyName', label: 'Solution Name', type: 'name' },
				{ key: 'uniqueName', label: 'Unique Name', type: 'identifier' },
				{ key: 'version', label: 'Version', type: 'version' },
				{ key: 'isManaged', label: 'Type', type: 'status' },
				{ key: 'publisherName', label: 'Publisher', type: 'name' },
				{ key: 'isVisible', label: 'Visible', type: 'boolean' },
				{ key: 'isApiManaged', label: 'API Managed', type: 'boolean' },
				{ key: 'installedOn', label: 'Installed On', type: 'datetime' },
				{ key: 'modifiedOn', label: 'Modified On', type: 'datetime' }
			],
			searchPlaceholder: '🔍 Search...',
			noDataMessage: 'No solutions found.',
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing solutions with virtual table');

		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			// Clear existing cache and reload
			this.cacheManager.clearCache();

			// Load initial page
			const result = await this.cacheManager.loadInitialPage();
			const cacheState = this.cacheManager.getCacheState();

			// Sort view models alphabetically by friendlyName for initial render
			// Client-side sorting (VirtualTableRenderer.js) handles user interactions
			const viewModels = result.getItems()
				.map(s => this.viewModelMapper.toViewModel(s))
				.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

			this.logger.info('Solutions refreshed successfully', {
				initialCount: viewModels.length,
				totalCount: cacheState.getTotalRecordCount()
			});

			// Send data to frontend with pagination state
			await this.panel.postMessage({
				command: 'updateVirtualTable',
				data: {
					rows: viewModels,
					columns: this.getTableConfig().columns,
					pagination: {
						cachedCount: cacheState.getCachedRecordCount(),
						totalCount: cacheState.getTotalRecordCount(),
						isLoading: cacheState.getIsLoading(),
						currentPage: cacheState.getCurrentPage(),
						isFullyCached: cacheState.isFullyCached()
					}
				}
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing solutions', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh solutions: ${errorMessage}`);
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	private async handleOpenInMaker(solutionId: string): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open solution: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildSolutionUrl(environment.powerPlatformEnvironmentId, solutionId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solution in Maker Portal', { solutionId });
	}

	private async handleOpenMakerSolutionsList(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildSolutionsListUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solutions list in Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;

		// Clear old cache and create new cache manager for new environment
		this.cacheManager.clearCache();
		const newProvider = new SolutionDataProviderAdapter(this.solutionRepository, environmentId);
		this.cacheManager = new VirtualTableCacheManager(newProvider, this.virtualTableConfig, this.logger);

		// Re-register panel in map for new environment
		this.reregisterPanel(SolutionExplorerPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Solutions - ${environment.name}`;
		}

		// handleRefresh handles loading state
		await this.handleRefresh();
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
