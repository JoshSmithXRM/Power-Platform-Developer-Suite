import type { DeploymentSettings } from '../entities/DeploymentSettings';

/**
 * Repository interface for deployment settings file operations.
 * Domain layer contract implemented by infrastructure.
 */
export interface IDeploymentSettingsRepository {
	/**
	 * Reads deployment settings from a file.
	 * @param filePath - Absolute path to deployment settings JSON file
	 * @returns Parsed DeploymentSettings entity
	 * @throws {Error} If file doesn't exist or JSON is invalid
	 */
	read(filePath: string): Promise<DeploymentSettings>;

	/**
	 * Writes deployment settings to a file.
	 * Formats JSON with 4-space indentation for readability.
	 * @param filePath - Absolute path to deployment settings JSON file
	 * @param settings - DeploymentSettings entity to write
	 * @throws {Error} If write operation fails
	 */
	write(filePath: string, settings: DeploymentSettings): Promise<void>;

	/**
	 * Checks if a file exists.
	 * @param filePath - Absolute path to check
	 * @returns True if file exists, false otherwise
	 */
	exists(filePath: string): Promise<boolean>;

	/**
	 * Prompts user to select or create a deployment settings file.
	 * @param suggestedName - Suggested filename (e.g., "SolutionName.deploymentsettings.json")
	 * @param defaultUri - Default directory to open file picker in (workspace root if not specified)
	 * @returns Absolute file path selected by user, or undefined if cancelled
	 */
	promptForFilePath(suggestedName?: string, defaultUri?: string): Promise<string | undefined>;
}
