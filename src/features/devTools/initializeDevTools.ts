import * as vscode from 'vscode';

import type { IEnvironmentRepository } from '../environmentSetup/domain/interfaces/IEnvironmentRepository';
import type { IDataverseApiService } from '../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../infrastructure/logging/ILogger';

/**
 * Response wrapper for entity definitions API.
 */
interface EntityDefinitionsResponse {
	value: Array<{ LogicalName: string; DisplayName?: { UserLocalizedLabel?: { Label: string } } }>;
}

/**
 * Quick pick item with environment ID for environment selection.
 */
interface EnvironmentQuickPickItem extends vscode.QuickPickItem {
	envId: string;
}

/**
 * Quick pick item with logical name for entity selection.
 */
interface EntityQuickPickItem extends vscode.QuickPickItem {
	logicalName: string;
}

/**
 * Initializes development-only tools and commands.
 * Only called when extensionMode === ExtensionMode.Development.
 *
 * Commands:
 * - Dump Raw Entity Metadata: Fetches raw API response for entity metadata
 */
export function initializeDevTools(
	context: vscode.ExtensionContext,
	environmentRepository: IEnvironmentRepository,
	createApiService: () => IDataverseApiService,
	logger: ILogger
): void {
	logger.info('[DevTools] Initializing development tools');

	// Create output channel for dev tools
	const outputChannel = vscode.window.createOutputChannel('Power Platform Dev Tools');

	// Register: Dump Raw Entity Metadata
	const dumpMetadataCommand = vscode.commands.registerCommand(
		'power-platform-dev-suite.devDumpRawMetadata',
		async () => {
			try {
				await dumpRawEntityMetadata(
					environmentRepository,
					createApiService,
					outputChannel,
					logger
				);
			} catch (error) {
				logger.error('[DevTools] Failed to dump metadata', error);
				vscode.window.showErrorMessage(`Failed to dump metadata: ${error}`);
			}
		}
	);

	context.subscriptions.push(dumpMetadataCommand, outputChannel);
	logger.info('[DevTools] Development tools initialized');
}

/**
 * Dumps raw entity metadata to Output panel.
 * Prompts user to select environment and entity.
 */
async function dumpRawEntityMetadata(
	environmentRepository: IEnvironmentRepository,
	createApiService: () => IDataverseApiService,
	outputChannel: vscode.OutputChannel,
	logger: ILogger
): Promise<void> {
	// Step 1: Select environment
	const environments = await environmentRepository.getAll();
	if (environments.length === 0) {
		vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
		return;
	}

	const envItems: EnvironmentQuickPickItem[] = environments.map(env => ({
		label: env.getName().getValue(),
		description: env.getDataverseUrl().getValue(),
		envId: env.getId().getValue()
	}));

	const selectedEnv = await vscode.window.showQuickPick(envItems, {
		placeHolder: 'Select environment to fetch metadata from'
	});

	if (!selectedEnv) {
		return;
	}

	const environmentId = selectedEnv.envId;
	const apiService = createApiService();

	// Step 2: Fetch entity list
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Fetching entity list...',
			cancellable: false
		},
		async () => {
			const entitiesEndpoint = '/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName';
			const entitiesResponse = await apiService.get<EntityDefinitionsResponse>(environmentId, entitiesEndpoint);

			if (!entitiesResponse?.value) {
				throw new Error('Failed to fetch entity list');
			}

			// Step 3: Select entity
			const entityItems: EntityQuickPickItem[] = entitiesResponse.value
				.map(e => ({
					label: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName,
					description: e.LogicalName,
					logicalName: e.LogicalName
				}))
				.sort((a, b) => a.label.localeCompare(b.label));

			const selectedEntity = await vscode.window.showQuickPick(entityItems, {
				placeHolder: 'Select entity to dump metadata for',
				matchOnDescription: true
			});

			if (!selectedEntity) {
				return;
			}

			// Step 4: Fetch full entity metadata (raw, no mapping)
			outputChannel.clear();
			outputChannel.show(true);
			outputChannel.appendLine(`=== Raw Entity Metadata: ${selectedEntity.logicalName} ===`);
			outputChannel.appendLine(`Environment: ${selectedEnv.label}`);
			outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
			outputChannel.appendLine('');

			const entityEndpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${selectedEntity.logicalName}')?$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys`;
			const rawEntityMetadata = await apiService.get<unknown>(environmentId, entityEndpoint);

			// Output raw JSON
			outputChannel.appendLine(JSON.stringify(rawEntityMetadata, null, 2));
			outputChannel.appendLine('');
			outputChannel.appendLine('=== END OF METADATA ===');

			logger.info('[DevTools] Dumped raw metadata', { entity: selectedEntity.logicalName });
			vscode.window.showInformationMessage(`Raw metadata for ${selectedEntity.logicalName} written to Output panel`);
		}
	);
}
