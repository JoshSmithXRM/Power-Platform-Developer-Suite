import type { EnvironmentVariable } from '../../domain/entities/EnvironmentVariable';
import type { EnvironmentVariableEntry } from '../../../../shared/domain/entities/DeploymentSettings';

/**
 * Maps EnvironmentVariable domain entities to deployment settings entry format.
 *
 * Responsibilities:
 * - Transform domain entities to deployment settings JSON structure
 * - Handle null values by converting to empty strings for valid JSON
 * - Use effective value (current value if set, otherwise default value)
 *
 * This mapper exists in the application layer because deployment settings format
 * is a presentation/application concern, not domain logic.
 */
export class EnvironmentVariableToDeploymentSettingsMapper {
	/**
	 * Maps a single environment variable to deployment settings entry format.
	 * Uses the effective value (current value if set, otherwise default value)
	 * to capture environment-specific configuration for deployment.
	 *
	 * @param environmentVariable - Domain entity to map
	 * @returns Deployment settings entry with SchemaName and Value
	 */
	toDeploymentSettingsEntry(environmentVariable: EnvironmentVariable): EnvironmentVariableEntry {
		return {
			SchemaName: environmentVariable.schemaName,
			Value: environmentVariable.getEffectiveValue() ?? ''
		};
	}

	/**
	 * Maps an array of environment variables to deployment settings entries.
	 *
	 * @param environmentVariables - Array of domain entities to map
	 * @returns Array of deployment settings entries
	 */
	toDeploymentSettingsEntries(environmentVariables: EnvironmentVariable[]): EnvironmentVariableEntry[] {
		return environmentVariables.map(ev => this.toDeploymentSettingsEntry(ev));
	}
}
