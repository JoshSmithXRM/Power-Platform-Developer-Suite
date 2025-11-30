import * as vscode from 'vscode';

/**
 * Coordinates publish operations across panels to prevent concurrent publishes
 * to the same environment.
 *
 * Dataverse only allows one publish/import operation per environment at a time.
 * This coordinator:
 * 1. Tracks which environments have active publish operations
 * 2. Notifies all panels when publish state changes
 * 3. Provides timeout safety net (5 minutes) to prevent stuck states
 *
 * Usage:
 * - Panels subscribe via onPublishStateChanged()
 * - Before publishing, check isPublishing() or let PublishBehavior handle it
 * - Wrap publish operations with notifyPublishStarted/notifyPublishCompleted
 */
export class PublishCoordinator {
	/** Environments currently publishing (environmentId -> timeout handle) */
	private static publishingEnvironments = new Map<string, NodeJS.Timeout>();

	/** Listeners for publish state changes */
	private static listeners = new Set<(environmentId: string, isPublishing: boolean) => void>();

	/** Safety timeout: auto-release lock after 5 minutes */
	private static readonly TIMEOUT_MS = 5 * 60 * 1000;

	/**
	 * Checks if an environment currently has an active publish operation.
	 *
	 * @param environmentId - Environment GUID
	 * @returns True if publish is in progress for this environment
	 */
	public static isPublishing(environmentId: string): boolean {
		return this.publishingEnvironments.has(environmentId);
	}

	/**
	 * Notifies the coordinator that a publish operation has started.
	 * All registered listeners will be notified.
	 * A safety timeout will auto-release the lock after 5 minutes.
	 *
	 * @param environmentId - Environment GUID where publish is starting
	 */
	public static notifyPublishStarted(environmentId: string): void {
		// Clear any existing timeout for this environment
		const existingTimeout = this.publishingEnvironments.get(environmentId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Set new timeout as safety net
		const timeout = setTimeout(() => {
			if (this.publishingEnvironments.has(environmentId)) {
				this.notifyPublishCompleted(environmentId);
			}
		}, this.TIMEOUT_MS);

		this.publishingEnvironments.set(environmentId, timeout);
		this.notifyListeners(environmentId, true);
	}

	/**
	 * Notifies the coordinator that a publish operation has completed.
	 * All registered listeners will be notified.
	 *
	 * @param environmentId - Environment GUID where publish completed
	 */
	public static notifyPublishCompleted(environmentId: string): void {
		const timeout = this.publishingEnvironments.get(environmentId);
		if (timeout) {
			clearTimeout(timeout);
		}
		this.publishingEnvironments.delete(environmentId);
		this.notifyListeners(environmentId, false);
	}

	/**
	 * Subscribes to publish state changes.
	 * Listener is called with (environmentId, isPublishing) when state changes.
	 *
	 * @param listener - Callback function for state changes
	 * @returns Disposable to unsubscribe
	 */
	public static onPublishStateChanged(
		listener: (environmentId: string, isPublishing: boolean) => void
	): vscode.Disposable {
		this.listeners.add(listener);
		return new vscode.Disposable(() => {
			this.listeners.delete(listener);
		});
	}

	/**
	 * Notifies all registered listeners of a state change.
	 */
	private static notifyListeners(environmentId: string, isPublishing: boolean): void {
		for (const listener of this.listeners) {
			try {
				listener(environmentId, isPublishing);
			} catch {
				// Don't let one listener's error affect others
				// Errors here are swallowed to protect other listeners
			}
		}
	}

	/**
	 * Clears all state. For testing purposes only.
	 */
	public static reset(): void {
		for (const timeout of this.publishingEnvironments.values()) {
			clearTimeout(timeout);
		}
		this.publishingEnvironments.clear();
		this.listeners.clear();
	}
}
