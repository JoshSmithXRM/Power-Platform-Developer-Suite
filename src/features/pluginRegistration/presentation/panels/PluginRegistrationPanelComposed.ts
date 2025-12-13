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
import type { RegisterPluginAssemblyUseCase } from '../../application/useCases/RegisterPluginAssemblyUseCase';
import type { UnregisterPluginAssemblyUseCase } from '../../application/useCases/UnregisterPluginAssemblyUseCase';
import type { UnregisterPluginPackageUseCase } from '../../application/useCases/UnregisterPluginPackageUseCase';
import type { UnregisterPluginStepUseCase } from '../../application/useCases/UnregisterPluginStepUseCase';
import type { UnregisterStepImageUseCase } from '../../application/useCases/UnregisterStepImageUseCase';
import type { RegisterPluginStepUseCase } from '../../application/useCases/RegisterPluginStepUseCase';
import type { UpdatePluginStepUseCase } from '../../application/useCases/UpdatePluginStepUseCase';
import type { RegisterStepImageUseCase } from '../../application/useCases/RegisterStepImageUseCase';
import type { UpdateStepImageUseCase } from '../../application/useCases/UpdateStepImageUseCase';
import type { ISdkMessageRepository } from '../../domain/interfaces/ISdkMessageRepository';
import type { ISdkMessageFilterRepository } from '../../domain/interfaces/ISdkMessageFilterRepository';
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
import type { PluginInspectorService } from '../../infrastructure/services/PluginInspectorService';
import type { PluginTypeToRegister } from '../../application/useCases/RegisterPluginAssemblyUseCase';

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
	readonly registerAssembly: RegisterPluginAssemblyUseCase;
	readonly unregisterAssembly: UnregisterPluginAssemblyUseCase;
	readonly unregisterPackage: UnregisterPluginPackageUseCase;
	readonly unregisterStep: UnregisterPluginStepUseCase;
	readonly unregisterImage: UnregisterStepImageUseCase;
	readonly registerStep: RegisterPluginStepUseCase;
	readonly updateStep: UpdatePluginStepUseCase;
	readonly registerImage: RegisterStepImageUseCase;
	readonly updateImage: UpdateStepImageUseCase;
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
	readonly sdkMessage: ISdkMessageRepository;
	readonly sdkMessageFilter: ISdkMessageFilterRepository;
}

/**
 * Bundle of services for plugin registration.
 */
export interface PluginRegistrationServices {
	readonly pluginInspector: PluginInspectorService;
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
	| 'confirmRegisterPackage'
	| 'confirmRegisterAssembly'
	| 'confirmUpdatePackage'
	| 'confirmUpdateAssembly'
	| 'unregisterAssembly'
	| 'confirmRegisterStep'
	| 'confirmEditStep'
	| 'confirmRegisterImage'
	| 'confirmEditImage'
	| 'getEntitiesForMessage';

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
	private pendingAssemblyContent: string | null = null;
	private pendingAssemblyTypes: PluginTypeToRegister[] = [];
	// Pending state for update operations
	private pendingUpdatePackageId: string | null = null;
	private pendingUpdatePackageContent: string | null = null;
	private pendingUpdateAssemblyId: string | null = null;
	private pendingUpdateAssemblyContent: string | null = null;
	private pendingUpdateAssemblyTypes: PluginTypeToRegister[] = [];
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
		private readonly services: PluginRegistrationServices,
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
		services: PluginRegistrationServices,
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
						services,
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
				components: ['buttons', 'inputs', 'dropdown', 'form-modal', 'filterable-combobox'],
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
							'components',
							'FilterableComboBox.js'
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

		this.coordinator.registerHandler('getEntitiesForMessage', async (data) => {
			const { messageId } = data as { messageId?: string };
			if (messageId) {
				await this.handleGetEntitiesForMessage(messageId);
			}
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

		this.coordinator.registerHandler('confirmRegisterAssembly', async (data) => {
			const { name, solutionUniqueName, selectedTypes } = data as {
				name?: string;
				solutionUniqueName?: string;
				selectedTypes?: string[]; // Array of type names to register
			};
			if (name && selectedTypes && selectedTypes.length > 0) {
				await this.handleConfirmRegisterAssembly(name, solutionUniqueName, selectedTypes);
			}
		});

		this.coordinator.registerHandler('unregisterAssembly', async (data) => {
			const { assemblyId, assemblyName } = data as {
				assemblyId?: string;
				assemblyName?: string;
			};
			if (assemblyId && assemblyName) {
				await this.handleUnregisterAssembly(assemblyId, assemblyName);
			}
		});

		this.coordinator.registerHandler('confirmUpdatePackage', async (data) => {
			const { packageId, version } = data as {
				packageId?: string;
				version?: string;
			};
			if (packageId) {
				await this.handleConfirmUpdatePackage(packageId, version);
			}
		});

		this.coordinator.registerHandler('confirmUpdateAssembly', async (data) => {
			const { assemblyId, selectedTypes } = data as {
				assemblyId?: string;
				selectedTypes?: string[]; // Array of type names to keep/register
			};
			if (assemblyId) {
				await this.handleConfirmUpdateAssembly(assemblyId, selectedTypes ?? []);
			}
		});

		this.coordinator.registerHandler('confirmRegisterStep', async (data) => {
			const stepData = data as {
				pluginTypeId?: string;
				sdkMessageId?: string;
				sdkMessageFilterId?: string;
				primaryEntity?: string; // For filter lookup
				secondaryEntity?: string; // For Associate/Disassociate messages
				name?: string;
				stage?: number;
				mode?: number;
				rank?: number;
				supportedDeployment?: number;
				filteringAttributes?: string;
				asyncAutoDelete?: boolean;
				unsecureConfiguration?: string;
				secureConfiguration?: string;
				impersonatingUserId?: string;
				description?: string;
			};
			if (
				stepData.pluginTypeId &&
				stepData.sdkMessageId &&
				stepData.name &&
				stepData.stage !== undefined &&
				stepData.mode !== undefined &&
				stepData.rank !== undefined &&
				stepData.supportedDeployment !== undefined &&
				stepData.asyncAutoDelete !== undefined
			) {
				await this.handleConfirmRegisterStep({
					pluginTypeId: stepData.pluginTypeId,
					sdkMessageId: stepData.sdkMessageId,
					sdkMessageFilterId: stepData.sdkMessageFilterId,
					primaryEntity: stepData.primaryEntity,
					secondaryEntity: stepData.secondaryEntity,
					name: stepData.name,
					stage: stepData.stage,
					mode: stepData.mode,
					rank: stepData.rank,
					supportedDeployment: stepData.supportedDeployment,
					filteringAttributes: stepData.filteringAttributes,
					asyncAutoDelete: stepData.asyncAutoDelete,
					unsecureConfiguration: stepData.unsecureConfiguration,
					secureConfiguration: stepData.secureConfiguration,
					impersonatingUserId: stepData.impersonatingUserId,
					description: stepData.description,
				});
			}
		});

		this.coordinator.registerHandler('confirmEditStep', async (data) => {
			const stepData = data as {
				stepId?: string;
				name?: string;
				stage?: number;
				mode?: number;
				rank?: number;
				supportedDeployment?: number;
				filteringAttributes?: string;
				asyncAutoDelete?: boolean;
				unsecureConfiguration?: string;
				secureConfiguration?: string;
				impersonatingUserId?: string;
				description?: string;
			};
			if (
				stepData.stepId &&
				stepData.name &&
				stepData.stage !== undefined &&
				stepData.mode !== undefined &&
				stepData.rank !== undefined
			) {
				await this.handleConfirmEditStep({
					stepId: stepData.stepId,
					name: stepData.name,
					stage: stepData.stage,
					mode: stepData.mode,
					rank: stepData.rank,
					supportedDeployment: stepData.supportedDeployment,
					filteringAttributes: stepData.filteringAttributes,
					asyncAutoDelete: stepData.asyncAutoDelete,
					unsecureConfiguration: stepData.unsecureConfiguration,
					secureConfiguration: stepData.secureConfiguration,
					impersonatingUserId: stepData.impersonatingUserId,
					description: stepData.description,
				});
			}
		});

		this.coordinator.registerHandler('confirmRegisterImage', async (data) => {
			const imageData = data as {
				stepId?: string;
				name?: string;
				imageType?: number;
				entityAlias?: string;
				attributes?: string;
			};
			if (
				imageData.stepId &&
				imageData.name &&
				imageData.imageType !== undefined &&
				imageData.entityAlias
			) {
				await this.handleConfirmRegisterImage({
					stepId: imageData.stepId,
					name: imageData.name,
					imageType: imageData.imageType,
					entityAlias: imageData.entityAlias,
					attributes: imageData.attributes,
				});
			}
		});

		this.coordinator.registerHandler('confirmEditImage', async (data) => {
			const imageData = data as {
				imageId?: string;
				name?: string;
				imageType?: number;
				entityAlias?: string;
				attributes?: string;
			};
			if (
				imageData.imageId &&
				imageData.name &&
				imageData.imageType !== undefined &&
				imageData.entityAlias
			) {
				await this.handleConfirmEditImage({
					imageId: imageData.imageId,
					name: imageData.name,
					imageType: imageData.imageType,
					entityAlias: imageData.entityAlias,
					attributes: imageData.attributes,
				});
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
	 * Shows file picker for .dll, inspects for plugin types, then shows modal with types.
	 */
	private async handleRegisterAssembly(): Promise<void> {
		this.logger.info('Register Assembly requested');

		// Show file picker
		const fileUri = await this.pickAssemblyFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Check if inspector is available
			const inspectorAvailable = await this.services.pluginInspector.isAvailable();
			if (!inspectorAvailable) {
				void vscode.window.showErrorMessage(
					'Plugin Inspector tool not found. Please rebuild the extension with "npm run build:tools".'
				);
				return;
			}

			// Show progress while inspecting
			const inspectionResult = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Inspecting assembly for plugin types...',
					cancellable: false,
				},
				async () => this.services.pluginInspector.inspect(fileUri.fsPath)
			);

			if (!inspectionResult.success) {
				void vscode.window.showErrorMessage(
					`Failed to inspect assembly: ${inspectionResult.error}`
				);
				return;
			}

			if (inspectionResult.types.length === 0) {
				void vscode.window.showWarningMessage(
					'No plugin types (IPlugin or CodeActivity implementations) found in this assembly.'
				);
				return;
			}

			this.logger.info('Assembly inspection completed', {
				assemblyName: inspectionResult.assemblyName,
				typeCount: inspectionResult.types.length,
			});

			// Read file content for registration
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			// Store for later use when confirm is received
			this.pendingAssemblyContent = base64Content;
			this.pendingAssemblyTypes = inspectionResult.types.map((t) => ({
				typeName: t.typeName,
				displayName: t.displayName,
				typeKind: t.typeKind,
			}));

			// Extract assembly name from inspector result or filename
			const assemblyName =
				inspectionResult.assemblyName ?? this.extractFilename(fileUri.fsPath).replace(/\.dll$/i, '');
			const fullFilename = this.extractFilename(fileUri.fsPath);

			// Load unmanaged solutions (optional for assemblies)
			this.unmanagedSolutionsWithPrefix =
				await this.repositories.solution.findUnmanagedWithPublisherPrefix(
					this.currentEnvironmentId
				);

			this.logger.debug('Loaded unmanaged solutions for assembly registration', {
				count: this.unmanagedSolutionsWithPrefix.length,
			});

			// Send message to webview to show modal with discovered types
			await this.panel.postMessage({
				command: 'showRegisterAssemblyModal',
				data: {
					name: assemblyName,
					filename: fullFilename,
					version: inspectionResult.assemblyVersion ?? '1.0.0.0',
					solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
						id: s.id,
						name: s.name,
						uniqueName: s.uniqueName,
					})),
					// Send discovered plugin types for checkbox selection
					discoveredTypes: inspectionResult.types.map((t) => ({
						typeName: t.typeName,
						displayName: t.displayName,
						typeKind: t.typeKind,
					})),
				},
			});
		} catch (error) {
			this.logger.error('Failed to process assembly file', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to process assembly file: ${errorMessage}`);
			this.pendingAssemblyContent = null;
			this.pendingAssemblyTypes = [];
		}
	}

	/**
	 * Handle confirmation from the Register Assembly modal.
	 * Calls the use case to register the assembly and its plugin types.
	 */
	private async handleConfirmRegisterAssembly(
		name: string,
		solutionUniqueName: string | undefined,
		selectedTypeNames: string[]
	): Promise<void> {
		if (!this.pendingAssemblyContent) {
			this.logger.error('No pending assembly content for registration');
			void vscode.window.showErrorMessage('No assembly file selected. Please try again.');
			return;
		}

		// Filter pending types to only those selected by user
		const typesToRegister = this.pendingAssemblyTypes.filter((t) =>
			selectedTypeNames.includes(t.typeName)
		);

		if (typesToRegister.length === 0) {
			void vscode.window.showErrorMessage('No plugin types selected. Please select at least one type.');
			return;
		}

		const base64Content = this.pendingAssemblyContent;
		this.pendingAssemblyContent = null; // Clear pending content
		this.pendingAssemblyTypes = []; // Clear pending types

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Registering ${name} with ${typesToRegister.length} plugin type(s) in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					const result = await this.useCases.registerAssembly.execute(this.currentEnvironmentId, {
						name,
						base64Content,
						solutionUniqueName,
						pluginTypes: typesToRegister,
					});

					const solutionInfo = solutionUniqueName
						? ` and added to solution ${solutionUniqueName}`
						: '';
					void vscode.window.showInformationMessage(
						`${name} registered successfully with ${result.pluginTypeIds.length} plugin type(s) in ${environmentName}${solutionInfo}.`
					);

					// Fetch the new assembly with types and send delta update
					await this.sendAssemblyDeltaUpdate(result.assemblyId);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to register plugin assembly', error);
					void vscode.window.showErrorMessage(
						`Failed to register ${name} in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
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
	 * Handle request for entities available for a specific message.
	 * Fetches sdkmessagefilter records and returns entity logical names.
	 */
	private async handleGetEntitiesForMessage(messageId: string): Promise<void> {
		try {
			const filters = await this.repositories.sdkMessageFilter.findByMessageId(
				this.currentEnvironmentId,
				messageId
			);

			// Extract primary entity logical names, sorted alphabetically
			const primaryEntities = filters
				.map((f) => f.getPrimaryEntityLogicalName())
				.filter((e) => e !== 'none')
				.sort((a, b) => a.localeCompare(b));

			// Extract secondary entity logical names (for messages like Associate/Disassociate)
			const secondaryEntities = filters
				.filter((f) => f.hasSecondaryEntity())
				.map((f) => f.getSecondaryEntityLogicalName())
				.filter((e, i, arr) => arr.indexOf(e) === i) // Deduplicate
				.sort((a, b) => a.localeCompare(b));

			await this.panel.postMessage({
				command: 'entitiesForMessage',
				data: { messageId, entities: primaryEntities, secondaryEntities },
			});
		} catch (error) {
			this.logger.error('Failed to fetch entities for message', { messageId, error });
			await this.panel.postMessage({
				command: 'entitiesForMessage',
				data: { messageId, entities: [], secondaryEntities: [], error: 'Failed to fetch entities' },
			});
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
	 * Shows file picker, runs inspector, then shows modal for confirmation.
	 * User can select which types to register/unregister (like PRT).
	 */
	public async updateAssembly(assemblyId: string): Promise<void> {
		this.logger.info('Updating plugin assembly', { assemblyId });

		// Fetch assembly info for display
		const assembly = await this.repositories.assembly.findById(
			this.currentEnvironmentId,
			assemblyId
		);
		const assemblyName = assembly?.getName() ?? 'Unknown Assembly';

		// Show file picker
		const fileUri = await this.pickAssemblyFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Check if inspector is available
			const inspectorAvailable = await this.services.pluginInspector.isAvailable();
			if (!inspectorAvailable) {
				void vscode.window.showErrorMessage(
					'Plugin Inspector tool not found. Please rebuild the extension with "npm run build:tools".'
				);
				return;
			}

			// Inspect the new assembly
			const inspectionResult = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Inspecting assembly...',
					cancellable: false,
				},
				async () => this.services.pluginInspector.inspect(fileUri.fsPath)
			);

			if (!inspectionResult.success) {
				void vscode.window.showErrorMessage(
					`Failed to inspect assembly: ${inspectionResult.error}`
				);
				return;
			}

			// Fetch existing registered types for this assembly
			const existingTypes = await this.repositories.pluginType.findByAssemblyId(
				this.currentEnvironmentId,
				assemblyId
			);
			const existingTypeNames = new Set(existingTypes.map((t) => t.getName()));

			this.logger.debug('Fetched existing types for assembly update', {
				assemblyId,
				existingCount: existingTypes.length,
				newCount: inspectionResult.types.length,
			});

			// Read file content and store for confirmation
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			this.pendingUpdateAssemblyId = assemblyId;
			this.pendingUpdateAssemblyContent = base64Content;
			this.pendingUpdateAssemblyTypes = inspectionResult.types.map((t) => ({
				typeName: t.typeName,
				displayName: t.displayName,
				typeKind: t.typeKind,
			}));

			// Build merged type list for modal:
			// - Types in new DLL get their info from inspection
			// - Types already registered are pre-checked
			// - Types only in existing (removed from DLL) are shown as "existing only"
			const discoveredTypeNames = new Set(inspectionResult.types.map((t) => t.typeName));

			// Types in new assembly (may or may not be registered)
			const mergedTypes = inspectionResult.types.map((t) => ({
				typeName: t.typeName,
				displayName: t.displayName,
				typeKind: t.typeKind,
				isRegistered: existingTypeNames.has(t.typeName),
				existsInNewDll: true,
			}));

			// Types that are registered but NOT in new DLL (were removed from code)
			for (const existingType of existingTypes) {
				if (!discoveredTypeNames.has(existingType.getName())) {
					mergedTypes.push({
						typeName: existingType.getName(),
						displayName: existingType.getFriendlyName(),
						typeKind: existingType.isWorkflowActivity() ? 'WorkflowActivity' : 'Plugin',
						isRegistered: true,
						existsInNewDll: false,
					});
				}
			}

			// Show modal with assembly info and merged types
			await this.panel.postMessage({
				command: 'showUpdateAssemblyModal',
				data: {
					assemblyId,
					name: assemblyName,
					filename: this.extractFilename(fileUri.fsPath),
					version: inspectionResult.assemblyVersion ?? '1.0.0.0',
					discoveredTypes: mergedTypes,
				},
			});
		} catch (error) {
			this.logger.error('Failed to process assembly file for update', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to process assembly: ${errorMessage}`);
			this.pendingUpdateAssemblyId = null;
			this.pendingUpdateAssemblyContent = null;
			this.pendingUpdateAssemblyTypes = [];
		}
	}

	/**
	 * Update a plugin package. Called from context menu command.
	 * Shows file picker, then modal for confirmation.
	 */
	public async updatePackage(packageId: string): Promise<void> {
		this.logger.info('Updating plugin package', { packageId });

		// Fetch package info for display
		const pkg = await this.repositories.package.findById(this.currentEnvironmentId, packageId);
		const packageName = pkg?.getName() ?? 'Unknown Package';
		const packageVersion = pkg?.getVersion() ?? '1.0.0';

		// Show file picker
		const fileUri = await this.pickPackageFile();
		if (!fileUri) {
			return; // User cancelled
		}

		try {
			// Read file content and store for confirmation
			const fileContent = await vscode.workspace.fs.readFile(fileUri);
			const base64Content = Buffer.from(fileContent).toString('base64');

			// Parse new version from filename
			const filename = this.extractFilename(fileUri.fsPath);
			const metadata = this.filenameParser.parse(fileUri.fsPath);

			this.pendingUpdatePackageId = packageId;
			this.pendingUpdatePackageContent = base64Content;

			// Show modal with package info
			await this.panel.postMessage({
				command: 'showUpdatePackageModal',
				data: {
					packageId,
					name: packageName,
					version: metadata.version || packageVersion,
					filename,
				},
			});
		} catch (error) {
			this.logger.error('Failed to read package file for update', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to read package file: ${errorMessage}`);
			this.pendingUpdatePackageId = null;
			this.pendingUpdatePackageContent = null;
		}
	}

	/**
	 * Unregister (delete) a standalone plugin assembly. Called from context menu command.
	 */
	public async unregisterAssembly(assemblyId: string): Promise<void> {
		this.logger.info('Unregistering plugin assembly', { assemblyId });

		// Fetch assembly and environment info for better messaging
		const [assembly, environment] = await Promise.all([
			this.repositories.assembly.findById(this.currentEnvironmentId, assemblyId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const assemblyName = assembly?.getName() ?? 'Unknown Assembly';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${assemblyName}" from ${environmentName}? This will delete the assembly and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${assemblyName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterAssembly.execute(
						this.currentEnvironmentId,
						assemblyId,
						assemblyName
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: assemblyId },
					});

					void vscode.window.showInformationMessage(
						`${assemblyName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister plugin assembly', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${assemblyName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle unregister assembly from webview message.
	 */
	private async handleUnregisterAssembly(assemblyId: string, _assemblyName: string): Promise<void> {
		// Delegate to the public method which handles confirmation and execution
		await this.unregisterAssembly(assemblyId);
	}

	/**
	 * Unregister (delete) a plugin package. Called from context menu command.
	 * Shows confirmation dialog, then deletes the package.
	 */
	public async unregisterPackage(packageId: string): Promise<void> {
		this.logger.info('Unregistering plugin package', { packageId });

		// Fetch package and environment info for better messaging
		const [pkg, environment] = await Promise.all([
			this.repositories.package.findById(this.currentEnvironmentId, packageId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const packageName = pkg?.getName() ?? 'Unknown Package';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${packageName}" from ${environmentName}? This will delete the package and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${packageName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterPackage.execute(
						this.currentEnvironmentId,
						packageId,
						packageName
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: packageId },
					});

					void vscode.window.showInformationMessage(
						`${packageName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister plugin package', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${packageName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Unregister (delete) a plugin step. Called from context menu command.
	 * Shows confirmation dialog, then deletes the step.
	 */
	public async unregisterStep(stepId: string): Promise<void> {
		this.logger.info('Unregistering plugin step', { stepId });

		// Fetch step and environment info for better messaging
		const [step, environment] = await Promise.all([
			this.repositories.step.findById(this.currentEnvironmentId, stepId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const stepName = step?.getName() ?? 'Unknown Step';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${stepName}" from ${environmentName}? This will delete the step and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${stepName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterStep.execute(
						this.currentEnvironmentId,
						stepId,
						stepName
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: stepId },
					});

					void vscode.window.showInformationMessage(
						`${stepName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister plugin step', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${stepName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Unregister (delete) a step image. Called from context menu command.
	 * Shows confirmation dialog, then deletes the image.
	 */
	public async unregisterImage(imageId: string): Promise<void> {
		this.logger.info('Unregistering step image', { imageId });

		// Fetch image and environment info for better messaging
		const [image, environment] = await Promise.all([
			this.repositories.image.findById(this.currentEnvironmentId, imageId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const imageName = image?.getName() ?? 'Unknown Image';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${imageName}" from ${environmentName}? This will delete the image and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${imageName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterImage.execute(
						this.currentEnvironmentId,
						imageId,
						imageName
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: imageId },
					});

					void vscode.window.showInformationMessage(
						`${imageName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister step image', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${imageName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Register a new plugin step. Called from context menu on plugin type.
	 * Shows modal form, then creates the step.
	 */
	public async registerStep(pluginTypeId: string): Promise<void> {
		this.logger.info('Registering new plugin step', { pluginTypeId });

		// Fetch plugin type info and SDK messages for the form
		const [pluginType, messages] = await Promise.all([
			this.repositories.pluginType.findById(this.currentEnvironmentId, pluginTypeId),
			this.repositories.sdkMessage.findAllPublic(this.currentEnvironmentId),
		]);

		const pluginTypeName = pluginType?.getName() ?? 'Unknown Plugin';

		// Send modal data to webview
		await this.panel.postMessage({
			command: 'showRegisterStepModal',
			data: {
				pluginTypeId,
				pluginTypeName,
				messages: messages.map((m) => ({ id: m.getId(), name: m.getName() })),
			},
		});
	}

	/**
	 * Edit an existing plugin step. Called from context menu on step.
	 * Shows modal form pre-populated with current values, then updates the step.
	 */
	public async editStep(stepId: string): Promise<void> {
		this.logger.info('Editing plugin step', { stepId });

		// Fetch step and SDK messages
		const [step, messages] = await Promise.all([
			this.repositories.step.findById(this.currentEnvironmentId, stepId),
			this.repositories.sdkMessage.findAllPublic(this.currentEnvironmentId),
		]);

		if (step === null) {
			void vscode.window.showErrorMessage('Step not found.');
			return;
		}

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditStepModal',
			data: {
				stepId,
				stepName: step.getName(),
				sdkMessageId: step.getMessageId(),
				sdkMessageName: step.getMessageName(),
				stage: step.getStage().getValue(),
				mode: step.getMode().getValue(),
				rank: step.getRank(),
				filteringAttributes: step.getFilteringAttributes() ?? '',
				messages: messages.map((m) => ({ id: m.getId(), name: m.getName() })),
			},
		});
	}

	/**
	 * Register a new step image. Called from context menu on step.
	 * Shows modal form, then creates the image.
	 */
	public async registerImage(stepId: string): Promise<void> {
		this.logger.info('Registering new step image', { stepId });

		const step = await this.repositories.step.findById(this.currentEnvironmentId, stepId);
		const stepName = step?.getName() ?? 'Unknown Step';

		// Send modal data to webview
		await this.panel.postMessage({
			command: 'showRegisterImageModal',
			data: {
				stepId,
				stepName,
			},
		});
	}

	/**
	 * Edit an existing step image. Called from context menu on image.
	 * Shows modal form pre-populated with current values, then updates the image.
	 */
	public async editImage(imageId: string): Promise<void> {
		this.logger.info('Editing step image', { imageId });

		const image = await this.repositories.image.findById(this.currentEnvironmentId, imageId);

		if (image === null) {
			void vscode.window.showErrorMessage('Image not found.');
			return;
		}

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditImageModal',
			data: {
				imageId,
				imageName: image.getName(),
				imageType: image.getImageType().getValue(),
				entityAlias: image.getEntityAlias(),
				attributes: image.getAttributes(),
			},
		});
	}

	/**
	 * Handle confirmation from the Register Step modal.
	 */
	private async handleConfirmRegisterStep(data: {
		pluginTypeId: string;
		sdkMessageId: string;
		sdkMessageFilterId?: string | undefined;
		primaryEntity?: string | undefined; // Used to lookup filter if not provided directly
		secondaryEntity?: string | undefined; // For Associate/Disassociate messages (informational)
		name: string;
		stage: number;
		mode: number;
		rank: number;
		supportedDeployment: number;
		filteringAttributes?: string | undefined;
		asyncAutoDelete: boolean;
		unsecureConfiguration?: string | undefined;
		secureConfiguration?: string | undefined;
		impersonatingUserId?: string | undefined;
		description?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling register step confirmation', data);

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Registering step in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					// If primaryEntity is provided but not sdkMessageFilterId, look it up
					let filterId = data.sdkMessageFilterId;
					if (!filterId && data.primaryEntity) {
						const filter = await this.repositories.sdkMessageFilter.findByMessageAndEntity(
							this.currentEnvironmentId,
							data.sdkMessageId,
							data.primaryEntity
						);
						filterId = filter?.getId();
					}

					const stepId = await this.useCases.registerStep.execute(
						this.currentEnvironmentId,
						{
							pluginTypeId: data.pluginTypeId,
							sdkMessageId: data.sdkMessageId,
							sdkMessageFilterId: filterId,
							name: data.name,
							stage: data.stage,
							mode: data.mode,
							rank: data.rank,
							supportedDeployment: data.supportedDeployment,
							filteringAttributes: data.filteringAttributes,
							asyncAutoDelete: data.asyncAutoDelete,
							unsecureConfiguration: data.unsecureConfiguration,
							secureConfiguration: data.secureConfiguration,
							impersonatingUserId: data.impersonatingUserId,
							description: data.description,
						}
					);

					// Fetch the new step and send delta update
					const newStep = await this.repositories.step.findById(
						this.currentEnvironmentId,
						stepId
					);

					if (newStep) {
						// Import mapper at runtime to avoid circular dependencies
						const { PluginStepViewModelMapper } = await import(
							'../../application/mappers/PluginStepViewModelMapper.js'
						);
						const mapper = new PluginStepViewModelMapper();
						const stepViewModel = mapper.toTreeItem(newStep, data.pluginTypeId, []);

						await this.panel.postMessage({
							command: 'addNode',
							data: {
								parentId: data.pluginTypeId,
								node: stepViewModel,
							},
						});
					}

					void vscode.window.showInformationMessage(
						`Step "${data.name}" registered successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to register plugin step', error);
					void vscode.window.showErrorMessage(
						`Failed to register step in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle confirmation from the Edit Step modal.
	 */
	private async handleConfirmEditStep(data: {
		stepId: string;
		name: string;
		stage: number;
		mode: number;
		rank: number;
		supportedDeployment?: number | undefined;
		filteringAttributes?: string | undefined;
		asyncAutoDelete?: boolean | undefined;
		unsecureConfiguration?: string | undefined;
		secureConfiguration?: string | undefined;
		impersonatingUserId?: string | undefined;
		description?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling edit step confirmation', data);

		const [step, environment] = await Promise.all([
			this.repositories.step.findById(this.currentEnvironmentId, data.stepId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);
		const stepName = step?.getName() ?? 'Unknown Step';
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Updating ${stepName} in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.updateStep.execute(
						this.currentEnvironmentId,
						data.stepId,
						{
							name: data.name,
							stage: data.stage,
							mode: data.mode,
							rank: data.rank,
							supportedDeployment: data.supportedDeployment,
							filteringAttributes: data.filteringAttributes,
							asyncAutoDelete: data.asyncAutoDelete,
							unsecureConfiguration: data.unsecureConfiguration,
							secureConfiguration: data.secureConfiguration,
							impersonatingUserId: data.impersonatingUserId,
							description: data.description,
						}
					);

					// Fetch updated step and send delta update
					const updatedStep = await this.repositories.step.findById(
						this.currentEnvironmentId,
						data.stepId
					);

					if (updatedStep) {
						const { PluginStepViewModelMapper } = await import(
							'../../application/mappers/PluginStepViewModelMapper.js'
						);
						const mapper = new PluginStepViewModelMapper();
						// Get existing images
						const images = await this.repositories.image.findByStepId(
							this.currentEnvironmentId,
							data.stepId
						);
						const { StepImageViewModelMapper } = await import(
							'../../application/mappers/StepImageViewModelMapper.js'
						);
						const imageMapper = new StepImageViewModelMapper();
						const imageViewModels = images.map((img) =>
							imageMapper.toTreeItem(img, data.stepId)
						);

						const stepViewModel = mapper.toTreeItem(
							updatedStep,
							updatedStep.getPluginTypeId(),
							imageViewModels
						);

						await this.panel.postMessage({
							command: 'updateNode',
							data: { node: stepViewModel },
						});
					}

					void vscode.window.showInformationMessage(
						`${data.name} updated successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to update plugin step', error);
					void vscode.window.showErrorMessage(
						`Failed to update step in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle confirmation from the Register Image modal.
	 */
	private async handleConfirmRegisterImage(data: {
		stepId: string;
		name: string;
		imageType: number;
		entityAlias: string;
		attributes?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling register image confirmation', data);

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Registering image in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					const imageId = await this.useCases.registerImage.execute(
						this.currentEnvironmentId,
						{
							stepId: data.stepId,
							name: data.name,
							imageType: data.imageType,
							entityAlias: data.entityAlias,
							attributes: data.attributes,
						}
					);

					// Fetch the new image and send delta update
					const newImage = await this.repositories.image.findById(
						this.currentEnvironmentId,
						imageId
					);

					if (newImage) {
						const { StepImageViewModelMapper } = await import(
							'../../application/mappers/StepImageViewModelMapper.js'
						);
						const mapper = new StepImageViewModelMapper();
						const imageViewModel = mapper.toTreeItem(newImage, data.stepId);

						await this.panel.postMessage({
							command: 'addNode',
							data: {
								parentId: data.stepId,
								node: imageViewModel,
							},
						});
					}

					void vscode.window.showInformationMessage(
						`Image "${data.name}" registered successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to register step image', error);
					void vscode.window.showErrorMessage(
						`Failed to register image in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle confirmation from the Edit Image modal.
	 */
	private async handleConfirmEditImage(data: {
		imageId: string;
		name: string;
		imageType: number;
		entityAlias: string;
		attributes?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling edit image confirmation', data);

		const [image, environment] = await Promise.all([
			this.repositories.image.findById(this.currentEnvironmentId, data.imageId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);
		const imageName = image?.getName() ?? 'Unknown Image';
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Updating ${imageName} in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.updateImage.execute(
						this.currentEnvironmentId,
						data.imageId,
						{
							name: data.name,
							imageType: data.imageType,
							entityAlias: data.entityAlias,
							attributes: data.attributes,
						}
					);

					// Fetch updated image and send delta update
					const updatedImage = await this.repositories.image.findById(
						this.currentEnvironmentId,
						data.imageId
					);

					if (updatedImage) {
						const { StepImageViewModelMapper } = await import(
							'../../application/mappers/StepImageViewModelMapper.js'
						);
						const mapper = new StepImageViewModelMapper();
						const imageViewModel = mapper.toTreeItem(
							updatedImage,
							updatedImage.getStepId()
						);

						await this.panel.postMessage({
							command: 'updateNode',
							data: { node: imageViewModel },
						});
					}

					void vscode.window.showInformationMessage(
						`${data.name} updated successfully in ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to update step image', error);
					void vscode.window.showErrorMessage(
						`Failed to update image in ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle confirmation from the Update Package modal.
	 */
	private async handleConfirmUpdatePackage(
		packageId: string,
		_version: string | undefined
	): Promise<void> {
		if (!this.pendingUpdatePackageContent || this.pendingUpdatePackageId !== packageId) {
			this.logger.error('No pending package content for update');
			void vscode.window.showErrorMessage('No package file selected. Please try again.');
			return;
		}

		const base64Content = this.pendingUpdatePackageContent;
		this.pendingUpdatePackageId = null;
		this.pendingUpdatePackageContent = null;

		const [pkg, environment] = await Promise.all([
			this.repositories.package.findById(this.currentEnvironmentId, packageId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);
		const packageName = pkg?.getName() ?? 'Unknown Package';
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Updating ${packageName} in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
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

	/**
	 * Handle confirmation from the Update Assembly modal.
	 * Handles type registration/unregistration based on user selection (like PRT).
	 */
	private async handleConfirmUpdateAssembly(
		assemblyId: string,
		selectedTypeNames: string[]
	): Promise<void> {
		if (!this.pendingUpdateAssemblyContent || this.pendingUpdateAssemblyId !== assemblyId) {
			this.logger.error('No pending assembly content for update');
			void vscode.window.showErrorMessage('No assembly file selected. Please try again.');
			return;
		}

		const base64Content = this.pendingUpdateAssemblyContent;
		const pendingTypes = this.pendingUpdateAssemblyTypes;
		this.pendingUpdateAssemblyId = null;
		this.pendingUpdateAssemblyContent = null;
		this.pendingUpdateAssemblyTypes = [];

		const [assembly, environment] = await Promise.all([
			this.repositories.assembly.findById(this.currentEnvironmentId, assemblyId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);
		const assemblyName = assembly?.getName() ?? 'Unknown Assembly';
		const environmentName = environment?.name ?? 'Unknown Environment';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Updating ${assemblyName} in ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					// 1. Update assembly content (existing)
					await this.useCases.updateAssembly.execute(
						this.currentEnvironmentId,
						assemblyId,
						base64Content
					);

					// 2. Fetch current existing types to compare with selection
					const existingTypes = await this.repositories.pluginType.findByAssemblyId(
						this.currentEnvironmentId,
						assemblyId
					);
					const existingTypeNames = new Set(existingTypes.map((t) => t.getName()));
					const selectedTypeNameSet = new Set(selectedTypeNames);

					// 3. Register new types (selected but not existing)
					// Only consider types that exist in the new DLL
					const typesToRegister = pendingTypes.filter(
						(t) => selectedTypeNameSet.has(t.typeName) && !existingTypeNames.has(t.typeName)
					);

					let registeredCount = 0;
					for (const typeInfo of typesToRegister) {
						await this.repositories.pluginType.register(this.currentEnvironmentId, {
							typeName: typeInfo.typeName,
							friendlyName: typeInfo.displayName,
							assemblyId,
							isWorkflowActivity: typeInfo.typeKind === 'WorkflowActivity',
						});
						registeredCount++;
					}

					// 4. Unregister removed types (existing but not selected)
					const typesToUnregister = existingTypes.filter(
						(t) => !selectedTypeNameSet.has(t.getName())
					);

					let unregisteredCount = 0;
					for (const pluginType of typesToUnregister) {
						try {
							await this.repositories.pluginType.delete(
								this.currentEnvironmentId,
								pluginType.getId()
							);
							unregisteredCount++;
						} catch (error) {
							// Type may have steps - log and continue
							this.logger.warn('Failed to unregister plugin type (may have steps)', {
								pluginTypeId: pluginType.getId(),
								typeName: pluginType.getName(),
								error: error instanceof Error ? error.message : 'Unknown error',
							});
						}
					}

					// Refresh the subtree (assembly + all children)
					await this.refreshAssemblySubtree(assemblyId);

					// Build summary message
					const parts: string[] = [`${assemblyName} updated`];
					if (registeredCount > 0) {
						parts.push(`${registeredCount} type(s) added`);
					}
					if (unregisteredCount > 0) {
						parts.push(`${unregisteredCount} type(s) removed`);
					}

					void vscode.window.showInformationMessage(
						`${parts.join(', ')} in ${environmentName}.`
					);

					this.logger.info('Assembly update completed', {
						assemblyId,
						registeredCount,
						unregisteredCount,
					});
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

	// ========================================
	// Delta Update Helpers
	// ========================================

	/**
	 * Fetch a newly registered assembly with its types and send delta update to webview.
	 * This avoids a full tree refresh after registration.
	 */
	private async sendAssemblyDeltaUpdate(assemblyId: string): Promise<void> {
		this.logger.debug('Sending assembly delta update', { assemblyId });

		// Fetch the assembly with its plugin types (1 API call)
		const result = await this.repositories.assembly.findByIdWithTypes(
			this.currentEnvironmentId,
			assemblyId
		);

		if (result === null) {
			// Fallback to full refresh if assembly not found (shouldn't happen)
			this.logger.warn('Assembly not found for delta update, falling back to refresh', {
				assemblyId,
			});
			await this.handleRefresh();
			return;
		}

		// Build plugin type tree items (no steps yet for new assembly)
		const pluginTypeItems = result.pluginTypes.map((pluginType) =>
			this.pluginTypeMapper.toTreeItem(pluginType, assemblyId, [])
		);

		// Build assembly tree item (0 active steps for new assembly)
		const assemblyNode = this.assemblyMapper.toTreeItem(
			result.assembly,
			pluginTypeItems,
			0, // activeStepCount = 0 for new assembly
			null // parentPackageId = null for standalone
		);

		// Send delta update to webview
		await this.panel.postMessage({
			command: 'addStandaloneAssembly',
			data: { assemblyNode },
		});

		this.logger.debug('Assembly delta update sent', {
			assemblyId,
			pluginTypeCount: pluginTypeItems.length,
		});
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
