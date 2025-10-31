import * as vscode from 'vscode';

// Environment Setup - Clean Architecture imports
import { IEnvironmentRepository } from './features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentRepository } from './features/environmentSetup/infrastructure/repositories/EnvironmentRepository';
import { EnvironmentDomainMapper } from './features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper';
import { EnvironmentValidationService } from './features/environmentSetup/domain/services/EnvironmentValidationService';
import { VsCodeEventPublisher } from './features/environmentSetup/infrastructure/services/VsCodeEventPublisher';
import { MsalAuthenticationService } from './features/environmentSetup/infrastructure/services/MsalAuthenticationService';
import { WhoAmIService } from './features/environmentSetup/infrastructure/services/WhoAmIService';
import { PowerPlatformApiService } from './features/environmentSetup/infrastructure/services/PowerPlatformApiService';
import { LoadEnvironmentsUseCase } from './features/environmentSetup/application/useCases/LoadEnvironmentsUseCase';
import { LoadEnvironmentByIdUseCase } from './features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from './features/environmentSetup/application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from './features/environmentSetup/application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from './features/environmentSetup/application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from './features/environmentSetup/application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from './features/environmentSetup/application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from './features/environmentSetup/application/useCases/CheckConcurrentEditUseCase';
import { EnvironmentListViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentListViewModelMapper';
import { EnvironmentListViewModel } from './features/environmentSetup/application/viewModels/EnvironmentListViewModel';
import { EnvironmentFormViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentFormViewModelMapper';
import { EnvironmentSetupPanel } from './features/environmentSetup/presentation/panels/EnvironmentSetupPanel';
import { EnvironmentId } from './features/environmentSetup/domain/valueObjects/EnvironmentId';
import { EnvironmentCreated } from './features/environmentSetup/domain/events/EnvironmentCreated';
import { EnvironmentUpdated } from './features/environmentSetup/domain/events/EnvironmentUpdated';
import { EnvironmentDeleted } from './features/environmentSetup/domain/events/EnvironmentDeleted';
import { AuthenticationCacheInvalidationRequested } from './features/environmentSetup/domain/events/AuthenticationCacheInvalidationRequested';
import { AuthenticationCacheInvalidationHandler } from './features/environmentSetup/infrastructure/eventHandlers/AuthenticationCacheInvalidationHandler';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
	// Extension activated

	// ========================================
	// Dependency Injection Setup (Clean Architecture)
	// ========================================

	// Infrastructure Layer
	const environmentDomainMapper = new EnvironmentDomainMapper();
	const environmentRepository = new EnvironmentRepository(
		context.globalState,
		context.secrets,
		environmentDomainMapper
	);
	const eventPublisher = new VsCodeEventPublisher();
	const authService = new MsalAuthenticationService();
	const whoAmIService = new WhoAmIService(authService);
	const powerPlatformApiService = new PowerPlatformApiService(authService);

	// Domain Layer
	const environmentValidationService = new EnvironmentValidationService();

	// Application Layer - Mappers
	const listViewModelMapper = new EnvironmentListViewModelMapper();
	const formViewModelMapper = new EnvironmentFormViewModelMapper();

	// Application Layer - Use Cases
	const _loadEnvironmentsUseCase = new LoadEnvironmentsUseCase(environmentRepository, listViewModelMapper);
	const loadEnvironmentByIdUseCase = new LoadEnvironmentByIdUseCase(environmentRepository, formViewModelMapper);
	const saveEnvironmentUseCase = new SaveEnvironmentUseCase(environmentRepository, environmentValidationService, eventPublisher);
	const deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(environmentRepository, eventPublisher);
	const testConnectionUseCase = new TestConnectionUseCase(whoAmIService, environmentRepository);
	const discoverEnvironmentIdUseCase = new DiscoverEnvironmentIdUseCase(powerPlatformApiService, environmentRepository);
	const validateUniqueNameUseCase = new ValidateUniqueNameUseCase(environmentRepository);
	const checkConcurrentEditUseCase = new CheckConcurrentEditUseCase();

	// ========================================
	// Register Tree View Providers
	// ========================================

	// Register Tools tree view provider
	const toolsProvider = new ToolsTreeProvider();
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

	// Register Environments tree view provider
	const environmentsProvider = new EnvironmentsTreeProvider(environmentRepository, listViewModelMapper);
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);

	// ========================================
	// Register Commands
	// ========================================

	// Add Environment command - Opens EnvironmentSetupPanel
	const addEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.addEnvironment', () => {
		EnvironmentSetupPanel.createOrShow(
			context.extensionUri,
			loadEnvironmentByIdUseCase,
			saveEnvironmentUseCase,
			deleteEnvironmentUseCase,
			testConnectionUseCase,
			discoverEnvironmentIdUseCase,
			validateUniqueNameUseCase,
			checkConcurrentEditUseCase
		);
	});

	// Edit Environment command
	const editEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.editEnvironment', async (environmentItem?: { envId: string }) => {
		if (environmentItem) {
			EnvironmentSetupPanel.createOrShow(
				context.extensionUri,
				loadEnvironmentByIdUseCase,
				saveEnvironmentUseCase,
				deleteEnvironmentUseCase,
				testConnectionUseCase,
				discoverEnvironmentIdUseCase,
				validateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				environmentItem.envId
			);
		}
	});

	// Test Environment Connection command
	const testEnvironmentConnectionCommand = vscode.commands.registerCommand('power-platform-dev-suite.testEnvironmentConnection', async (environmentItem?: { envId: string }) => {
		if (!environmentItem?.envId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		try {
			// Load environment from repository
			const environment = await environmentRepository.getById(new EnvironmentId(environmentItem.envId));

			if (!environment) {
				vscode.window.showErrorMessage('Environment not found');
				return;
			}

			// Load credentials from secret storage if needed
			const authMethod = environment.getAuthenticationMethod();
			let clientSecret: string | undefined;
			let password: string | undefined;

			if (authMethod.requiresClientCredentials()) {
				clientSecret = await environmentRepository.getClientSecret(environment.getClientId()?.getValue() || '');
				if (!clientSecret) {
					vscode.window.showErrorMessage('Client secret not found. Please edit the environment and re-enter credentials.');
					return;
				}
			}

			if (authMethod.requiresUsernamePassword()) {
				password = await environmentRepository.getPassword(environment.getUsername() || '');
				if (!password) {
					vscode.window.showErrorMessage('Password not found. Please edit the environment and re-enter credentials.');
					return;
				}
			}

			// Test connection
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Testing connection to ${environment.getName().getValue()}...`,
				cancellable: false
			}, async () => {
				const result = await whoAmIService.testConnection(environment, clientSecret, password);

				vscode.window.showInformationMessage(
					`Connection successful! User ID: ${result.userId}`
				);
			});
		} catch (error) {
			vscode.window.showErrorMessage(
				`Connection test failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Remove Environment command
	const removeEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.removeEnvironment', async (environmentItem?: { envId: string; label: string }) => {
		if (!environmentItem?.envId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		const confirmResult = await vscode.window.showWarningMessage(
			`Are you sure you want to remove the environment "${environmentItem.label}"?`,
			{ modal: true },
			'Remove'
		);

		if (confirmResult === 'Remove') {
			try {
				await deleteEnvironmentUseCase.execute({ environmentId: environmentItem.envId });
				environmentsProvider.refresh();
				vscode.window.showInformationMessage(`Environment "${environmentItem.label}" removed successfully!`);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to remove environment: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	});

	// Open in Maker command
	const openMakerCommand = vscode.commands.registerCommand('power-platform-dev-suite.openMaker', async (environmentItem?: { envId: string }) => {
		if (!environmentItem?.envId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		try {
			const environment = await environmentRepository.getById(new EnvironmentId(environmentItem.envId));

			if (!environment) {
				vscode.window.showErrorMessage('Environment not found');
				return;
			}

			const powerPlatformEnvId = environment.getPowerPlatformEnvironmentId();
			if (!powerPlatformEnvId) {
				// No environment ID - just send to make.powerapps.com
				vscode.env.openExternal(vscode.Uri.parse('https://make.powerapps.com/'));
			} else {
				const makerUrl = `https://make.powerapps.com/environments/${powerPlatformEnvId}/home`;
				vscode.env.openExternal(vscode.Uri.parse(makerUrl));
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Maker: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Open in Dynamics command
	const openDynamicsCommand = vscode.commands.registerCommand('power-platform-dev-suite.openDynamics', async (environmentItem?: { envId: string }) => {
		if (!environmentItem?.envId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		try {
			const environment = await environmentRepository.getById(new EnvironmentId(environmentItem.envId));

			if (!environment) {
				vscode.window.showErrorMessage('Environment not found');
				return;
			}

			vscode.env.openExternal(vscode.Uri.parse(environment.getDataverseUrl().getValue()));
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Dynamics: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Refresh Environments command
	const refreshEnvironmentsCommand = vscode.commands.registerCommand('power-platform-dev-suite.refreshEnvironments', () => {
		environmentsProvider.refresh();
	});

	// Subscribe to domain events to auto-refresh tree view
	eventPublisher.subscribe(EnvironmentCreated, () => environmentsProvider.refresh());
	eventPublisher.subscribe(EnvironmentUpdated, () => environmentsProvider.refresh());
	eventPublisher.subscribe(EnvironmentDeleted, () => environmentsProvider.refresh());

	// Subscribe to authentication cache invalidation events
	const cacheInvalidationHandler = new AuthenticationCacheInvalidationHandler(authService);
	eventPublisher.subscribe(AuthenticationCacheInvalidationRequested, (event) => {
		cacheInvalidationHandler.handle(event);
	});

	context.subscriptions.push(
		addEnvironmentCommand,
		editEnvironmentCommand,
		testEnvironmentConnectionCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		eventPublisher
	);
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
	// Extension deactivated
}

/**
 * Tools tree view provider
 */
class ToolsTreeProvider implements vscode.TreeDataProvider<ToolItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ToolItem | undefined | null | void> = new vscode.EventEmitter<ToolItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ToolItem): vscode.TreeItem {
		return element;
	}

	getChildren(): ToolItem[] {
		return [
			new ToolItem('Solution Explorer', 'Browse and manage solutions', 'solutionExplorer'),
			new ToolItem('Metadata Browser', 'Explore entity metadata', 'metadataBrowser'),
			new ToolItem('Import Job Viewer', 'Monitor solution imports', 'importJobViewer'),
			new ToolItem('Data Explorer', 'Query and explore data', 'dataExplorer'),
			new ToolItem('Connection References', 'Manage connection references', 'connectionReferences'),
			new ToolItem('Environment Variables', 'Manage environment variables', 'environmentVariables'),
			new ToolItem('Plugin Trace Viewer', 'View plugin execution traces', 'pluginTraceViewer'),
			new ToolItem('Plugin Registration', 'Register and manage plugins', 'pluginRegistration')
		];
	}
}

/**
 * Environments tree view provider
 * Uses repository pattern for data access consistency
 */
class EnvironmentsTreeProvider implements vscode.TreeDataProvider<EnvironmentItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentListViewModelMapper
	) { }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: EnvironmentItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<EnvironmentItem[]> {
		// Use repository to load environments
		const environments = await this.repository.getAll();

		if (environments.length === 0) {
			return [
				new EnvironmentItem('No environments configured', 'Click + to add an environment', 'placeholder')
			];
		}

		// Map domain entities to view models, then to tree items
		return environments.map(env => {
			const vm: EnvironmentListViewModel = this.mapper.toViewModel(env);
			return new EnvironmentItem(vm.name, vm.dataverseUrl, 'environment', vm.id);
		});
	}
}

/**
 * Tool item in tree view
 */
class ToolItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly tooltip: string,
		public readonly contextValue: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = tooltip;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('tools');
	}
}

/**
 * Environment item in tree view
 */
class EnvironmentItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		public readonly contextValue: string,
		public readonly envId?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
		this.tooltip = `${label} - ${description}`;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('cloud');
	}
}
