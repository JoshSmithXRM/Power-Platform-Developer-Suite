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
import type { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import type { ImportJob } from '../../domain/entities/ImportJob';
import { ImportJobDataProviderAdapter } from '../../infrastructure/adapters/ImportJobDataProviderAdapter';
import type { OpenImportLogUseCase } from '../../application/useCases/OpenImportLogUseCase';
import type { ImportJobViewModelMapper } from '../../application/mappers/ImportJobViewModelMapper';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';

/**
 * Commands supported by Import Job Viewer panel.
 */
type ImportJobViewerCommands = 'refresh' | 'openMaker' | 'viewImportJob' | 'environmentChange';

/**
 * Import Job Viewer panel using new PanelCoordinator architecture.
 * Displays list of import jobs for a specific environment.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class ImportJobViewerPanelComposed extends EnvironmentScopedPanel<ImportJobViewerPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.importJobViewer';
	private static panels = new Map<string, ImportJobViewerPanelComposed>();

	private readonly coordinator: PanelCoordinator<ImportJobViewerCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly virtualTableConfig: VirtualTableConfig;
	private currentEnvironmentId: string;
	private cacheManager: VirtualTableCacheManager<ImportJob>;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly importJobRepository: IImportJobRepository,
		private readonly openImportLogUseCase: OpenImportLogUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: ImportJobViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		logger.debug('ImportJobViewerPanel: Initialized with virtual table architecture');

		// Configure virtual table: 100 initial, up to 5000 cached (plenty for most import job lists)
		this.virtualTableConfig = VirtualTableConfig.create(100, 5000, 500, true);

		// Create cache manager with adapter binding environment
		const provider = new ImportJobDataProviderAdapter(importJobRepository, environmentId);
		this.cacheManager = new VirtualTableCacheManager(provider, this.virtualTableConfig, logger);

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

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
		importJobRepository: IImportJobRepository,
		openImportLogUseCase: OpenImportLogUseCase,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: ImportJobViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<ImportJobViewerPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: ImportJobViewerPanelComposed.viewType,
			titlePrefix: 'Import Jobs',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new ImportJobViewerPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				importJobRepository,
				openImportLogUseCase,
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
		}, ImportJobViewerPanelComposed.panels);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first so they appear on initial render
		const environments = await this.getEnvironments();

		// Initialize coordinator with environments and loading state
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			tableData: [],
			isLoading: true
		});

		// Load initial page of import jobs using cache manager
		const result = await this.cacheManager.loadInitialPage();
		const cacheState = this.cacheManager.getCacheState();

		// Map to ViewModels (sorting handled by ImportJobCollectionService via mapper)
		const viewModels = result.getItems()
			.map(job => this.viewModelMapper.toViewModel(job));

		this.logger.info('Import jobs loaded with virtual table', {
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

		// Set up callback to update UI during background loading
		this.cacheManager.onStateChange((state, cachedRecords) => {
			const updatedViewModels = cachedRecords
				.map(job => this.viewModelMapper.toViewModel(job));

			// Send updated data to webview (fire-and-forget, errors logged)
			this.panel.webview.postMessage({
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

	private createCoordinator(): { coordinator: PanelCoordinator<ImportJobViewerCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
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
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'import-jobs.css')
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
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'ImportJobViewerBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Import Jobs'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<ImportJobViewerCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh import jobs
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open import history in Maker
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMakerImportHistory();
		});

		// View individual import job log
		this.coordinator.registerHandler('viewImportJob', async (data) => {
			const importJobId = (data as { importJobId?: string })?.importJobId;
			if (importJobId) {
				await this.handleViewImportLog(importJobId);
			}
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});
	}

	private getTableConfig(): DataTableConfig {
		return {
			viewType: ImportJobViewerPanelComposed.viewType,
			title: 'Import Jobs',
			dataCommand: 'importJobsData',
			defaultSortColumn: 'createdOn',
			defaultSortDirection: 'desc',
			columns: [
				{ key: 'solutionName', label: 'Solution', type: 'name' },
				{ key: 'status', label: 'Status', type: 'status' },
				{ key: 'progress', label: 'Progress', type: 'progress' },
				{ key: 'createdBy', label: 'Created By', type: 'user' },
				{ key: 'createdOn', label: 'Created On', type: 'datetime' },
				{ key: 'duration', label: 'Duration', type: 'status' },
				{ key: 'operationContext', label: 'Operation Context', type: 'identifier' }
			],
			searchPlaceholder: '🔍 Search...',
			noDataMessage: 'No import jobs found.',
			toolbarButtons: []
		};
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing import jobs with virtual table');

		this.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			// Clear existing cache and reload
			this.cacheManager.clearCache();

			// Load initial page
			const result = await this.cacheManager.loadInitialPage();
			const cacheState = this.cacheManager.getCacheState();

			// Map to ViewModels (sorting handled by ImportJobCollectionService via mapper)
			const viewModels = result.getItems()
				.map(job => this.viewModelMapper.toViewModel(job));

			this.logger.info('Import jobs refreshed successfully', {
				initialCount: viewModels.length,
				totalCount: cacheState.getTotalRecordCount()
			});

			// Send data to frontend with pagination state
			await this.panel.webview.postMessage({
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
			this.logger.error('Error refreshing import jobs', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh import jobs: ${errorMessage}`);
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	private async handleViewImportLog(importJobId: string): Promise<void> {
		try {
			this.logger.info('Opening import log', { importJobId });

			const cancellationTokenSource = new vscode.CancellationTokenSource();
			const cancellationToken = new VsCodeCancellationTokenAdapter(cancellationTokenSource.token);

			await this.openImportLogUseCase.execute(this.currentEnvironmentId, importJobId, cancellationToken);

			this.logger.info('Import log opened successfully', { importJobId });
		} catch (error) {
			this.logger.error('Failed to open import log', error);
			vscode.window.showErrorMessage(`Failed to open import log: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async handleOpenMakerImportHistory(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildImportHistoryUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened import history in Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;

		// Clear old cache and create new cache manager for new environment
		this.cacheManager.clearCache();
		const newProvider = new ImportJobDataProviderAdapter(this.importJobRepository, environmentId);
		this.cacheManager = new VirtualTableCacheManager(newProvider, this.virtualTableConfig, this.logger);

		// Re-register state change callback for background loading updates
		this.cacheManager.onStateChange((state, cachedRecords) => {
			const updatedViewModels = cachedRecords
				.map(job => this.viewModelMapper.toViewModel(job));

			this.panel.webview.postMessage({
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

		// Re-register panel in map for new environment
		this.reregisterPanel(ImportJobViewerPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Import Jobs - ${environment.name}`;
		}

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment switches.
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

	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}
}
