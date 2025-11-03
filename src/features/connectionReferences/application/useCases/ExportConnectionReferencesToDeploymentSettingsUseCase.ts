import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import { DeploymentSettings } from '../../../../shared/domain/entities/DeploymentSettings';
import type { ConnectionReference } from '../../domain/entities/ConnectionReference';
import type { SyncResult } from '../../../../shared/domain/entities/DeploymentSettings';

/**
 * Result of exporting connection references to deployment settings.
 */
export interface ExportResult extends SyncResult {
	readonly filePath: string;
}

/**
 * Use case for exporting connection references to a deployment settings file.
 *
 * Orchestrates:
 * 1. Extracting unique connection references from relationships
 * 2. Prompting user for file path
 * 3. Reading existing deployment settings (if file exists)
 * 4. Syncing connection references section
 * 5. Writing updated deployment settings to file
 */
export class ExportConnectionReferencesToDeploymentSettingsUseCase {
	constructor(
		private readonly deploymentSettingsRepository: IDeploymentSettingsRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Exports connection references to a deployment settings file.
	 *
	 * @param connectionReferences - Connection references to export
	 * @param suggestedFileName - Suggested filename (e.g., "SolutionName.deploymentsettings.json")
	 * @returns Export result with sync statistics and file path, or null if user cancelled
	 */
	async execute(
		connectionReferences: ConnectionReference[],
		suggestedFileName?: string
	): Promise<ExportResult | null> {
		this.logger.info('Exporting connection references to deployment settings', {
			count: connectionReferences.length,
			suggestedFileName
		});

		// Prompt user for file path
		const filePath = await this.deploymentSettingsRepository.promptForFilePath(suggestedFileName);
		if (!filePath) {
			this.logger.debug('User cancelled deployment settings export');
			return null;
		}

		// Read existing deployment settings or create empty
		let existingSettings: DeploymentSettings;
		const fileExists = await this.deploymentSettingsRepository.exists(filePath);

		if (fileExists) {
			this.logger.debug('Reading existing deployment settings', { filePath });
			existingSettings = await this.deploymentSettingsRepository.read(filePath);
		} else {
			this.logger.debug('Creating new deployment settings file', { filePath });
			existingSettings = DeploymentSettings.createEmpty();
		}

		// Convert connection references to deployment settings entries
		const entries = connectionReferences.map(cr => cr.toDeploymentSettingsEntry());

		// Sync connection references section
		const { settings: updatedSettings, syncResult } = existingSettings.syncConnectionReferences(entries);

		// Write updated deployment settings
		await this.deploymentSettingsRepository.write(filePath, updatedSettings);

		this.logger.info('Connection references exported successfully', {
			filePath,
			added: syncResult.added,
			removed: syncResult.removed,
			preserved: syncResult.preserved
		});

		return {
			filePath,
			...syncResult
		};
	}
}
