import { DeploymentSettings } from '../entities/DeploymentSettings';

/**
 * Factory for creating DeploymentSettings instances.
 *
 * Responsibilities:
 * - Create empty deployment settings
 * - Provide factory methods for common deployment settings creation patterns
 */
export class DeploymentSettingsFactory {
	/**
	 * Creates an empty DeploymentSettings instance.
	 * @returns New DeploymentSettings with empty arrays
	 */
	createEmpty(): DeploymentSettings {
		return new DeploymentSettings([], []);
	}
}
