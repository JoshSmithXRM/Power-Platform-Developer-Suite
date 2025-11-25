import { IPanelTrackingBehavior } from './IPanelTrackingBehavior';

/**
 * Implementation: Panel Tracking
 * Manages static panel map for tracking panel instances by environment ID.
 */
export class PanelTrackingBehavior<T> implements IPanelTrackingBehavior {
	constructor(
		private readonly panelMap: Map<string, T>
	) {}

	/**
	 * Registers a panel instance for the specified environment.
	 *
	 * Allows panel singleton tracking per environment to support "reveal existing
	 * panel" behavior instead of creating duplicates.
	 */
	public registerPanel(environmentId: string, panel: unknown): void {
		this.panelMap.set(environmentId, panel as T);
	}

	/**
	 * Unregisters a panel instance for the specified environment.
	 *
	 * Called when the panel is disposed to remove it from the tracking map.
	 */
	public unregisterPanel(environmentId: string): void {
		this.panelMap.delete(environmentId);
	}

	/**
	 * Retrieves the panel instance for the specified environment.
	 *
	 * Returns undefined if no panel exists for the environment.
	 */
	public getPanel(environmentId: string): T | undefined {
		return this.panelMap.get(environmentId);
	}

	/**
	 * Disposes the behavior.
	 *
	 * No resources to clean up as the map is managed by the caller.
	 */
	public dispose(): void {
		// Map cleanup handled by caller - no resources to dispose
	}
}
