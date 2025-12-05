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
}
