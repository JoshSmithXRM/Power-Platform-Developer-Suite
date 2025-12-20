import * as vscode from 'vscode';

import { CoreServicesContainer } from './infrastructure/dependencyInjection/CoreServicesContainer';
import { SharedFactories } from './infrastructure/dependencyInjection/SharedFactories';
import { EnvironmentFeature } from './infrastructure/dependencyInjection/EnvironmentFeature';
import { ToolsTreeProvider, EnvironmentsTreeProvider } from './infrastructure/dependencyInjection/TreeViewProviders';
import { IEnvironmentRepository } from './features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentSetupPanelComposed } from './features/environmentSetup/presentation/panels/EnvironmentSetupPanelComposed';
import { EnvironmentCreated } from './features/environmentSetup/domain/events/EnvironmentCreated';
import { EnvironmentUpdated } from './features/environmentSetup/domain/events/EnvironmentUpdated';
import { EnvironmentDeleted } from './features/environmentSetup/domain/events/EnvironmentDeleted';
import { AuthenticationCacheInvalidationRequested } from './features/environmentSetup/domain/events/AuthenticationCacheInvalidationRequested';
import { AuthenticationCacheInvalidationHandler } from './features/environmentSetup/infrastructure/eventHandlers/AuthenticationCacheInvalidationHandler';
import { EnvironmentId } from './features/environmentSetup/domain/valueObjects/EnvironmentId';
import type { QuickPickItemWithEnvId } from './shared/infrastructure/ui/types/QuickPickItemWithEnvId';
import { initializeSolutionExplorer } from './features/solutionExplorer/presentation/initialization/initializeSolutionExplorer.js';
import { initializeImportJobViewer } from './features/importJobViewer/presentation/initialization/initializeImportJobViewer.js';
import { initializeConnectionReferences } from './features/connectionReferences/presentation/initialization/initializeConnectionReferences.js';
import { initializeEnvironmentVariables } from './features/environmentVariables/presentation/initialization/initializeEnvironmentVariables.js';
import { initializePluginTraceViewer } from './features/pluginTraceViewer/presentation/initialization/initializePluginTraceViewer.js';
import { initializePluginRegistration } from './features/pluginRegistration/presentation/initialization/initializePluginRegistration.js';
import { PluginRegistrationPanelComposed } from './features/pluginRegistration/presentation/panels/PluginRegistrationPanelComposed.js';
import { initializeMetadataBrowser } from './features/metadataBrowser/presentation/initialization/initializeMetadataBrowser.js';
import { initializePersistenceInspector } from './features/persistenceInspector/presentation/initialization/initializePersistenceInspector.js';
import { initializeDevTools } from './features/devTools/initializeDevTools.js';
import { initializeDataExplorer } from './features/dataExplorer/presentation/initialization/initializeDataExplorer.js';
import { initializeWebResources } from './features/webResources/presentation/initialization/initializeWebResources.js';
import { registerDataverseNotebooks } from './features/dataExplorer/notebooks/registerNotebooks.js';
import { registerDataExplorerIntelliSense } from './features/dataExplorer/presentation/initialization/registerDataExplorerIntelliSense.js';
import { DataverseApiService } from './shared/infrastructure/services/DataverseApiService.js';

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

	// Initialize development-only tools
	if (isDevelopment) {
		void initializePersistenceInspector(context, container.eventPublisher, container.logger);
		initializeDevTools(
			context,
			container.environmentRepository,
			() => new DataverseApiService(
				factories.dataverseApiServiceFactory.getAccessToken,
				factories.dataverseApiServiceFactory.getDataverseUrl,
				container.logger
			),
			container.logger
		);
	}

	// Create and register tree view providers
	const toolsProvider = new ToolsTreeProvider();
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

	const environmentsProvider = new EnvironmentsTreeProvider(
		container.environmentRepository,
		environmentFeature.listViewModelMapper
	);
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);

	// Register Power Platform Developer Suite Notebooks (SQL and FetchXML support)
	registerDataverseNotebooks(context, {
		getEnvironments: factories.getEnvironments,
		dataverseApiServiceFactory: factories.dataverseApiServiceFactory,
		logger: container.logger,
	}).then((disposables) => {
		context.subscriptions.push(...disposables);
	}).catch((error) => {
		container.logger.error('Failed to register Power Platform Developer Suite Notebooks', error);
	});

	// Register IntelliSense for SQL/FetchXML files and notebook cells
	// This must be registered during activation so notebooks have IntelliSense
	// even if the Data Explorer panel is never opened
	const { getAccessToken, getDataverseUrl } = factories.dataverseApiServiceFactory;
	const intelliSenseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, container.logger);
	registerDataExplorerIntelliSense(context, intelliSenseApiService, container.logger);

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
			container.logger.error('Failed to open Environment Setup', error);
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
				container.logger.error('Failed to open Environment Setup for edit', error);
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

	const setDefaultEnvironmentCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.setDefaultEnvironment',
		async (environmentItem?: { envId: string; label: string }) => {
			if (!environmentItem?.envId) {
				vscode.window.showErrorMessage('No environment selected');
				return;
			}

			try {
				await environmentFeature.setDefaultEnvironmentUseCase.execute(environmentItem.envId);
				environmentsProvider.refresh();
				vscode.window.showInformationMessage(`"${environmentItem.label}" set as default environment`);
			} catch (error) {
				container.logger.error('Failed to set default environment', error);
				vscode.window.showErrorMessage(
					`Failed to set default environment: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	);

	const moveEnvironmentUpCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.moveEnvironmentUp',
		async (environmentItem?: { envId: string; label: string }) => {
			if (!environmentItem?.envId) {
				vscode.window.showErrorMessage('No environment selected');
				return;
			}

			try {
				const moved = await environmentFeature.moveEnvironmentUseCase.execute(environmentItem.envId, 'up');
				if (moved) {
					environmentsProvider.refresh();
				} else {
					vscode.window.showInformationMessage(`"${environmentItem.label}" is already at the top`);
				}
			} catch (error) {
				container.logger.error('Failed to move environment up', error);
				vscode.window.showErrorMessage(
					`Failed to move environment: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	);

	const moveEnvironmentDownCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.moveEnvironmentDown',
		async (environmentItem?: { envId: string; label: string }) => {
			if (!environmentItem?.envId) {
				vscode.window.showErrorMessage('No environment selected');
				return;
			}

			try {
				const moved = await environmentFeature.moveEnvironmentUseCase.execute(environmentItem.envId, 'down');
				if (moved) {
					environmentsProvider.refresh();
				} else {
					vscode.window.showInformationMessage(`"${environmentItem.label}" is already at the bottom`);
				}
			} catch (error) {
				container.logger.error('Failed to move environment down', error);
				vscode.window.showErrorMessage(
					`Failed to move environment: ${error instanceof Error ? error.message : String(error)}`
				);
			}
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
				container.logger.error('Failed to remove environment', error);
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
			container.logger.error('Failed to open Maker portal', error);
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
			container.logger.error('Failed to open Dynamics', error);
			vscode.window.showErrorMessage(
				`Failed to open Dynamics: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const refreshEnvironmentsCommand = vscode.commands.registerCommand('power-platform-dev-suite.refreshEnvironments', () => {
		environmentsProvider.refresh();
	});

	const openSettingsCommand = vscode.commands.registerCommand('power-platform-dev-suite.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'powerPlatformDevSuite');
	});

	const showOutputCommand = vscode.commands.registerCommand('power-platform-dev-suite.showOutput', () => {
		container.outputChannel.show();
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
			await initializeSolutionExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Solution Explorer', error);
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
			container.logger.error('Failed to open Solutions with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Solutions: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const importJobViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.importJobViewer', async (environmentItem?: { envId: string }) => {
		try {
			void initializeImportJobViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Import Job Viewer', error);
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
			container.logger.error('Failed to open Import Jobs with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Import Jobs: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const connectionReferencesCommand = vscode.commands.registerCommand('power-platform-dev-suite.connectionReferences', async (environmentItem?: { envId: string }) => {
		try {
			void initializeConnectionReferences(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Connection References', error);
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
			container.logger.error('Failed to open Connection References with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Connection References: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const environmentVariablesCommand = vscode.commands.registerCommand('power-platform-dev-suite.environmentVariables', async (environmentItem?: { envId: string }) => {
		try {
			void initializeEnvironmentVariables(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Environment Variables', error);
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
			container.logger.error('Failed to open Environment Variables with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Environment Variables: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginTraceViewerCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewer', async (environmentItem?: { envId: string }) => {
		try {
			void initializePluginTraceViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, container.configService, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Plugin Trace Viewer', error);
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
				async (envId) => initializePluginTraceViewer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, container.configService, envId)
			);
		} catch (error) {
			container.logger.error('Failed to open Plugin Trace Viewer with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Plugin Trace Viewer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginRegistrationCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginRegistration', async (environmentItem?: { envId: string }) => {
		try {
			void initializePluginRegistration(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Plugin Registration', error);
			vscode.window.showErrorMessage(
				`Failed to open Plugin Registration: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const pluginRegistrationPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.pluginRegistrationPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to view Plugin Registration',
				async (envId) => initializePluginRegistration(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			container.logger.error('Failed to open Plugin Registration with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Plugin Registration: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	// Plugin Registration Context Menu Commands
	const enablePluginStepCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.enablePluginStep',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const stepId = contextMenuContext?.nodeId;
			if (!stepId) {
				vscode.window.showWarningMessage('No step selected.');
				return;
			}
			await panel.enableStep(stepId);
		}
	);

	const disablePluginStepCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.disablePluginStep',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const stepId = contextMenuContext?.nodeId;
			if (!stepId) {
				vscode.window.showWarningMessage('No step selected.');
				return;
			}
			await panel.disableStep(stepId);
		}
	);

	const updatePluginAssemblyCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.updatePluginAssembly',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const assemblyId = contextMenuContext?.nodeId;
			if (!assemblyId) {
				vscode.window.showWarningMessage('No assembly selected.');
				return;
			}
			await panel.updateAssembly(assemblyId);
		}
	);

	const updatePluginPackageCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.updatePluginPackage',
		async (contextMenuContext?: { nodeId?: string; packageId?: string }) => {
			container.logger.debug('updatePluginPackage command invoked', {
				contextMenuContext: JSON.stringify(contextMenuContext),
			});

			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			// packageId is set when clicking on an assembly-in-package, nodeId when clicking on package directly
			const packageId = contextMenuContext?.packageId ?? contextMenuContext?.nodeId;
			container.logger.debug('updatePluginPackage resolved packageId', {
				packageId,
				fromPackageId: contextMenuContext?.packageId,
				fromNodeId: contextMenuContext?.nodeId,
			});

			if (!packageId) {
				vscode.window.showWarningMessage('No package selected.');
				return;
			}
			await panel.updatePackage(packageId);
		}
	);

	const unregisterPluginAssemblyCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterPluginAssembly',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const assemblyId = contextMenuContext?.nodeId;
			if (!assemblyId) {
				vscode.window.showWarningMessage('No assembly selected.');
				return;
			}
			await panel.unregisterAssembly(assemblyId);
		}
	);

	const unregisterPluginPackageCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterPluginPackage',
		async (contextMenuContext?: { nodeId?: string; packageId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			// packageId is set when clicking on an assembly-in-package, nodeId when clicking on package directly
			const packageId = contextMenuContext?.packageId ?? contextMenuContext?.nodeId;
			if (!packageId) {
				vscode.window.showWarningMessage('No package selected.');
				return;
			}
			await panel.unregisterPackage(packageId);
		}
	);

	const unregisterPluginStepCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterPluginStep',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const stepId = contextMenuContext?.nodeId;
			if (!stepId) {
				vscode.window.showWarningMessage('No step selected.');
				return;
			}
			await panel.unregisterStep(stepId);
		}
	);

	const unregisterStepImageCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterStepImage',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const imageId = contextMenuContext?.nodeId;
			if (!imageId) {
				vscode.window.showWarningMessage('No image selected.');
				return;
			}
			await panel.unregisterImage(imageId);
		}
	);

	const registerPluginStepCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.registerPluginStep',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const pluginTypeId = contextMenuContext?.nodeId;
			if (!pluginTypeId) {
				vscode.window.showWarningMessage('No plugin type selected.');
				return;
			}
			await panel.registerStep(pluginTypeId);
		}
	);

	const editPluginStepCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.editPluginStep',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const stepId = contextMenuContext?.nodeId;
			if (!stepId) {
				vscode.window.showWarningMessage('No step selected.');
				return;
			}
			await panel.editStep(stepId);
		}
	);

	const registerStepImageCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.registerStepImage',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const stepId = contextMenuContext?.nodeId;
			if (!stepId) {
				vscode.window.showWarningMessage('No step selected.');
				return;
			}
			await panel.registerImage(stepId);
		}
	);

	const editStepImageCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.editStepImage',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const imageId = contextMenuContext?.nodeId;
			if (!imageId) {
				vscode.window.showWarningMessage('No image selected.');
				return;
			}
			await panel.editImage(imageId);
		}
	);

	const editWebHookCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.editWebHook',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const webhookId = contextMenuContext?.nodeId;
			if (!webhookId) {
				vscode.window.showWarningMessage('No webhook selected.');
				return;
			}
			await panel.editWebHook(webhookId);
		}
	);

	const unregisterWebHookCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterWebHook',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const webhookId = contextMenuContext?.nodeId;
			if (!webhookId) {
				vscode.window.showWarningMessage('No webhook selected.');
				return;
			}
			await panel.unregisterWebHook(webhookId);
		}
	);

	const editDataProviderCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.editDataProvider',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const dataProviderId = contextMenuContext?.nodeId;
			if (!dataProviderId) {
				vscode.window.showWarningMessage('No data provider selected.');
				return;
			}
			await panel.editDataProvider(dataProviderId);
		}
	);

	const unregisterDataProviderCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.unregisterDataProvider',
		async (contextMenuContext?: { nodeId?: string }) => {
			const panel = PluginRegistrationPanelComposed.getActivePanel();
			if (!panel) {
				vscode.window.showWarningMessage('No Plugin Registration panel is open.');
				return;
			}
			const dataProviderId = contextMenuContext?.nodeId;
			if (!dataProviderId) {
				vscode.window.showWarningMessage('No data provider selected.');
				return;
			}
			await panel.unregisterDataProvider(dataProviderId);
		}
	);

	const metadataBrowserCommand = vscode.commands.registerCommand('power-platform-dev-suite.metadataBrowser', async (environmentItem?: { envId: string }) => {
		try {
			void initializeMetadataBrowser(context, factories.getEnvironments, factories.dataverseApiServiceFactory, container.environmentRepository, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Metadata Browser', error);
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
			container.logger.error('Failed to open Metadata Browser with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Metadata Browser: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const dataExplorerCommand = vscode.commands.registerCommand('power-platform-dev-suite.dataExplorer', async (environmentItem?: { envId: string }) => {
		try {
			void initializeDataExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Data Explorer', error);
			vscode.window.showErrorMessage(
				`Failed to open Data Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const dataExplorerPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.dataExplorerPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to open Data Explorer',
				async (envId) => { void await initializeDataExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId); }
			);
		} catch (error) {
			container.logger.error('Failed to open Data Explorer with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Data Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const openCellInDataExplorerCommand = vscode.commands.registerCommand('power-platform-dev-suite.openCellInDataExplorer', async () => {
		try {
			// Get active notebook editor
			const editor = vscode.window.activeNotebookEditor;
			if (!editor || editor.notebook.notebookType !== 'ppdsnb') {
				vscode.window.showWarningMessage('This command is only available for Dataverse notebooks.');
				return;
			}

			// Get selected cell
			const selections = editor.selections;
			const firstSelection = selections[0];
			if (!firstSelection) {
				vscode.window.showWarningMessage('No cell selected.');
				return;
			}

			const cell = editor.notebook.cellAt(firstSelection.start);
			if (cell.kind !== vscode.NotebookCellKind.Code) {
				vscode.window.showWarningMessage('Please select a code cell.');
				return;
			}

			// Get cell content and language
			const query = cell.document.getText().trim();
			if (!query) {
				vscode.window.showWarningMessage('Cell is empty.');
				return;
			}

			const cellLanguage = cell.document.languageId;
			const language: 'sql' | 'fetchxml' = cellLanguage === 'fetchxml' ? 'fetchxml' : 'sql';

			// Get environment from notebook metadata
			const notebookMetadata = editor.notebook.metadata;
			const environmentId = notebookMetadata?.['environmentId'] as string | undefined;

			// Open Data Explorer with the environment (creates new or shows existing for that env)
			const panel = await initializeDataExplorer(
				context,
				factories.getEnvironments,
				factories.getEnvironmentById,
				factories.dataverseApiServiceFactory,
				container.logger,
				environmentId
			);

			// Load the query into the Visual Query Builder
			await panel.loadQueryFromExternal(query, language);

		} catch (error) {
			container.logger.error('Failed to open cell in Data Explorer', error);
			vscode.window.showErrorMessage(
				`Failed to open in Data Explorer: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const webResourcesCommand = vscode.commands.registerCommand('power-platform-dev-suite.webResources', async (environmentItem?: { envId: string }) => {
		try {
			void initializeWebResources(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, environmentItem?.envId);
		} catch (error) {
			container.logger.error('Failed to open Web Resources', error);
			vscode.window.showErrorMessage(
				`Failed to open Web Resources: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});

	const webResourcesPickEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.webResourcesPickEnvironment', async () => {
		try {
			await showEnvironmentPickerAndExecute(
				container.environmentRepository,
				'Select an environment to browse web resources',
				async (envId) => initializeWebResources(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			container.logger.error('Failed to open Web Resources with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Web Resources: ${error instanceof Error ? error.message : String(error)}`
			);
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
		setDefaultEnvironmentCommand,
		moveEnvironmentUpCommand,
		moveEnvironmentDownCommand,
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
		pluginRegistrationCommand,
		pluginRegistrationPickEnvironmentCommand,
		enablePluginStepCommand,
		disablePluginStepCommand,
		updatePluginAssemblyCommand,
		updatePluginPackageCommand,
		unregisterPluginAssemblyCommand,
		unregisterPluginPackageCommand,
		unregisterPluginStepCommand,
		unregisterStepImageCommand,
		registerPluginStepCommand,
		editPluginStepCommand,
		registerStepImageCommand,
		editStepImageCommand,
		editWebHookCommand,
		unregisterWebHookCommand,
		editDataProviderCommand,
		unregisterDataProviderCommand,
		metadataBrowserCommand,
		metadataBrowserPickEnvironmentCommand,
		dataExplorerCommand,
		dataExplorerPickEnvironmentCommand,
		openCellInDataExplorerCommand,
		webResourcesCommand,
		webResourcesPickEnvironmentCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		openSettingsCommand,
		showOutputCommand,
		container.eventPublisher
	);

	container.logger.info('Extension activated successfully');
}

export function deactivate(): void {
	// Intentionally empty - extension cleanup handled by disposables
}
