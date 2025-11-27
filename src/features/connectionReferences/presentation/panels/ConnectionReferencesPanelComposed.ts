import type * as vscode from 'vscode';
import * as vscodeImpl from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
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
	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;
	private connectionReferences: ConnectionReference[] = [];
	private solutionOptions: SolutionOption[] = [];
	private readonly viewModelMapper: FlowConnectionRelationshipViewModelMapper;

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
			{ key: 'connectionReferenceLogicalName', label: 'Connection Reference', type: 'identifier' },
			{ key: 'connectionReferenceDisplayName', label: 'CR Display Name', type: 'name' },
			{ key: 'relationshipType', label: 'Status', type: 'status' },
			{ key: 'flowIsManaged', label: 'Flow Managed', type: 'boolean' },
			{ key: 'flowModifiedOn', label: 'Flow Modified', type: 'datetime' },
			{ key: 'connectionReferenceIsManaged', label: 'CR Managed', type: 'boolean' },
			{ key: 'connectionReferenceModifiedOn', label: 'CR Modified', type: 'datetime' }
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

		// PARALLEL LOADING - Don't wait for solutions to load data!
		const [solutions, data] = await Promise.all([
			this.loadSolutions(),
			this.loadData()
		]);

		// Post-load validation: Check if persisted solution still exists
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

		// Final render with both solutions and data
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions,
			currentSolutionId: finalSolutionId,
			tableData: data
		});
	}

	private async render(): Promise<void> {
		const data = await this.loadData();

		// Data-driven update: Send ViewModels to frontend
		await this.panel.webview.postMessage({
			command: 'updateTableData',
			data: {
				viewModels: data,
				columns: this.getTableConfig().columns
			}
		});
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

	private async loadData(): Promise<Record<string, unknown>[]> {
		if (!this.currentEnvironmentId) {
			this.logger.warn('Cannot load connection references: No environment selected');
			return [];
		}

		this.logger.info('Loading connection references', {
			environmentId: this.currentEnvironmentId,
			solutionId: this.currentSolutionId
		});

		const cancellationToken: ICancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: (): vscode.Disposable => ({ dispose: (): void => {} })
		};

		try {
			const result = await this.listConnectionReferencesUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId,
				cancellationToken
			);

			this.connectionReferences = result.connectionReferences;

			if (cancellationToken.isCancellationRequested) {
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

	private async handleRefresh(): Promise<void> {
		await this.render();
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.setButtonLoading('refresh', true);
		this.clearTable();

		try {
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

			await this.handleRefresh();
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
		this.currentSolutionId = solutionId;
		this.clearTable();

		// Always save concrete solution selection to panel state
		if (this.panelStateRepository) {
			await this.panelStateRepository.save(
				{ panelType: 'connectionReferences', environmentId: this.currentEnvironmentId },
				{ selectedSolutionId: solutionId, lastUpdated: new Date().toISOString() }
			);
		}

		await this.handleRefresh();
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
