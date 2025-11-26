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
import { initializeMetadataBrowser } from './features/metadataBrowser/presentation/initialization/initializeMetadataBrowser.js';
import { initializePersistenceInspector } from './features/persistenceInspector/presentation/initialization/initializePersistenceInspector.js';
import { initializeDataExplorer } from './features/dataExplorer/presentation/initialization/initializeDataExplorer.js';
import { initializeWebResources } from './features/webResources/presentation/initialization/initializeWebResources.js';

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
				async (envId) => initializeDataExplorer(context, factories.getEnvironments, factories.getEnvironmentById, factories.dataverseApiServiceFactory, container.logger, envId)
			);
		} catch (error) {
			container.logger.error('Failed to open Data Explorer with environment picker', error);
			vscode.window.showErrorMessage(
				`Failed to open Data Explorer: ${error instanceof Error ? error.message : String(error)}`
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
		dataExplorerCommand,
		dataExplorerPickEnvironmentCommand,
		webResourcesCommand,
		webResourcesPickEnvironmentCommand,
		removeEnvironmentCommand,
		openMakerCommand,
		openDynamicsCommand,
		refreshEnvironmentsCommand,
		openSettingsCommand,
		container.eventPublisher
	);

	container.logger.info('Extension activated successfully');
}

export function deactivate(): void {
	// Intentionally empty - extension cleanup handled by disposables
}
