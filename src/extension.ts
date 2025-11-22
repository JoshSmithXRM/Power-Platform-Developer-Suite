import * as vscode from 'vscode';

import { CoreServicesContainer } from './infrastructure/dependencyInjection/CoreServicesContainer';
import { SharedFactories } from './infrastructure/dependencyInjection/SharedFactories';
import { EnvironmentFeature } from './infrastructure/dependencyInjection/EnvironmentFeature';
import { ToolsTreeProvider, EnvironmentsTreeProvider } from './infrastructure/dependencyInjection/TreeViewProviders';
import { IEnvironmentRepository } from './features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentSetupPanelComposed } from './features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed';
import { Environment } from './features/environmentSetup/domain/entities/Environment';
import { EnvironmentCreated } from './features/environmentSetup/domain/events/EnvironmentCreated';
import { EnvironmentUpdated } from './features/environmentSetup/domain/events/EnvironmentUpdated';
import { EnvironmentDeleted } from './features/environmentSetup/domain/events/EnvironmentDeleted';
import { AuthenticationCacheInvalidationRequested } from './features/environmentSetup/domain/events/AuthenticationCacheInvalidationRequested';
import { AuthenticationCacheInvalidationHandler } from './features/environmentSetup/infrastructure/eventHandlers/AuthenticationCacheInvalidationHandler';
import { EnvironmentId } from './features/environmentSetup/domain/valueObjects/EnvironmentId';
import type { ILogger } from './infrastructure/logging/ILogger';
import type { VsCodeEventPublisher } from './features/environmentSetup/infrastructure/services/VsCodeEventPublisher';
import type { QuickPickItemWithEnvId } from './shared/infrastructure/ui/types/QuickPickItemWithEnvId';

/**
 * Shows environment picker and executes callback with selected environment ID.
 * Handles "no environments" case and displays warning for missing Power Platform IDs.
 */
async function showEnvironmentPickerAndExecute(
	environmentRepository: IEnvironmentRepository,
	placeholder: string,
	onSelected: (envId: string) => Promise<void>
): Promise<void> {
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

	const selected = await vscode.window.showQuickPick(quickPickItems, { placeHolder: placeholder });

	if (selected) {
		await onSelected(selected.envId);
	}
}

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
	// Create core services container
	const container = new CoreServicesContainer(context);
	container.logger.info('Extension activating');

	// Create shared factories
	const factories = new SharedFactories(container.environmentRepository, container.authService);

	// Create Environment Setup feature
	const environmentFeature = new EnvironmentFeature(container);

	// Set development mode context
	const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
	void vscode.commands.executeCommand('setContext', 'powerPlatformDevSuite.isDevelopment', isDevelopment);

	// Initialize Persistence Inspector in development mode
	if (isDevelopment) {
		void initializePersistenceInspector(context, container.eventPublisher, container.logger);
	}

	// Create and register tree view providers
	const toolsProvider = new ToolsTreeProvider();
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

	const environmentsProvider = new EnvironmentsTreeProvider(
		container.environmentRepository,
		environmentFeature.listViewModelMapper
	);
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);

	// Register Environment Setup commands
	const addEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.addEnvironment', () => {
		try {
			EnvironmentSetupPanelComposed.createOrShow(
				context.extensionUri,
				environmentFeature.loadEnvironmentByIdUseCase,
				environmentFeature.saveEnvironmentUseCase,
				environmentFeature.deleteEnvironmentUseCase,
				environmentFeature.testConnectionUseCase,
				environmentFeature.discoverEnvironmentIdUseCase,
				environmentFeature.validateUniqueNameUseCase,
				environmentFeature.checkConcurrentEditUseCase,
				container.logger,
				undefined
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Environment Setup: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const editEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.editEnvironment', async (environmentItem?: { envId: string }) => {
		if (environmentItem) {
			try {
				EnvironmentSetupPanelComposed.createOrShow(
					context.extensionUri,
					environmentFeature.loadEnvironmentByIdUseCase,
					environmentFeature.saveEnvironmentUseCase,
					environmentFeature.deleteEnvironmentUseCase,
					environmentFeature.testConnectionUseCase,
					environmentFeature.discoverEnvironmentIdUseCase,
					environmentFeature.validateUniqueNameUseCase,
					environmentFeature.checkConcurrentEditUseCase,
					container.logger,
					environmentItem.envId
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to open Environment Setup: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	});

	const testEnvironmentConnectionCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.testEnvironmentConnection',
		async (environmentItem?: { envId: string }) => {
			await environmentFeature.testEnvironmentConnectionCommandHandler.execute({
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
				await environmentFeature.deleteEnvironmentUseCase.execute({ environmentId: environmentItem.envId });
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
			const environment = await container.environmentRepository.getById(new EnvironmentId(environmentItem.envId));

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
			const environment = await container.environmentRepository.getById(new EnvironmentId(environmentItem.envId));

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

	// Subscribe to domain events
	container.eventPublisher.subscribe(EnvironmentCreated, () => environmentsProvider.refresh());
	container.eventPublisher.subscribe(EnvironmentUpdated, () => environmentsProvider.refresh());
	container.eventPublisher.subscribe(EnvironmentDeleted, () => environmentsProvider.refresh());
	const cacheInvalidationHandler = new AuthenticationCacheInvalidationHandler(container.authService, container.logger);
	container.eventPublisher.subscribe(AuthenticationCacheInvalidationRequested, (event) => {
		cacheInvalidationHandler.handle(event);
	});

	// Register lazy-loaded feature commands
	const solutionExplorerCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorer', async (environmentItem?: { envId: string }) => {
		try {
			void initializeSolutionExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Solution Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const solutionExplorerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorerPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to open Solutions',
				async (envId) => initializeSolutionExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Solutions: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const importJobViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewer', async (environmentItem?: { envId: string }) => {
		try {
			void initializeImportJobViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Import Job Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const importJobViewerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewerPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to open Import Jobs',
				async (envId) => initializeImportJobViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Import Jobs: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const connectionReferencesCommand = vscode.commands.registerCommand('power-platform-dev-suite.connectionReferences', async (environmentItem?: { envId: string }) => {
		try {
			void initializeConnectionReferences(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Connection References: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const connectionReferencesPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.connectionReferencesPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to view Connection References',
				async (envId) => initializeConnectionReferences(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Connection References: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const environmentVariablesCommand = vscode.commands.registerCommand('power-platform-dev-suite.environmentVariables', async (environmentItem?: { envId: string }) => {
		try {
			void initializeEnvironmentVariables(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Environment Variables: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const environmentVariablesPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.environmentVariablesPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to view Environment Variables',
				async (envId) => initializeEnvironmentVariables(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Environment Variables: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginTraceViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewer', async (environmentItem?: { envId: string }) => {
		try {
			void initializePluginTraceViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Plugin Trace Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginTraceViewerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewerPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to view Plugin Traces',
				async (envId) => initializePluginTraceViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Plugin Trace Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const metadataBrowserCommand = vscode.commands.registerCommand('power-platform-dev-suite.metadataBrowser', async (environmentItem?: { envId: string }) => {
		try {
			void initializeMetadataBrowser(context, factories.getEnvironments, factories.dataverseApiServiceFactory, container.environmentRepository, container.logger, environmentItem?.envId);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Metadata Browser: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const metadataBrowserPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.metadataBrowserPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to browse metadata',
				async (envId) => initializeMetadataBrowser(context, factories.getEnvironments, factories.dataverseApiServiceFactory, container.environmentRepository, container.logger, envId)
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Metadata Browser: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// TEMPORARY: Benchmark query approaches
	const benchmarkMetadataQueriesCommand = vscode.commands.registerCommand('power-platform-dev-suite.benchmarkMetadataQueries', async () => {
		try {
			const envs = await container.environmentRepository.getAll();
			if (envs.length === 0) {
				vscode.window.showErrorMessage('No environments configured');
				return;
			}

			const items: QuickPickItemWithEnvId[] = envs.map((env: Environment) => ({
				label: env.getName().getValue(),
				description: env.getDataverseUrl().getValue(),
				envId: env.getId().getValue()
			}));

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select environment for benchmark test'
			});

			if (!selected) {
				return;
			}

			vscode.window.showInformationMessage('Running benchmark... this will take a few seconds');

			const { DataverseEntityMetadataRepository } = await import('./features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.js');
			const { OptionSetMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/OptionSetMetadataMapper.js');
			const { EntityKeyMapper } = await import('./features/metadataBrowser/infrastructure/mappers/EntityKeyMapper.js');
			const { SecurityPrivilegeMapper } = await import('./features/metadataBrowser/infrastructure/mappers/SecurityPrivilegeMapper.js');
			const { RelationshipMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/RelationshipMetadataMapper.js');
			const { AttributeMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/AttributeMetadataMapper.js');
			const { EntityMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/EntityMetadataMapper.js');
			const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
			const { LogicalName } = await import('./features/metadataBrowser/domain/valueObjects/LogicalName.js');

			const dataverseApiService = new DataverseApiService(factories.dataverseApiServiceFactory.getAccessToken, factories.dataverseApiServiceFactory.getDataverseUrl, container.logger);

			// Create mapper chain for benchmark
			const optionSetMapper = new OptionSetMetadataMapper();
			const entityKeyMapper = new EntityKeyMapper();
			const securityPrivilegeMapper = new SecurityPrivilegeMapper();
			const relationshipMapper = new RelationshipMetadataMapper();
			const attributeMapper = new AttributeMetadataMapper(optionSetMapper);
			const entityMapper = new EntityMetadataMapper(attributeMapper, relationshipMapper, entityKeyMapper, securityPrivilegeMapper);

			const repository = new DataverseEntityMetadataRepository(dataverseApiService, entityMapper, optionSetMapper, container.logger);

			// Clear cache first
			repository.clearCache();

			// Run navigation properties approach (current)
			const navStart = Date.now();
			await repository.getEntityWithAttributes(selected.envId, LogicalName.create('account'));
			const navTime = Date.now() - navStart;

			// Clear cache again
			repository.clearCache();

			// Manually run $expand approach for comparison
			const expandStart = Date.now();
			const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='account')?$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys`;
			await dataverseApiService.get(selected.envId, endpoint);
			const expandTime = Date.now() - expandStart;

			// Show results
			const message = `Benchmark Results (Account entity):
Navigation Properties: ${navTime}ms
$expand: ${expandTime}ms
Difference: ${Math.abs(navTime - expandTime)}ms ${navTime < expandTime ? '(Nav Props FASTER)' : '($expand FASTER)'}`;

			vscode.window.showInformationMessage(message, { modal: true });
			container.logger.info('Metadata query benchmark completed', {
				navigationPropertiesMs: navTime,
				expandMs: expandTime,
				difference: Math.abs(navTime - expandTime),
				faster: navTime < expandTime ? 'navigation' : 'expand'
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Benchmark failed: ${errorMessage}`);
			container.logger.error('Benchmark failed', error);
		}
	});

	// Register all disposables with VS Code's extension context.
	// When the extension deactivates, VS Code automatically calls .dispose() on each
	// registered disposable in reverse order, ensuring proper cleanup of:
	// - Commands (unregister from command palette)
	// - Output channels (close and dispose)
	// - Event subscriptions (prevent memory leaks)
	// - Webview panels (close any open panels)
	// This eliminates the need for manual cleanup in deactivate().
	context.subscriptions.push(
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
		metadataBrowserCommand,
		metadataBrowserPickEnvironmentCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		benchmarkMetadataQueriesCommand,
		container.eventPublisher
	);

	container.logger.info('Extension activated successfully');
}

export function deactivate(): void {
	// Intentionally empty - extension cleanup handled by disposables
}

/**
 * Lazy-loads and initializes Solution Explorer panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
async function initializeSolutionExplorer(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
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

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
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
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
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
	const { ImportJobViewModelMapper } = await import('./features/importJobViewer/application/mappers/ImportJobViewModelMapper.js');
	const { ImportJobCollectionService } = await import('./features/importJobViewer/domain/services/ImportJobCollectionService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const importJobRepository = new DataverseApiImportJobRepository(dataverseApiService, logger);
	const xmlFormatter = new XmlFormatter();
	const editorService = new VsCodeEditorService(logger, xmlFormatter);

	const listImportJobsUseCase = new ListImportJobsUseCase(importJobRepository, logger);
	const openImportLogUseCase = new OpenImportLogUseCase(importJobRepository, editorService, logger);

	const collectionService = new ImportJobCollectionService();
	const viewModelMapper = new ImportJobViewModelMapper(collectionService);

	await ImportJobViewerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		listImportJobsUseCase,
		openImportLogUseCase,
		urlBuilder,
		viewModelMapper,
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
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
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

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
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
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
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
	const { EnvironmentVariableViewModelMapper } = await import('./features/environmentVariables/application/mappers/EnvironmentVariableViewModelMapper.js');
	const { EnvironmentVariableCollectionService } = await import('./features/environmentVariables/domain/services/EnvironmentVariableCollectionService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
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
	const environmentVariableCollectionService = new EnvironmentVariableCollectionService();
	const viewModelMapper = new EnvironmentVariableViewModelMapper(environmentVariableCollectionService);
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
		viewModelMapper,
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
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (envId: string) => Promise<{ id: string; name: string; powerPlatformEnvironmentId: string | undefined } | null>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
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
	const { BuildTimelineUseCase } = await import('./features/pluginTraceViewer/application/useCases/BuildTimelineUseCase.js');
	const { PluginTraceViewModelMapper } = await import('./features/pluginTraceViewer/presentation/mappers/PluginTraceViewModelMapper.js');
	const { PluginTraceViewerPanelComposed } = await import('./features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const pluginTraceRepository = new DataversePluginTraceRepository(dataverseApiService, logger);
	const pluginTraceExporter = new FileSystemPluginTraceExporter(logger);

	const getPluginTracesUseCase = new GetPluginTracesUseCase(pluginTraceRepository, logger);
	const deleteTracesUseCase = new DeleteTracesUseCase(pluginTraceRepository, logger);
	const exportTracesUseCase = new ExportTracesUseCase(pluginTraceExporter, logger);
	const getTraceLevelUseCase = new GetTraceLevelUseCase(pluginTraceRepository, logger);
	const setTraceLevelUseCase = new SetTraceLevelUseCase(pluginTraceRepository, logger);
	const buildTimelineUseCase = new BuildTimelineUseCase(logger);

	const viewModelMapper = new PluginTraceViewModelMapper();

	// Panel state repository for persisting UI state (filter criteria per environment)
	const { VSCodePanelStateRepository } = await import('./shared/infrastructure/ui/VSCodePanelStateRepository.js');
	const panelStateRepository = new VSCodePanelStateRepository(context.workspaceState, logger);

	await PluginTraceViewerPanelComposed.createOrShow(
		context.extensionUri,
		getEnvironments,
		getEnvironmentById,
		getPluginTracesUseCase,
		deleteTracesUseCase,
		exportTracesUseCase,
		getTraceLevelUseCase,
		setTraceLevelUseCase,
		buildTimelineUseCase,
		viewModelMapper,
		logger,
		initialEnvironmentId,
		panelStateRepository
	);
}

/**
 * Lazy-loads and initializes Metadata Browser panel.
 */
async function initializeMetadataBrowser(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
	const { DataverseEntityMetadataRepository } = await import('./features/metadataBrowser/infrastructure/repositories/DataverseEntityMetadataRepository.js');
	const { OptionSetMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/OptionSetMetadataMapper.js');
	const { EntityKeyMapper } = await import('./features/metadataBrowser/infrastructure/mappers/EntityKeyMapper.js');
	const { SecurityPrivilegeMapper } = await import('./features/metadataBrowser/infrastructure/mappers/SecurityPrivilegeMapper.js');
	const { RelationshipMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/RelationshipMetadataMapper.js');
	const { AttributeMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/AttributeMetadataMapper.js');
	const { EntityMetadataMapper } = await import('./features/metadataBrowser/infrastructure/mappers/EntityMetadataMapper.js');
	const { LoadMetadataTreeUseCase } = await import('./features/metadataBrowser/application/useCases/LoadMetadataTreeUseCase.js');
	const { LoadEntityMetadataUseCase } = await import('./features/metadataBrowser/application/useCases/LoadEntityMetadataUseCase.js');
	const { LoadChoiceMetadataUseCase } = await import('./features/metadataBrowser/application/useCases/LoadChoiceMetadataUseCase.js');
	const { OpenInMakerUseCase } = await import('./features/metadataBrowser/application/useCases/OpenInMakerUseCase.js');
	const { EntityTreeItemMapper } = await import('./features/metadataBrowser/application/mappers/EntityTreeItemMapper.js');
	const { ChoiceTreeItemMapper } = await import('./features/metadataBrowser/application/mappers/ChoiceTreeItemMapper.js');
	const { AttributeRowMapper } = await import('./features/metadataBrowser/application/mappers/AttributeRowMapper.js');
	const { KeyRowMapper } = await import('./features/metadataBrowser/application/mappers/KeyRowMapper.js');
	const { RelationshipRowMapper } = await import('./features/metadataBrowser/application/mappers/RelationshipRowMapper.js');
	const { PrivilegeRowMapper } = await import('./features/metadataBrowser/application/mappers/PrivilegeRowMapper.js');
	const { ChoiceValueRowMapper } = await import('./features/metadataBrowser/application/mappers/ChoiceValueRowMapper.js');
	const { MetadataBrowserPanel } = await import('./features/metadataBrowser/presentation/panels/MetadataBrowserPanel.js');
	const { VSCodeBrowserService } = await import('./shared/infrastructure/services/VSCodeBrowserService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	// Create mapper chain (dependencies flow inward)
	const optionSetMapper = new OptionSetMetadataMapper();
	const entityKeyMapper = new EntityKeyMapper();
	const securityPrivilegeMapper = new SecurityPrivilegeMapper();
	const relationshipMapper = new RelationshipMetadataMapper();
	const attributeMapper = new AttributeMetadataMapper(optionSetMapper);
	const entityMapper = new EntityMetadataMapper(attributeMapper, relationshipMapper, entityKeyMapper, securityPrivilegeMapper);

	const entityMetadataRepository = new DataverseEntityMetadataRepository(dataverseApiService, entityMapper, optionSetMapper, logger);
	const browserService = new VSCodeBrowserService();

	// Create mappers
	const entityTreeItemMapper = new EntityTreeItemMapper();
	const choiceTreeItemMapper = new ChoiceTreeItemMapper();
	const attributeRowMapper = new AttributeRowMapper();
	const keyRowMapper = new KeyRowMapper();
	const relationshipRowMapper = new RelationshipRowMapper();
	const privilegeRowMapper = new PrivilegeRowMapper();
	const choiceValueRowMapper = new ChoiceValueRowMapper();

	// Create use cases
	const loadMetadataTreeUseCase = new LoadMetadataTreeUseCase(
		entityMetadataRepository,
		entityTreeItemMapper,
		choiceTreeItemMapper,
		logger
	);

	const loadEntityMetadataUseCase = new LoadEntityMetadataUseCase(
		entityMetadataRepository,
		entityTreeItemMapper,
		attributeRowMapper,
		keyRowMapper,
		relationshipRowMapper,
		privilegeRowMapper,
		logger
	);

	const loadChoiceMetadataUseCase = new LoadChoiceMetadataUseCase(
		entityMetadataRepository,
		choiceTreeItemMapper,
		choiceValueRowMapper,
		logger
	);

	const openInMakerUseCase = new OpenInMakerUseCase(
		async (envId: string) => {
			const environment = await environmentRepository.getById(new EnvironmentId(envId));
			return environment;
		},
		browserService,
		logger
	);

	// Helper function to get environment by ID
	const getEnvironmentById = async (envId: string): Promise<Environment | null> => {
		const environment = await environmentRepository.getById(new EnvironmentId(envId));
		return environment;
	};

	await MetadataBrowserPanel.createOrShow(
		context.extensionUri,
		context,
		getEnvironments,
		getEnvironmentById,
		{
			loadMetadataTreeUseCase,
			loadEntityMetadataUseCase,
			loadChoiceMetadataUseCase,
			openInMakerUseCase
		},
		entityMetadataRepository,
		logger,
		initialEnvironmentId
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
	const { PersistenceInspectorPanelComposed } = await import('./features/persistenceInspector/presentation/panels/PersistenceInspectorPanelComposed.js');

	const storageReader = new VsCodeStorageReader(context.globalState, context.secrets, context.workspaceState);
	const storageClearer = new VsCodeStorageClearer(context.globalState, context.secrets, context.workspaceState);
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
		PersistenceInspectorPanelComposed.createOrShow(
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
