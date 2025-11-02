import * as vscode from 'vscode';

// Logging Infrastructure
import { ILogger } from './infrastructure/logging/ILogger';
import { OutputChannelLogger } from './infrastructure/logging/OutputChannelLogger';
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
	// ========================================
	// Logging Infrastructure
	// ========================================
	const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite', { log: true });
	const logger: ILogger = new OutputChannelLogger(outputChannel);

	logger.info('Extension activating...');

	// ========================================
	// Dependency Injection Setup (Clean Architecture)
	// ========================================

	// Infrastructure Layer
	const environmentDomainMapper = new EnvironmentDomainMapper(logger);
	const environmentRepository = new EnvironmentRepository(
		context.globalState,
		context.secrets,
		environmentDomainMapper,
		logger
	);
	const eventPublisher = new VsCodeEventPublisher(logger);
	const authService = new MsalAuthenticationService(logger);
	const whoAmIService = new WhoAmIService(authService, logger);
	const powerPlatformApiService = new PowerPlatformApiService(authService, logger);

	// Domain Layer
	const environmentValidationService = new EnvironmentValidationService();

	// Application Layer - Mappers
	const listViewModelMapper = new EnvironmentListViewModelMapper();
	const formViewModelMapper = new EnvironmentFormViewModelMapper();

	// Application Layer - Use Cases
	const _loadEnvironmentsUseCase = new LoadEnvironmentsUseCase(environmentRepository, listViewModelMapper, logger);
	const loadEnvironmentByIdUseCase = new LoadEnvironmentByIdUseCase(environmentRepository, formViewModelMapper, logger);
	const saveEnvironmentUseCase = new SaveEnvironmentUseCase(environmentRepository, environmentValidationService, eventPublisher, logger);
	const deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(environmentRepository, eventPublisher, logger);
	const testConnectionUseCase = new TestConnectionUseCase(whoAmIService, environmentRepository, logger);
	const discoverEnvironmentIdUseCase = new DiscoverEnvironmentIdUseCase(powerPlatformApiService, environmentRepository, logger);
	const validateUniqueNameUseCase = new ValidateUniqueNameUseCase(environmentRepository, logger);
	const checkConcurrentEditUseCase = new CheckConcurrentEditUseCase(logger);

	// ========================================
	// Development Mode Context
	// ========================================
	// Set context variable for conditional command visibility
	const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
	void vscode.commands.executeCommand('setContext', 'powerPlatformDevSuite.isDevelopment', isDevelopment);

	// ========================================
	// Persistence Inspector (Development Only)
	// ========================================
	if (isDevelopment) {
		// Lazy-load persistence inspector using dynamic import
		void initializePersistenceInspector(context, eventPublisher, logger);
	}

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
			checkConcurrentEditUseCase,
			logger
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
				logger,
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
	const cacheInvalidationHandler = new AuthenticationCacheInvalidationHandler(authService, logger);
	eventPublisher.subscribe(AuthenticationCacheInvalidationRequested, (event) => {
		cacheInvalidationHandler.handle(event);
	});

	// Solution Explorer command - opens panel with optional initial environment
	const solutionExplorerCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorer', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			// If called from environment context menu, use the internal environment ID
			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			// Lazy-load solution explorer (works with or without initial environment)
			void initializeSolutionExplorer(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Solution Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Solution Explorer Pick Environment command - shows environment picker for tools context menu
	const solutionExplorerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorerPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems = environments.map(env => {
				const ppEnvId = env.getPowerPlatformEnvironmentId();
				return {
					label: env.getName().getValue(),
					description: env.getDataverseUrl().getValue(),
					detail: ppEnvId ? undefined : '💡 Missing Environment ID - "Open in Maker" button will be disabled',
					envId: env.getId().getValue()
				};
			});

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an environment to open Solutions'
			});

			if (selected) {
				void initializeSolutionExplorer(context, authService, environmentRepository, logger, selected.envId);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Solutions: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Import Job Viewer command - opens panel with optional initial environment
	const importJobViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewer', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			void initializeImportJobViewer(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Import Job Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Import Job Viewer Pick Environment command - shows environment picker for tools context menu
	const importJobViewerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewerPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems = environments.map(env => {
				const ppEnvId = env.getPowerPlatformEnvironmentId();
				return {
					label: env.getName().getValue(),
					description: env.getDataverseUrl().getValue(),
					detail: ppEnvId ? undefined : '💡 Missing Environment ID - "Open in Maker" button will be disabled',
					envId: env.getId().getValue()
				};
			});

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an environment to open Import Jobs'
			});

			if (selected) {
				void initializeImportJobViewer(context, authService, environmentRepository, logger, selected.envId);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Import Jobs: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	context.subscriptions.push(
		outputChannel,
		addEnvironmentCommand,
		editEnvironmentCommand,
		testEnvironmentConnectionCommand,
		solutionExplorerCommand,
		solutionExplorerPickEnvironmentCommand,
		importJobViewerCommand,
		importJobViewerPickEnvironmentCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		eventPublisher
	);

	logger.info('Extension activated successfully');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
	// Extension deactivated
}

/**
 * Initializes the Solution Explorer
 * Uses dynamic imports for lazy loading
 */
async function initializeSolutionExplorer(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService') as typeof import('./shared/infrastructure/services/DataverseApiService');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder') as typeof import('./shared/infrastructure/services/MakerUrlBuilder');
	const { DataverseApiSolutionRepository } = await import('./features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository') as typeof import('./features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository');
	const { ListSolutionsUseCase } = await import('./features/solutionExplorer/application/useCases/ListSolutionsUseCase') as typeof import('./features/solutionExplorer/application/useCases/ListSolutionsUseCase');
	const { SolutionExplorerPanel } = await import('./features/solutionExplorer/presentation/panels/SolutionExplorerPanel') as typeof import('./features/solutionExplorer/presentation/panels/SolutionExplorerPanel');

	// Factory function to get all environments
	const getEnvironments = async (): Promise<Array<{ id: string; name: string; url: string }>> => {
		const environments = await environmentRepository.getAll();
		return environments.map(env => ({
			id: env.getId().getValue(),
			name: env.getName().getValue(),
			url: env.getDataverseUrl().getValue()
		}));
	};

	// Factory function to get environment by ID
	const getEnvironmentById = async (envId: string): Promise<{ id: string; name: string; powerPlatformEnvironmentId?: string } | null> => {
		const environments = await environmentRepository.getAll();
		const environment = environments.find(env => env.getId().getValue() === envId);
		if (!environment) {
			return null;
		}
		return {
			id: envId,
			name: environment.getName().getValue(),
			powerPlatformEnvironmentId: environment.getPowerPlatformEnvironmentId()
		};
	};

	// Infrastructure Layer - Dataverse API Service that works for any environment
	const dataverseApiService = new DataverseApiService(
		async (envId: string) => {
			// Get the environment for this envId
			const environments = await environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);

			if (!environment) {
				throw new Error(`Environment not found for ID: ${envId}`);
			}

			const authMethod = environment.getAuthenticationMethod();
			let clientSecret: string | undefined;
			let password: string | undefined;

			if (authMethod.requiresClientCredentials()) {
				clientSecret = await environmentRepository.getClientSecret(environment.getClientId()?.getValue() || '');
			}

			if (authMethod.requiresUsernamePassword()) {
				password = await environmentRepository.getPassword(environment.getUsername() || '');
			}

			return authService.getAccessTokenForEnvironment(environment, clientSecret, password);
		},
		async (envId: string) => {
			// Get the Dataverse URL for this environment
			const environments = await environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);

			if (!environment) {
				throw new Error(`Environment not found for ID: ${envId}`);
			}

			return environment.getDataverseUrl().getValue();
		},
		logger
	);

	const urlBuilder = new MakerUrlBuilder();
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	// Application Layer
	const listSolutionsUseCase = new ListSolutionsUseCase(solutionRepository, logger);

	// Presentation Layer
	await SolutionExplorerPanel.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listSolutionsUseCase,
		urlBuilder,
		logger,
		initialEnvironmentId
	);
}

/**
 * Initializes the Import Job Viewer
 * Uses dynamic imports for lazy loading
 */
async function initializeImportJobViewer(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService') as typeof import('./shared/infrastructure/services/DataverseApiService');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder') as typeof import('./shared/infrastructure/services/MakerUrlBuilder');
	const { XmlFormatter } = await import('./shared/infrastructure/formatters/XmlFormatter') as typeof import('./shared/infrastructure/formatters/XmlFormatter');
	const { VsCodeEditorService } = await import('./shared/infrastructure/services/VsCodeEditorService') as typeof import('./shared/infrastructure/services/VsCodeEditorService');
	const { DataverseApiImportJobRepository } = await import('./features/importJobViewer/infrastructure/repositories/DataverseApiImportJobRepository') as typeof import('./features/importJobViewer/infrastructure/repositories/DataverseApiImportJobRepository');
	const { ListImportJobsUseCase } = await import('./features/importJobViewer/application/useCases/ListImportJobsUseCase') as typeof import('./features/importJobViewer/application/useCases/ListImportJobsUseCase');
	const { OpenImportLogUseCase } = await import('./features/importJobViewer/application/useCases/OpenImportLogUseCase') as typeof import('./features/importJobViewer/application/useCases/OpenImportLogUseCase');
	const { ImportJobViewerPanel } = await import('./features/importJobViewer/presentation/panels/ImportJobViewerPanel') as typeof import('./features/importJobViewer/presentation/panels/ImportJobViewerPanel');

	// Factory function to get all environments
	const getEnvironments = async (): Promise<Array<{ id: string; name: string; url: string }>> => {
		const environments = await environmentRepository.getAll();
		return environments.map(env => ({
			id: env.getId().getValue(),
			name: env.getName().getValue(),
			url: env.getDataverseUrl().getValue()
		}));
	};

	// Factory function to get environment by ID
	const getEnvironmentById = async (envId: string): Promise<{ id: string; name: string; powerPlatformEnvironmentId?: string } | null> => {
		const environments = await environmentRepository.getAll();
		const environment = environments.find(env => env.getId().getValue() === envId);
		if (!environment) {
			return null;
		}
		return {
			id: envId,
			name: environment.getName().getValue(),
			powerPlatformEnvironmentId: environment.getPowerPlatformEnvironmentId()
		};
	};

	// Infrastructure Layer - Dataverse API Service
	const dataverseApiService = new DataverseApiService(
		async (envId: string) => {
			const environments = await environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);

			if (!environment) {
				throw new Error(`Environment not found for ID: ${envId}`);
			}

			const authMethod = environment.getAuthenticationMethod();
			let clientSecret: string | undefined;
			let password: string | undefined;

			if (authMethod.requiresClientCredentials()) {
				clientSecret = await environmentRepository.getClientSecret(environment.getClientId()?.getValue() || '');
			}

			if (authMethod.requiresUsernamePassword()) {
				password = await environmentRepository.getPassword(environment.getUsername() || '');
			}

			return authService.getAccessTokenForEnvironment(environment, clientSecret, password);
		},
		async (envId: string) => {
			const environments = await environmentRepository.getAll();
			const environment = environments.find(env => env.getId().getValue() === envId);

			if (!environment) {
				throw new Error(`Environment not found for ID: ${envId}`);
			}

			return environment.getDataverseUrl().getValue();
		},
		logger
	);

	const urlBuilder = new MakerUrlBuilder();
	const importJobRepository = new DataverseApiImportJobRepository(dataverseApiService, logger);
	const xmlFormatter = new XmlFormatter();
	const editorService = new VsCodeEditorService(logger, xmlFormatter);

	// Application Layer
	const listImportJobsUseCase = new ListImportJobsUseCase(importJobRepository, logger);
	const openImportLogUseCase = new OpenImportLogUseCase(importJobRepository, editorService, logger);

	// Presentation Layer
	await ImportJobViewerPanel.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listImportJobsUseCase,
		openImportLogUseCase,
		urlBuilder,
		logger,
		initialEnvironmentId
	);
}

/**
 * Initializes the Persistence Inspector (Development Only)
 * Uses dynamic imports to avoid loading in production
 */
async function initializePersistenceInspector(
	context: vscode.ExtensionContext,
	eventPublisher: VsCodeEventPublisher,
	logger: ILogger
): Promise<void> {
	const { VsCodeStorageReader } = await import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageReader') as typeof import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageReader');
	const { VsCodeStorageClearer } = await import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageClearer') as typeof import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageClearer');
	const { HardcodedProtectedKeyProvider } = await import('./features/persistenceInspector/infrastructure/providers/HardcodedProtectedKeyProvider') as typeof import('./features/persistenceInspector/infrastructure/providers/HardcodedProtectedKeyProvider');
	const { StorageInspectionService } = await import('./features/persistenceInspector/domain/services/StorageInspectionService') as typeof import('./features/persistenceInspector/domain/services/StorageInspectionService');
	const { StorageClearingService } = await import('./features/persistenceInspector/domain/services/StorageClearingService') as typeof import('./features/persistenceInspector/domain/services/StorageClearingService');
	const { InspectStorageUseCase } = await import('./features/persistenceInspector/application/useCases/InspectStorageUseCase') as typeof import('./features/persistenceInspector/application/useCases/InspectStorageUseCase');
	const { RevealSecretUseCase } = await import('./features/persistenceInspector/application/useCases/RevealSecretUseCase') as typeof import('./features/persistenceInspector/application/useCases/RevealSecretUseCase');
	const { ClearStorageEntryUseCase } = await import('./features/persistenceInspector/application/useCases/ClearStorageEntryUseCase') as typeof import('./features/persistenceInspector/application/useCases/ClearStorageEntryUseCase');
	const { ClearStoragePropertyUseCase } = await import('./features/persistenceInspector/application/useCases/ClearStoragePropertyUseCase') as typeof import('./features/persistenceInspector/application/useCases/ClearStoragePropertyUseCase');
	const { ClearAllStorageUseCase } = await import('./features/persistenceInspector/application/useCases/ClearAllStorageUseCase') as typeof import('./features/persistenceInspector/application/useCases/ClearAllStorageUseCase');
	const { GetClearAllConfirmationMessageUseCase } = await import('./features/persistenceInspector/application/useCases/GetClearAllConfirmationMessageUseCase') as typeof import('./features/persistenceInspector/application/useCases/GetClearAllConfirmationMessageUseCase');
	const { PersistenceInspectorPanel } = await import('./features/persistenceInspector/presentation/panels/PersistenceInspectorPanel') as typeof import('./features/persistenceInspector/presentation/panels/PersistenceInspectorPanel');

	// Infrastructure Layer
	const storageReader = new VsCodeStorageReader(context.globalState, context.secrets);
	const storageClearer = new VsCodeStorageClearer(context.globalState, context.secrets);
	const protectedKeyProvider = new HardcodedProtectedKeyProvider();

	// Domain Layer
	const storageInspectionService = new StorageInspectionService(storageReader, protectedKeyProvider);
	const storageClearingService = new StorageClearingService(storageClearer, protectedKeyProvider);

	// Application Layer - Use Cases
	const inspectStorageUseCase = new InspectStorageUseCase(storageInspectionService, eventPublisher, logger);
	const revealSecretUseCase = new RevealSecretUseCase(storageInspectionService, eventPublisher, logger);
	const clearStorageEntryUseCase = new ClearStorageEntryUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearStoragePropertyUseCase = new ClearStoragePropertyUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearAllStorageUseCase = new ClearAllStorageUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const getClearAllConfirmationMessageUseCase = new GetClearAllConfirmationMessageUseCase(storageInspectionService, logger);

	// Register Command (Development Only)
	const openPersistenceInspectorCommand = vscode.commands.registerCommand('power-platform-dev-suite.openPersistenceInspector', () => {
		PersistenceInspectorPanel.createOrShow(
			context.extensionUri,
			inspectStorageUseCase,
			revealSecretUseCase,
			clearStorageEntryUseCase,
			clearStoragePropertyUseCase,
			clearAllStorageUseCase,
			getClearAllConfirmationMessageUseCase,
			logger
		);
	});

	context.subscriptions.push(openPersistenceInspectorCommand);
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
			new ToolItem('Solutions', 'Browse and manage solutions', 'solutionExplorer', 'power-platform-dev-suite.solutionExplorerPickEnvironment'),
			new ToolItem('Import Jobs', 'Monitor solution imports', 'importJobViewer', 'power-platform-dev-suite.importJobViewerPickEnvironment')
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
		public readonly contextValue: string,
		commandId: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = tooltip;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('tools');
		this.command = {
			command: commandId,
			title: label
		};
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
