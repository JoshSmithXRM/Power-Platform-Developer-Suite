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
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';
import { createWebResourceUri, WebResourceFileSystemProvider } from '../../infrastructure/providers/WebResourceFileSystemProvider';
import type { WebResourceConnectionRegistry, EnvironmentResources } from '../../infrastructure/providers/WebResourceConnectionRegistry';
import type { GetWebResourceContentUseCase } from '../../application/useCases/GetWebResourceContentUseCase';
import type { UpdateWebResourceUseCase } from '../../application/useCases/UpdateWebResourceUseCase';
import { PublishBehavior } from '../../../../shared/infrastructure/ui/behaviors/PublishBehavior';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { AbortSignalCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/AbortSignalCancellationTokenAdapter';
import { CompositeCancellationToken } from '../../../../shared/infrastructure/adapters/CompositeCancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

/**
 * Commands supported by Web Resources panel.
 */
type WebResourcesCommands = 'refresh' | 'openMaker' | 'environmentChange' | 'solutionChange' | 'openWebResource' | 'searchServer' | 'publish' | 'publishAll' | 'rowSelect' | 'toggleShowAll' | 'copySuccess';

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

	// Client-side cache: stores ALL web resources per solution (unfiltered)
	// Filter (textBasedOnly) is applied client-side from this cache
	// Cache key is just solutionId - filter state is NOT part of the key
	private dataCache: Map<string, readonly WebResource[]> = new Map();

	// Subscription to FileSystemProvider save events for auto-refresh
	private saveSubscription: vscode.Disposable | undefined;

	// Request versioning to prevent stale responses from overwriting fresh data
	// Incremented on each solution change; responses with outdated version are discarded
	private requestVersion: number = 0;

	// Cancellation source for in-flight solution data requests
	// Cancelled when user switches solutions to stop wasted API calls
	private currentCancellationSource: vscode.CancellationTokenSource | null = null;

	// Panel-level cancellation token - aborted when panel is disposed
	// Used to stop ALL operations when user closes the panel
	private readonly panelCancellationToken: ICancellationToken;

	// Resources for FileSystemProvider registration (kept for re-registration on environment change)
	private readonly environmentResources: EnvironmentResources;

	private constructor(
		private readonly panel: SafeWebviewPanel,
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
		private readonly panelStateRepository: IPanelStateRepository | undefined,
		private readonly fileSystemProvider: WebResourceFileSystemProvider | undefined,
		private readonly connectionRegistry: WebResourceConnectionRegistry | undefined,
		getWebResourceContentUseCase: GetWebResourceContentUseCase,
		updateWebResourceUseCase: UpdateWebResourceUseCase
	) {
		super();
		this.currentEnvironmentId = environmentId;

		// Create panel-level cancellation token from SafeWebviewPanel's abortSignal
		// This token is cancelled when the panel is disposed, stopping all in-flight operations
		this.panelCancellationToken = new AbortSignalCancellationTokenAdapter(panel.abortSignal);

		// Create environment resources for FileSystemProvider registration
		this.environmentResources = {
			getWebResourceContentUseCase,
			updateWebResourceUseCase,
			publishWebResourceUseCase,
			webResourceRepository
		};

		// Register resources with registry if we have a valid environment
		if (this.connectionRegistry && environmentId) {
			this.connectionRegistry.register(environmentId, this.environmentResources);
		}

		logger.debug('WebResourcesPanel: Initialized with virtual table architecture', { environmentId });

		// Virtual table config - no artificial limits. Primary data display uses
		// listWebResourcesUseCase with OData pagination (unlimited records).
		this.virtualTableConfig = VirtualTableConfig.createDefault();

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

		// Subscribe to FileSystemProvider save events for auto-refresh
		// Only process events for this panel's current environment
		if (this.fileSystemProvider) {
			this.saveSubscription = this.fileSystemProvider.onDidSaveWebResource((event) => {
				void this.handleWebResourceSaved(event.environmentId, event.webResourceId);
			});
		}

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

	/**
	 * Cleans up resources when the panel is disposed.
	 * Cancels any background loading and clears caches.
	 */
	public dispose(): void {
		this.logger.debug('WebResourcesPanel: Disposing', { environmentId: this.currentEnvironmentId });

		// Cancel any in-flight solution data request
		if (this.currentCancellationSource) {
			this.currentCancellationSource.cancel();
			this.currentCancellationSource.dispose();
			this.currentCancellationSource = null;
		}

		// Cancel any background loading in progress
		if (this.cacheManager) {
			this.cacheManager.cancelBackgroundLoading();
			this.cacheManager.clearCache();
		}

		// Clear local data cache
		this.clearCache();

		// Dispose FileSystemProvider subscription
		this.saveSubscription?.dispose();

		// Dispose behaviors
		this.publishBehavior.dispose();

		// Note: We don't unregister from the connection registry on dispose
		// because another panel might be using the same environment's resources.
		// The registry is designed to be shared across panels.

		this.logger.debug('WebResourcesPanel: Disposed successfully');
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
		panelStateRepository?: IPanelStateRepository,
		fileSystemProvider?: WebResourceFileSystemProvider,
		connectionRegistry?: WebResourceConnectionRegistry,
		getWebResourceContentUseCase?: GetWebResourceContentUseCase,
		updateWebResourceUseCase?: UpdateWebResourceUseCase
	): Promise<WebResourcesPanelComposed> {
		// These use cases must be provided for the panel to function properly
		if (getWebResourceContentUseCase === undefined || updateWebResourceUseCase === undefined) {
			throw new Error('WebResourcesPanelComposed requires getWebResourceContentUseCase and updateWebResourceUseCase');
		}

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
				panelStateRepository,
				fileSystemProvider,
				connectionRegistry,
				getWebResourceContentUseCase,
				updateWebResourceUseCase
			),
			webviewOptions: {
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			},
			onDispose: (instance) => {
				instance.dispose();
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

		// Initial render - openMaker stays enabled (only needs environmentId)
		const environments = await this.getEnvironments();
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions: [],
			currentSolutionId: this.currentSolutionId,
			tableData: []
		});

		// Show loading state IMMEDIATELY after scaffold (before loading solutions)
		// This prevents "No data" flash while solutions are loading
		this.showTableLoading();

		// Disable refresh button during initial load (shows spinner)
		await this.loadingBehavior.setLoading(true);

		try {
			// Load solutions first
			const solutions = await this.loadSolutions();

			// Validate persisted solution still exists
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

			// Update solutions dropdown via message (avoids full HTML refresh that causes "No data" flash)
			await this.panel.postMessage({
				command: 'updateSolutionSelector',
				data: {
					solutions,
					currentSolutionId: finalSolutionId
				}
			});

			// Set up cancellation for initial data load (can be cancelled by solution change)
			const myVersion = ++this.requestVersion;
			if (this.currentCancellationSource) {
				this.currentCancellationSource.cancel();
				this.currentCancellationSource.dispose();
			}
			this.currentCancellationSource = new vscode.CancellationTokenSource();
			const cancellationToken = this.currentCancellationSource.token;

			// NOW load data (user sees solutions dropdown, can change selection while waiting)
			const webResources = await this.getFilteredWebResources(false, cancellationToken);

			// Check if superseded by solution change during load
			if (this.requestVersion !== myVersion) {
				this.logger.debug('Initial load superseded by solution change, discarding', {
					myVersion,
					currentVersion: this.requestVersion
				});
				return;
			}

			const viewModels = this.viewModelMapper.toViewModels(webResources);

			this.logger.info('Web resources loaded successfully', { count: viewModels.length });

			// Send data to frontend via message (scaffoldingBehavior.refresh regenerates HTML
			// which resets the table state; we need to use postMessage instead)
			await this.panel.postMessage({
				command: 'updateVirtualTable',
				data: {
					rows: viewModels,
					noDataMessage: this.getTableConfig().noDataMessage
				}
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
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'KeyboardSelectionBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Web Resources'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel,
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
			// kebab-case 'file-extension' in HTML becomes camelCase 'fileExtension' via messaging.js kebabToCamel
			const payload = data as { id?: string; name?: string; fileExtension?: string } | undefined;
			if (payload?.id && payload?.name && payload?.fileExtension) {
				await this.handleOpenWebResource(payload.id, payload.name, payload.fileExtension);
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

		// Copy success notification from KeyboardSelectionBehavior
		this.coordinator.registerHandler('copySuccess', async (data) => {
			const payload = data as { count?: number } | undefined;
			const count = payload?.count ?? 0;
			await vscode.window.showInformationMessage(`${count} rows copied to clipboard`);
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
				{ key: 'managed', label: 'Managed' },
				{ key: 'createdOn', label: 'Created On', type: 'datetime' },
				{ key: 'createdBy', label: 'Created By' },
				{ key: 'modifiedOn', label: 'Modified On', type: 'datetime' },
				{ key: 'modifiedBy', label: 'Modified By' }
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

	/**
	 * Generates a cache key for the solution.
	 * Cache stores ALL web resources per solution (unfiltered).
	 * Filter (textBasedOnly) is applied client-side from cached data.
	 */
	private getCacheKey(solutionId: string): string {
		return solutionId;
	}

	/**
	 * Clears the data cache.
	 * Called on environment change to ensure fresh data.
	 */
	private clearCache(): void {
		this.dataCache.clear();
		this.logger.debug('Data cache cleared');
	}

	/**
	 * Gets ALL web resources for the current solution (from cache or server).
	 * Does NOT apply textBasedOnly filter - returns full unfiltered dataset.
	 *
	 * @param forceRefresh - If true, bypasses cache and fetches from server
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns ALL web resources for the current solution (unfiltered)
	 */
	private async getAllWebResourcesWithCache(
		forceRefresh: boolean = false,
		cancellationToken?: vscode.CancellationToken
	): Promise<readonly WebResource[]> {
		const cacheKey = this.getCacheKey(this.currentSolutionId);

		// Return cached data if available and not forcing refresh
		const cached = this.dataCache.get(cacheKey);
		if (!forceRefresh && cached !== undefined) {
			this.logger.debug('Returning cached web resources (all types)', {
				cacheKey,
				cachedCount: cached.length
			});
			return cached;
		}

		// Fetch ALL from server (textBasedOnly = false to get everything)
		this.logger.debug('Loading ALL web resources from server', {
			solutionId: this.currentSolutionId
		});

		// Create composite cancellation token:
		// - Panel-level: cancelled when panel is disposed (stops ALL operations)
		// - Operation-level: cancelled when user changes solution (stops THIS operation)
		const domainToken = cancellationToken
			? new CompositeCancellationToken(
				this.panelCancellationToken,
				new VsCodeCancellationTokenAdapter(cancellationToken)
			)
			: this.panelCancellationToken;

		const webResources = await this.listWebResourcesUseCase.execute(
			this.currentEnvironmentId,
			this.currentSolutionId,
			domainToken, // Pass composite cancellation token to use case
			{ textBasedOnly: false } // Always fetch ALL types
		);

		// Store in cache
		this.dataCache.set(cacheKey, webResources);

		this.logger.info('Web resources cached (all types)', {
			cacheKey,
			count: webResources.length
		});
		return webResources;
	}

	/**
	 * Gets web resources filtered by current display settings.
	 * Uses cached data and applies textBasedOnly filter client-side.
	 *
	 * @param forceRefresh - If true, bypasses cache and fetches from server
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Filtered web resources based on current showTextBasedOnly setting
	 */
	private async getFilteredWebResources(
		forceRefresh: boolean = false,
		cancellationToken?: vscode.CancellationToken
	): Promise<readonly WebResource[]> {
		const allResources = await this.getAllWebResourcesWithCache(forceRefresh, cancellationToken);

		// Apply filter client-side
		if (this.showTextBasedOnly) {
			const filtered = allResources.filter(wr => wr.isTextBased());
			this.logger.debug('Filtered to text-based types (client-side)', {
				totalCount: allResources.length,
				filteredCount: filtered.length
			});
			return filtered;
		}

		return allResources;
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing web resources (force refresh from server)', {
			solutionId: this.currentSolutionId,
			textBasedOnly: this.showTextBasedOnly
		});
		// Force refresh bypasses cache
		await this.loadAndDisplayWebResources(true);
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

		// Immediately show loading state to clear stale data from previous environment
		await this.panel.postMessage({
			command: 'showLoading',
			message: 'Switching environment...'
		});

		// Show loading placeholder in solution selector to prevent stale selection
		await this.panel.postMessage({
			command: 'updateSolutionSelector',
			data: {
				solutions: [{ id: '', name: 'Loading solutions...', uniqueName: '' }],
				currentSolutionId: '',
				disabled: true
			}
		});

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;

		// Register resources for the new environment in the registry
		// This ensures FileSystemProvider can find credentials when opening web resources
		if (this.connectionRegistry && environmentId) {
			this.connectionRegistry.register(environmentId, this.environmentResources);
			this.logger.debug('Registered environment resources in registry', { environmentId });
		}

		// Clear cache - new environment means fresh data
		this.clearCache();

		// Re-register panel in map for new environment
		this.reregisterPanel(WebResourcesPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		// Reinitialize virtual table for new environment
		this.initializeVirtualTable(environmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Web Resources - ${environment.name}`;
		}

		// Load persisted state for the NEW environment (Option A: Fresh Start)
		await this.loadPersistedStateForEnvironment(environmentId);

		this.solutionOptions = await this.loadSolutions();

		// Post-load validation: Check if persisted solution still exists
		if (this.currentSolutionId !== DEFAULT_SOLUTION_ID) {
			if (!this.solutionOptions.some(s => s.id === this.currentSolutionId)) {
				this.logger.warn('Persisted solution no longer exists, falling back to default', {
					invalidSolutionId: this.currentSolutionId
				});
				this.currentSolutionId = DEFAULT_SOLUTION_ID;
			}
		}

		// Update solution selector in UI
		await this.panel.postMessage({
			command: 'updateSolutionSelector',
			data: {
				solutions: this.solutionOptions,
				currentSolutionId: this.currentSolutionId
			}
		});

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	/**
	 * Loads persisted state for a specific environment.
	 * Called during environment switch to restore the target environment's saved state.
	 */
	private async loadPersistedStateForEnvironment(environmentId: string): Promise<void> {
		// Reset to defaults first
		this.currentSolutionId = DEFAULT_SOLUTION_ID;

		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: 'webResources',
					environmentId
				});
				if (state?.selectedSolutionId) {
					this.currentSolutionId = state.selectedSolutionId;
					this.logger.debug('Loaded persisted solution for environment', {
						environmentId,
						solutionId: this.currentSolutionId
					});
				}
			} catch (error) {
				this.logger.warn('Failed to load persisted state for environment', { environmentId, error });
			}
		}
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
		this.logger.debug('Solution filter changed', { solutionId });

		this.currentSolutionId = solutionId;

		// Increment request version to detect stale responses
		const myVersion = ++this.requestVersion;

		// Cancel any in-flight request from previous solution change
		if (this.currentCancellationSource) {
			this.logger.debug('Cancelling previous solution data request');
			this.currentCancellationSource.cancel();
			this.currentCancellationSource.dispose();
		}

		// Create new cancellation source for this request
		this.currentCancellationSource = new vscode.CancellationTokenSource();
		const cancellationToken = this.currentCancellationSource.token;

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

		// Load with caching - use cached data if switching back to previously viewed solution
		// Pass version to detect if another solution change occurred during async operation
		// Pass cancellation token to stop API calls if user changes solution again
		await this.loadAndDisplayWebResources(false, myVersion, cancellationToken);
	}

	/**
	 * Loads web resources and updates the display.
	 * Fetches ALL types and filters client-side based on showTextBasedOnly.
	 *
	 * @param forceRefresh - If true, bypass cache and fetch from server
	 * @param requestVersion - Optional version to detect stale responses. If provided and
	 *                         doesn't match current version, the response is discarded.
	 * @param cancellationToken - Optional token to cancel the operation if user changes solution
	 */
	private async loadAndDisplayWebResources(
		forceRefresh: boolean,
		requestVersion?: number,
		cancellationToken?: vscode.CancellationToken
	): Promise<void> {
		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			const webResources = await this.getFilteredWebResources(forceRefresh, cancellationToken);

			// Check for stale response: if version was provided and has changed, discard this response
			if (requestVersion !== undefined && requestVersion !== this.requestVersion) {
				this.logger.debug('Discarding stale web resources response', {
					requestVersion,
					currentVersion: this.requestVersion
				});
				return;
			}

			const viewModels = this.viewModelMapper.toViewModels(webResources);

			this.logger.info('Web resources displayed', {
				count: viewModels.length,
				showTextBasedOnly: this.showTextBasedOnly,
				fromCache: !forceRefresh && this.dataCache.has(this.getCacheKey(this.currentSolutionId))
			});

			await this.panel.postMessage({
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
			// Silently ignore cancellation - user switched solutions so this response is not needed
			if (error instanceof OperationCancelledException) {
				this.logger.debug('Web resources request cancelled - user switched solutions');
				return;
			}
			this.logger.error('Error loading web resources', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to load web resources: ${errorMessage}`);
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment/solution switches.
	 */
	private showTableLoading(): void {
		void this.panel.postMessage({
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
	 * Compares published vs unpublished content and shows diff if different.
	 *
	 * @param webResourceId - Web resource GUID
	 * @param name - Web resource name (used for filename)
	 * @param fileExtension - File extension (e.g., '.js', '.html') for syntax highlighting
	 */
	private async handleOpenWebResource(webResourceId: string, name: string, fileExtension: string): Promise<void> {
		// Require environment selection before opening web resources
		if (!this.currentEnvironmentId) {
			vscode.window.showWarningMessage('Please select an environment first.');
			return;
		}

		this.logger.debug('Opening web resource in editor', { webResourceId, name, environmentId: this.currentEnvironmentId });

		try {
			// Get friendly environment name for the filename suffix
			const environment = await this.getEnvironmentById(this.currentEnvironmentId);
			const envName = environment?.name ?? this.currentEnvironmentId;
			// Sanitize environment name for filename safety (remove invalid characters)
			const sanitizedEnvName = envName.replace(/[<>:"/\\|?*]/g, '_').trim();

			// Check if name already has an extension, otherwise use type-based extension
			// (Web resource names may or may not include extensions)
			const nameParts = name.split('.');
			const nameHasExtension = nameParts.length > 1;
			const ext = nameHasExtension ? `.${nameParts.pop()}` : fileExtension;
			const baseName = nameParts.join('.');
			const filename = `${baseName} [${sanitizedEnvName}]${ext}`;

			// Check for unpublished changes before opening
			const hasUnpublishedChanges = await this.checkForUnpublishedChanges(webResourceId);

			if (hasUnpublishedChanges) {
				// Show diff view: published (left) vs unpublished (right)
				await this.showPublishedVsUnpublishedDiff(webResourceId, filename);
				return;
			}

			// No unpublished changes - open normally
			await this.openWebResourceDirectly(webResourceId, filename);
		} catch (error) {
			this.logger.error('Failed to open web resource', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to open web resource: ${message}`);
		}
	}

	/**
	 * Checks if a web resource has unpublished changes.
	 * Compares published vs unpublished content.
	 *
	 * @returns true if content differs, false if same
	 */
	private async checkForUnpublishedChanges(webResourceId: string): Promise<boolean> {
		const repository = this.environmentResources.webResourceRepository;
		if (repository === undefined) {
			this.logger.debug('Repository not available, skipping unpublished check');
			return false;
		}

		try {
			// Fetch both versions in parallel
			const [publishedContent, unpublishedContent] = await Promise.all([
				repository.getPublishedContent(this.currentEnvironmentId, webResourceId),
				repository.getContent(this.currentEnvironmentId, webResourceId)
			]);

			const hasChanges = publishedContent !== unpublishedContent;

			this.logger.debug('Checked for unpublished changes', {
				webResourceId,
				hasChanges,
				publishedLength: publishedContent.length,
				unpublishedLength: unpublishedContent.length
			});

			return hasChanges;
		} catch (error) {
			// If check fails, proceed without diff (don't block opening)
			this.logger.warn('Failed to check for unpublished changes, proceeding without diff', error);
			return false;
		}
	}

	/**
	 * Shows diff between published and unpublished versions with version selection.
	 * User views the diff, then chooses which version to edit.
	 *
	 * Flow:
	 * 1. Show diff view (Published left, Unpublished right)
	 * 2. Show modal: "Edit Unpublished" / "Edit Published" / "Cancel"
	 * 3. Close diff, open chosen version as normal editable file
	 */
	private async showPublishedVsUnpublishedDiff(webResourceId: string, filename: string): Promise<void> {
		this.logger.info('Unpublished changes detected, showing diff for version selection', { webResourceId, filename });

		// Create URIs for both versions
		const publishedUri = createWebResourceUri(
			this.currentEnvironmentId,
			webResourceId,
			filename,
			'published'
		);

		const unpublishedUri = createWebResourceUri(
			this.currentEnvironmentId,
			webResourceId,
			filename
		);

		// Invalidate cache to ensure fresh content
		if (this.fileSystemProvider) {
			this.fileSystemProvider.invalidateCache(this.currentEnvironmentId, webResourceId);
		}

		// Open diff view: published (left) vs unpublished (right) - for viewing only
		await vscode.commands.executeCommand(
			'vscode.diff',
			publishedUri,
			unpublishedUri,
			`${filename}: Published ↔ Unpublished`
		);

		this.logger.debug('Diff view opened, showing version selection notification', { webResourceId });

		// Show non-modal notification so user can scroll the diff while deciding
		const selection = await vscode.window.showInformationMessage(
			'This file has unpublished changes. Which version do you want to edit?',
			'Edit Unpublished',
			'Edit Published',
			'Cancel'
		);

		// Close the diff view
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

		if (selection === 'Edit Unpublished') {
			this.logger.info('User chose to edit unpublished version', { webResourceId });
			await this.openWebResourceDirectly(webResourceId, filename, 'unpublished');

			// Offer to publish since we know there are unpublished changes
			this.offerToPublishUnpublishedChanges(webResourceId, filename);
		} else if (selection === 'Edit Published') {
			this.logger.info('User chose to edit published version', { webResourceId });
			await this.openWebResourceDirectly(webResourceId, filename, 'published');
		} else {
			// User clicked Cancel or dismissed the notification - diff is already closed
			this.logger.info('User cancelled version selection', { webResourceId });
		}
	}

	/**
	 * Opens a web resource directly in the editor.
	 *
	 * @param webResourceId - Web resource GUID
	 * @param filename - Display filename
	 * @param mode - 'unpublished' (default) or 'published'
	 */
	private async openWebResourceDirectly(
		webResourceId: string,
		filename: string,
		mode?: 'published' | 'unpublished'
	): Promise<void> {
		const uri = createWebResourceUri(
			this.currentEnvironmentId,
			webResourceId,
			filename,
			mode
		);

		// Invalidate our internal cache to ensure fresh fetch
		if (this.fileSystemProvider) {
			this.fileSystemProvider.invalidateCache(this.currentEnvironmentId, webResourceId);
		}

		// Open the document
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document, { preview: false });

		// Set language mode based on file extension (VS Code doesn't auto-detect for custom schemes)
		const languageId = this.getLanguageIdFromFilename(filename);
		if (languageId !== null && document.languageId !== languageId) {
			await vscode.languages.setTextDocumentLanguage(document, languageId);
		}

		this.logger.info('Opened web resource in editor', {
			webResourceId,
			filename,
			mode: mode ?? 'unpublished',
			environmentId: this.currentEnvironmentId
		});
	}

	/**
	 * Handles row selection from the webview.
	 * Enables/disables the Publish button based on selection.
	 */
	private handleRowSelect(webResourceId: string | null, name: string | null): void {
		this.selectedWebResourceId = webResourceId;
		this.selectedWebResourceName = name;

		// Enable/disable the Publish button
		void this.panel.postMessage({
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

		this.logger.debug('Publishing web resource', {
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

		this.logger.debug('Publishing all customizations via PublishAllXml');

		await this.publishBehavior.executePublish(
			'publishAll',
			async () => this.publishWebResourceUseCase.executeAll(this.currentEnvironmentId),
			'All customizations published successfully'
		);
	}

	/**
	 * Offers to publish unpublished changes when user opens the unpublished version.
	 * Shows a non-modal notification so user can continue working while deciding.
	 *
	 * @param webResourceId - Web resource GUID
	 * @param filename - Display filename
	 */
	private offerToPublishUnpublishedChanges(webResourceId: string, filename: string): void {
		// Fire and forget - don't await, let user continue working
		void vscode.window
			.showInformationMessage(
				`"${filename}" has unpublished changes. Would you like to publish them now?`,
				'Publish',
				'Not Now'
			)
			.then(async (choice) => {
				if (choice === 'Publish') {
					this.logger.info('User chose to publish unpublished changes', { webResourceId });
					await this.publishBehavior.executePublish(
						'publish',
						async () =>
							this.publishWebResourceUseCase.execute(this.currentEnvironmentId, webResourceId),
						`Published: ${filename}`
					);
				}
			});
	}

	/**
	 * Toggles between showing text-based types only and all types.
	 */
	private async handleToggleShowAll(): Promise<void> {
		this.showTextBasedOnly = !this.showTextBasedOnly;
		const newLabel = this.showTextBasedOnly ? 'Show All' : 'Text Only';

		this.logger.debug('Toggle show all types', { showTextBasedOnly: this.showTextBasedOnly });

		// Update button label
		await this.panel.postMessage({
			command: 'setButtonLabel',
			buttonId: 'toggleShowAll',
			label: newLabel
		});

		// Load with caching - use cached data if we've seen this filter state before
		await this.loadAndDisplayWebResources(false);
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
			await this.panel.postMessage({
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
			await this.panel.postMessage({
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
	 * Handles web resource save events from FileSystemProvider.
	 * Fetches the updated web resource and refreshes the table row.
	 *
	 * @param environmentId - Environment ID from the save event
	 * @param webResourceId - Web resource GUID that was saved
	 */
	private async handleWebResourceSaved(environmentId: string, webResourceId: string): Promise<void> {
		// Only process events for this panel's current environment
		if (environmentId !== this.currentEnvironmentId) {
			return;
		}

		this.logger.debug('WebResourcesPanel: Handling save event', { webResourceId, environmentId });

		try {
			// Fetch the updated web resource from the server
			const updatedResource = await this.webResourceRepository.findById(environmentId, webResourceId);

			if (updatedResource === null) {
				this.logger.warn('WebResourcesPanel: Saved web resource not found', { webResourceId });
				return;
			}

			// Update the cache with the new data
			const cacheKey = this.getCacheKey(this.currentSolutionId);
			const cachedData = this.dataCache.get(cacheKey);

			if (cachedData) {
				// Replace the old resource with the updated one in the cache
				const updatedCache = cachedData.map(wr =>
					wr.id === webResourceId ? updatedResource : wr
				);
				this.dataCache.set(cacheKey, updatedCache);
			}

			// Update the view (don't force refresh since we already have fresh data in cache)
			await this.loadAndDisplayWebResources(false);

			this.logger.info('WebResourcesPanel: Row refreshed after save', { webResourceId });
		} catch (error) {
			this.logger.error('WebResourcesPanel: Failed to refresh after save', error);
			// Don't throw - save was successful, just couldn't refresh
		}
	}

	/**
	 * Updates the virtual table display when cache state changes.
	 * Called by VirtualTableCacheManager.onStateChange callback.
	 * Note: Virtual table infrastructure is currently unused - all solutions use the use case path.
	 */
	private async updateVirtualTableData(records: readonly WebResource[], state: VirtualTableCacheState): Promise<void> {

		const viewModels = this.viewModelMapper.toViewModels(records);

		await this.panel.postMessage({
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

	/**
	 * Maps file extension to VS Code language ID for syntax highlighting.
	 * Returns null if extension is not recognized.
	 */
	private getLanguageIdFromFilename(filename: string): string | null {
		const ext = filename.toLowerCase().split('.').pop();
		if (ext === undefined) {
			return null;
		}

		const languageMap: Record<string, string> = {
			'js': 'javascript',
			'ts': 'typescript',
			'css': 'css',
			'html': 'html',
			'htm': 'html',
			'xml': 'xml',
			'xsl': 'xml',
			'xslt': 'xml',
			'svg': 'xml',
			'resx': 'xml',
			'json': 'json',
			'xap': 'plaintext'
		};

		return languageMap[ext] ?? null;
	}
}
