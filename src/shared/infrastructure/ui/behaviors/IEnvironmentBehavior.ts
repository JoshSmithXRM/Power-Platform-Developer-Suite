/**
 * Behavior: Environment Management
 * Responsibility: Environment dropdown, switching, persistence
 */
export interface IEnvironmentBehavior {
	/**
	 * Initializes environment behavior.
	 * Loads environments and sends to webview.
	 */
	initialize(): Promise<void>;

	/**
	 * Gets the currently selected environment ID.
	 * @returns Current environment ID or null if none selected
	 */
	getCurrentEnvironmentId(): string | null;

	/**
	 * Switches to a different environment.
	 * @param environmentId - Target environment ID
	 */
	switchEnvironment(environmentId: string): Promise<void>;

	/**
	 * Disposes resources used by this behavior.
	 */
	dispose(): void;
}
