/**
 * Domain interface for reading VS Code storage.
 *
 * Clean Architecture Principle: Domain defines the interface, infrastructure implements it.
 * This inverts the dependency: domain does NOT depend on VS Code APIs.
 *
 * WHY Interface in Domain: Allows domain services to read storage without
 * coupling to VS Code storage APIs. Infrastructure layer implements this contract
 * using actual VS Code storage.
 *
 * Responsibilities:
 * - Read all global state entries (extension-wide settings)
 * - Read all workspace state entries (workspace-specific settings like panel state)
 * - Read all secret keys (values hidden by default)
 * - Reveal specific secret values on demand
 */
export interface IStorageReader {
	/**
	 * Reads all global state keys and their values.
	 * Global state persists across all workspaces.
	 *
	 * @returns {Promise<Map<string, unknown>>} Map of keys to values
	 */
	readAllGlobalState(): Promise<Map<string, unknown>>;

	/**
	 * Reads all workspace state keys and their values.
	 * Workspace state is specific to the current workspace (e.g., panel UI preferences).
	 *
	 * @returns {Promise<Map<string, unknown>>} Map of keys to values
	 */
	readAllWorkspaceState(): Promise<Map<string, unknown>>;

	/**
	 * Reads all secret storage keys.
	 *
	 * Note: Returns keys only, not values. Values are sensitive and hidden by default.
	 * Secret key pattern: `power-platform-dev-suite-secret-{clientId}` or
	 * `power-platform-dev-suite-password-{username}`
	 *
	 * @returns {Promise<string[]>} Array of secret keys
	 */
	readAllSecretKeys(): Promise<string[]>;

	/**
	 * Reveals a specific secret value for display.
	 *
	 * Secrets are hidden by default. This method allows explicit
	 * revelation when user clicks "Show" button.
	 *
	 * @param {string} key - Secret storage key
	 * @returns {Promise<string | undefined>} Secret value or undefined if not found
	 */
	revealSecret(key: string): Promise<string | undefined>;
}
