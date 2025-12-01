import type * as vscode from 'vscode';
import * as vscodeImpl from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { SolutionFilterSection } from '../../../../shared/infrastructure/ui/sections/SolutionFilterSection';
import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { EnvironmentOption, SolutionOption, DataTableColumn, DataTableConfig } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { ListConnectionReferencesUseCase } from '../../application/useCases/ListConnectionReferencesUseCase';
import { ExportConnectionReferencesToDeploymentSettingsUseCase } from '../../application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase';
import { FlowConnectionRelationshipCollectionService } from '../../domain/services/FlowConnectionRelationshipCollectionService';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { FlowConnectionRelationshipViewModelMapper } from '../../application/mappers/FlowConnectionRelationshipViewModelMapper';
import { enhanceViewModelsWithFlowLinks } from '../views/FlowLinkView';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import type { HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';
import { VsCodeCancellationTokenAdapter } from '../../../../shared/infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';

/**
 * Commands that the Connection References panel can receive from the webview.
 */
type ConnectionReferencesCommands = 'refresh' | 'openMaker' | 'syncDeploymentSettings' | 'openFlow' | 'environmentChange' | 'solutionChange';

/**
 * Presentation layer panel for Connection References.
 * Uses universal panel pattern with section composition.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class ConnectionReferencesPanelComposed extends EnvironmentScopedPanel<ConnectionReferencesPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.connectionReferences';
	private static panels = new Map<string, ConnectionReferencesPanelComposed>();

	private coordinator!: PanelCoordinator<ConnectionReferencesCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;
	private loadingBehavior!: LoadingStateBehavior;
	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;
	private connectionReferences: ConnectionReference[] = [];
	private solutionOptions: SolutionOption[] = [];
	private readonly viewModelMapper: FlowConnectionRelationshipViewModelMapper;

	// Request versioning to prevent stale responses from overwriting fresh data
	// Incremented on each solution change; responses with outdated version are discarded
	private requestVersion: number = 0;

	// Cancellation source for in-flight solution data requests
	// Cancelled when user switches solutions to stop wasted API calls
	private currentCancellationSource: vscode.CancellationTokenSource | null = null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly relationshipCollectionService: FlowConnectionRelationshipCollectionService,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.viewModelMapper = new FlowConnectionRelationshipViewModelMapper();
		logger.debug('ConnectionReferencesPanel: Initialized');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const { coordinator, scaffoldingBehavior } = this.createCoordinator();
		this.coordinator = coordinator;
		this.scaffoldingBehavior = scaffoldingBehavior;

		// Initialize loading behavior for toolbar buttons
		// Note: openMaker excluded - it only needs environmentId which is already known
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(['refresh', 'syncDeploymentSettings']),
			logger
		);

		this.registerPanelCommands();

		void this.initializeAndLoadData();
	}

	/**
	 * Reveals the panel in the specified column.
	 */
	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		relationshipCollectionService: FlowConnectionRelationshipCollectionService,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<ConnectionReferencesPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: ConnectionReferencesPanelComposed.viewType,
			titlePrefix: 'Connection References',
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new ConnectionReferencesPanelComposed(
				panel,
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				listConnectionReferencesUseCase,
				exportToDeploymentSettingsUseCase,
				solutionRepository,
				urlBuilder,
				relationshipCollectionService,
				logger,
				envId,
				panelStateRepository
			),
			webviewOptions: {
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		}, ConnectionReferencesPanelComposed.panels);
	}

	private getTableConfig(): DataTableConfig {
		const columns: DataTableColumn[] = [
			{ key: 'flowName', label: 'Flow Name', type: 'name' },
			{ key: 'connectionReferenceDisplayName', label: 'CR Display Name', type: 'name' },
			{ key: 'connectionReferenceLogicalName', label: 'Connection Reference', type: 'identifier' },
			{ key: 'relationshipType', label: 'Status', type: 'status' },
			{ key: 'flowIsManaged', label: 'Flow Managed', type: 'boolean' },
			{ key: 'flowModifiedOn', label: 'Flow Modified', type: 'datetime' },
			{ key: 'connectionReferenceIsManaged', label: 'CR Managed', type: 'boolean' },
			{ key: 'connectionReferenceModifiedOn', label: 'CR Modified On', type: 'datetime' }
		];

		return {
			viewType: ConnectionReferencesPanelComposed.viewType,
			title: 'Connection References',
			dataCommand: 'connectionReferencesData',
			defaultSortColumn: 'flowName',
			defaultSortDirection: 'asc',
			columns,
			searchPlaceholder: '🔍 Search flows and connection references...',
			noDataMessage: 'No connection references found.',
			toolbarButtons: []
		};
	}

	private createCoordinator(): { coordinator: PanelCoordinator<ConnectionReferencesCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const environmentSelector = new EnvironmentSelectorSection();
		const solutionFilter = new SolutionFilterSection();

		const tableConfig = this.getTableConfig();

		const tableSection = new DataTableSection(tableConfig);

		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'openMaker', label: 'Open in Maker' },
				{ id: 'refresh', label: 'Refresh' },
				{ id: 'syncDeploymentSettings', label: 'Sync Deployment Settings' }
			]
		}, SectionPosition.Toolbar);

		// Order: action buttons, solution filter, environment selector (far right), then table
		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, solutionFilter, environmentSelector, tableSection],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'solution-filter', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscodeImpl.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'connection-references.css')
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'ConnectionReferencesBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Connection References'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<ConnectionReferencesCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerPanelCommands(): void {
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		this.coordinator.registerHandler('solutionChange', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId) {
				await this.handleSolutionChange(solutionId);
			}
		});

		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		this.coordinator.registerHandler('syncDeploymentSettings', async () => {
			await this.handleSyncDeploymentSettings();
		});

		this.coordinator.registerHandler('openFlow', async (data) => {
			const flowId = (data as { flowId?: string })?.flowId;
			if (flowId) {
				await this.handleOpenFlow(flowId);
			}
		});

		// Note: Panel disposal is handled by EnvironmentScopedPanel base class
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load persisted solution ID immediately (optimistic - no validation yet)
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: 'connectionReferences',
					environmentId: this.currentEnvironmentId
				});
				if (state && typeof state === 'object' && 'selectedSolutionId' in state) {
					const savedId = state.selectedSolutionId as string | undefined;
					if (savedId) {
						this.currentSolutionId = savedId;
					}
				}
			} catch (error) {
				this.logger.warn('Failed to load panel state', error);
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

		// Disable refresh button during initial load (shows spinner)
		await this.loadingBehavior.setLoading(true);

		try {
			// Load solutions first so user can see/interact with dropdown while data loads
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
							{ panelType: 'connectionReferences', environmentId: this.currentEnvironmentId },
							{ selectedSolutionId: DEFAULT_SOLUTION_ID, lastUpdated: new Date().toISOString() }
						);
					}
				}
			}

			// IMMEDIATELY render solutions (user can interact while data loads)
			await this.scaffoldingBehavior.refresh({
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				solutions,
				currentSolutionId: finalSolutionId,
				tableData: []
			});

			// Show loading state in table AFTER scaffold refresh (refresh replaces HTML, so loading must come after)
			this.showTableLoading();

			// Set up cancellation for initial data load (can be cancelled by solution change)
			const myVersion = ++this.requestVersion;
			if (this.currentCancellationSource) {
				this.currentCancellationSource.cancel();
				this.currentCancellationSource.dispose();
			}
			this.currentCancellationSource = new vscodeImpl.CancellationTokenSource();
			const cancellationToken = this.currentCancellationSource.token;

			// NOW load data (user sees solutions dropdown, can change selection while waiting)
			const data = await this.loadData(cancellationToken);

			// Check if superseded by solution change during load
			if (this.requestVersion !== myVersion) {
				this.logger.debug('Initial load superseded by solution change, discarding', {
					myVersion,
					currentVersion: this.requestVersion
				});
				return;
			}

			// Final render with data
			await this.scaffoldingBehavior.refresh({
				environments,
				currentEnvironmentId: this.currentEnvironmentId,
				solutions,
				currentSolutionId: finalSolutionId,
				tableData: data
			});
		} finally {
			// Re-enable buttons after load completes
			await this.loadingBehavior.setLoading(false);
		}
	}

	/**
	 * Renders connection references data.
	 *
	 * @param requestVersion - Optional version to detect stale responses. If provided and
	 *                         doesn't match current version, the response is discarded.
	 * @param cancellationToken - Optional token to cancel the operation if user changes solution
	 */
	private async render(
		requestVersion?: number,
		cancellationToken?: vscode.CancellationToken
	): Promise<void> {
		try {
			const data = await this.loadData(cancellationToken);

			// Check for stale response: if version was provided and has changed, discard this response
			if (requestVersion !== undefined && requestVersion !== this.requestVersion) {
				this.logger.debug('Discarding stale connection references response', {
					requestVersion,
					currentVersion: this.requestVersion
				});
				return;
			}

			const config = this.getTableConfig();

			// Data-driven update: Send ViewModels to frontend
			await this.panel.webview.postMessage({
				command: 'updateTableData',
				data: {
					viewModels: data,
					columns: config.columns,
					noDataMessage: config.noDataMessage
				}
			});
		} catch (error: unknown) {
			// Silently ignore cancellation - user switched solutions so this response is not needed
			if (error instanceof OperationCancelledException) {
				this.logger.debug('Connection references request cancelled - user switched solutions');
				return;
			}
			throw error; // Re-throw non-cancellation errors
		}
	}

	private async loadSolutions(): Promise<SolutionOption[]> {
		if (!this.currentEnvironmentId) {
			return [];
		}

		try {
			this.solutionOptions = await this.solutionRepository.findAllForDropdown(this.currentEnvironmentId);
			return this.solutionOptions;
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
	}

	/**
	 * Loads connection reference data from the use case.
	 *
	 * @param cancellationToken - Optional token to cancel the operation
	 */
	private async loadData(cancellationToken?: vscode.CancellationToken): Promise<Record<string, unknown>[]> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load connection references: No environment selected');
			return [];
		}

		this.logger.info('Loading connection references', {
			environmentId: this.currentEnvironmentId,
			solutionId: this.currentSolutionId
		});

		// Wrap VS Code token in domain adapter if provided
		const domainToken = cancellationToken
			? new VsCodeCancellationTokenAdapter(cancellationToken)
			: undefined;

		try {
			const result = await this.listConnectionReferencesUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId,
				domainToken // Pass cancellation token to use case
			);

			this.connectionReferences = result.connectionReferences;

			if (domainToken?.isCancellationRequested) {
				return [];
			}

			const sortedRelationships = this.relationshipCollectionService.sort(result.relationships);
			const viewModels = this.viewModelMapper.toViewModels(sortedRelationships);
			const enhancedViewModels = enhanceViewModelsWithFlowLinks(viewModels);

			this.logger.info('Connection references loaded successfully', { count: result.relationships.length });

			return enhancedViewModels;
		} catch (error) {
			this.logger.error('Failed to load connection references', error);
			return [];
		}
	}

	/**
	 * Refreshes connection references data.
	 *
	 * @param requestVersion - Optional version to detect stale responses. If provided and
	 *                         doesn't match current version, the response is discarded.
	 * @param cancellationToken - Optional token to cancel the operation if user changes solution
	 */
	private async handleRefresh(
		requestVersion?: number,
		cancellationToken?: vscode.CancellationToken
	): Promise<void> {
		await this.loadingBehavior.setButtonLoading('refresh', true);
		this.showTableLoading();

		try {
			await this.render(requestVersion, cancellationToken);
		} finally {
			await this.loadingBehavior.setButtonLoading('refresh', false);
		}
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;
		this.currentSolutionId = DEFAULT_SOLUTION_ID;

		// Re-register panel in map for new environment
		this.reregisterPanel(ConnectionReferencesPanelComposed.panels, oldEnvironmentId, this.currentEnvironmentId);

		const environment = await this.getEnvironmentById(environmentId);
		this.panel.title = `Connection References - ${environment?.name || 'Unknown'}`;

		// Load saved solution selection for new environment
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: 'connectionReferences',
					environmentId: this.currentEnvironmentId
				});
				if (state && typeof state === 'object' && 'selectedSolutionId' in state) {
					const savedId = state.selectedSolutionId as string | undefined;
					if (savedId) {
						this.currentSolutionId = savedId;
					}
				}
			} catch (error) {
				this.logger.warn('Failed to load panel state for new environment', error);
			}
		}

		// handleRefresh handles loading state
		await this.handleRefresh();
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
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
		this.currentCancellationSource = new vscodeImpl.CancellationTokenSource();
		const cancellationToken = this.currentCancellationSource.token;

		// Always save concrete solution selection to panel state
		if (this.panelStateRepository) {
			await this.panelStateRepository.save(
				{ panelType: 'connectionReferences', environmentId: this.currentEnvironmentId },
				{ selectedSolutionId: solutionId, lastUpdated: new Date().toISOString() }
			);
		}

		// handleRefresh handles loading state
		// Pass version and cancellation token to detect/cancel stale operations
		await this.handleRefresh(myVersion, cancellationToken);
	}

	private async handleOpenFlow(flowId: string): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open flow: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open flow: Environment ID not configured');
			vscodeImpl.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildFlowUrl(environment.powerPlatformEnvironmentId, this.currentSolutionId, flowId);
		await vscodeImpl.env.openExternal(vscodeImpl.Uri.parse(url));
		this.logger.info('Opened flow in Maker Portal', { flowId, solutionId: this.currentSolutionId });
	}

	private async handleOpenMaker(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscodeImpl.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const url = this.urlBuilder.buildConnectionReferencesUrl(
			environment.powerPlatformEnvironmentId,
			this.currentSolutionId
		);
		await vscodeImpl.env.openExternal(vscodeImpl.Uri.parse(url));
		this.logger.info('Opened connection references in Maker Portal', { environmentId: this.currentEnvironmentId, solutionId: this.currentSolutionId });
	}

	private async handleSyncDeploymentSettings(): Promise<void> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot sync deployment settings: No environment selected');
			return;
		}

		if (this.connectionReferences.length === 0) {
			vscodeImpl.window.showWarningMessage('No connection references to export.');
			return;
		}

		const currentSolution = this.solutionOptions.find(sol => sol.id === this.currentSolutionId);
		const filename = currentSolution
			? `${currentSolution.uniqueName}.deploymentsettings.json`
			: 'deploymentsettings.json';

		this.logger.info('Syncing deployment settings', {
			count: this.connectionReferences.length,
			filename
		});

		try {
			const result = await this.exportToDeploymentSettingsUseCase.execute(
				this.connectionReferences,
				filename
			);

			if (result) {
				const message = `Synced deployment settings: ${result.added} added, ${result.removed} removed, ${result.preserved} preserved`;
				this.logger.info(message);
				vscodeImpl.window.showInformationMessage(message);
			}
		} catch (error) {
			this.logger.error('Failed to sync deployment settings', error);
			vscodeImpl.window.showErrorMessage(`Failed to sync deployment settings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Shows loading spinner in the table.
	 * Provides visual feedback during environment/solution switches.
	 */
	private showTableLoading(): void {
		this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: [],
				columns: this.getTableConfig().columns,
				isLoading: true
			}
		});
	}

}
