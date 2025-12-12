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
import type { RegisterPluginPackageUseCase } from '../../application/useCases/RegisterPluginPackageUseCase';
import { NupkgFilenameParser } from '../../infrastructure/utils/NupkgFilenameParser';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';
import { PluginRegistrationTreeMapper } from '../../application/mappers/PluginRegistrationTreeMapper';
import { PluginRegistrationTreeSection } from '../sections/PluginRegistrationTreeSection';
import { RegisterDropdownSection } from '../sections/RegisterDropdownSection';
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
	readonly registerPackage: RegisterPluginPackageUseCase;
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
	| 'filterTree'
	| 'registerAssembly'
	| 'registerPackage'
	| 'registerStep'
	| 'registerImage'
	| 'confirmRegisterPackage';

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
	private pendingPackageContent: string | null = null;
	private readonly filenameParser: NupkgFilenameParser;
	private unmanagedSolutionsWithPrefix: Array<{
		id: string;
		name: string;
		uniqueName: string;
		publisherPrefix: string;
	}> = [];

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
		this.filenameParser = new NupkgFilenameParser();

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
	 * Get the currently active (focused) panel for command routing.
	 * Returns the active panel if one exists, otherwise falls back to first visible,
	 * then first panel in the map.
	 *
	 * Priority:
	 * 1. Active (focused) panel - user is currently interacting with it
	 * 2. Visible panel - panel is shown but not focused
	 * 3. First panel - fallback when no panels are visible
	 */
	public static getActivePanel(): PluginRegistrationPanelComposed | undefined {
		const panels = Array.from(PluginRegistrationPanelComposed.panels.values());
		if (panels.length === 0) {
			return undefined;
		}

		// First priority: find the active (focused) panel
		const activePanel = panels.find((p) => p.isActive());
		if (activePanel) {
			return activePanel;
		}

		// Second priority: find any visible panel
		const visiblePanel = panels.find((p) => p.isVisible());
		if (visiblePanel) {
			return visiblePanel;
		}

		// Fallback: return first panel
		return panels[0];
	}

	/**
	 * Check if this panel is currently active (focused).
	 */
	public isActive(): boolean {
		return this.panel.active;
	}

	/**
	 * Check if this panel is currently visible.
	 */
	public isVisible(): boolean {
		return this.panel.visible;
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
		const registerDropdown = new RegisterDropdownSection();
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
			[registerDropdown, actionButtons, environmentSelector, solutionFilter, treeSection],
			PanelLayout.SingleColumn
		);

		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs', 'dropdown', 'form-modal'],
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
							'components',
							'DropdownComponent.js'
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
							'components',
							'FormModal.js'
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

		// Register dropdown handlers
		this.coordinator.registerHandler('registerAssembly', async () => {
			await this.handleRegisterAssembly();
		});

		this.coordinator.registerHandler('registerPackage', async () => {
			await this.handleRegisterPackage();
		});

		this.coordinator.registerHandler('registerStep', async () => {
			// TODO: Implement step registration (requires plugin type context)
			void vscode.window.showInformationMessage('Register Step: Coming soon');
		});

		this.coordinator.registerHandler('registerImage', async () => {
			// TODO: Implement image registration (requires step context)
			void vscode.window.showInformationMessage('Register Image: Coming soon');
		});

		this.coordinator.registerHandler('confirmRegisterPackage', async (data) => {
			const { name, version, prefix } = data as {
				name?: string;
				version?: string;
				prefix?: string;
			};
			if (name && version && prefix) {
				await this.handleConfirmRegisterPackage(name, version, prefix);
			}
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
	// Register Handlers (for Register dropdown)
	// ========================================

	/**
	 * Handle Register Assembly action.
	 * Shows file picker, then registers the assembly.
	 */
	private async handleRegisterAssembly(): Promise<void> {
		this.logger.info('Register Assembly requested');
		// TODO: Implement assembly registration
		// 1. Show file picker for .dll
		// 2. Show modal for isolation mode selection
		// 3. Call RegisterPluginAssemblyUseCase
		// 4. Refresh tree
		void vscode.window.showInformationMessage('Register Assembly: Coming soon');
	}

	/**
	 * Handle Register Package action.
	 * Shows file picker, extracts metadata from filename, shows confirmation modal.
	 */
	private async handleRegisterPackage(): Promise<void> {
		this.logger.info('Register Package requested');

		// Show file picker
		const fileUri = await this.pickPackageFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Read file content
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			// Store for later use when confirm is received
			this.pendingPackageContent = base64Content;

			// Parse filename to extract name and version
			const filename = fileUri.fsPath;
			const metadata = this.filenameParser.parse(filename);

			this.logger.debug('Parsed package metadata from filename', {
				filename,
				name: metadata.name,
				version: metadata.version,
			});

			// Load unmanaged solutions with publisher prefix (excludes Default solution)
			this.unmanagedSolutionsWithPrefix =
				await this.repositories.solution.findUnmanagedWithPublisherPrefix(
					this.currentEnvironmentId
				);

			this.logger.debug('Loaded unmanaged solutions for registration', {
				count: this.unmanagedSolutionsWithPrefix.length,
			});

			// Send message to webview to show modal
			// No pre-selected solution - user must explicitly choose (best practice)
			await this.panel.postMessage({
				command: 'showRegisterPackageModal',
				data: {
					name: metadata.name,
					version: metadata.version,
					filename: this.extractFilename(filename),
					solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
						id: s.id,
						name: s.name,
						prefix: s.publisherPrefix,
					})),
				},
			});
		} catch (error) {
			this.logger.error('Failed to read package file', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to read package file: ${errorMessage}`);
			this.pendingPackageContent = null;
		}
	}

	/**
	 * Handle confirmation from the Register Package modal.
	 * Calls the use case to register the package.
	 */
	private async handleConfirmRegisterPackage(
		name: string,
		version: string,
		prefix: string
	): Promise<void> {
		if (!this.pendingPackageContent) {
			this.logger.error('No pending package content for registration');
			void vscode.window.showErrorMessage('No package file selected. Please try again.');
			return;
		}

		const base64Content = this.pendingPackageContent;
		this.pendingPackageContent = null; // Clear pending content

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Construct name and uniquename with prefix: {prefix}_{packageId}
		// Both must be identical per Plugin Registration Tool behavior
		const prefixedName = `${prefix}_${name}`;

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Registering ${prefixedName} in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.registerPackage.execute(this.currentEnvironmentId, {
						name: prefixedName,
						version,
						uniqueName: prefixedName,
						base64Content,
					});

					void vscode.window.showInformationMessage(
						`${prefixedName} v${version} registered successfully in ${environmentName}.`
					);

					// Refresh tree to show the new package
					await this.handleRefresh();
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to register plugin package', error);
					void vscode.window.showErrorMessage(
						`Failed to register ${prefixedName} in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Extract just the filename from a full path.
	 */
	private extractFilename(filepath: string): string {
		const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
		return lastSlash >= 0 ? filepath.substring(lastSlash + 1) : filepath;
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

		// Fetch assembly and environment info for better messaging
		const [assembly, environment] = await Promise.all([
			this.repositories.assembly.findById(this.currentEnvironmentId, assemblyId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const assemblyName = assembly?.getName() ?? 'Unknown Assembly';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Show file picker
		const fileUri = await this.pickAssemblyFile();
		if (!fileUri) {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Uploading ${assemblyName} to ${environmentName}...`,
				cancellable: false,
			},
			async () => {
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

					void vscode.window.showInformationMessage(
						`${assemblyName} updated successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to update plugin assembly', error);
					void vscode.window.showErrorMessage(
						`Failed to update ${assemblyName} in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Update a plugin package. Called from context menu command.
	 */
	public async updatePackage(packageId: string): Promise<void> {
		this.logger.info('Updating plugin package', { packageId });

		// Fetch package and environment info for better messaging
		const [pkg, environment] = await Promise.all([
			this.repositories.package.findById(this.currentEnvironmentId, packageId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const packageName = pkg?.getName() ?? 'Unknown Package';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Show file picker
		const fileUri = await this.pickPackageFile();
		if (!fileUri) {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Uploading ${packageName} to ${environmentName}...`,
				cancellable: false,
			},
			async () => {
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

					void vscode.window.showInformationMessage(
						`${packageName} updated successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to update plugin package', error);
					void vscode.window.showErrorMessage(
						`Failed to update ${packageName} in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
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
