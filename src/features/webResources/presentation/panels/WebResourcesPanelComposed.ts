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
import { SolutionFilterSection } from '../../../../shared/infrastructure/ui/sections/SolutionFilterSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import {
	VirtualTableCacheManager,
	VirtualTableConfig,
	SearchVirtualTableUseCase,
	VirtualTableCacheState
} from '../../../../shared/application';
import type { ListWebResourcesUseCase } from '../../application/useCases/ListWebResourcesUseCase';
import type { PublishWebResourceUseCase } from '../../application/useCases/PublishWebResourceUseCase';
import type { WebResourceViewModelMapper } from '../mappers/WebResourceViewModelMapper';
import type { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import type { WebResource } from '../../domain/entities/WebResource';
import { WebResourceDataProviderAdapter } from '../../infrastructure/adapters/WebResourceDataProviderAdapter';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { SolutionOption } from '../../../../shared/infrastructure/ui/views/solutionFilterView';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';
import { createWebResourceUri } from '../../infrastructure/providers/WebResourceFileSystemProvider';
import { PublishBehavior } from '../../../../shared/infrastructure/ui/behaviors/PublishBehavior';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';

/**
 * Commands supported by Web Resources panel.
 */
type WebResourcesCommands = 'refresh' | 'openMaker' | 'environmentChange' | 'solutionChange' | 'openWebResource' | 'searchServer' | 'publish' | 'publishAll' | 'rowSelect' | 'toggleShowAll';

/**
 * Web Resources panel using PanelCoordinator architecture with virtual table.
 * Displays list of web resources for a specific environment with optional solution filtering.
 * Uses VirtualTableCacheManager for large datasets (65k+ records).
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class WebResourcesPanelComposed extends EnvironmentScopedPanel<WebResourcesPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.webResources';
	private static panels = new Map<string, WebResourcesPanelComposed>();

	private readonly coordinator: PanelCoordinator<WebResourcesCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly publishBehavior: PublishBehavior;
	private readonly loadingBehavior: LoadingStateBehavior;
	private readonly virtualTableConfig: VirtualTableConfig;
	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;
	private solutionOptions: SolutionOption[] = [];

	// Virtual table infrastructure
	private cacheManager: VirtualTableCacheManager<WebResource> | null = null;
	private searchUseCase: SearchVirtualTableUseCase<WebResource> | null = null;

	// Row selection for publish
	private selectedWebResourceId: string | null = null;
	private selectedWebResourceName: string | null = null;

	// Filter state: true = text-based only (default), false = show all types
	private showTextBasedOnly: boolean = true;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly listWebResourcesUseCase: ListWebResourcesUseCase,
		private readonly publishWebResourceUseCase: PublishWebResourceUseCase,
		private readonly webResourceRepository: IWebResourceRepository,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: WebResourceViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		super();
		this.currentEnvironmentId = environmentId;
		logger.debug('WebResourcesPanel: Initialized with virtual table architecture');

		// Configure virtual table: 100 initial, up to 5000 cached, background loading enabled
		this.virtualTableConfig = VirtualTableConfig.create(100, 5000, 500, true);

		// Initialize virtual table infrastructure for Default Solution
		this.initializeVirtualTable(environmentId);

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Initialize publish behavior with Publish and Publish All buttons
		this.publishBehavior = new PublishBehavior(
			panel,
			() => this.currentEnvironmentId,
			['publish', 'publishAll'],
			logger
		);

		// Initialize loading behavior for toolbar buttons
		// Note: openMaker excluded - it only needs environmentId which is already known
		// Publish button stays disabled until row is selected
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(
				['refresh', 'publish', 'publishAll', 'toggleShowAll'],
				{ keepDisabledButtons: ['publish'] } // Publish requires row selection
			),
			logger
		);

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	/**
	 * Initializes virtual table cache manager and search use case for a given environment.
	 */
	private initializeVirtualTable(environmentId: string): void {
		const provider = new WebResourceDataProviderAdapter(this.webResourceRepository, environmentId);
		this.cacheManager = new VirtualTableCacheManager<WebResource>(provider, this.virtualTableConfig, this.logger);

		// Client-side filter function for web resources
		const clientFilterFn = (record: WebResource, query: string): boolean => {
			return record.name.getValue().toLowerCase().includes(query) ||
				record.displayName.toLowerCase().includes(query);
		};

		// OData filter builder for server-side search
		const odataFilterBuilder = (query: string): string => {
			const escaped = query.replace(/'/g, "''");
			return `contains(name,'${escaped}') or contains(displayname,'${escaped}')`;
		};

		this.searchUseCase = new SearchVirtualTableUseCase<WebResource>(
			this.cacheManager,
			provider,
			clientFilterFn,
			odataFilterBuilder,
			this.logger
		);

		// Register for cache state changes to update UI
		this.cacheManager.onStateChange((state, records) => {
			void this.updateVirtualTableData(records, state);
		});
	}

	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		listWebResourcesUseCase: ListWebResourcesUseCase,
		publishWebResourceUseCase: PublishWebResourceUseCase,
		webResourceRepository: IWebResourceRepository,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: WebResourceViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<WebResourcesPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: WebResourcesPanelComposed.viewType,
			titlePrefix: 'Web Resources',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new WebResourcesPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				listWebResourcesUseCase,
				publishWebResourceUseCase,
				webResourceRepository,
				solutionRepository,
				urlBuilder,
				viewModelMapper,
				logger,
				envId,
				panelStateRepository
			),
			webviewOptions: {
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			},
			onDispose: (instance) => {
				instance.publishBehavior.dispose();
			}
		}, WebResourcesPanelComposed.panels);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load persisted solution ID immediately (optimistic - no validation yet)
		if (this.panelStateRepository) {
			const savedState = await this.panelStateRepository.load({
				panelType: 'webResources',
				environmentId: this.currentEnvironmentId
			});
			if (savedState?.selectedSolutionId) {
				this.currentSolutionId = savedState.selectedSolutionId;
			}
		}

		// Show initial loading state with known solution ID
		const environments = await this.getEnvironments();
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions: [],
			currentSolutionId: this.currentSolutionId,
			tableData: [],
			isLoading: true
		});

		// Disable all buttons during initial load (refresh shows spinner)
		await this.loadingBehavior.setLoading(true);

		try {
			// Load solutions in parallel with initial data
			const solutionsPromise = this.loadSolutions();

			// Post-load validation: Check if persisted solution still exists
			const solutions = await solutionsPromise;
			let finalSolutionId = this.currentSolutionId;
			if (this.currentSolutionId !== DEFAULT_SOLUTION_ID) {
				if (!solutions.some(s => s.id === this.currentSolutionId)) {
					this.logger.warn('Persisted solution no longer exists, falling back to default', {
						invalidSolutionId: this.currentSolutionId
					});
					finalSolutionId = DEFAULT_SOLUTION_ID;
					this.currentSolutionId = DEFAULT_SOLUTION_ID;

					// Save corrected state
					if (this.panelStateRepository) {
						await this.panelStateRepository.save(
							{ panelType: 'webResources', environmentId: this.currentEnvironmentId },
							{ selectedSolutionId: DEFAULT_SOLUTION_ID, lastUpdated: new Date().toISOString() }
						);
					}
				}
			}

			// Load web resources for the selected solution
			this.logger.debug('Loading web resources', { solutionId: finalSolutionId, textBasedOnly: this.showTextBasedOnly });
			const webResources = await this.listWebResourcesUseCase.execute(
				this.currentEnvironmentId,
				finalSolutionId,
				undefined,
				{ textBasedOnly: this.showTextBasedOnly }
			);
			const viewModels = this.viewModelMapper.toViewModels(webResources);

			// Final render with solutions and data
			await this.scaffoldingBehavior.refresh({
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				solutions,
				currentSolutionId: finalSolutionId,
				tableData: viewModels
			});
		} finally {
			// Re-enable buttons after load completes (publish stays disabled until row selected)
			await this.loadingBehavior.setLoading(false);
		}
	}

	private createCoordinator(): { coordinator: PanelCoordinator<WebResourcesCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const config = this.getTableConfig();

		const environmentSelector = new EnvironmentSelectorSection();
		const solutionFilter = new SolutionFilterSection();
		const tableSection = new VirtualDataTableSection(config);
		// Note: Button IDs must match command names registered in registerCommandHandlers()
		// Order: Open in Maker, Refresh, publish actions, then Show All toggle
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' },
				{ id: 'publish', label: 'Publish', disabled: true },
				{ id: 'publishAll', label: 'Publish All' },
				{ id: 'toggleShowAll', label: 'Show All' }
			]
		}, SectionPosition.Toolbar);

		// Order: action buttons, solution filter, environment selector (far right), then table
		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, solutionFilter, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'solution-filter', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris,
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'renderers', 'VirtualTableRenderer.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Web Resources'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<WebResourcesCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh web resources
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open web resources in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Solution change
		this.coordinator.registerHandler('solutionChange', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId) {
				await this.handleSolutionChange(solutionId);
			}
		});

		// Open web resource in editor
		this.coordinator.registerHandler('openWebResource', async (data) => {
			const payload = data as { id?: string; name?: string; typeCode?: string } | undefined;
			if (payload?.id && payload?.name && payload?.typeCode) {
				await this.handleOpenWebResource(payload.id, payload.name, parseInt(payload.typeCode, 10));
			}
		});

		// Server-side search (triggered when client cache has no matches)
		this.coordinator.registerHandler('searchServer', async (data) => {
			const payload = data as { query?: string } | undefined;
			if (payload?.query && this.searchUseCase) {
				await this.handleServerSearch(payload.query);
			}
		});

		// Row selection for publish
		this.coordinator.registerHandler('rowSelect', async (data) => {
			const payload = data as { id?: string; name?: string } | undefined;
			this.handleRowSelect(payload?.id ?? null, payload?.name ?? null);
		});

		// Publish selected web resource
		this.coordinator.registerHandler('publish', async () => {
			await this.handlePublish();
		});

		// Publish all customizations (uses PublishAllXml)
		this.coordinator.registerHandler('publishAll', async () => {
			await this.handlePublishAll();
		});

		// Toggle between text-based only and all types
		this.coordinator.registerHandler('toggleShowAll', async () => {
			await this.handleToggleShowAll();
		});
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: WebResourcesPanelComposed.viewType,
			title: 'Web Resources',
			dataCommand: 'webResourcesData',
			defaultSortColumn: 'name',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'name', label: 'Name' },
				{ key: 'displayName', label: 'Display Name' },
				{ key: 'type', label: 'Type' },
				{ key: 'createdOn', label: 'Created On', type: 'datetime' },
				{ key: 'modifiedOn', label: 'Modified On', type: 'datetime' }
			],
			searchPlaceholder: '🔍 Search web resources...',
			noDataMessage: 'No web resources found.',
			toolbarButtons: []
		};
	}

	private async loadSolutions(): Promise<SolutionOption[]> {
		try {
			this.solutionOptions = await this.solutionRepository.findAllForDropdown(this.currentEnvironmentId);
			return this.solutionOptions;
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing web resources', { solutionId: this.currentSolutionId, textBasedOnly: this.showTextBasedOnly });

		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			const webResources = await this.listWebResourcesUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId,
				undefined,
				{ textBasedOnly: this.showTextBasedOnly }
			);

			const viewModels = this.viewModelMapper.toViewModels(webResources);

			this.logger.info('Web resources loaded successfully', { count: viewModels.length });

			await this.panel.webview.postMessage({
				command: 'updateVirtualTable',
				data: {
					rows: viewModels,
					columns: this.getTableConfig().columns,
					pagination: {
						cachedCount: viewModels.length,
						totalCount: viewModels.length,
						isLoading: false,
						currentPage: 0,
						isFullyCached: true
					}
				}
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing web resources', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh web resources: ${errorMessage}`);
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	private async handleOpenMaker(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildWebResourcesUrl(
			environment.powerPlatformEnvironmentId,
			this.currentSolutionId
		);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened web resources in Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;
		this.currentSolutionId = DEFAULT_SOLUTION_ID; // Reset to default solution

		// Re-register panel in map for new environment
		this.reregisterPanel(WebResourcesPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		// Reinitialize virtual table for new environment
		this.initializeVirtualTable(environmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Web Resources - ${environment.name}`;
		}

		this.solutionOptions = await this.loadSolutions();

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		this.currentSolutionId = solutionId;

		// Persist solution selection
		if (this.panelStateRepository) {
			await this.panelStateRepository.save(
				{
					panelType: 'webResources',
					environmentId: this.currentEnvironmentId
				},
				{
					selectedSolutionId: solutionId,
					lastUpdated: new Date().toISOString()
				}
			);
		}

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment/solution switches.
	 */
	private showTableLoading(): void {
		this.panel.webview.postMessage({
			command: 'updateVirtualTable',
			data: {
				rows: [],
				columns: this.getTableConfig().columns,
				pagination: {
					cachedCount: 0,
					totalCount: 0,
					isLoading: true,
					currentPage: 0,
					isFullyCached: false
				}
			}
		});
	}

	/**
	 * Opens a web resource in VS Code editor.
	 *
	 * @param webResourceId - Web resource GUID
	 * @param name - Web resource name (used for filename)
	 * @param typeCode - Web resource type code (determines file extension)
	 */
	private async handleOpenWebResource(webResourceId: string, name: string, _typeCode: number): Promise<void> {
		this.logger.debug('Opening web resource in editor', { webResourceId, name });

		try {
			// Web resource name already includes the file extension (e.g., "new_script.js")
			// No need to append extension based on type code
			const filename = name;

			const uri = createWebResourceUri(
				this.currentEnvironmentId,
				webResourceId,
				filename
			);

			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document, { preview: true });

			this.logger.info('Opened web resource in editor', { webResourceId, filename });
		} catch (error) {
			this.logger.error('Failed to open web resource', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to open web resource: ${message}`);
		}
	}

	/**
	 * Handles row selection from the webview.
	 * Enables/disables the Publish button based on selection.
	 */
	private handleRowSelect(webResourceId: string | null, name: string | null): void {
		this.selectedWebResourceId = webResourceId;
		this.selectedWebResourceName = name;

		// Enable/disable the Publish button
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId: 'publish',
			disabled: webResourceId === null
		});

		this.logger.debug('Row selection changed', {
			webResourceId,
			name,
			hasSelection: webResourceId !== null
		});
	}

	/**
	 * Publishes the currently selected web resource.
	 */
	private async handlePublish(): Promise<void> {
		if (this.selectedWebResourceId === null) {
			vscode.window.showWarningMessage('No web resource selected. Click a row to select it.');
			return;
		}

		const webResourceId = this.selectedWebResourceId;
		const displayName = this.selectedWebResourceName ?? webResourceId;

		this.logger.info('Publishing web resource', {
			webResourceId,
			name: this.selectedWebResourceName
		});

		await this.publishBehavior.executePublish(
			'publish',
			async () => this.publishWebResourceUseCase.execute(this.currentEnvironmentId, webResourceId),
			`Published: ${displayName}`
		);
	}

	/**
	 * Publishes all customizations in the environment using PublishAllXml.
	 * This publishes ALL solution components, not just web resources.
	 */
	private async handlePublishAll(): Promise<void> {
		// Show warning dialog - this publishes EVERYTHING
		const confirmed = await vscode.window.showWarningMessage(
			'Publish ALL customizations in this environment? This publishes all solution components (entities, web resources, etc.), not just web resources.',
			{ modal: true },
			'Publish All',
			'Cancel'
		);

		if (confirmed !== 'Publish All') {
			return;
		}

		this.logger.info('Publishing all customizations via PublishAllXml');

		await this.publishBehavior.executePublish(
			'publishAll',
			async () => this.publishWebResourceUseCase.executeAll(this.currentEnvironmentId),
			'All customizations published successfully'
		);
	}

	/**
	 * Toggles between showing text-based types only and all types.
	 */
	private async handleToggleShowAll(): Promise<void> {
		this.showTextBasedOnly = !this.showTextBasedOnly;
		const newLabel = this.showTextBasedOnly ? 'Show All' : 'Text Only';

		this.logger.debug('Toggle show all types', { showTextBasedOnly: this.showTextBasedOnly });

		// Update button label
		await this.panel.webview.postMessage({
			command: 'setButtonLabel',
			buttonId: 'toggleShowAll',
			label: newLabel
		});

		// Reload data with new filter setting
		await this.handleRefresh();
	}

	/**
	 * Handles server-side search when client cache has no matching results.
	 * Uses SearchVirtualTableUseCase to query server with OData $filter.
	 */
	private async handleServerSearch(query: string): Promise<void> {
		if (!this.searchUseCase) {
			this.logger.warn('Server search requested but searchUseCase not initialized');
			return;
		}

		this.logger.debug('Executing server-side search', { query });

		try {
			const result = await this.searchUseCase.execute(query);
			const viewModels = this.viewModelMapper.toViewModels(result.results);

			// Send results back to webview
			await this.panel.webview.postMessage({
				command: 'serverSearchResults',
				data: {
					viewModels,
					source: result.source,
					query,
					isFullyCached: result.source === 'cache'
				}
			});

			this.logger.debug('Server search completed', {
				query,
				resultCount: viewModels.length,
				source: result.source
			});
		} catch (error) {
			this.logger.error('Server search failed', error);
			// Send error back to webview so it can show appropriate message
			await this.panel.webview.postMessage({
				command: 'serverSearchResults',
				data: {
					viewModels: [],
					source: 'error',
					query,
					error: error instanceof Error ? error.message : 'Search failed'
				}
			});
		}
	}

	/**
	 * Updates the virtual table display when cache state changes.
	 * Called by VirtualTableCacheManager.onStateChange callback.
	 * Note: Virtual table infrastructure is currently unused - all solutions use the use case path.
	 */
	private async updateVirtualTableData(records: readonly WebResource[], state: VirtualTableCacheState): Promise<void> {

		const viewModels = this.viewModelMapper.toViewModels(records);

		await this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels,
				columns: this.getTableConfig().columns,
				pagination: {
					cachedCount: state.getCachedRecordCount(),
					totalCount: state.getTotalRecordCount(),
					isLoading: state.getIsLoading(),
					currentPage: state.getCurrentPage(),
					isFullyCached: state.isFullyCached()
				}
			}
		});

		this.logger.debug('Virtual table data updated', {
			recordCount: viewModels.length,
			isFullyLoaded: state.isFullyCached(),
			totalCount: state.getTotalRecordCount()
		});
	}
}
