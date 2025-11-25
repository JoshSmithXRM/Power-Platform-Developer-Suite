import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import type { SyncResult } from '../../../../shared/domain/entities/DeploymentSettings';
import type { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { DeploymentSettings } from '../../../../shared/domain/entities/DeploymentSettings';
import { ConnectionReferenceToDeploymentSettingsMapper } from '../mappers/ConnectionReferenceToDeploymentSettingsMapper';

export interface ExportResult extends SyncResult {
	readonly filePath: string;
}

/**
 * Use case for exporting connection references to a deployment settings file.
 */
export class ExportConnectionReferencesToDeploymentSettingsUseCase {
	constructor(
		private readonly deploymentSettingsRepository: IDeploymentSettingsRepository,
		private readonly mapper: ConnectionReferenceToDeploymentSettingsMapper,
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

		const filePath = await this.deploymentSettingsRepository.promptForFilePath(suggestedFileName);
		if (!filePath) {
			this.logger.debug('User cancelled deployment settings export');
			return null;
		}

		let existingSettings: DeploymentSettings;
		const fileExists = await this.deploymentSettingsRepository.exists(filePath);

		if (fileExists) {
			this.logger.debug('Reading existing deployment settings', { filePath });
			existingSettings = await this.deploymentSettingsRepository.read(filePath);
		} else {
			this.logger.debug('Creating new deployment settings file', { filePath });
			existingSettings = new DeploymentSettings([], []);
		}

		// Export all connection references as-is, including those without connections.
		// Data quality issues should be addressed in the solution itself, not hidden by filtering.
		const entries = this.mapper.toDeploymentSettingsEntries(connectionReferences);

		const { settings: updatedSettings, syncResult } = existingSettings.syncConnectionReferences(entries);

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
