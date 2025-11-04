/**
 * Behavior: Panel Tracking
 * Responsibility: Static panel map management
 */
export interface IPanelTrackingBehavior {
	/**
	 * Registers a panel in the tracking map.
	 * @param environmentId - Environment ID key
	 * @param panel - Panel instance
	 */
	registerPanel(environmentId: string, panel: unknown): void;

	/**
	 * Unregisters a panel from the tracking map.
	 * @param environmentId - Environment ID key
	 */
	unregisterPanel(environmentId: string): void;

	/**
	 * Gets a panel from the tracking map.
	 * @param environmentId - Environment ID key
	 * @returns Panel instance or undefined
	 */
	getPanel(environmentId: string): unknown | undefined;

	/**
	 * Disposes resources used by this behavior.
	 */
	dispose(): void;
}
