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
import {
	LoadSolutionMembershipsUseCase,
	type SolutionMembershipsDto,
} from '../../application/useCases/LoadSolutionMembershipsUseCase';
import type { LoadAttributesForPickerUseCase } from '../../application/useCases/LoadAttributesForPickerUseCase';
import type { RegisterWebHookUseCase } from '../../application/useCases/RegisterWebHookUseCase';
import type { UpdateWebHookUseCase } from '../../application/useCases/UpdateWebHookUseCase';
import type { UnregisterWebHookUseCase } from '../../application/useCases/UnregisterWebHookUseCase';
import type { RegisterServiceEndpointUseCase } from '../../application/useCases/RegisterServiceEndpointUseCase';
import type { UpdateServiceEndpointUseCase } from '../../application/useCases/UpdateServiceEndpointUseCase';
import type { UnregisterServiceEndpointUseCase } from '../../application/useCases/UnregisterServiceEndpointUseCase';
import type { RegisterDataProviderUseCase } from '../../application/useCases/RegisterDataProviderUseCase';
import type { UpdateDataProviderUseCase } from '../../application/useCases/UpdateDataProviderUseCase';
import type { UnregisterDataProviderUseCase } from '../../application/useCases/UnregisterDataProviderUseCase';
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
import type { IWebHookRepository } from '../../domain/interfaces/IWebHookRepository';
import type { IServiceEndpointRepository } from '../../domain/interfaces/IServiceEndpointRepository';
import type { IDataProviderRepository } from '../../domain/interfaces/IDataProviderRepository';
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
	readonly loadMemberships: LoadSolutionMembershipsUseCase;
	readonly loadAttributesForPicker: LoadAttributesForPickerUseCase;
	readonly registerWebHook: RegisterWebHookUseCase;
	readonly updateWebHook: UpdateWebHookUseCase;
	readonly unregisterWebHook: UnregisterWebHookUseCase;
	readonly registerServiceEndpoint: RegisterServiceEndpointUseCase;
	readonly updateServiceEndpoint: UpdateServiceEndpointUseCase;
	readonly unregisterServiceEndpoint: UnregisterServiceEndpointUseCase;
	readonly registerDataProvider: RegisterDataProviderUseCase;
	readonly updateDataProvider: UpdateDataProviderUseCase;
	readonly unregisterDataProvider: UnregisterDataProviderUseCase;
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
	readonly webHook: IWebHookRepository;
	readonly serviceEndpoint: IServiceEndpointRepository;
	readonly dataProvider: IDataProviderRepository;
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
	| 'getEntitiesForMessage'
	| 'showAttributePicker'
	| 'registerWebHook'
	| 'confirmRegisterWebHook'
	| 'confirmUpdateWebHook'
	| 'registerServiceEndpoint'
	| 'confirmRegisterServiceEndpoint'
	| 'confirmUpdateServiceEndpoint'
	| 'registerDataProvider'
	| 'confirmRegisterDataProvider'
	| 'confirmUpdateDataProvider'
	| 'showValidationError';

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
	/** Generation counter for load operations - used to discard stale results after environment change */
	private currentLoadId = 0;
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
			// Load solutions and tree in parallel for faster UX
			// Solutions typically load in ~1s, tree takes ~48s
			// By loading in parallel, dropdown populates immediately
			const solutionsPromise = this.loadSolutions().then(async (solutions) => {
				// Update dropdown as soon as solutions are ready
				await this.panel.postMessage({
					command: 'updateSolutionSelector',
					data: {
						solutions,
						currentSolutionId: this.currentSolutionId,
					},
				});
			});

			// Load tree data (this takes the longest)
			const treePromise = this.handleRefresh();

			// Wait for both to complete
			await Promise.all([solutionsPromise, treePromise]);
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

	/**
	 * Resolve solution unique name to solution ID using cached solutions.
	 * Used to update client-side solution memberships cache after registration.
	 */
	private resolveSolutionIdFromUniqueName(uniqueName: string | undefined): string | undefined {
		if (!uniqueName) return undefined;
		const solution = this.unmanagedSolutionsWithPrefix.find(
			(s) => s.uniqueName === uniqueName
		);
		return solution?.id;
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
							'AttributePickerModal.js'
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
			const { nodeId, nodeType } = data as { nodeId?: string; nodeType?: string };
			if (nodeId && nodeType) {
				await this.handleNodeSelection(nodeId, nodeType);
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

		this.coordinator.registerHandler('registerWebHook', async () => {
			await this.handleRegisterWebHook();
		});

		this.coordinator.registerHandler('registerServiceEndpoint', async () => {
			await this.handleRegisterServiceEndpoint();
		});

		this.coordinator.registerHandler('registerDataProvider', async () => {
			await this.handleRegisterDataProvider();
		});

		this.coordinator.registerHandler('registerStep', async () => {
			await this.handleRegisterStepFromDropdown();
		});

		this.coordinator.registerHandler('registerImage', async () => {
			await this.handleRegisterImageFromDropdown();
		});

		this.coordinator.registerHandler('getEntitiesForMessage', async (data) => {
			const { messageId } = data as { messageId?: string };
			if (messageId) {
				await this.handleGetEntitiesForMessage(messageId);
			}
		});

		this.coordinator.registerHandler('confirmRegisterPackage', async (data) => {
			const { name, version, prefix, solutionUniqueName } = data as {
				name?: string;
				version?: string;
				prefix?: string;
				solutionUniqueName?: string;
			};
			if (name && version && prefix && solutionUniqueName) {
				await this.handleConfirmRegisterPackage(name, version, prefix, solutionUniqueName);
			}
		});

		this.coordinator.registerHandler('confirmRegisterWebHook', async (data) => {
			const { name, url, authType, authValue, description, solutionUniqueName } = data as {
				name?: string;
				url?: string;
				authType?: number;
				authValue?: string;
				description?: string;
				solutionUniqueName?: string;
			};
			if (name && url && authType !== undefined) {
				await this.handleConfirmRegisterWebHook(
					name,
					url,
					authType,
					authValue,
					description,
					solutionUniqueName
				);
			}
		});

		this.coordinator.registerHandler('confirmUpdateWebHook', async (data) => {
			const { webhookId, name, url, authType, authValue, description } = data as {
				webhookId?: string;
				name?: string;
				url?: string;
				authType?: number;
				authValue?: string;
				description?: string;
			};
			if (webhookId && name && url && authType !== undefined) {
				await this.handleConfirmUpdateWebHook(webhookId, name, url, authType, authValue, description);
			}
		});

		this.coordinator.registerHandler('confirmRegisterServiceEndpoint', async (data) => {
			const endpointData = data as {
				name?: string;
				description?: string;
				contract?: number;
				connectionMode?: number;
				authType?: number;
				solutionNamespace?: string;
				namespaceAddress?: string;
				path?: string;
				sasKeyName?: string;
				sasKey?: string;
				sasToken?: string;
				messageFormat?: number;
				userClaim?: number;
				solutionUniqueName?: string;
			};
			if (endpointData.name && endpointData.solutionNamespace && endpointData.contract !== undefined) {
				await this.handleConfirmRegisterServiceEndpoint(endpointData);
			}
		});

		this.coordinator.registerHandler('confirmUpdateServiceEndpoint', async (data) => {
			const endpointData = data as {
				serviceEndpointId?: string;
				name?: string;
				description?: string;
				solutionNamespace?: string;
				namespaceAddress?: string;
				path?: string;
				authType?: number;
				sasKeyName?: string;
				sasKey?: string;
				sasToken?: string;
				messageFormat?: number;
				userClaim?: number;
			};
			if (endpointData.serviceEndpointId) {
				await this.handleConfirmUpdateServiceEndpoint(endpointData);
			}
		});

		this.coordinator.registerHandler('confirmRegisterDataProvider', async (data) => {
			const providerData = data as {
				name?: string;
				dataSourceLogicalName?: string;
				description?: string;
				retrievePluginId?: string;
				retrieveMultiplePluginId?: string;
				createPluginId?: string;
				updatePluginId?: string;
				deletePluginId?: string;
				solutionUniqueName?: string;
			};
			if (providerData.name && providerData.dataSourceLogicalName) {
				await this.handleConfirmRegisterDataProvider(providerData);
			}
		});

		this.coordinator.registerHandler('confirmUpdateDataProvider', async (data) => {
			const providerData = data as {
				dataProviderId?: string;
				name?: string;
				description?: string;
				retrievePluginId?: string | null;
				retrieveMultiplePluginId?: string | null;
				createPluginId?: string | null;
				updatePluginId?: string | null;
				deletePluginId?: string | null;
			};
			if (providerData.dataProviderId) {
				await this.handleConfirmUpdateDataProvider(providerData);
			}
		});

		this.coordinator.registerHandler('showValidationError', async (data) => {
			const { message } = data as { message?: string };
			if (message) {
				void vscode.window.showErrorMessage(message);
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
				solutionUniqueName?: string; // Solution to add step to
			};

			// Validate required fields and provide specific feedback
			const missingFields: string[] = [];
			if (!stepData.pluginTypeId) missingFields.push('Plugin Type');
			if (!stepData.sdkMessageId) missingFields.push('Message');
			if (!stepData.name) missingFields.push('Step Name');
			if (stepData.stage === undefined) missingFields.push('Stage');
			if (stepData.mode === undefined) missingFields.push('Mode');
			if (stepData.rank === undefined) missingFields.push('Execution Order');
			if (stepData.supportedDeployment === undefined) missingFields.push('Deployment');
			if (stepData.asyncAutoDelete === undefined) missingFields.push('Async Auto Delete');

			if (missingFields.length > 0) {
				this.logger.warn('Register step validation failed', { missingFields, stepData });
				void vscode.window.showErrorMessage(
					`Cannot register step: Missing required fields: ${missingFields.join(', ')}`
				);
				return;
			}

			await this.handleConfirmRegisterStep({
				pluginTypeId: stepData.pluginTypeId!,
				sdkMessageId: stepData.sdkMessageId!,
				sdkMessageFilterId: stepData.sdkMessageFilterId,
				primaryEntity: stepData.primaryEntity,
				secondaryEntity: stepData.secondaryEntity,
				name: stepData.name!,
				stage: stepData.stage!,
				mode: stepData.mode!,
				rank: stepData.rank!,
				supportedDeployment: stepData.supportedDeployment!,
				filteringAttributes: stepData.filteringAttributes,
				asyncAutoDelete: stepData.asyncAutoDelete!,
				unsecureConfiguration: stepData.unsecureConfiguration,
				secureConfiguration: stepData.secureConfiguration,
				impersonatingUserId: stepData.impersonatingUserId,
				description: stepData.description,
				solutionUniqueName: stepData.solutionUniqueName,
			});
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
				messagePropertyName?: string;
				attributes?: string;
			};
			if (
				imageData.stepId &&
				imageData.name &&
				imageData.imageType !== undefined &&
				imageData.entityAlias &&
				imageData.messagePropertyName
			) {
				await this.handleConfirmRegisterImage({
					stepId: imageData.stepId,
					name: imageData.name,
					imageType: imageData.imageType,
					entityAlias: imageData.entityAlias,
					messagePropertyName: imageData.messagePropertyName,
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

		this.coordinator.registerHandler('showAttributePicker', async (data) => {
			const { entityLogicalName, currentAttributes, fieldId } = data as {
				entityLogicalName?: string;
				currentAttributes?: string;
				fieldId?: string;
			};
			if (entityLogicalName && fieldId) {
				await this.handleShowAttributePicker(entityLogicalName, currentAttributes || '', fieldId);
			}
		});
	}

	private async handleRefresh(): Promise<void> {
		// Increment load ID to invalidate any in-flight requests from previous loads
		// This prevents stale data from overwriting the UI after environment change
		const thisLoadId = ++this.currentLoadId;

		this.logger.debug('Refreshing plugin registration tree', {
			environmentId: this.currentEnvironmentId,
			solutionId: this.currentSolutionId,
			loadId: thisLoadId,
		});

		await this.loadingBehavior.setLoading(true);

		try {
			// Progress callback updates webview only (no status bar notification - panel UI is sufficient)
			const onProgress = (step: string, percent: number): void => {
				// Don't send progress if this load has been superseded
				if (thisLoadId !== this.currentLoadId) return;
				void this.panel.postMessage({
					command: 'updateLoadingProgress',
					data: { step, percent },
				});
			};

			// Load tree and solution memberships in parallel for no UX regression
			const [treeResult, membershipsResult] = await Promise.all([
				this.useCases.loadTree.execute(
					this.currentEnvironmentId,
					this.currentSolutionId === DEFAULT_SOLUTION_ID ? undefined : this.currentSolutionId,
					onProgress
				),
				this.loadSolutionMemberships(),
			]);

			// Check if this load has been superseded by a newer one (e.g., environment changed)
			if (thisLoadId !== this.currentLoadId) {
				this.logger.debug('Discarding stale load result', {
					thisLoadId,
					currentLoadId: this.currentLoadId,
				});
				return;
			}

			const treeItems = this.treeMapper.toTreeItems(
				treeResult.packages,
				treeResult.standaloneAssemblies,
				treeResult.webHooks,
				treeResult.serviceEndpoints,
				treeResult.dataProviders,
				treeResult.customApis
			);

			// Count webhooks and service endpoints in the mapped tree items
			const webhookTreeItems = treeItems.filter((item) => item.type === 'webHook');
			const serviceEndpointTreeItems = treeItems.filter((item) => item.type === 'serviceEndpoint');

			this.logger.info('Plugin registration tree loaded', {
				totalNodeCount: treeResult.totalNodeCount,
				webHooksFromUseCase: treeResult.webHooks.length,
				webHooksInTreeItems: webhookTreeItems.length,
				serviceEndpointsFromUseCase: treeResult.serviceEndpoints.length,
				serviceEndpointsInTreeItems: serviceEndpointTreeItems.length,
				solutionMembershipCount: Object.keys(membershipsResult).length,
			});

			// Send tree and memberships together - memberships enable client-side filtering
			await this.panel.postMessage({
				command: 'updateTree',
				data: {
					treeItems,
					isEmpty: treeResult.totalNodeCount === 0,
					solutionMemberships: membershipsResult,
				},
			});
		} catch (error: unknown) {
			// Don't show error if this load has been superseded
			if (thisLoadId !== this.currentLoadId) return;

			this.logger.error('Error loading plugin registration tree', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to load plugin registration: ${errorMessage}`
			);
		} finally {
			// Only clear loading state if this is still the current load
			if (thisLoadId === this.currentLoadId) {
				await this.loadingBehavior.setLoading(false);
			}
		}
	}

	/**
	 * Loads solution memberships for client-side filtering.
	 * Errors are logged but don't fail the main tree load.
	 */
	private async loadSolutionMemberships(): Promise<SolutionMembershipsDto> {
		try {
			const memberships = await this.useCases.loadMemberships.execute(this.currentEnvironmentId);
			return LoadSolutionMembershipsUseCase.toDto(memberships);
		} catch (error: unknown) {
			this.logger.warn('Failed to load solution memberships (filtering disabled)', error);
			return {};
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

		// Send to webview for client-side filtering (no server reload needed)
		await this.panel.postMessage({
			command: 'solutionFilterChanged',
			data: { solutionId },
		});
	}

	/**
	 * Handle attribute picker request from webview.
	 * Fetches entity attributes and sends them to the webview for modal display.
	 */
	private async handleShowAttributePicker(
		entityLogicalName: string,
		currentAttributes: string,
		fieldId: string
	): Promise<void> {
		this.logger.debug('Showing attribute picker', { entityLogicalName, fieldId });

		try {
			const result = await this.useCases.loadAttributesForPicker.execute(
				this.currentEnvironmentId,
				entityLogicalName
			);

			// Parse current attributes to mark as selected
			const currentSet = new Set(
				currentAttributes
					.split(',')
					.map((a) => a.trim().toLowerCase())
					.filter((a) => a.length > 0)
			);

			// Send attributes to webview
			await this.panel.postMessage({
				command: 'showAttributePickerModal',
				data: {
					entityLogicalName,
					fieldId,
					attributes: result.attributes,
					currentSelection: Array.from(currentSet),
				},
			});
		} catch (error: unknown) {
			this.logger.error('Failed to load attributes for picker', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to load attributes: ${errorMessage}`);
		}
	}

	/**
	 * Handle node selection - fetch entity details and send to webview for detail panel.
	 */
	private async handleNodeSelection(nodeId: string, nodeType: string): Promise<void> {
		this.logger.debug('Node selected', { nodeId, nodeType });

		try {
			let details: Record<string, unknown> | null = null;

			switch (nodeType) {
				case 'package':
					details = await this.fetchPackageDetails(nodeId);
					break;
				case 'assembly':
					details = await this.fetchAssemblyDetails(nodeId);
					break;
				case 'pluginType':
					details = await this.fetchPluginTypeDetails(nodeId);
					break;
				case 'step':
					details = await this.fetchStepDetails(nodeId);
					break;
				case 'image':
					details = await this.fetchImageDetails(nodeId);
					break;
				case 'webHook':
					details = await this.fetchWebHookDetails(nodeId);
					break;
				case 'serviceEndpoint':
					details = await this.fetchServiceEndpointDetails(nodeId);
					break;
				default:
					this.logger.warn('Unknown node type', { nodeType });
					return;
			}

			if (details) {
				await this.panel.postMessage({ command: 'showNodeDetails', data: details });
			}
		} catch (error) {
			this.logger.error('Failed to fetch node details', { nodeId, nodeType, error });
		}
	}

	private async fetchPackageDetails(packageId: string): Promise<Record<string, unknown> | null> {
		const pkg = await this.repositories.package.findById(this.currentEnvironmentId, packageId);
		if (!pkg) return null;

		return {
			nodeType: 'package',
			name: pkg.getName(),
			uniqueName: pkg.getUniqueName(),
			version: pkg.getVersion(),
			isManaged: pkg.isInManagedState(),
			createdOn: pkg.getCreatedOn()?.toISOString(),
			modifiedOn: pkg.getModifiedOn()?.toISOString(),
		};
	}

	private async fetchAssemblyDetails(assemblyId: string): Promise<Record<string, unknown> | null> {
		const assembly = await this.repositories.assembly.findById(
			this.currentEnvironmentId,
			assemblyId
		);
		if (!assembly) return null;

		// Count plugins for this assembly
		const pluginTypes = await this.repositories.pluginType.findByAssemblyId(
			this.currentEnvironmentId,
			assemblyId
		);

		return {
			nodeType: 'assembly',
			name: assembly.getName(),
			version: assembly.getVersion(),
			isolationMode: assembly.getIsolationMode().getName(),
			sourceType: assembly.getSourceType().getName(),
			isManaged: assembly.isInManagedState(),
			pluginCount: pluginTypes.length,
			packageName: assembly.getPackageId() ? 'In package' : null,
			createdOn: assembly.getCreatedOn()?.toISOString(),
		};
	}

	private async fetchPluginTypeDetails(pluginTypeId: string): Promise<Record<string, unknown> | null> {
		const pluginType = await this.repositories.pluginType.findById(
			this.currentEnvironmentId,
			pluginTypeId
		);
		if (!pluginType) return null;

		// Count steps for this plugin type
		const steps = await this.repositories.step.findByPluginTypeId(
			this.currentEnvironmentId,
			pluginTypeId
		);

		return {
			nodeType: 'pluginType',
			typeName: pluginType.getName(),
			friendlyName: pluginType.getFriendlyName(),
			isWorkflowActivity: pluginType.isWorkflowActivity(),
			assemblyName: pluginType.getAssemblyId(),
			stepCount: steps.length,
		};
	}

	private async fetchStepDetails(stepId: string): Promise<Record<string, unknown> | null> {
		const step = await this.repositories.step.findById(this.currentEnvironmentId, stepId);
		if (!step) return null;

		return {
			nodeType: 'step',
			name: step.getName(),
			message: step.getMessageName(),
			primaryEntity: step.getPrimaryEntityLogicalName(),
			stage: step.getStage().getName(),
			mode: step.getMode().getName(),
			rank: step.getRank(),
			deployment: this.getDeploymentDisplayName(step.getSupportedDeployment()),
			asyncAutoDelete: step.getAsyncAutoDelete(),
			filteringAttributes: step.getFilteringAttributes(),
			isEnabled: step.isEnabled(),
			isManaged: step.isInManagedState(),
			unsecureConfig: step.getUnsecureConfiguration()
				? this.truncateText(step.getUnsecureConfiguration() ?? '', 200)
				: null,
			createdOn: step.getCreatedOn()?.toISOString(),
		};
	}

	private async fetchImageDetails(imageId: string): Promise<Record<string, unknown> | null> {
		const image = await this.repositories.image.findById(this.currentEnvironmentId, imageId);
		if (!image) return null;

		return {
			nodeType: 'image',
			name: image.getName(),
			imageType: image.getImageType().getName(),
			entityAlias: image.getEntityAlias(),
			messagePropertyName: image.getMessagePropertyName(),
			attributes: image.getAttributes(),
		};
	}

	private async fetchWebHookDetails(webhookId: string): Promise<Record<string, unknown> | null> {
		const webhook = await this.repositories.webHook.findById(this.currentEnvironmentId, webhookId);
		if (!webhook) return null;

		return {
			nodeType: 'webHook',
			name: webhook.getName(),
			url: webhook.getUrl(),
			authType: webhook.getAuthType().getName(),
			description: webhook.getDescription(),
			isManaged: webhook.isInManagedState(),
			createdOn: webhook.getCreatedOn().toISOString(),
			modifiedOn: webhook.getModifiedOn().toISOString(),
		};
	}

	private async fetchServiceEndpointDetails(
		serviceEndpointId: string
	): Promise<Record<string, unknown> | null> {
		const endpoint = await this.repositories.serviceEndpoint.findById(
			this.currentEnvironmentId,
			serviceEndpointId
		);
		if (!endpoint) return null;

		return {
			nodeType: 'serviceEndpoint',
			name: endpoint.getName(),
			description: endpoint.getDescription(),
			contract: endpoint.getContract().getName(),
			connectionMode: endpoint.getConnectionMode().getName(),
			authType: endpoint.getAuthType().getName(),
			messageFormat: endpoint.getMessageFormat().getName(),
			userClaim: endpoint.getUserClaim().getName(),
			namespace: endpoint.isEventHub()
				? endpoint.getNamespaceAddress()
				: endpoint.getSolutionNamespace(),
			path: endpoint.getPath(),
			sasKeyName: endpoint.getSasKeyName(),
			isManaged: endpoint.isInManagedState(),
			createdOn: endpoint.getCreatedOn().toISOString(),
			modifiedOn: endpoint.getModifiedOn().toISOString(),
		};
	}

	private getDeploymentDisplayName(deployment: number): string {
		switch (deployment) {
			case 0:
				return 'Server Only';
			case 1:
				return 'Offline Only';
			case 2:
				return 'Server and Offline';
			default:
				return 'Unknown';
		}
	}

	private truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
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
						uniqueName: s.uniqueName,
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
	 * Handle Register WebHook action from dropdown.
	 * Shows modal with empty form for webhook registration.
	 */
	private async handleRegisterWebHook(): Promise<void> {
		this.logger.info('Register WebHook requested');

		try {
			// Load unmanaged solutions for the dropdown
			this.unmanagedSolutionsWithPrefix =
				await this.repositories.solution.findUnmanagedWithPublisherPrefix(
					this.currentEnvironmentId
				);

			// Send message to webview to show modal
			await this.panel.postMessage({
				command: 'showRegisterWebHookModal',
				data: {
					authTypes: [
						{ value: 5, label: 'HttpHeader' },
						{ value: 4, label: 'WebhookKey' },
						{ value: 6, label: 'HttpQueryString' },
					],
					solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
						id: s.id,
						uniqueName: s.uniqueName,
						name: s.name,
					})),
				},
			});
		} catch (error) {
			this.logger.error('Failed to load solutions for webhook registration', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to prepare webhook registration: ${errorMessage}`);
		}
	}

	/**
	 * Handle confirmed webhook registration.
	 */
	private async handleConfirmRegisterWebHook(
		name: string,
		url: string,
		authType: number,
		authValue: string | undefined,
		description: string | undefined,
		solutionUniqueName: string | undefined
	): Promise<void> {
		this.logger.info('Registering webhook', { name, url, authType });

		try {
			let webhookId: string | undefined;

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Registering WebHook: ${name}`,
					cancellable: false,
				},
				async () => {
					webhookId = await this.useCases.registerWebHook.execute(this.currentEnvironmentId, {
						name,
						url,
						authType,
						authValue,
						description,
						solutionUniqueName,
					});
				}
			);

			void vscode.window.showInformationMessage(`WebHook "${name}" registered successfully.`);

			// Delta update: fetch the new webhook and add to tree
			if (webhookId) {
				const newWebHook = await this.repositories.webHook.findById(
					this.currentEnvironmentId,
					webhookId
				);

				if (newWebHook) {
					const { WebHookViewModelMapper } = await import(
						'../../application/mappers/WebHookViewModelMapper.js'
					);
					const mapper = new WebHookViewModelMapper();
					const webhookViewModel = mapper.toTreeItem(newWebHook);

					// Resolve solution ID for client-side cache update
					const solutionId = this.resolveSolutionIdFromUniqueName(solutionUniqueName);

					// Add as root-level node (no parent)
					await this.panel.postMessage({
						command: 'addNode',
						data: {
							parentId: null,
							node: webhookViewModel,
							solutionId, // Updates client-side solution memberships cache
						},
					});

					// Select the new webhook and show details
					await this.panel.postMessage({
						command: 'selectAndShowDetails',
						data: { nodeId: webhookId, nodeType: 'webHook' },
					});
				}
			}
		} catch (error) {
			this.logger.error('Failed to register webhook', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to register WebHook: ${errorMessage}`);
		}
	}

	/**
	 * Handle confirmed webhook update.
	 */
	private async handleConfirmUpdateWebHook(
		webhookId: string,
		name: string,
		url: string,
		authType: number,
		authValue: string | undefined,
		description: string | undefined
	): Promise<void> {
		this.logger.info('Updating webhook', { webhookId, name, url, authType });

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Updating WebHook: ${name}`,
					cancellable: false,
				},
				async () => {
					await this.useCases.updateWebHook.execute(
						this.currentEnvironmentId,
						webhookId,
						name,
						{
							name,
							url,
							authType,
							authValue,
							description,
						}
					);
				}
			);

			void vscode.window.showInformationMessage(
				`WebHook "${name}" updated successfully in ${environmentName}.`
			);
			await this.handleRefresh();

			// Select the updated webhook and show details
			await this.panel.postMessage({
				command: 'selectAndShowDetails',
				data: { nodeId: webhookId, nodeType: 'webHook' },
			});
		} catch (error) {
			this.logger.error('Failed to update webhook', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to update WebHook in ${environmentName}: ${errorMessage}`
			);
		}
	}

	/**
	 * Handle Register Service Endpoint action from dropdown.
	 * Shows modal with form for service endpoint registration.
	 */
	private async handleRegisterServiceEndpoint(): Promise<void> {
		this.logger.info('Register Service Endpoint requested');

		try {
			// Load unmanaged solutions for the dropdown
			this.unmanagedSolutionsWithPrefix =
				await this.repositories.solution.findUnmanagedWithPublisherPrefix(
					this.currentEnvironmentId
				);

			// Send message to webview to show modal
			await this.panel.postMessage({
				command: 'showRegisterServiceEndpointModal',
				data: {
					contractTypes: [
						{ value: 6, label: 'Queue' },
						{ value: 5, label: 'Topic' },
						{ value: 7, label: 'EventHub' },
						{ value: 1, label: 'OneWay (Legacy)' },
						{ value: 4, label: 'TwoWay (Legacy)' },
						{ value: 3, label: 'Rest' },
					],
					authTypes: [
						{ value: 2, label: 'SASKey' },
						{ value: 3, label: 'SASToken' },
						{ value: 1, label: 'ACS (Legacy)' },
					],
					messageFormats: [
						{ value: 2, label: 'JSON' },
						{ value: 1, label: '.NET Binary' },
						{ value: 3, label: 'XML' },
					],
					userClaims: [
						{ value: 1, label: 'None' },
						{ value: 2, label: 'UserId' },
						{ value: 3, label: 'UserInfo' },
					],
					solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
						id: s.id,
						uniqueName: s.uniqueName,
						name: s.name,
					})),
				},
			});
		} catch (error) {
			this.logger.error('Failed to load solutions for service endpoint registration', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to prepare service endpoint registration: ${errorMessage}`
			);
		}
	}

	/**
	 * Handle confirmed service endpoint registration.
	 */
	private async handleConfirmRegisterServiceEndpoint(endpointData: {
		name?: string;
		description?: string;
		contract?: number;
		connectionMode?: number;
		authType?: number;
		solutionNamespace?: string;
		namespaceAddress?: string;
		path?: string;
		sasKeyName?: string;
		sasKey?: string;
		sasToken?: string;
		messageFormat?: number;
		userClaim?: number;
		solutionUniqueName?: string;
	}): Promise<void> {
		const { name, contract } = endpointData;
		this.logger.info('Registering service endpoint', { name, contract });

		try {
			let serviceEndpointId: string | undefined;

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Registering Service Endpoint: ${name}`,
					cancellable: false,
				},
				async () => {
					serviceEndpointId = await this.useCases.registerServiceEndpoint.execute(
						this.currentEnvironmentId,
						{
							name: endpointData.name!,
							description: endpointData.description,
							contract: endpointData.contract!,
							connectionMode: endpointData.connectionMode ?? 1,
							authType: endpointData.authType ?? 2,
							solutionNamespace: endpointData.solutionNamespace!,
							namespaceAddress: endpointData.namespaceAddress ?? '',
							path: endpointData.path,
							sasKeyName: endpointData.sasKeyName,
							sasKey: endpointData.sasKey,
							sasToken: endpointData.sasToken,
							messageFormat: endpointData.messageFormat ?? 2,
							userClaim: endpointData.userClaim ?? 1,
							solutionUniqueName: endpointData.solutionUniqueName,
						}
					);
				}
			);

			void vscode.window.showInformationMessage(
				`Service Endpoint "${name}" registered successfully.`
			);

			// Delta update: fetch the new endpoint and add to tree
			if (serviceEndpointId) {
				const newEndpoint = await this.repositories.serviceEndpoint.findById(
					this.currentEnvironmentId,
					serviceEndpointId
				);

				if (newEndpoint) {
					const { ServiceEndpointViewModelMapper } = await import(
						'../../application/mappers/ServiceEndpointViewModelMapper.js'
					);
					const mapper = new ServiceEndpointViewModelMapper();
					const endpointViewModel = mapper.toTreeItem(newEndpoint);

					// Resolve solution ID for client-side cache update
					const solutionId = this.resolveSolutionIdFromUniqueName(endpointData.solutionUniqueName);

					await this.panel.postMessage({
						command: 'addNode',
						data: {
							parentId: null,
							node: endpointViewModel,
							solutionId, // Updates client-side solution memberships cache
						},
					});

					// Select the new service endpoint and show details
					await this.panel.postMessage({
						command: 'selectAndShowDetails',
						data: { nodeId: serviceEndpointId, nodeType: 'serviceEndpoint' },
					});
				}
			}
		} catch (error) {
			this.logger.error('Failed to register service endpoint', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(`Failed to register Service Endpoint: ${errorMessage}`);
		}
	}

	/**
	 * Handle confirmed service endpoint update.
	 */
	private async handleConfirmUpdateServiceEndpoint(endpointData: {
		serviceEndpointId?: string;
		name?: string;
		description?: string;
		solutionNamespace?: string;
		namespaceAddress?: string;
		path?: string;
		authType?: number;
		sasKeyName?: string;
		sasKey?: string;
		sasToken?: string;
		messageFormat?: number;
		userClaim?: number;
	}): Promise<void> {
		const { serviceEndpointId, name } = endpointData;
		this.logger.info('Updating service endpoint', { serviceEndpointId, name });

		const environment = await this.getEnvironmentById(this.currentEnvironmentId);
		const environmentName = environment?.name ?? 'Unknown Environment';

		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Updating Service Endpoint: ${name ?? serviceEndpointId}`,
					cancellable: false,
				},
				async () => {
					await this.useCases.updateServiceEndpoint.execute(
						this.currentEnvironmentId,
						serviceEndpointId!,
						{
							name: endpointData.name,
							description: endpointData.description,
							solutionNamespace: endpointData.solutionNamespace,
							namespaceAddress: endpointData.namespaceAddress,
							path: endpointData.path,
							authType: endpointData.authType,
							sasKeyName: endpointData.sasKeyName,
							sasKey: endpointData.sasKey,
							sasToken: endpointData.sasToken,
							messageFormat: endpointData.messageFormat,
							userClaim: endpointData.userClaim,
						}
					);
				}
			);

			void vscode.window.showInformationMessage(
				`Service Endpoint "${name ?? serviceEndpointId}" updated successfully in ${environmentName}.`
			);
			await this.handleRefresh();

			// Select the updated service endpoint and show details
			if (serviceEndpointId) {
				await this.panel.postMessage({
					command: 'selectAndShowDetails',
					data: { nodeId: serviceEndpointId, nodeType: 'serviceEndpoint' },
				});
			}
		} catch (error) {
			this.logger.error('Failed to update service endpoint', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to update Service Endpoint in ${environmentName}: ${errorMessage}`
			);
		}
	}

	/**
	 * Handle Register Data Provider action from dropdown.
	 * Shows modal with form for data provider registration.
	 */
	private async handleRegisterDataProvider(): Promise<void> {
		this.logger.info('Register Data Provider requested');

		try {
			// Load unmanaged solutions for the dropdown
			this.unmanagedSolutionsWithPrefix =
				await this.repositories.solution.findUnmanagedWithPublisherPrefix(
					this.currentEnvironmentId
				);

			// Load plugin types for the plugin pickers (non-workflow activities only)
			const allPluginTypes = await this.repositories.pluginType.findAll(this.currentEnvironmentId);
			const pluginOptions = allPluginTypes
				.filter((pt) => !pt.isWorkflowActivity())
				.map((pt) => ({
					value: pt.getId(),
					label: pt.getFriendlyName() || pt.getName(),
				}))
				.sort((a, b) => a.label.localeCompare(b.label));

			// Send message to webview to show modal
			await this.panel.postMessage({
				command: 'showRegisterDataProviderModal',
				data: {
					pluginTypes: pluginOptions,
					solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
						id: s.id,
						uniqueName: s.uniqueName,
						name: s.name,
					})),
				},
			});
		} catch (error) {
			this.logger.error('Failed to load data for data provider registration', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to prepare data provider registration: ${errorMessage}`
			);
		}
	}

	/**
	 * Handle confirmed data provider registration.
	 */
	private async handleConfirmRegisterDataProvider(providerData: {
		name?: string;
		dataSourceLogicalName?: string;
		description?: string;
		retrievePluginId?: string;
		retrieveMultiplePluginId?: string;
		createPluginId?: string;
		updatePluginId?: string;
		deletePluginId?: string;
		solutionUniqueName?: string;
	}): Promise<void> {
		const { name, dataSourceLogicalName } = providerData;

		// Validate required fields
		if (!name || !dataSourceLogicalName) {
			void vscode.window.showErrorMessage('Name and Data Source are required.');
			return;
		}

		this.logger.info('Registering data provider', { name, dataSourceLogicalName });

		try {
			let dataProviderId: string | undefined;

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Registering Data Provider: ${name}`,
					cancellable: false,
				},
				async () => {
					dataProviderId = await this.useCases.registerDataProvider.execute(
						this.currentEnvironmentId,
						{
							name: name,
							dataSourceLogicalName: dataSourceLogicalName,
							description: providerData.description,
							retrievePluginId: providerData.retrievePluginId || undefined,
							retrieveMultiplePluginId: providerData.retrieveMultiplePluginId || undefined,
							createPluginId: providerData.createPluginId || undefined,
							updatePluginId: providerData.updatePluginId || undefined,
							deletePluginId: providerData.deletePluginId || undefined,
							solutionUniqueName: providerData.solutionUniqueName || undefined,
						}
					);
				}
			);

			void vscode.window.showInformationMessage(
				`Data Provider "${name}" registered successfully.`
			);

			// Delta update: fetch the new data provider and add to tree
			if (dataProviderId) {
				const newDataProvider = await this.repositories.dataProvider.findById(
					this.currentEnvironmentId,
					dataProviderId
				);

				if (newDataProvider) {
					const { DataProviderViewModelMapper } = await import(
						'../../application/mappers/DataProviderViewModelMapper.js'
					);
					const mapper = new DataProviderViewModelMapper();
					const dataProviderViewModel = mapper.toTreeItem(newDataProvider);

					// Resolve solution ID for client-side cache update
					const solutionId = this.resolveSolutionIdFromUniqueName(
						providerData.solutionUniqueName
					);

					// Add as root-level node (no parent)
					await this.panel.postMessage({
						command: 'addNode',
						data: {
							parentId: null,
							node: dataProviderViewModel,
							solutionId,
						},
					});

					// Select the new data provider and show details
					await this.panel.postMessage({
						command: 'selectAndShowDetails',
						data: { nodeId: dataProviderId, nodeType: 'dataProvider' },
					});
				}
			}
		} catch (error) {
			this.logger.error('Failed to register data provider', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			void vscode.window.showErrorMessage(
				`Failed to register Data Provider: ${errorMessage}`
			);
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
		prefix: string,
		solutionUniqueName: string
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
					const packageId = await this.useCases.registerPackage.execute(this.currentEnvironmentId, {
						name: prefixedName,
						version,
						uniqueName: prefixedName,
						base64Content,
						solutionUniqueName,
					});

					void vscode.window.showInformationMessage(
						`${prefixedName} v${version} registered successfully in ${environmentName}.`
					);

					// Fetch the new package and send delta update
					await this.sendPackageDeltaUpdate(packageId);
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

				// Select the updated step and show details
				await this.panel.postMessage({
					command: 'selectAndShowDetails',
					data: { nodeId: stepId, nodeType: 'step' },
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

				// Select the updated step and show details
				await this.panel.postMessage({
					command: 'selectAndShowDetails',
					data: { nodeId: stepId, nodeType: 'step' },
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
	 * Handle Register Step from dropdown menu.
	 * Shows quick pick to select plugin type, then opens registration modal.
	 */
	private async handleRegisterStepFromDropdown(): Promise<void> {
		this.logger.info('Register Step from dropdown - fetching plugin types');

		// Fetch all plugin types
		const pluginTypes = await this.repositories.pluginType.findAll(this.currentEnvironmentId);

		if (pluginTypes.length === 0) {
			void vscode.window.showWarningMessage(
				'No plugin types found. Register an assembly first to create plugin types.'
			);
			return;
		}

		// Show quick pick to select plugin type
		const items = pluginTypes.map((pt) => ({
			label: pt.getName(),
			description: pt.isWorkflowActivity() ? '(Workflow Activity)' : '(Plugin)',
			pluginTypeId: pt.getId(),
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a plugin type to register a step for',
			title: 'Register Step',
		});

		if (!selected) {
			return; // User cancelled
		}

		// Proceed with step registration using the selected plugin type
		await this.registerStep(selected.pluginTypeId);
	}

	/**
	 * Handle Register Image from dropdown menu.
	 * Shows quick pick to select step, then opens registration modal.
	 */
	private async handleRegisterImageFromDropdown(): Promise<void> {
		this.logger.info('Register Image from dropdown - fetching steps');

		// Fetch all steps
		const steps = await this.repositories.step.findAll(this.currentEnvironmentId);

		if (steps.length === 0) {
			void vscode.window.showWarningMessage(
				'No plugin steps found. Register a step first before adding images.'
			);
			return;
		}

		// Show quick pick to select step
		const items = steps.map((step) => ({
			label: step.getName(),
			description: step.getMessageName(),
			detail: step.isEnabled() ? 'Enabled' : 'Disabled',
			stepId: step.getId(),
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a step to register an image for',
			title: 'Register Image',
		});

		if (!selected) {
			return; // User cancelled
		}

		// Proceed with image registration using the selected step
		await this.registerImage(selected.stepId);
	}

	/**
	 * Register a new plugin step. Called from context menu on plugin type.
	 * Shows modal form, then creates the step.
	 */
	public async registerStep(pluginTypeId: string): Promise<void> {
		this.logger.info('Registering new plugin step', { pluginTypeId });

		// Fetch plugin type info, SDK messages, and solutions for the form
		const [pluginType, messages, solutions] = await Promise.all([
			this.repositories.pluginType.findById(this.currentEnvironmentId, pluginTypeId),
			this.repositories.sdkMessage.findAllPublic(this.currentEnvironmentId),
			this.repositories.solution.findUnmanagedWithPublisherPrefix(this.currentEnvironmentId),
		]);

		const pluginTypeName = pluginType?.getName() ?? 'Unknown Plugin';

		// Send modal data to webview
		await this.panel.postMessage({
			command: 'showRegisterStepModal',
			data: {
				pluginTypeId,
				pluginTypeName,
				messages: messages.map((m) => ({ id: m.getId(), name: m.getName() })),
				solutions: solutions.map((s) => ({
					id: s.id,
					uniqueName: s.uniqueName,
					name: s.name,
				})),
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
				primaryEntity: step.getPrimaryEntityLogicalName(),
				stage: step.getStage().getValue(),
				mode: step.getMode().getValue(),
				rank: step.getRank(),
				filteringAttributes: step.getFilteringAttributes() ?? '',
				supportedDeployment: step.getSupportedDeployment(),
				asyncAutoDelete: step.getAsyncAutoDelete(),
				unsecureConfiguration: step.getUnsecureConfiguration() ?? '',
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
		const messageName = step?.getMessageName() ?? 'Update';
		const primaryEntity = step?.getPrimaryEntityLogicalName() ?? null;

		// Send modal data to webview
		await this.panel.postMessage({
			command: 'showRegisterImageModal',
			data: {
				stepId,
				stepName,
				messageName,
				primaryEntity,
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

		// Get the step to retrieve the primary entity for the attribute picker
		const step = await this.repositories.step.findById(this.currentEnvironmentId, image.getStepId());
		const primaryEntity = step?.getPrimaryEntityLogicalName() ?? null;

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditImageModal',
			data: {
				imageId,
				imageName: image.getName(),
				imageType: image.getImageType().getValue(),
				entityAlias: image.getEntityAlias(),
				messagePropertyName: image.getMessagePropertyName(),
				attributes: image.getAttributes(),
				primaryEntity,
			},
		});
	}

	/**
	 * Edit a webhook. Called from context menu command.
	 * Shows modal with pre-populated values.
	 */
	public async editWebHook(webhookId: string): Promise<void> {
		this.logger.info('Editing webhook', { webhookId });

		const webhook = await this.repositories.webHook.findById(this.currentEnvironmentId, webhookId);

		if (webhook === null) {
			void vscode.window.showErrorMessage('WebHook not found.');
			return;
		}

		// Load unmanaged solutions for the dropdown
		this.unmanagedSolutionsWithPrefix =
			await this.repositories.solution.findUnmanagedWithPublisherPrefix(this.currentEnvironmentId);

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditWebHookModal',
			data: {
				webhookId,
				name: webhook.getName(),
				url: webhook.getUrl(),
				authType: webhook.getAuthType().getValue(),
				description: webhook.getDescription(),
				authTypes: [
					{ value: 5, label: 'HttpHeader' },
					{ value: 4, label: 'WebhookKey' },
					{ value: 6, label: 'HttpQueryString' },
				],
				solutions: this.unmanagedSolutionsWithPrefix.map((s) => ({
					id: s.id,
					uniqueName: s.uniqueName,
					name: s.name,
				})),
			},
		});
	}

	/**
	 * Unregister (delete) a webhook. Called from context menu command.
	 * Shows confirmation dialog, then deletes the webhook.
	 */
	public async unregisterWebHook(webhookId: string): Promise<void> {
		this.logger.info('Unregistering webhook', { webhookId });

		// Fetch webhook and environment info for better messaging
		const [webhook, environment] = await Promise.all([
			this.repositories.webHook.findById(this.currentEnvironmentId, webhookId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const webhookName = webhook?.getName() ?? 'Unknown WebHook';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${webhookName}" from ${environmentName}? This will delete the webhook and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${webhookName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterWebHook.execute(
						this.currentEnvironmentId,
						webhookId,
						webhookName
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: webhookId },
					});

					void vscode.window.showInformationMessage(
						`${webhookName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister webhook', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${webhookName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Edit a service endpoint. Called from context menu command.
	 * Shows modal with pre-populated values.
	 */
	public async editServiceEndpoint(serviceEndpointId: string): Promise<void> {
		this.logger.info('Editing service endpoint', { serviceEndpointId });

		const endpoint = await this.repositories.serviceEndpoint.findById(
			this.currentEnvironmentId,
			serviceEndpointId
		);

		if (endpoint === null) {
			void vscode.window.showErrorMessage('Service Endpoint not found.');
			return;
		}

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditServiceEndpointModal',
			data: {
				serviceEndpointId,
				name: endpoint.getName(),
				description: endpoint.getDescription(),
				contract: endpoint.getContract().getName(),
				contractValue: endpoint.getContract().getValue(),
				solutionNamespace: endpoint.getSolutionNamespace(),
				namespaceAddress: endpoint.getNamespaceAddress(),
				path: endpoint.getPath(),
				authType: endpoint.getAuthType().getName(),
				authTypeValue: endpoint.getAuthType().getValue(),
				sasKeyName: endpoint.getSasKeyName(),
				messageFormat: endpoint.getMessageFormat().getName(),
				messageFormatValue: endpoint.getMessageFormat().getValue(),
				userClaim: endpoint.getUserClaim().getName(),
				userClaimValue: endpoint.getUserClaim().getValue(),
				authTypes: [
					{ value: 2, label: 'SASKey' },
					{ value: 3, label: 'SASToken' },
					{ value: 1, label: 'ACS (Legacy)' },
				],
				messageFormats: [
					{ value: 2, label: 'JSON' },
					{ value: 1, label: '.NET Binary' },
					{ value: 3, label: 'XML' },
				],
				userClaims: [
					{ value: 1, label: 'None' },
					{ value: 2, label: 'UserId' },
					{ value: 3, label: 'UserInfo' },
				],
			},
		});
	}

	/**
	 * Unregister (delete) a service endpoint. Called from context menu command.
	 * Shows confirmation dialog, then deletes the endpoint.
	 */
	public async unregisterServiceEndpoint(serviceEndpointId: string): Promise<void> {
		this.logger.info('Unregistering service endpoint', { serviceEndpointId });

		// Fetch endpoint and environment info for better messaging
		const [endpoint, environment] = await Promise.all([
			this.repositories.serviceEndpoint.findById(this.currentEnvironmentId, serviceEndpointId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const endpointName = endpoint?.getName() ?? 'Unknown Service Endpoint';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Check if endpoint is managed (cannot be deleted)
		if (endpoint?.isInManagedState()) {
			void vscode.window.showWarningMessage(
				`Cannot unregister "${endpointName}": This service endpoint is part of a managed solution and cannot be deleted.`
			);
			return;
		}

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${endpointName}" from ${environmentName}? This will delete the service endpoint and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${endpointName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterServiceEndpoint.execute(
						this.currentEnvironmentId,
						serviceEndpointId
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: serviceEndpointId },
					});

					void vscode.window.showInformationMessage(
						`${endpointName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister service endpoint', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${endpointName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Edit a data provider. Called from context menu command.
	 * Shows modal with pre-populated values.
	 */
	public async editDataProvider(dataProviderId: string): Promise<void> {
		this.logger.info('Editing data provider', { dataProviderId });

		const dataProvider = await this.repositories.dataProvider.findById(
			this.currentEnvironmentId,
			dataProviderId
		);

		if (dataProvider === null) {
			void vscode.window.showErrorMessage('Data Provider not found.');
			return;
		}

		// Load plugin types for the plugin pickers (non-workflow activities only)
		const allPluginTypes = await this.repositories.pluginType.findAll(this.currentEnvironmentId);
		const pluginTypes = allPluginTypes
			.filter((pt) => !pt.isWorkflowActivity())
			.map((pt) => ({
				value: pt.getId(),
				label: pt.getFriendlyName() || pt.getName(),
			}))
			.sort((a, b) => a.label.localeCompare(b.label));

		// Send modal data to webview with pre-populated values
		await this.panel.postMessage({
			command: 'showEditDataProviderModal',
			data: {
				dataProviderId,
				name: dataProvider.getName(),
				dataSourceLogicalName: dataProvider.getDataSourceLogicalName(),
				description: dataProvider.getDescription(),
				retrievePluginId: dataProvider.getRetrievePluginId(),
				retrieveMultiplePluginId: dataProvider.getRetrieveMultiplePluginId(),
				createPluginId: dataProvider.getCreatePluginId(),
				updatePluginId: dataProvider.getUpdatePluginId(),
				deletePluginId: dataProvider.getDeletePluginId(),
				pluginTypes,
			},
		});
	}

	/**
	 * Unregister (delete) a data provider. Called from context menu command.
	 * Shows confirmation dialog, then deletes the data provider.
	 */
	public async unregisterDataProvider(dataProviderId: string): Promise<void> {
		this.logger.info('Unregistering data provider', { dataProviderId });

		// Fetch data provider and environment info for better messaging
		const [dataProvider, environment] = await Promise.all([
			this.repositories.dataProvider.findById(this.currentEnvironmentId, dataProviderId),
			this.getEnvironmentById(this.currentEnvironmentId),
		]);

		const providerName = dataProvider?.getName() ?? 'Unknown Data Provider';
		const environmentName = environment?.name ?? 'Unknown Environment';

		// Check if data provider is managed (cannot be deleted)
		if (dataProvider?.isInManagedState()) {
			void vscode.window.showWarningMessage(
				`Cannot unregister "${providerName}": This data provider is part of a managed solution and cannot be deleted.`
			);
			return;
		}

		// Confirm deletion with user
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to unregister "${providerName}" from ${environmentName}? This will delete the data provider and cannot be undone.`,
			{ modal: true },
			'Unregister'
		);

		if (confirmation !== 'Unregister') {
			return; // User cancelled
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Unregistering ${providerName} from ${environmentName}...`,
				cancellable: false,
			},
			async () => {
				try {
					await this.useCases.unregisterDataProvider.execute(
						this.currentEnvironmentId,
						dataProviderId
					);

					// Send delta update to webview (instant, no full refresh)
					await this.panel.postMessage({
						command: 'removeNode',
						data: { nodeId: dataProviderId },
					});

					void vscode.window.showInformationMessage(
						`${providerName} unregistered successfully from ${environmentName}.`
					);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					this.logger.error('Failed to unregister data provider', error);
					void vscode.window.showErrorMessage(
						`Failed to unregister ${providerName} from ${environmentName}: ${errorMessage}`
					);
				}
			}
		);
	}

	/**
	 * Handle confirmed data provider update.
	 */
	private async handleConfirmUpdateDataProvider(providerData: {
		dataProviderId?: string;
		name?: string;
		description?: string;
		retrievePluginId?: string | null;
		retrieveMultiplePluginId?: string | null;
		createPluginId?: string | null;
		updatePluginId?: string | null;
		deletePluginId?: string | null;
	}): Promise<void> {
		const { dataProviderId, name } = providerData;

		if (!dataProviderId) {
			void vscode.window.showErrorMessage('Data Provider ID is required.');
			return;
		}

		this.logger.info('Updating data provider', { dataProviderId, name });

		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Updating Data Provider: ${name ?? dataProviderId}`,
					cancellable: false,
				},
				async () => {
					await this.useCases.updateDataProvider.execute(
						this.currentEnvironmentId,
						dataProviderId,
						{
							name: providerData.name,
							description: providerData.description,
							retrievePluginId: providerData.retrievePluginId,
							retrieveMultiplePluginId: providerData.retrieveMultiplePluginId,
							createPluginId: providerData.createPluginId,
							updatePluginId: providerData.updatePluginId,
							deletePluginId: providerData.deletePluginId,
						}
					);
				}
			);

			void vscode.window.showInformationMessage(
				`Data Provider "${name ?? dataProviderId}" updated successfully.`
			);

			// Refresh tree to show updated data provider
			await this.handleRefresh();

			// Select the updated data provider and show details
			await this.panel.postMessage({
				command: 'selectAndShowDetails',
				data: { nodeId: dataProviderId },
			});
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to update data provider', error);
			void vscode.window.showErrorMessage(`Failed to update data provider: ${errorMessage}`);
		}
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
		solutionUniqueName?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling register step confirmation', data);

		const [environment, pluginType] = await Promise.all([
			this.getEnvironmentById(this.currentEnvironmentId),
			this.repositories.pluginType.findById(this.currentEnvironmentId, data.pluginTypeId),
		]);
		const environmentName = environment?.name ?? 'Unknown Environment';
		const pluginTypeName = pluginType?.getName() ?? 'Unknown Plugin';

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
							solutionUniqueName: data.solutionUniqueName,
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

						// Resolve solution ID for client-side cache update
						const solutionId = this.resolveSolutionIdFromUniqueName(data.solutionUniqueName);

						await this.panel.postMessage({
							command: 'addNode',
							data: {
								parentId: data.pluginTypeId,
								node: stepViewModel,
								solutionId, // Updates client-side solution memberships cache
							},
						});

						// Select the new step and show details
						await this.panel.postMessage({
							command: 'selectAndShowDetails',
							data: { nodeId: stepId, nodeType: 'step' },
						});
					}

					void vscode.window.showInformationMessage(
						`Step "${data.name}" registered for ${pluginTypeName} in ${environmentName}.`
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
							data: { nodeId: data.stepId, updatedNode: stepViewModel },
						});

						// Select the updated step and show details
						await this.panel.postMessage({
							command: 'selectAndShowDetails',
							data: { nodeId: data.stepId, nodeType: 'step' },
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
		messagePropertyName: string;
		attributes?: string | undefined;
	}): Promise<void> {
		this.logger.debug('Handling register image confirmation', data);

		const [environment, step] = await Promise.all([
			this.getEnvironmentById(this.currentEnvironmentId),
			this.repositories.step.findById(this.currentEnvironmentId, data.stepId),
		]);
		const environmentName = environment?.name ?? 'Unknown Environment';
		const stepName = step?.getName() ?? 'Unknown Step';

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Registering image for ${stepName}...`,
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
							messagePropertyName: data.messagePropertyName,
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

						// Select the new image and show details
						await this.panel.postMessage({
							command: 'selectAndShowDetails',
							data: { nodeId: imageId, nodeType: 'image' },
						});
					}

					void vscode.window.showInformationMessage(
						`Image "${data.name}" registered for ${stepName} in ${environmentName}.`
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
							data: { nodeId: data.imageId, updatedNode: imageViewModel },
						});

						// Select the updated image and show details
						await this.panel.postMessage({
							command: 'selectAndShowDetails',
							data: { nodeId: data.imageId, nodeType: 'image' },
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

		// Select the new assembly and show details
		await this.panel.postMessage({
			command: 'selectAndShowDetails',
			data: { nodeId: assemblyId, nodeType: 'assembly' },
		});

		this.logger.debug('Assembly delta update sent', {
			assemblyId,
			pluginTypeCount: pluginTypeItems.length,
		});
	}

	/**
	 * Fetch a newly registered package and send delta update to webview.
	 * This avoids a full tree refresh after registration.
	 */
	private async sendPackageDeltaUpdate(packageId: string): Promise<void> {
		this.logger.debug('Sending package delta update', { packageId });

		// Fetch the newly created package
		const pkg = await this.repositories.package.findById(this.currentEnvironmentId, packageId);

		if (pkg === null) {
			// Fallback to full refresh if package not found (shouldn't happen)
			this.logger.warn('Package not found for delta update, falling back to refresh', {
				packageId,
			});
			await this.handleRefresh();
			return;
		}

		// Build package tree item (no assemblies yet for new package)
		const packageNode = this.packageMapper.toTreeItem(
			pkg,
			[], // No assemblies yet
			0 // assemblyCount = 0 for new package
		);

		// Send delta update to webview
		await this.panel.postMessage({
			command: 'addPackage',
			data: { packageNode },
		});

		// Select the new package and show details
		await this.panel.postMessage({
			command: 'selectAndShowDetails',
			data: { nodeId: packageId, nodeType: 'package' },
		});

		this.logger.debug('Package delta update sent', { packageId });
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

		// Select the updated assembly and show details
		await this.panel.postMessage({
			command: 'selectAndShowDetails',
			data: { nodeId: assemblyId, nodeType: 'assembly' },
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

		// Select the updated package and show details
		await this.panel.postMessage({
			command: 'selectAndShowDetails',
			data: { nodeId: packageId, nodeType: 'package' },
		});
	}
}
