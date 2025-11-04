import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { IDataLoader } from '../../../../shared/infrastructure/ui/behaviors/IDataLoader';
import type { EnvironmentOption, DataTableConfig, SolutionOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { PanelTrackingBehavior } from '../../../../shared/infrastructure/ui/behaviors/PanelTrackingBehavior';
import { HtmlRenderingBehavior, type HtmlCustomization } from '../../../../shared/infrastructure/ui/behaviors/HtmlRenderingBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { SolutionFilterBehavior } from '../../../../shared/infrastructure/ui/behaviors/SolutionFilterBehavior';
import { MessageRoutingBehavior } from '../../../../shared/infrastructure/ui/behaviors/MessageRoutingBehavior';
import { DataTableBehaviorRegistry } from '../../../../shared/infrastructure/ui/behaviors/DataTableBehaviorRegistry';
import { DataTablePanelCoordinator, type CoordinatorDependencies } from '../../../../shared/infrastructure/ui/coordinators/DataTablePanelCoordinator';
import { ListConnectionReferencesUseCase } from '../../application/useCases/ListConnectionReferencesUseCase';
import { ExportConnectionReferencesToDeploymentSettingsUseCase } from '../../application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase';
import { FlowConnectionRelationshipCollectionService } from '../../domain/services/FlowConnectionRelationshipCollectionService';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { ConnectionReferencesDataLoader } from '../dataLoaders/ConnectionReferencesDataLoader';
import { isOpenFlowMessage } from '../../../../infrastructure/ui/utils/TypeGuards';
import { renderLinkClickHandler } from '../../../../shared/infrastructure/ui/views/clickableLinks';

/**
 * Presentation layer panel for Connection References.
 * Uses composition pattern with specialized behaviors instead of inheritance.
 */
export class ConnectionReferencesPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.connectionReferences';
	private static panels = new Map<string, ConnectionReferencesPanelComposed>();

	private readonly coordinator: DataTablePanelCoordinator;
	private readonly registry: DataTableBehaviorRegistry;
	private connectionReferences: ConnectionReference[] = [];
	private solutionOptions: SolutionOption[] = [];

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
		logger.debug('ConnectionReferencesPanel: Initialized');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		this.registry = this.createBehaviorRegistry(environmentId);
		this.coordinator = this.createCoordinator();
		this.registerPanelCommands();

		void this.coordinator.initialize();
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
		const column = vscode.ViewColumn.One;

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

		const panel = vscode.window.createWebviewPanel(
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

	private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
		const config = this.getConfig();
		const customization = this.getCustomization();

		const panelTrackingBehavior = new PanelTrackingBehavior(
			ConnectionReferencesPanelComposed.panels
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
			async () => { /* Coordinator handles reload */ },
			this.logger,
			environmentId
		);

		// Solution filter behavior (enabled)
		const solutionFilterBehavior = new SolutionFilterBehavior(
			this.panel.webview,
			'connectionReferences',
			environmentBehavior,
			async () => this.loadSolutions(),
			this.panelStateRepository,
			async () => { /* Coordinator handles reload */ },
			this.logger,
			true
		);

		const dataLoader = new ConnectionReferencesDataLoader(
			() => environmentBehavior.getCurrentEnvironmentId(),
			() => solutionFilterBehavior.getCurrentSolutionId(),
			this.listConnectionReferencesUseCase,
			this.relationshipCollectionService,
			this.logger
		);

		// Wrap data loader to capture connection references
		const wrappedDataLoader: IDataLoader = {
			load: async (cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> => {
				const result = await this.listConnectionReferencesUseCase.execute(
					environmentBehavior.getCurrentEnvironmentId() || '',
					solutionFilterBehavior.getCurrentSolutionId() || undefined,
					cancellationToken
				);
				this.connectionReferences = result.connectionReferences;

				// Use the actual data loader for transformation
				return dataLoader.load(cancellationToken);
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
		this.registry.messageRoutingBehavior.registerHandler('openFlow', async (message) => {
			if (isOpenFlowMessage(message)) {
				await this.handleOpenFlow(message.data.flowId);
			}
		});

		this.registry.messageRoutingBehavior.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		this.registry.messageRoutingBehavior.registerHandler('syncDeploymentSettings', async () => {
			await this.handleSyncDeploymentSettings();
		});
	}

	private async loadSolutions(): Promise<SolutionOption[]> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			return [];
		}

		try {
			this.solutionOptions = await this.solutionRepository.findAllForDropdown(envId);
			return this.solutionOptions;
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
	}

	private getConfig(): DataTableConfig {
		return {
			viewType: ConnectionReferencesPanelComposed.viewType,
			title: 'Connection References',
			dataCommand: 'connectionReferencesData',
			defaultSortColumn: 'flowName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'flowName', label: 'Flow Name' },
				{ key: 'connectionReferenceLogicalName', label: 'Connection Reference' },
				{ key: 'connectionReferenceDisplayName', label: 'CR Display Name' },
				{ key: 'relationshipType', label: 'Status' },
				{ key: 'flowIsManaged', label: 'Flow Managed' },
				{ key: 'flowModifiedOn', label: 'Flow Modified' },
				{ key: 'connectionReferenceIsManaged', label: 'CR Managed' },
				{ key: 'connectionReferenceModifiedOn', label: 'CR Modified' }
			],
			searchPlaceholder: '🔍 Search flows and connection references...',
			noDataMessage: 'No connection references found.',
			enableSolutionFilter: true,
			toolbarButtons: [
				{ id: 'openMakerBtn', label: 'Open in Maker', command: 'openMaker', position: 'left' },
				{ id: 'refreshBtn', label: 'Refresh', command: 'refresh', position: 'left' },
				{ id: 'syncDeploymentSettingsBtn', label: 'Sync Deployment Settings', command: 'syncDeploymentSettings', position: 'left' }
			]
		};
	}

	private getCustomization(): HtmlCustomization {
		return {
			customCss: `
				/* Highlight orphaned relationships */
				td:has(> span[data-status="Missing CR"]),
				td:has(> span[data-status="Unused CR"]) {
					color: #f48771;
				}
				td:has(> span[data-status="Valid"]) {
					color: #89d185;
				}
			`,
			filterLogic: `
				filtered = allData.filter(rel =>
					(rel.flowName || '').toLowerCase().includes(query) ||
					(rel.connectionReferenceLogicalName || '').toLowerCase().includes(query) ||
					(rel.connectionReferenceDisplayName || '').toLowerCase().includes(query) ||
					(rel.relationshipType || '').toLowerCase().includes(query)
				);
			`,
			customJavaScript: renderLinkClickHandler('.flow-link', 'openFlow', 'flowId')
		};
	}

	private async handleOpenFlow(flowId: string): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot open flow: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(envId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open flow: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const solutionId = this.registry.solutionFilterBehavior.getCurrentSolutionId();
		if (!solutionId) {
			this.logger.warn('Cannot open flow: No solution selected');
			vscode.window.showWarningMessage('Please select a solution to open flows.');
			return;
		}

		const url = this.urlBuilder.buildFlowUrl(environment.powerPlatformEnvironmentId, solutionId, flowId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened flow in Maker Portal', { flowId, solutionId });
	}

	private async handleOpenMaker(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot open Maker Portal: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(envId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			vscode.window.showErrorMessage('Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.');
			return;
		}

		const solutionId = this.registry.solutionFilterBehavior.getCurrentSolutionId();
		const url = this.urlBuilder.buildConnectionReferencesUrl(
			environment.powerPlatformEnvironmentId,
			solutionId || undefined
		);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened connection references in Maker Portal', { environmentId: envId, solutionId });
	}

	private async handleSyncDeploymentSettings(): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot sync deployment settings: No environment selected');
			return;
		}

		if (this.connectionReferences.length === 0) {
			vscode.window.showWarningMessage('No connection references to export.');
			return;
		}

		const solutionId = this.registry.solutionFilterBehavior.getCurrentSolutionId();
		const currentSolution = this.solutionOptions.find(sol => sol.id === solutionId);
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
				vscode.window.showInformationMessage(message);
			}
		} catch (error) {
			this.logger.error('Failed to sync deployment settings', error);
			vscode.window.showErrorMessage(`Failed to sync deployment settings: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
