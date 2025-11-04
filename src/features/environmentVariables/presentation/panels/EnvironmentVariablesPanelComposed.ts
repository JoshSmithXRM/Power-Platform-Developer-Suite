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
import { ListEnvironmentVariablesUseCase } from '../../application/useCases/ListEnvironmentVariablesUseCase';
import { ExportEnvironmentVariablesToDeploymentSettingsUseCase } from '../../application/useCases/ExportEnvironmentVariablesToDeploymentSettingsUseCase';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import { EnvironmentVariablesDataLoader } from '../dataLoaders/EnvironmentVariablesDataLoader';

/**
 * Presentation layer panel for Environment Variables.
 * Uses composition pattern with specialized behaviors instead of inheritance.
 */
export class EnvironmentVariablesPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.environmentVariables';
	private static panels = new Map<string, EnvironmentVariablesPanelComposed>();

	private readonly coordinator: DataTablePanelCoordinator;
	private readonly registry: DataTableBehaviorRegistry;
	private environmentVariables: EnvironmentVariable[] = [];
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
		private readonly listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		private readonly exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		environmentId: string,
		private readonly panelStateRepository: IPanelStateRepository | undefined
	) {
		logger.debug('EnvironmentVariablesPanel: Initialized');

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
		listEnvVarsUseCase: ListEnvironmentVariablesUseCase,
		exportToDeploymentSettingsUseCase: ExportEnvironmentVariablesToDeploymentSettingsUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string,
		panelStateRepository?: IPanelStateRepository
	): Promise<EnvironmentVariablesPanelComposed> {
		const column = vscode.ViewColumn.One;

		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		const existingPanel = EnvironmentVariablesPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			EnvironmentVariablesPanelComposed.viewType,
			`Environment Variables - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new EnvironmentVariablesPanelComposed(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listEnvVarsUseCase,
			exportToDeploymentSettingsUseCase,
			solutionRepository,
			urlBuilder,
			logger,
			targetEnvironmentId,
			panelStateRepository
		);

		EnvironmentVariablesPanelComposed.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
		const config = this.getConfig();
		const customization = this.getCustomization();

		const panelTrackingBehavior = new PanelTrackingBehavior(
			EnvironmentVariablesPanelComposed.panels
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
			'environmentVariables',
			environmentBehavior,
			async () => this.loadSolutions(),
			this.panelStateRepository,
			async () => { /* Coordinator handles reload */ },
			this.logger,
			true
		);

		const dataLoader = new EnvironmentVariablesDataLoader(
			() => environmentBehavior.getCurrentEnvironmentId(),
			() => solutionFilterBehavior.getCurrentSolutionId(),
			this.listEnvVarsUseCase,
			this.logger
		);

		// Wrap data loader to capture environment variables
		const wrappedDataLoader: IDataLoader = {
			load: async (cancellationToken: ICancellationToken): Promise<Record<string, unknown>[]> => {
				const envId = environmentBehavior.getCurrentEnvironmentId();
				const solutionId = solutionFilterBehavior.getCurrentSolutionId();

				this.environmentVariables = await this.listEnvVarsUseCase.execute(
					envId || '',
					solutionId || undefined,
					cancellationToken
				);

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
			viewType: EnvironmentVariablesPanelComposed.viewType,
			title: 'Environment Variables',
			dataCommand: 'environmentVariablesData',
			defaultSortColumn: 'schemaName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'schemaName', label: 'Schema Name' },
				{ key: 'displayName', label: 'Display Name' },
				{ key: 'type', label: 'Type' },
				{ key: 'currentValue', label: 'Current Value' },
				{ key: 'defaultValue', label: 'Default Value' },
				{ key: 'isManaged', label: 'Managed' },
				{ key: 'modifiedOn', label: 'Modified On' }
			],
			searchPlaceholder: '🔍 Search environment variables...',
			noDataMessage: 'No environment variables found.',
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
			customCss: '',
			filterLogic: `
				filtered = allData.filter(ev =>
					(ev.schemaName || '').toLowerCase().includes(query) ||
					(ev.displayName || '').toLowerCase().includes(query) ||
					(ev.type || '').toLowerCase().includes(query) ||
					(ev.currentValue || '').toLowerCase().includes(query) ||
					(ev.defaultValue || '').toLowerCase().includes(query) ||
					(ev.description || '').toLowerCase().includes(query)
				);
			`,
			customJavaScript: ''
		};
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
		const url = this.urlBuilder.buildEnvironmentVariablesObjectsUrl(
			environment.powerPlatformEnvironmentId,
			solutionId || undefined
		);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened environment variables in Maker Portal', { environmentId: envId, solutionId });
	}

	private async handleSyncDeploymentSettings(): Promise<void> {
		if (this.environmentVariables.length === 0) {
			vscode.window.showWarningMessage('No environment variables to export.');
			return;
		}

		const solutionId = this.registry.solutionFilterBehavior.getCurrentSolutionId();
		const currentSolution = this.solutionOptions.find(sol => sol.id === solutionId);
		const filename = currentSolution
			? `${currentSolution.uniqueName}.deploymentsettings.json`
			: 'deploymentsettings.json';

		this.logger.info('Syncing deployment settings', {
			count: this.environmentVariables.length,
			filename
		});

		try {
			const result = await this.exportToDeploymentSettingsUseCase.execute(
				this.environmentVariables,
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
