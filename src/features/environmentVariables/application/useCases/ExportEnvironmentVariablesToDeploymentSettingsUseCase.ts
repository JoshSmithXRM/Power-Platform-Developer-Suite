import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDeploymentSettingsRepository } from '../../../../shared/domain/interfaces/IDeploymentSettingsRepository';
import type { DeploymentSettings } from '../../../../shared/domain/entities/DeploymentSettings';
import type { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import type { SyncResult } from '../../../../shared/domain/entities/DeploymentSettings';
import { EnvironmentVariableToDeploymentSettingsMapper } from '../mappers/EnvironmentVariableToDeploymentSettingsMapper';
import { DeploymentSettingsFactory } from '../../../../shared/domain/services/DeploymentSettingsFactory';

/**
 * Result of exporting environment variables to deployment settings.
 */
export interface ExportResult extends SyncResult {
	readonly filePath: string;
}

/**
 * Use case for exporting environment variables to a deployment settings file.
 *
 * Orchestrates:
 * 1. Prompting user for file path
 * 2. Reading existing deployment settings (if file exists)
 * 3. Syncing environment variables section
 * 4. Writing updated deployment settings to file
 */
export class ExportEnvironmentVariablesToDeploymentSettingsUseCase {
	private readonly deploymentSettingsFactory = new DeploymentSettingsFactory();

	constructor(
		private readonly deploymentSettingsRepository: IDeploymentSettingsRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Exports environment variables to a deployment settings file.
	 *
	 * @param environmentVariables - Environment variables to export
	 * @param suggestedFileName - Suggested filename (e.g., "SolutionName.deploymentsettings.json")
	 * @returns Export result with sync statistics and file path, or null if user cancelled
	 */
	async execute(
		environmentVariables: EnvironmentVariable[],
		suggestedFileName: string | undefined
	): Promise<ExportResult | null> {
		this.logger.info('Exporting environment variables to deployment settings', {
			count: environmentVariables.length,
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
			existingSettings = this.deploymentSettingsFactory.createEmpty();
		}

		// Export all environment variables as-is, even if they lack values.
		// This is intentional: the export faithfully represents solution state.
		// Data quality issues should be addressed in the solution itself, not hidden by filtering.
		// The export is for pipeline deployment files - if it's in the solution, it goes in the export.
		const entries = EnvironmentVariableToDeploymentSettingsMapper.toDeploymentSettingsEntries(environmentVariables);

		// Sync environment variables section
		const { settings: updatedSettings, syncResult } = existingSettings.syncEnvironmentVariables(entries);

		// Write updated deployment settings
		await this.deploymentSettingsRepository.write(filePath, updatedSettings);

		this.logger.info('Environment variables exported successfully', {
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
