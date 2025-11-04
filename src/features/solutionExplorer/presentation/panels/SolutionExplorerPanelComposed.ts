import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { EnvironmentOption, DataTableConfig } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelTrackingBehavior } from '../../../../shared/infrastructure/ui/behaviors/PanelTrackingBehavior';
import { HtmlRenderingBehavior, type HtmlCustomization } from '../../../../shared/infrastructure/ui/behaviors/HtmlRenderingBehavior';
import { DataBehavior } from '../../../../shared/infrastructure/ui/behaviors/DataBehavior';
import { EnvironmentBehavior } from '../../../../shared/infrastructure/ui/behaviors/EnvironmentBehavior';
import { SolutionFilterBehavior } from '../../../../shared/infrastructure/ui/behaviors/SolutionFilterBehavior';
import { MessageRoutingBehavior } from '../../../../shared/infrastructure/ui/behaviors/MessageRoutingBehavior';
import { DataTableBehaviorRegistry } from '../../../../shared/infrastructure/ui/behaviors/DataTableBehaviorRegistry';
import { DataTablePanelCoordinator, type CoordinatorDependencies } from '../../../../shared/infrastructure/ui/coordinators/DataTablePanelCoordinator';
import { ListSolutionsUseCase } from '../../application/useCases/ListSolutionsUseCase';
import { SolutionViewModelMapper } from '../../application/mappers/SolutionViewModelMapper';
import { SolutionDataLoader } from '../dataLoaders/SolutionDataLoader';
import { isOpenInMakerMessage } from '../../../../infrastructure/ui/utils/TypeGuards';
import { renderLinkClickHandler } from '../../../../shared/infrastructure/ui/views/clickableLinks';

/**
 * Presentation layer panel for Solution Explorer.
 * Uses composition pattern with specialized behaviors instead of inheritance.
 */
export class SolutionExplorerPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.solutionExplorer';
	private static panels = new Map<string, SolutionExplorerPanelComposed>();

	private readonly coordinator: DataTablePanelCoordinator;
	private readonly registry: DataTableBehaviorRegistry;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<{
			id: string;
			name: string;
			powerPlatformEnvironmentId: string | undefined;
		} | null>,
		private readonly listSolutionsUseCase: ListSolutionsUseCase,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly viewModelMapper: SolutionViewModelMapper,
		private readonly logger: ILogger,
		environmentId: string
	) {
		logger.debug('SolutionExplorerPanel: Initialized');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		// Create behaviors
		this.registry = this.createBehaviorRegistry(environmentId);
		this.coordinator = this.createCoordinator();

		// Register panel-specific command handlers
		this.registerPanelCommands();

		// Initialize panel asynchronously
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
		listSolutionsUseCase: ListSolutionsUseCase,
		urlBuilder: IMakerUrlBuilder,
		viewModelMapper: SolutionViewModelMapper,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<SolutionExplorerPanelComposed> {
		const column = vscode.ViewColumn.One;

		// Determine which environment to use
		let targetEnvironmentId = initialEnvironmentId;
		if (!targetEnvironmentId) {
			const environments = await getEnvironments();
			targetEnvironmentId = environments[0]?.id;
		}

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Check if panel already exists for this environment
		const existingPanel = SolutionExplorerPanelComposed.panels.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		const panel = vscode.window.createWebviewPanel(
			SolutionExplorerPanelComposed.viewType,
			`Solutions - ${environmentName}`,
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		const newPanel = new SolutionExplorerPanelComposed(
			panel,
			extensionUri,
			getEnvironments,
			getEnvironmentById,
			listSolutionsUseCase,
			urlBuilder,
			viewModelMapper,
			logger,
			targetEnvironmentId
		);

		SolutionExplorerPanelComposed.panels.set(targetEnvironmentId, newPanel);

		return newPanel;
	}

	private createBehaviorRegistry(environmentId: string): DataTableBehaviorRegistry {
		const config = this.getConfig();
		const customization = this.getCustomization();

		const panelTrackingBehavior = new PanelTrackingBehavior(
			SolutionExplorerPanelComposed.panels
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

		// Solution filter behavior (disabled - this IS the solution list)
		const solutionFilterBehavior = new SolutionFilterBehavior(
			this.panel.webview,
			'solutions',
			environmentBehavior,
			async () => [],
			undefined,
			async () => { /* No solution filtering */ },
			this.logger,
			false
		);

		const dataLoader = new SolutionDataLoader(
			() => environmentBehavior.getCurrentEnvironmentId(),
			this.listSolutionsUseCase,
			this.viewModelMapper,
			this.logger
		);

		const dataBehavior = new DataBehavior(
			this.panel.webview,
			config,
			dataLoader,
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
		// Open individual solution in Maker
		this.registry.messageRoutingBehavior.registerHandler('openInMaker', async (message) => {
			if (isOpenInMakerMessage(message)) {
				await this.handleOpenInMaker(message.data.solutionId);
			}
		});

		// Open solutions list in Maker
		this.registry.messageRoutingBehavior.registerHandler('openMaker', async () => {
			await this.handleOpenMakerSolutionsList();
		});
	}

	private getConfig(): DataTableConfig {
		return {
			viewType: SolutionExplorerPanelComposed.viewType,
			title: 'Solutions',
			dataCommand: 'solutionsData',
			defaultSortColumn: 'friendlyName',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'friendlyName', label: 'Solution Name' },
				{ key: 'uniqueName', label: 'Unique Name' },
				{ key: 'version', label: 'Version' },
				{ key: 'isManaged', label: 'Type' },
				{ key: 'publisherName', label: 'Publisher' },
				{ key: 'isVisible', label: 'Visible' },
				{ key: 'isApiManaged', label: 'API Managed' },
				{ key: 'installedOn', label: 'Installed On' },
				{ key: 'modifiedOn', label: 'Modified On' }
			],
			searchPlaceholder: '🔍 Search...',
			noDataMessage: 'No solutions found.',
			toolbarButtons: [
				{ id: 'openMakerBtn', label: 'Open in Maker', command: 'openMaker', position: 'left' },
				{ id: 'refreshBtn', label: 'Refresh', command: 'refresh', position: 'left' }
			]
		};
	}

	private getCustomization(): HtmlCustomization {
		return {
			customCss: '',
			filterLogic: `
				filtered = allData.filter(s =>
					s.friendlyName.toLowerCase().includes(query) ||
					s.uniqueName.toLowerCase().includes(query) ||
					s.publisherName.toLowerCase().includes(query) ||
					s.description.toLowerCase().includes(query)
				);
			`,
			customJavaScript: renderLinkClickHandler('.solution-link', 'openInMaker', 'solutionId')
		};
	}

	private async handleOpenInMaker(solutionId: string): Promise<void> {
		const envId = this.registry.environmentBehavior.getCurrentEnvironmentId();
		if (!envId) {
			this.logger.warn('Cannot open solution: No environment selected');
			return;
		}

		const environment = await this.getEnvironmentById(envId);
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

		const url = this.urlBuilder.buildSolutionsListUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened solutions list in Maker Portal', { environmentId: envId });
	}
}
