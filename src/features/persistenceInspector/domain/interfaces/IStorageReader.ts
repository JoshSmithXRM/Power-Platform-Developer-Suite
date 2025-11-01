/**
 * Domain interface for reading storage
 * Infrastructure layer implements this
 */
export interface IStorageReader {
	/**
	 * Reads all global state keys and their values
	 */
	readAllGlobalState(): Promise<Map<string, unknown>>;

	/**
	 * Reads all secret keys for the current environments
	 * Uses pattern: power-platform-dev-suite-secret-{clientId} and power-platform-dev-suite-password-{username}
	 */
	readAllSecretKeys(): Promise<string[]>;

	/**
	 * Reveals a specific secret value (for "Show" button functionality)
	 */
	revealSecret(key: string): Promise<string | undefined>;
}
