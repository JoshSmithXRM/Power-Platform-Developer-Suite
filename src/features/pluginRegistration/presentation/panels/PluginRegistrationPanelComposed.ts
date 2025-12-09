import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IMakerUrlBuilder } from '../../../../shared/domain/interfaces/IMakerUrlBuilder';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import {
	HtmlScaffoldingBehavior,
	type HtmlScaffoldingConfig,
} from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { SolutionFilterSection } from '../../../../shared/infrastructure/ui/sections/SolutionFilterSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';
import {
	EnvironmentScopedPanel,
	type EnvironmentInfo,
} from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';
import type { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { SolutionOption } from '../../../../shared/infrastructure/ui/views/solutionFilterView';
import type { LoadPluginRegistrationTreeUseCase } from '../../application/useCases/LoadPluginRegistrationTreeUseCase';
import { PluginRegistrationTreeMapper } from '../../application/mappers/PluginRegistrationTreeMapper';
import { PluginRegistrationTreeSection } from '../sections/PluginRegistrationTreeSection';

/**
 * Commands supported by Plugin Registration panel.
 */
type PluginRegistrationCommands =
	| 'refresh'
	| 'openMaker'
	| 'environmentChange'
	| 'solutionChange'
	| 'selectNode'
	| 'filterTree';

/**
 * Plugin Registration panel using PanelCoordinator architecture.
 * Displays hierarchical tree of plugin packages, assemblies, types, steps, and images.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class PluginRegistrationPanelComposed extends EnvironmentScopedPanel<PluginRegistrationPanelComposed> {
	public static readonly viewType = 'powerPlatformDevSuite.pluginRegistration';
	private static panels = new Map<string, PluginRegistrationPanelComposed>();

	private readonly coordinator: PanelCoordinator<PluginRegistrationCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly loadingBehavior: LoadingStateBehavior;
	private readonly treeMapper: PluginRegistrationTreeMapper;

	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly loadTreeUseCase: LoadPluginRegistrationTreeUseCase,
		private readonly solutionRepository: ISolutionRepository,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.treeMapper = new PluginRegistrationTreeMapper();

		logger.debug('PluginRegistrationPanel: Initializing');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri],
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Initialize loading behavior for toolbar buttons
		this.loadingBehavior = new LoadingStateBehavior(
			panel,
			LoadingStateBehavior.createButtonConfigs(['openMaker', 'refresh']),
			logger
		);

		this.registerCommandHandlers();

		void this.initializeAndLoadData();
	}

	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	protected getCurrentEnvironmentId(): string {
		return this.currentEnvironmentId;
	}

	public static async createOrShow(
		extensionUri: vscode.Uri,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		loadTreeUseCase: LoadPluginRegistrationTreeUseCase,
		solutionRepository: ISolutionRepository,
		urlBuilder: IMakerUrlBuilder,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<PluginRegistrationPanelComposed> {
		return EnvironmentScopedPanel.createOrShowPanel(
			{
				viewType: PluginRegistrationPanelComposed.viewType,
				titlePrefix: 'Plugin Registration',
				extensionUri,
				getEnvironments,
				getEnvironmentById,
				initialEnvironmentId,
				panelFactory: (panel, envId) =>
					new PluginRegistrationPanelComposed(
						panel,
						extensionUri,
						getEnvironments,
						getEnvironmentById,
						loadTreeUseCase,
						solutionRepository,
						urlBuilder,
						logger,
						envId
					),
				webviewOptions: {
					enableScripts: true,
					localResourceRoots: [extensionUri],
					retainContextWhenHidden: true,
					enableFindWidget: true,
				},
			},
			PluginRegistrationPanelComposed.panels
		);
	}

	private async initializeAndLoadData(): Promise<void> {
		// Load environments first
		const environments = await this.getEnvironments();

		// Initial render with loading state
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId,
			solutions: [],
			currentSolutionId: this.currentSolutionId,
			isLoading: true,
		});

		// Disable buttons during initial load
		await this.loadingBehavior.setLoading(true);

		try {
			// Load solutions for dropdown
			const solutions = await this.loadSolutions();

			// Update solutions dropdown
			await this.panel.postMessage({
				command: 'updateSolutionSelector',
				data: {
					solutions,
					currentSolutionId: this.currentSolutionId,
				},
			});

			// Load tree data
			await this.handleRefresh();
		} finally {
			await this.loadingBehavior.setLoading(false);
		}
	}

	private async loadSolutions(): Promise<SolutionOption[]> {
		try {
			return await this.solutionRepository.findAllForDropdown(this.currentEnvironmentId);
		} catch (error) {
			this.logger.error('Failed to load solutions', error);
			return [];
		}
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<PluginRegistrationCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		const environmentSelector = new EnvironmentSelectorSection();
		const solutionFilter = new SolutionFilterSection();
		const treeSection = new PluginRegistrationTreeSection();
		const actionButtons = new ActionButtonsSection(
			{
				buttons: [
					{ id: 'openMaker', label: 'Open in Maker' },
					{ id: 'refresh', label: 'Refresh' },
				],
			},
			SectionPosition.Toolbar
		);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, environmentSelector, solutionFilter, treeSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'solution-filter', 'action-buttons'],
			},
			this.extensionUri,
			this.panel.webview
		);

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris,
			jsUris: [
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'resources',
							'webview',
							'js',
							'messaging.js'
						)
					)
					.toString(),
			],
			cspNonce: getNonce(),
			title: 'Plugin Registration',
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<PluginRegistrationCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger,
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		this.coordinator.registerHandler('solutionChange', async (data) => {
			const solutionId = (data as { solutionId?: string })?.solutionId;
			if (solutionId !== undefined) {
				await this.handleSolutionChange(solutionId);
			}
		});

		this.coordinator.registerHandler('selectNode', async (data) => {
			const nodeId = (data as { nodeId?: string })?.nodeId;
			if (nodeId) {
				this.handleNodeSelection(nodeId);
			}
		});

		this.coordinator.registerHandler('filterTree', async () => {
			// Client-side filtering - no server action needed
		});
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing plugin registration tree', {
			environmentId: this.currentEnvironmentId,
			solutionId: this.currentSolutionId,
		});

		await this.loadingBehavior.setLoading(true);

		try {
			const result = await this.loadTreeUseCase.execute(
				this.currentEnvironmentId,
				this.currentSolutionId === DEFAULT_SOLUTION_ID ? undefined : this.currentSolutionId
			);

			const treeItems = this.treeMapper.toTreeItems(
				result.packages,
				result.standaloneAssemblies
			);

			this.logger.info('Plugin registration tree loaded', {
				totalNodeCount: result.totalNodeCount,
			});

			await this.panel.postMessage({
				command: 'updateTree',
				data: { treeItems, isEmpty: result.totalNodeCount === 0 },
			});
		} catch (error: unknown) {
			this.logger.error('Error loading plugin registration tree', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to load plugin registration: ${errorMessage}`
			);
		} finally {
			await this.loadingBehavior.setLoading(false);
		}
	}

	private async handleOpenMaker(): Promise<void> {
		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		if (!environment?.powerPlatformEnvironmentId) {
			this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
			void vscode.window.showErrorMessage(
				'Cannot open in Maker Portal: Environment ID not configured.'
			);
			return;
		}

		// Open solutions area in Maker Portal
		const url = this.urlBuilder.buildSolutionsListUrl(environment.powerPlatformEnvironmentId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
		this.logger.info('Opened Maker Portal');
	}

	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		const oldEnvironmentId = this.currentEnvironmentId;
		this.currentEnvironmentId = environmentId;

		// Re-register panel in map
		this.reregisterPanel(
			PluginRegistrationPanelComposed.panels,
			oldEnvironmentId,
			this.currentEnvironmentId
		);

		const environment = await this.getEnvironmentById(environmentId);
		if (environment) {
			this.panel.title = `Plugin Registration - ${environment.name}`;
		}

		// Reset solution to default
		this.currentSolutionId = DEFAULT_SOLUTION_ID;

		// Reload solutions for new environment
		const solutions = await this.loadSolutions();

		await this.panel.postMessage({
			command: 'updateSolutionSelector',
			data: {
				solutions,
				currentSolutionId: this.currentSolutionId,
			},
		});

		await this.handleRefresh();
	}

	private async handleSolutionChange(solutionId: string): Promise<void> {
		this.logger.debug('Solution changed', { solutionId });
		this.currentSolutionId = solutionId;
		await this.handleRefresh();
	}

	private handleNodeSelection(nodeId: string): void {
		this.logger.debug('Node selected', { nodeId });
		// Future: Show detail panel for selected node
	}
}
