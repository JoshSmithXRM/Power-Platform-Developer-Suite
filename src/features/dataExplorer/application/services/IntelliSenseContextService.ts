/**
 * Application Service: IntelliSense Context
 *
 * Maintains the active environment context for SQL completions.
 * This is a singleton that bridges the Data Explorer panel and
 * the completion provider.
 *
 * Updated by: Data Explorer panel when environment changes
 * Queried by: DataverseCompletionProvider when providing completions
 */
export class IntelliSenseContextService {
	private activeEnvironmentId: string | null = null;
	private readonly environmentChangeListeners: Array<(envId: string | null) => void> = [];
	private readonly executeQueryListeners: Array<(sql: string) => void> = [];

	/**
	 * Sets the active environment for IntelliSense.
	 * Call this when the Data Explorer panel's environment selection changes.
	 *
	 * @param environmentId - The environment ID, or null if none selected
	 */
	public setActiveEnvironment(environmentId: string | null): void {
		const changed = this.activeEnvironmentId !== environmentId;
		this.activeEnvironmentId = environmentId;

		if (changed) {
			for (const listener of this.environmentChangeListeners) {
				listener(environmentId);
			}
		}
	}

	/**
	 * Gets the currently active environment.
	 *
	 * @returns The active environment ID, or null if none
	 */
	public getActiveEnvironment(): string | null {
		return this.activeEnvironmentId;
	}

	/**
	 * Checks if there is an active environment.
	 */
	public hasActiveEnvironment(): boolean {
		return this.activeEnvironmentId !== null;
	}

	/**
	 * Registers a listener for environment changes.
	 * Useful for clearing caches when environment changes.
	 *
	 * @param listener - Callback when environment changes
	 * @returns Unsubscribe function
	 */
	public onEnvironmentChange(listener: (envId: string | null) => void): () => void {
		this.environmentChangeListeners.push(listener);
		return (): void => {
			const index = this.environmentChangeListeners.indexOf(listener);
			if (index >= 0) {
				this.environmentChangeListeners.splice(index, 1);
			}
		};
	}

	/**
	 * Requests query execution from the VS Code editor.
	 * Called when user presses Ctrl+Enter in a SQL file.
	 *
	 * @param sql - The SQL query to execute
	 */
	public requestQueryExecution(sql: string): void {
		for (const listener of this.executeQueryListeners) {
			listener(sql);
		}
	}

	/**
	 * Registers a listener for query execution requests.
	 * The Data Explorer panel subscribes to receive queries from the VS Code editor.
	 *
	 * @param listener - Callback when query execution is requested
	 * @returns Unsubscribe function
	 */
	public onExecuteQueryRequest(listener: (sql: string) => void): () => void {
		this.executeQueryListeners.push(listener);
		return (): void => {
			const index = this.executeQueryListeners.indexOf(listener);
			if (index >= 0) {
				this.executeQueryListeners.splice(index, 1);
			}
		};
	}
}
