import * as vscode from 'vscode';

import { ILogger } from './infrastructure/logging/ILogger';
import { OutputChannelLogger } from './infrastructure/logging/OutputChannelLogger';
import { IEnvironmentRepository } from './features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentRepository } from './features/environmentSetup/infrastructure/repositories/EnvironmentRepository';
import { EnvironmentDomainMapper } from './features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper';
import { EnvironmentValidationService } from './features/environmentSetup/domain/services/EnvironmentValidationService';
import { AuthenticationCacheInvalidationService } from './features/environmentSetup/domain/services/AuthenticationCacheInvalidationService';
import { VsCodeEventPublisher } from './features/environmentSetup/infrastructure/services/VsCodeEventPublisher';
import { MsalAuthenticationService } from './features/environmentSetup/infrastructure/services/MsalAuthenticationService';
import { WhoAmIService } from './features/environmentSetup/infrastructure/services/WhoAmIService';
import { PowerPlatformApiService } from './features/environmentSetup/infrastructure/services/PowerPlatformApiService';
import { LoadEnvironmentByIdUseCase } from './features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from './features/environmentSetup/application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from './features/environmentSetup/application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from './features/environmentSetup/application/useCases/TestConnectionUseCase';
import { TestExistingEnvironmentConnectionUseCase } from './features/environmentSetup/application/useCases/TestExistingEnvironmentConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from './features/environmentSetup/application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from './features/environmentSetup/application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from './features/environmentSetup/application/useCases/CheckConcurrentEditUseCase';
import { EnvironmentListViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentListViewModelMapper';
import { EnvironmentListViewModel } from './features/environmentSetup/application/viewModels/EnvironmentListViewModel';
import { EnvironmentFormViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentFormViewModelMapper';
import { EnvironmentSetupPanel } from './features/environmentSetup/presentation/panels/EnvironmentSetupPanel';
import { TestEnvironmentConnectionCommandHandler } from './features/environmentSetup/presentation/commands/TestEnvironmentConnectionCommandHandler';
import { EnvironmentId } from './features/environmentSetup/domain/valueObjects/EnvironmentId';
import { Environment } from './features/environmentSetup/domain/entities/Environment';
import { EnvironmentCreated } from './features/environmentSetup/domain/events/EnvironmentCreated';
import { EnvironmentUpdated } from './features/environmentSetup/domain/events/EnvironmentUpdated';
import { EnvironmentDeleted } from './features/environmentSetup/domain/events/EnvironmentDeleted';
import { AuthenticationCacheInvalidationRequested } from './features/environmentSetup/domain/events/AuthenticationCacheInvalidationRequested';
import { AuthenticationCacheInvalidationHandler } from './features/environmentSetup/infrastructure/eventHandlers/AuthenticationCacheInvalidationHandler';
import type { QuickPickItemWithEnvId } from './shared/infrastructure/ui/types/QuickPickItemWithEnvId';

/**
 * Creates a factory function for getting all environments.
 * Shared across Solution Explorer and Import Job Viewer panels.
 */
function createGetEnvironments(
	environmentRepository: IEnvironmentRepository
): () => Promise<Array<{ id: string; name: string; url: string }>> {
	return async () => {
		const environments = await environmentRepository.getAll();
		return environments.map(env => ({
			id: env.getId().getValue(),
			name: env.getName().getValue(),
			url: env.getDataverseUrl().getValue()
		}));
	};
}

/**
 * Creates a factory function for getting environment details by ID.
 * Shared across Solution Explorer and Import Job Viewer panels.
 */
function createGetEnvironmentById(
	environmentRepository: IEnvironmentRepository
): (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null> {
	return async (envId: string) => {
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
}

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
	const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Suite', { log: true });
	const logger: ILogger = new OutputChannelLogger(outputChannel);

	logger.info('Extension activating...');

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

	const environmentValidationService = new EnvironmentValidationService();
	const authCacheInvalidationService = new AuthenticationCacheInvalidationService();

	const listViewModelMapper = new EnvironmentListViewModelMapper();
	const formViewModelMapper = new EnvironmentFormViewModelMapper();
	const loadEnvironmentByIdUseCase = new LoadEnvironmentByIdUseCase(environmentRepository, formViewModelMapper, logger);
	const saveEnvironmentUseCase = new SaveEnvironmentUseCase(environmentRepository, environmentValidationService, eventPublisher, authCacheInvalidationService, logger);
	const deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(environmentRepository, eventPublisher, logger);
	const testConnectionUseCase = new TestConnectionUseCase(whoAmIService, environmentRepository, logger);
	const testExistingEnvironmentConnectionUseCase = new TestExistingEnvironmentConnectionUseCase(environmentRepository, whoAmIService, logger);
	const discoverEnvironmentIdUseCase = new DiscoverEnvironmentIdUseCase(powerPlatformApiService, environmentRepository, logger);
	const validateUniqueNameUseCase = new ValidateUniqueNameUseCase(environmentRepository, logger);
	const checkConcurrentEditUseCase = new CheckConcurrentEditUseCase(logger);

	// Command Handlers (Presentation Layer)
	const testEnvironmentConnectionCommandHandler = new TestEnvironmentConnectionCommandHandler(
		testExistingEnvironmentConnectionUseCase,
		logger
	);

	const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
	void vscode.commands.executeCommand('setContext', 'powerPlatformDevSuite.isDevelopment', isDevelopment);

	if (isDevelopment) {
		void initializePersistenceInspector(context, eventPublisher, logger);
	}
	const toolsProvider = new ToolsTreeProvider();
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

	const environmentsProvider = new EnvironmentsTreeProvider(environmentRepository, listViewModelMapper);
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);

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
			logger,
			undefined
		);
	});

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

	const testEnvironmentConnectionCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.testEnvironmentConnection',
		async (environmentItem?: { envId: string }) => {
			await testEnvironmentConnectionCommandHandler.execute({
				environmentId: environmentItem?.envId || ''
			});
		}
	);

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

	const refreshEnvironmentsCommand = vscode.commands.registerCommand('power-platform-dev-suite.refreshEnvironments', () => {
		environmentsProvider.refresh();
	});

	eventPublisher.subscribe(EnvironmentCreated, () => environmentsProvider.refresh());
	eventPublisher.subscribe(EnvironmentUpdated, () => environmentsProvider.refresh());
	eventPublisher.subscribe(EnvironmentDeleted, () => environmentsProvider.refresh());
	const cacheInvalidationHandler = new AuthenticationCacheInvalidationHandler(authService, logger);
	eventPublisher.subscribe(AuthenticationCacheInvalidationRequested, (event) => {
		cacheInvalidationHandler.handle(event);
	});

	const solutionExplorerCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorer', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			void initializeSolutionExplorer(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Solution Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const solutionExplorerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorerPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems: QuickPickItemWithEnvId[] = environments.map(env => {
				const ppEnvId = env.getPowerPlatformEnvironmentId();
				const item: QuickPickItemWithEnvId = {
					label: env.getName().getValue(),
					description: env.getDataverseUrl().getValue(),
					envId: env.getId().getValue()
				};
				if (!ppEnvId) {
					item.detail = '💡 Missing Environment ID - "Open in Maker" button will be disabled';
				}
				return item;
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

	const importJobViewerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewerPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems: QuickPickItemWithEnvId[] = environments.map(env => {
				const ppEnvId = env.getPowerPlatformEnvironmentId();
				const item: QuickPickItemWithEnvId = {
					label: env.getName().getValue(),
					description: env.getDataverseUrl().getValue(),
					envId: env.getId().getValue()
				};
				if (!ppEnvId) {
					item.detail = '💡 Missing Environment ID - "Open in Maker" button will be disabled';
				}
				return item;
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

	const connectionReferencesCommand = vscode.commands.registerCommand('power-platform-dev-suite.connectionReferences', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			void initializeConnectionReferences(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Connection References: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const connectionReferencesPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.connectionReferencesPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems = environments.map(env => ({
				label: env.getName().getValue(),
				description: env.getDataverseUrl().getValue(),
				envId: env.getId().getValue()
			}));

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an environment to view Connection References'
			});

			if (selected) {
				void initializeConnectionReferences(context, authService, environmentRepository, logger, selected.envId);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Connection References: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const environmentVariablesCommand = vscode.commands.registerCommand('power-platform-dev-suite.environmentVariables', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			void initializeEnvironmentVariables(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Environment Variables: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const environmentVariablesPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.environmentVariablesPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems = environments.map(env => ({
				label: env.getName().getValue(),
				description: env.getDataverseUrl().getValue(),
				envId: env.getId().getValue()
			}));

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an environment to view Environment Variables'
			});

			if (selected) {
				void initializeEnvironmentVariables(context, authService, environmentRepository, logger, selected.envId);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Environment Variables: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginTraceViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewer', async (environmentItem?: { envId: string }) => {
		try {
			let initialEnvironmentId: string | undefined;

			if (environmentItem?.envId) {
				initialEnvironmentId = environmentItem.envId;
			}

			void initializePluginTraceViewer(context, authService, environmentRepository, logger, initialEnvironmentId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Plugin Trace Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginTraceViewerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewerPickEnvironment', async () => {
		try {
			const environments = await environmentRepository.getAll();

			if (environments.length === 0) {
				vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
				return;
			}

			const quickPickItems = environments.map(env => ({
				label: env.getName().getValue(),
				description: env.getDataverseUrl().getValue(),
				envId: env.getId().getValue()
			}));

			const selected = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select an environment to view Plugin Traces'
			});

			if (selected) {
				void initializePluginTraceViewer(context, authService, environmentRepository, logger, selected.envId);
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Plugin Trace Viewer: ${error instanceof Error ? error.message : String(error)}`
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
		connectionReferencesCommand,
		connectionReferencesPickEnvironmentCommand,
		environmentVariablesCommand,
		environmentVariablesPickEnvironmentCommand,
		pluginTraceViewerCommand,
		pluginTraceViewerPickEnvironmentCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		eventPublisher
	);

	logger.info('Extension activated successfully');
}

export function deactivate(): void {
	// Intentionally empty - extension cleanup handled by disposables
}

/**
 * Creates factory functions for DataverseApiService to access tokens and URLs.
 * Encapsulates environment lookup and credential retrieval logic for shared API services.
 */
function createDataverseApiServiceFactory(
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository
): {
	getAccessToken: (envId: string) => Promise<string>;
	getDataverseUrl: (envId: string) => Promise<string>;
} {
	async function getEnvironmentById(envId: string): Promise<Environment> {
		const environments = await environmentRepository.getAll();
		const environment = environments.find(env => env.getId().getValue() === envId);

		if (!environment) {
			throw new Error(`Environment not found for ID: ${envId}`);
		}

		return environment;
	}

	return {
		async getAccessToken(envId: string): Promise<string> {
			const environment = await getEnvironmentById(envId);
			const authMethod = environment.getAuthenticationMethod();
			let clientSecret: string | undefined;
			let password: string | undefined;

			if (authMethod.requiresClientCredentials()) {
				clientSecret = await environmentRepository.getClientSecret(environment.getClientId()?.getValue() || '');
			}

			if (authMethod.requiresUsernamePassword()) {
				password = await environmentRepository.getPassword(environment.getUsername() || '');
			}

			return authService.getAccessTokenForEnvironment(environment, clientSecret, password, undefined, undefined);
		},
		async getDataverseUrl(envId: string): Promise<string> {
			const environment = await getEnvironmentById(envId);
			return environment.getDataverseUrl().getValue();
		}
	};
}

/**
 * Lazy-loads and initializes Solution Explorer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializeSolutionExplorer(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder.js');
	const { DataverseApiSolutionRepository } = await import('./features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { ListSolutionsUseCase } = await import('./features/solutionExplorer/application/useCases/ListSolutionsUseCase.js');
	const { SolutionExplorerPanelComposed } = await import('./features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.js');
	const { SolutionViewModelMapper } = await import('./features/solutionExplorer/application/mappers/SolutionViewModelMapper.js');
	const { SolutionCollectionService } = await import('./features/solutionExplorer/domain/services/SolutionCollectionService.js');

	const getEnvironments = createGetEnvironments(environmentRepository);
	const getEnvironmentById = createGetEnvironmentById(environmentRepository);

	const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	const listSolutionsUseCase = new ListSolutionsUseCase(solutionRepository, logger);

	const collectionService = new SolutionCollectionService();
	const viewModelMapper = new SolutionViewModelMapper(collectionService);

	await SolutionExplorerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listSolutionsUseCase,
		urlBuilder,
		viewModelMapper,
		logger,
		initialEnvironmentId
	);
}

/**
 * Lazy-loads and initializes Import Job Viewer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializeImportJobViewer(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder.js');
	const { XmlFormatter } = await import('./shared/infrastructure/formatters/XmlFormatter.js');
	const { VsCodeEditorService } = await import('./shared/infrastructure/services/VsCodeEditorService.js');
	const { DataverseApiImportJobRepository } = await import('./features/importJobViewer/infrastructure/repositories/DataverseApiImportJobRepository.js');
	const { ListImportJobsUseCase } = await import('./features/importJobViewer/application/useCases/ListImportJobsUseCase.js');
	const { OpenImportLogUseCase } = await import('./features/importJobViewer/application/useCases/OpenImportLogUseCase.js');
	const { ImportJobViewerPanelComposed } = await import('./features/importJobViewer/presentation/panels/ImportJobViewerPanelComposed.js');

	const getEnvironments = createGetEnvironments(environmentRepository);
	const getEnvironmentById = createGetEnvironmentById(environmentRepository);

	const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const importJobRepository = new DataverseApiImportJobRepository(dataverseApiService, logger);
	const xmlFormatter = new XmlFormatter();
	const editorService = new VsCodeEditorService(logger, xmlFormatter);

	const listImportJobsUseCase = new ListImportJobsUseCase(importJobRepository, logger);
	const openImportLogUseCase = new OpenImportLogUseCase(importJobRepository, editorService, logger);

	await ImportJobViewerPanelComposed.createOrShow(
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
 * Lazy-loads and initializes Connection References panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializeConnectionReferences(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { DataverseApiConnectionReferenceRepository } = await import('./features/connectionReferences/infrastructure/repositories/DataverseApiConnectionReferenceRepository.js');
	const { DataverseApiCloudFlowRepository } = await import('./features/connectionReferences/infrastructure/repositories/DataverseApiCloudFlowRepository.js');
	const { DataverseApiSolutionComponentRepository } = await import('./shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
	const { DataverseApiSolutionRepository } = await import('./features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { FileSystemDeploymentSettingsRepository } = await import('./shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.js');
	const { FlowConnectionRelationshipBuilder } = await import('./features/connectionReferences/domain/services/FlowConnectionRelationshipBuilder.js');
	const { FlowConnectionRelationshipCollectionService } = await import('./features/connectionReferences/domain/services/FlowConnectionRelationshipCollectionService.js');
	const { ListConnectionReferencesUseCase } = await import('./features/connectionReferences/application/useCases/ListConnectionReferencesUseCase.js');
	const { ExportConnectionReferencesToDeploymentSettingsUseCase } = await import('./features/connectionReferences/application/useCases/ExportConnectionReferencesToDeploymentSettingsUseCase.js');
	const { ConnectionReferencesPanelComposed } = await import('./features/connectionReferences/presentation/panels/ConnectionReferencesPanelComposed.js');
	const { VSCodePanelStateRepository } = await import('./shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder.js');
	const { ConnectionReferenceToDeploymentSettingsMapper } = await import('./features/connectionReferences/application/mappers/ConnectionReferenceToDeploymentSettingsMapper.js');

	const getEnvironments = createGetEnvironments(environmentRepository);
	const getEnvironmentById = createGetEnvironmentById(environmentRepository);

	const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const flowRepository = new DataverseApiCloudFlowRepository(dataverseApiService, logger);
	const connectionReferenceRepository = new DataverseApiConnectionReferenceRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
	const deploymentSettingsRepository = new FileSystemDeploymentSettingsRepository(logger);
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);
	const urlBuilder = new MakerUrlBuilder();
	const relationshipBuilder = new FlowConnectionRelationshipBuilder();
	const relationshipCollectionService = new FlowConnectionRelationshipCollectionService();
	const listConnectionReferencesUseCase = new ListConnectionReferencesUseCase(
		flowRepository,
		connectionReferenceRepository,
		solutionComponentRepository,
		relationshipBuilder,
		logger
	);
	const connectionReferenceMapper = new ConnectionReferenceToDeploymentSettingsMapper();
	const exportToDeploymentSettingsUseCase = new ExportConnectionReferencesToDeploymentSettingsUseCase(
		deploymentSettingsRepository,
		connectionReferenceMapper,
		logger
	);

	await ConnectionReferencesPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listConnectionReferencesUseCase,
		exportToDeploymentSettingsUseCase,
		solutionRepository,
		urlBuilder,
		relationshipCollectionService,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}

/**
 * Lazy-loads and initializes Environment Variables panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializeEnvironmentVariables(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { DataverseApiEnvironmentVariableRepository } = await import('./features/environmentVariables/infrastructure/repositories/DataverseApiEnvironmentVariableRepository.js');
	const { DataverseApiSolutionComponentRepository } = await import('./shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
	const { DataverseApiSolutionRepository } = await import('./features/solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
	const { FileSystemDeploymentSettingsRepository } = await import('./shared/infrastructure/repositories/FileSystemDeploymentSettingsRepository.js');
	const { EnvironmentVariableFactory } = await import('./features/environmentVariables/domain/services/EnvironmentVariableFactory.js');
	const { ListEnvironmentVariablesUseCase } = await import('./features/environmentVariables/application/useCases/ListEnvironmentVariablesUseCase.js');
	const { ExportEnvironmentVariablesToDeploymentSettingsUseCase } = await import('./features/environmentVariables/application/useCases/ExportEnvironmentVariablesToDeploymentSettingsUseCase.js');
	const { EnvironmentVariablesPanelComposed } = await import('./features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.js');
	const { VSCodePanelStateRepository } = await import('./shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const { MakerUrlBuilder } = await import('./shared/infrastructure/services/MakerUrlBuilder.js');
	const { EnvironmentVariableToDeploymentSettingsMapper } = await import('./features/environmentVariables/application/mappers/EnvironmentVariableToDeploymentSettingsMapper.js');

	const getEnvironments = createGetEnvironments(environmentRepository);
	const getEnvironmentById = createGetEnvironmentById(environmentRepository);

	const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const environmentVariableRepository = new DataverseApiEnvironmentVariableRepository(dataverseApiService, logger);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
	const deploymentSettingsRepository = new FileSystemDeploymentSettingsRepository(logger);
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);
	const urlBuilder = new MakerUrlBuilder();
	const environmentVariableFactory = new EnvironmentVariableFactory();
	const listEnvironmentVariablesUseCase = new ListEnvironmentVariablesUseCase(
		environmentVariableRepository,
		solutionComponentRepository,
		environmentVariableFactory,
		logger
	);
	const environmentVariableMapper = new EnvironmentVariableToDeploymentSettingsMapper();
	const exportToDeploymentSettingsUseCase = new ExportEnvironmentVariablesToDeploymentSettingsUseCase(
		deploymentSettingsRepository,
		environmentVariableMapper,
		logger
	);

	await EnvironmentVariablesPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listEnvironmentVariablesUseCase,
		exportToDeploymentSettingsUseCase,
		solutionRepository,
		urlBuilder,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}

/**
 * Lazy-loads and initializes Plugin Trace Viewer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializePluginTraceViewer(
	context: vscode.ExtensionContext,
	authService: MsalAuthenticationService,
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { DataversePluginTraceRepository } = await import('./features/pluginTraceViewer/infrastructure/repositories/DataversePluginTraceRepository.js');
	const { FileSystemPluginTraceExporter } = await import('./features/pluginTraceViewer/infrastructure/exporters/FileSystemPluginTraceExporter.js');
	const { GetPluginTracesUseCase } = await import('./features/pluginTraceViewer/application/useCases/GetPluginTracesUseCase.js');
	const { DeleteTracesUseCase } = await import('./features/pluginTraceViewer/application/useCases/DeleteTracesUseCase.js');
	const { ExportTracesUseCase } = await import('./features/pluginTraceViewer/application/useCases/ExportTracesUseCase.js');
	const { GetTraceLevelUseCase } = await import('./features/pluginTraceViewer/application/useCases/GetTraceLevelUseCase.js');
	const { SetTraceLevelUseCase } = await import('./features/pluginTraceViewer/application/useCases/SetTraceLevelUseCase.js');
	const { PluginTraceViewModelMapper } = await import('./features/pluginTraceViewer/presentation/mappers/PluginTraceViewModelMapper.js');
	const { PluginTraceViewerPanelComposed } = await import('./features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.js');

	const getEnvironments = createGetEnvironments(environmentRepository);
	const getEnvironmentById = createGetEnvironmentById(environmentRepository);

	const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const pluginTraceRepository = new DataversePluginTraceRepository(dataverseApiService, logger);
	const pluginTraceExporter = new FileSystemPluginTraceExporter(logger);

	const getPluginTracesUseCase = new GetPluginTracesUseCase(pluginTraceRepository, logger);
	const deleteTracesUseCase = new DeleteTracesUseCase(pluginTraceRepository, logger);
	const exportTracesUseCase = new ExportTracesUseCase(pluginTraceExporter, logger);
	const getTraceLevelUseCase = new GetTraceLevelUseCase(pluginTraceRepository, logger);
	const setTraceLevelUseCase = new SetTraceLevelUseCase(pluginTraceRepository, logger);

	const viewModelMapper = new PluginTraceViewModelMapper();

	// Panel state repository for persisting UI state (optional)
	const panelStateRepository = undefined; // Can be added later for state persistence

	await PluginTraceViewerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		getPluginTracesUseCase,
		deleteTracesUseCase,
		exportTracesUseCase,
		getTraceLevelUseCase,
		setTraceLevelUseCase,
		viewModelMapper,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}

/**
 * Lazy-loads and initializes Persistence Inspector (development mode only).
 * Dynamic imports ensure production builds exclude this development-only feature entirely.
 */
async function initializePersistenceInspector(
	context: vscode.ExtensionContext,
	eventPublisher: VsCodeEventPublisher,
	logger: ILogger
): Promise<void> {
	const { VsCodeStorageReader } = await import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageReader.js');
	const { VsCodeStorageClearer } = await import('./features/persistenceInspector/infrastructure/repositories/VsCodeStorageClearer.js');
	const { HardcodedProtectedKeyProvider } = await import('./features/persistenceInspector/infrastructure/providers/HardcodedProtectedKeyProvider.js');
	const { StorageInspectionService } = await import('./features/persistenceInspector/domain/services/StorageInspectionService.js');
	const { StorageClearingService } = await import('./features/persistenceInspector/domain/services/StorageClearingService.js');
	const { InspectStorageUseCase } = await import('./features/persistenceInspector/application/useCases/InspectStorageUseCase.js');
	const { RevealSecretUseCase } = await import('./features/persistenceInspector/application/useCases/RevealSecretUseCase.js');
	const { ClearStorageEntryUseCase } = await import('./features/persistenceInspector/application/useCases/ClearStorageEntryUseCase.js');
	const { ClearStoragePropertyUseCase } = await import('./features/persistenceInspector/application/useCases/ClearStoragePropertyUseCase.js');
	const { ClearAllStorageUseCase } = await import('./features/persistenceInspector/application/useCases/ClearAllStorageUseCase.js');
	const { GetClearAllConfirmationMessageUseCase } = await import('./features/persistenceInspector/application/useCases/GetClearAllConfirmationMessageUseCase.js');
	const { PersistenceInspectorPanel } = await import('./features/persistenceInspector/presentation/panels/PersistenceInspectorPanel.js');

	const storageReader = new VsCodeStorageReader(context.globalState, context.secrets);
	const storageClearer = new VsCodeStorageClearer(context.globalState, context.secrets);
	const protectedKeyProvider = new HardcodedProtectedKeyProvider();

	const storageInspectionService = new StorageInspectionService(storageReader, protectedKeyProvider);
	const storageClearingService = new StorageClearingService(storageClearer, protectedKeyProvider);
	const inspectStorageUseCase = new InspectStorageUseCase(storageInspectionService, eventPublisher, logger);
	const revealSecretUseCase = new RevealSecretUseCase(storageInspectionService, eventPublisher, logger);
	const clearStorageEntryUseCase = new ClearStorageEntryUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearStoragePropertyUseCase = new ClearStoragePropertyUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearAllStorageUseCase = new ClearAllStorageUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const getClearAllConfirmationMessageUseCase = new GetClearAllConfirmationMessageUseCase(storageInspectionService, logger);

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
			new ToolItem('Import Jobs', 'Monitor solution imports', 'importJobViewer', 'power-platform-dev-suite.importJobViewerPickEnvironment'),
			new ToolItem('Connection References', 'View connection references and flows', 'connectionReferences', 'power-platform-dev-suite.connectionReferencesPickEnvironment'),
			new ToolItem('Environment Variables', 'View environment variables', 'environmentVariables', 'power-platform-dev-suite.environmentVariablesPickEnvironment'),
			new ToolItem('Plugin Traces', 'View and manage plugin trace logs', 'pluginTraceViewer', 'power-platform-dev-suite.pluginTraceViewerPickEnvironment')
		];
	}
}

/**
 * Provides environments tree view data.
 * Loads from repository to maintain consistency with actual persistence layer.
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
		const environments = await this.repository.getAll();

		if (environments.length === 0) {
			return [
				new EnvironmentItem('No environments configured', 'Click + to add an environment', 'placeholder', undefined)
			];
		}
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
