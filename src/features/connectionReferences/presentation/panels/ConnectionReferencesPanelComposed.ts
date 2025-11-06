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

/**
 * Commands that the Connection References panel can receive from the webview.
 */
type ConnectionReferencesCommands = 'refresh' | 'openMaker' | 'syncDeploymentSettings' | 'openFlow' | 'environmentChange' | 'solutionChange';

/**
 * Presentation layer panel for Connection References.
 * Uses universal panel pattern with section composition.
 */
export class ConnectionReferencesPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.connectionReferences';
	private static panels = new Map<string, ConnectionReferencesPanelComposed>();

	private coordinator!: PanelCoordinator<ConnectionReferencesCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;
	private currentEnvironmentId: string;
	private currentSolutionId: string | undefined;
	private connectionReferences: ConnectionReference[] = [];
	private solutionOptions: SolutionOption[] = [];
	private readonly viewModelMapper: FlowConnectionRelationshipViewModelMapper;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly relationshipCollectionService: FlowConnectionRelationshipCollectionService,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
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

		void this.initialize();
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
		exportToDeploymentSettingsUseCase: ExportConnectionReferencesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		relationshipCollectionService: FlowConnectionRelationshipCollectionService,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<ConnectionReferencesPanelComposed> {
		const column = vscodeImpl.ViewColumn.One;

		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		const existingPanel = ConnectionReferencesPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscodeImpl.window.createWebviewPanel(
			ConnectionReferencesPanelComposed.viewType,
			`Connection References - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new ConnectionReferencesPanelComposed(
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
			targetEnvironmentId,
			panelStateRepository
		);

		ConnectionReferencesPanelComposed.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	private createCoordinator(): { coordinator: PanelCoordinator<ConnectionReferencesCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		// Create sections
		const environmentSelector = new EnvironmentSelectorSection();
		const solutionFilter = new SolutionFilterSection();

		const columns: DataTableColumn[] = [
			{ key: 'flowName', label: 'Flow Name' },
			{ key: 'connectionReferenceLogicalName', label: 'Connection Reference' },
			{ key: 'connectionReferenceDisplayName', label: 'CR Display Name' },
			{ key: 'relationshipType', label: 'Status' },
			{ key: 'flowIsManaged', label: 'Flow Managed' },
			{ key: 'flowModifiedOn', label: 'Flow Modified' },
			{ key: 'connectionReferenceIsManaged', label: 'CR Managed' },
			{ key: 'connectionReferenceModifiedOn', label: 'CR Modified' }
		];

		const tableConfig: DataTableConfig = {
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

		// Create HTML scaffolding behavior
		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscodeImpl.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
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

		// Create coordinator
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
			await this.handleSolutionChange(solutionId || undefined);
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

		// Panel disposal
		this.panel.onDidDispose(() => {
			ConnectionReferencesPanelComposed.panels.delete(this.currentEnvironmentId);
		});
	}

	private async initialize(): Promise<void> {
		// Load saved solution selection from panel state
		if (this.panelStateRepository) {
			try {
				const state = await this.panelStateRepository.load({
					panelType: 'connectionReferences',
					environmentId: this.currentEnvironmentId
				});
				if (state && typeof state === 'object' && 'selectedSolutionId' in state) {
					this.currentSolutionId = state.selectedSolutionId as string | undefined;
				}
			} catch (error) {
				this.logger.warn('Failed to load panel state', error);
			}
		}

		await this.render();
	}

	private async render(): Promise<void> {
		const environments = await this.getEnvironments();
		const solutions = await this.loadSolutions();
		const data = await this.loadData();

		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions,
			currentSolutionId: this.currentSolutionId,
			tableData: data
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
				this.currentSolutionId || undefined,
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
		// Remove old panel from registry
		ConnectionReferencesPanelComposed.panels.delete(this.currentEnvironmentId);

		this.currentEnvironmentId = environmentId;
		this.currentSolutionId = undefined;

		// Add new panel to registry
		ConnectionReferencesPanelComposed.panels.set(this.currentEnvironmentId, this);

		// Update panel title
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
					this.currentSolutionId = state.selectedSolutionId as string | undefined;
				}
			} catch (error) {
				this.logger.warn('Failed to load panel state for new environment', error);
			}
		}

		await this.handleRefresh();
	}

	private async handleSolutionChange(solutionId: string | undefined): Promise<void> {
		this.currentSolutionId = solutionId;

		// Save solution selection to panel state
		if (this.panelStateRepository) {
			if (solutionId) {
				await this.panelStateRepository.save(
					{ panelType: 'connectionReferences', environmentId: this.currentEnvironmentId },
					{ selectedSolutionId: solutionId, lastUpdated: new Date().toISOString() }
				);
			} else {
				await this.panelStateRepository.clear({
					panelType: 'connectionReferences',
					environmentId: this.currentEnvironmentId
				});
			}
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

		if (!this.currentSolutionId) {
			this.logger.warn('Cannot open flow: No solution selected');
			vscodeImpl.window.showWarningMessage('Please select a solution to open flows.');
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
			this.currentSolutionId || undefined
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
}
