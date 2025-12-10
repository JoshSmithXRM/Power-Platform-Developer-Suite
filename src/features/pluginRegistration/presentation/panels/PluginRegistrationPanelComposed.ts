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
import type { EnablePluginStepUseCase } from '../../application/useCases/EnablePluginStepUseCase';
import type { DisablePluginStepUseCase } from '../../application/useCases/DisablePluginStepUseCase';
import type { UpdatePluginAssemblyUseCase } from '../../application/useCases/UpdatePluginAssemblyUseCase';
import type { UpdatePluginPackageUseCase } from '../../application/useCases/UpdatePluginPackageUseCase';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';
import { PluginRegistrationTreeMapper } from '../../application/mappers/PluginRegistrationTreeMapper';
import { PluginRegistrationTreeSection } from '../sections/PluginRegistrationTreeSection';
import { PluginStepViewModelMapper } from '../../application/mappers/PluginStepViewModelMapper';
import { PluginAssemblyViewModelMapper } from '../../application/mappers/PluginAssemblyViewModelMapper';
import { PluginPackageViewModelMapper } from '../../application/mappers/PluginPackageViewModelMapper';
import { PluginTypeViewModelMapper } from '../../application/mappers/PluginTypeViewModelMapper';
import type { IPluginTypeRepository } from '../../domain/interfaces/IPluginTypeRepository';
import type { IStepImageRepository } from '../../domain/interfaces/IStepImageRepository';
import { StepImageViewModelMapper } from '../../application/mappers/StepImageViewModelMapper';

/**
 * Bundle of use cases for plugin registration operations.
 */
export interface PluginRegistrationUseCases {
	readonly loadTree: LoadPluginRegistrationTreeUseCase;
	readonly enableStep: EnablePluginStepUseCase;
	readonly disableStep: DisablePluginStepUseCase;
	readonly updateAssembly: UpdatePluginAssemblyUseCase;
	readonly updatePackage: UpdatePluginPackageUseCase;
}

/**
 * Bundle of repositories for refresh operations.
 */
export interface PluginRegistrationRepositories {
	readonly step: IPluginStepRepository;
	readonly assembly: IPluginAssemblyRepository;
	readonly package: IPluginPackageRepository;
	readonly pluginType: IPluginTypeRepository;
	readonly image: IStepImageRepository;
	readonly solution: ISolutionRepository;
}

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
	private readonly stepMapper: PluginStepViewModelMapper;
	private readonly assemblyMapper: PluginAssemblyViewModelMapper;
	private readonly packageMapper: PluginPackageViewModelMapper;
	private readonly pluginTypeMapper: PluginTypeViewModelMapper;
	private readonly imageMapper: StepImageViewModelMapper;

	private currentEnvironmentId: string;
	private currentSolutionId: string = DEFAULT_SOLUTION_ID;

	private constructor(
		private readonly panel: SafeWebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly extensionContext: vscode.ExtensionContext,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		private readonly useCases: PluginRegistrationUseCases,
		private readonly repositories: PluginRegistrationRepositories,
		private readonly urlBuilder: IMakerUrlBuilder,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.treeMapper = new PluginRegistrationTreeMapper();
		this.stepMapper = new PluginStepViewModelMapper();
		this.assemblyMapper = new PluginAssemblyViewModelMapper();
		this.packageMapper = new PluginPackageViewModelMapper();
		this.pluginTypeMapper = new PluginTypeViewModelMapper();
		this.imageMapper = new StepImageViewModelMapper();

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
		extensionContext: vscode.ExtensionContext,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
		useCases: PluginRegistrationUseCases,
		repositories: PluginRegistrationRepositories,
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
						extensionContext,
						getEnvironments,
						getEnvironmentById,
						useCases,
						repositories,
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

	/**
	 * Get the currently active panel for command routing.
	 * Returns the panel if there's exactly one, or the most recently focused one.
	 */
	public static getActivePanel(): PluginRegistrationPanelComposed | undefined {
		// For now, return the first panel if any exist
		// In practice, there's usually only one per environment
		const panels = Array.from(PluginRegistrationPanelComposed.panels.values());
		return panels.length > 0 ? panels[0] : undefined;
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
			return await this.repositories.solution.findAllForDropdown(this.currentEnvironmentId);
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
				features: ['plugin-registration'],
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
				this.panel.webview
					.asWebviewUri(
						vscode.Uri.joinPath(
							this.extensionUri,
							'resources',
							'webview',
							'js',
							'features',
							'plugin-registration.js'
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
			// Progress callback updates webview only (no status bar notification - panel UI is sufficient)
			const onProgress = (step: string, percent: number): void => {
				void this.panel.postMessage({
					command: 'updateLoadingProgress',
					data: { step, percent },
				});
			};

			const result = await this.useCases.loadTree.execute(
				this.currentEnvironmentId,
				this.currentSolutionId === DEFAULT_SOLUTION_ID ? undefined : this.currentSolutionId,
				onProgress
			);

			const treeItems = this.treeMapper.toTreeItems(result.packages, result.standaloneAssemblies);

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

	// ========================================
	// Public Action Methods (for context menu commands)
	// ========================================

	/**
	 * Enable a plugin step. Called from context menu command.
	 */
	public async enableStep(stepId: string): Promise<void> {
		this.logger.info('Enabling plugin step', { stepId });

		try {
			await this.useCases.enableStep.execute(this.currentEnvironmentId, stepId);

			// Fetch updated step and its images, then refresh node
			const updatedStep = await this.repositories.step.findById(this.currentEnvironmentId, stepId);
			if (updatedStep) {
				const images = await this.repositories.image.findByStepId(
					this.currentEnvironmentId,
					stepId
				);
				const imageViewModels = images.map((img) =>
					this.imageMapper.toTreeItem(img, stepId)
				);
				const updatedNode = this.stepMapper.toTreeItem(
					updatedStep,
					updatedStep.getPluginTypeId(),
					imageViewModels
				);
				await this.panel.postMessage({
					command: 'updateNode',
					data: { nodeId: stepId, updatedNode },
				});
			}

			void vscode.window.showInformationMessage('Plugin step enabled.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to enable plugin step', error);
			void vscode.window.showErrorMessage(`Failed to enable step: ${errorMessage}`);
		}
	}

	/**
	 * Disable a plugin step. Called from context menu command.
	 */
	public async disableStep(stepId: string): Promise<void> {
		this.logger.info('Disabling plugin step', { stepId });

		try {
			await this.useCases.disableStep.execute(this.currentEnvironmentId, stepId);

			// Fetch updated step and its images, then refresh node
			const updatedStep = await this.repositories.step.findById(this.currentEnvironmentId, stepId);
			if (updatedStep) {
				const images = await this.repositories.image.findByStepId(
					this.currentEnvironmentId,
					stepId
				);
				const imageViewModels = images.map((img) =>
					this.imageMapper.toTreeItem(img, stepId)
				);
				const updatedNode = this.stepMapper.toTreeItem(
					updatedStep,
					updatedStep.getPluginTypeId(),
					imageViewModels
				);
				await this.panel.postMessage({
					command: 'updateNode',
					data: { nodeId: stepId, updatedNode },
				});
			}

			void vscode.window.showInformationMessage('Plugin step disabled.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to disable plugin step', error);
			void vscode.window.showErrorMessage(`Failed to disable step: ${errorMessage}`);
		}
	}

	/**
	 * Update a standalone plugin assembly. Called from context menu command.
	 */
	public async updateAssembly(assemblyId: string): Promise<void> {
		this.logger.info('Updating plugin assembly', { assemblyId });

		// Show file picker
		const fileUri = await this.pickAssemblyFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Read file and convert to base64
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			await this.useCases.updateAssembly.execute(
				this.currentEnvironmentId,
				assemblyId,
				base64Content
			);

			// Refresh the subtree (assembly + all children)
			await this.refreshAssemblySubtree(assemblyId);

			void vscode.window.showInformationMessage('Plugin assembly updated.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to update plugin assembly', error);
			void vscode.window.showErrorMessage(`Failed to update assembly: ${errorMessage}`);
		}
	}

	/**
	 * Update a plugin package. Called from context menu command.
	 */
	public async updatePackage(packageId: string): Promise<void> {
		this.logger.info('Updating plugin package', { packageId });

		// Show file picker
		const fileUri = await this.pickPackageFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Read file and convert to base64
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			await this.useCases.updatePackage.execute(
				this.currentEnvironmentId,
				packageId,
				base64Content
			);

			// Refresh the subtree (package + all children)
			await this.refreshPackageSubtree(packageId);

			void vscode.window.showInformationMessage('Plugin package updated.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to update plugin package', error);
			void vscode.window.showErrorMessage(`Failed to update package: ${errorMessage}`);
		}
	}

	// ========================================
	// File Picker Helpers
	// ========================================

	private async pickAssemblyFile(): Promise<vscode.Uri | undefined> {
		const lastFolder = this.extensionContext.workspaceState.get<string>(
			'pluginRegistration.lastDllFolder'
		);

		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			filters: { 'DLL Files': ['dll'] },
			title: 'Select Plugin Assembly',
		};

		// Set defaultUri only if we have a valid folder
		if (lastFolder) {
			options.defaultUri = vscode.Uri.file(lastFolder);
		} else if (vscode.workspace.workspaceFolders?.[0]) {
			options.defaultUri = vscode.workspace.workspaceFolders[0].uri;
		}

		const result = await vscode.window.showOpenDialog(options);

		if (result?.[0]) {
			// Save folder for next time
			const folder = vscode.Uri.joinPath(result[0], '..').fsPath;
			await this.extensionContext.workspaceState.update(
				'pluginRegistration.lastDllFolder',
				folder
			);
			return result[0];
		}
		return undefined;
	}

	private async pickPackageFile(): Promise<vscode.Uri | undefined> {
		const lastFolder = this.extensionContext.workspaceState.get<string>(
			'pluginRegistration.lastNupkgFolder'
		);

		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			filters: { 'NuGet Packages': ['nupkg'] },
			title: 'Select Plugin Package',
		};

		// Set defaultUri only if we have a valid folder
		if (lastFolder) {
			options.defaultUri = vscode.Uri.file(lastFolder);
		} else if (vscode.workspace.workspaceFolders?.[0]) {
			options.defaultUri = vscode.workspace.workspaceFolders[0].uri;
		}

		const result = await vscode.window.showOpenDialog(options);

		if (result?.[0]) {
			// Save folder for next time
			const folder = vscode.Uri.joinPath(result[0], '..').fsPath;
			await this.extensionContext.workspaceState.update(
				'pluginRegistration.lastNupkgFolder',
				folder
			);
			return result[0];
		}
		return undefined;
	}

	// ========================================
	// Subtree Refresh Helpers
	// ========================================

	private async refreshAssemblySubtree(assemblyId: string): Promise<void> {
		// Fetch assembly and all its children
		const assembly = await this.repositories.assembly.findById(
			this.currentEnvironmentId,
			assemblyId
		);
		if (!assembly) return;

		const pluginTypes = await this.repositories.pluginType.findByAssemblyId(
			this.currentEnvironmentId,
			assemblyId
		);

		// Build child tree for each plugin type
		const typeViewModels = await Promise.all(
			pluginTypes.map(async (pluginType) => {
				const pluginTypeId = pluginType.getId();
				const steps = await this.repositories.step.findByPluginTypeId(
					this.currentEnvironmentId,
					pluginTypeId
				);

				const stepViewModels = await Promise.all(
					steps.map(async (step) => {
						const stepId = step.getId();
						const images = await this.repositories.image.findByStepId(
							this.currentEnvironmentId,
							stepId
						);
						const imageViewModels = images.map((img) =>
							this.imageMapper.toTreeItem(img, stepId)
						);
						return this.stepMapper.toTreeItem(step, pluginTypeId, imageViewModels);
					})
				);

				return this.pluginTypeMapper.toTreeItem(pluginType, assemblyId, stepViewModels);
			})
		);

		const activeStepCount = 0; // Not needed for refresh since we have fresh data
		const updatedSubtree = this.assemblyMapper.toTreeItem(
			assembly,
			typeViewModels,
			activeStepCount,
			assembly.getPackageId()
		);

		await this.panel.postMessage({
			command: 'updateSubtree',
			data: { nodeId: assemblyId, updatedSubtree },
		});
	}

	private async refreshPackageSubtree(packageId: string): Promise<void> {
		// Fetch package and all its children (assemblies → types → steps → images)
		const pkg = await this.repositories.package.findById(this.currentEnvironmentId, packageId);
		if (!pkg) return;

		const assemblies = await this.repositories.assembly.findByPackageId(
			this.currentEnvironmentId,
			packageId
		);

		// Build child tree for each assembly
		const assemblyViewModels = await Promise.all(
			assemblies.map(async (assembly) => {
				const assemblyId = assembly.getId();
				const pluginTypes = await this.repositories.pluginType.findByAssemblyId(
					this.currentEnvironmentId,
					assemblyId
				);

				const typeViewModels = await Promise.all(
					pluginTypes.map(async (pluginType) => {
						const pluginTypeId = pluginType.getId();
						const steps = await this.repositories.step.findByPluginTypeId(
							this.currentEnvironmentId,
							pluginTypeId
						);

						const stepViewModels = await Promise.all(
							steps.map(async (step) => {
								const stepId = step.getId();
								const images = await this.repositories.image.findByStepId(
									this.currentEnvironmentId,
									stepId
								);
								const imageViewModels = images.map((img) =>
									this.imageMapper.toTreeItem(img, stepId)
								);
								return this.stepMapper.toTreeItem(step, pluginTypeId, imageViewModels);
							})
						);

						return this.pluginTypeMapper.toTreeItem(pluginType, assemblyId, stepViewModels);
					})
				);

				const activeStepCount = 0;
				return this.assemblyMapper.toTreeItem(assembly, typeViewModels, activeStepCount, packageId);
			})
		);

		const assemblyCount = assemblies.length;
		const updatedSubtree = this.packageMapper.toTreeItem(pkg, assemblyViewModels, assemblyCount);

		await this.panel.postMessage({
			command: 'updateSubtree',
			data: { nodeId: packageId, updatedSubtree },
		});
	}
}
