/**
 * Coordinator: Orchestrates data table panel lifecycle.
 * Initializes behaviors in correct order and handles panel lifecycle events.
 */
export interface IDataTablePanelCoordinator {
	/**
	 * Initializes all behaviors and loads initial data.
	 */
	initialize(): Promise<void>;

	/**
	 * Cleans up all behaviors and resources.
	 */
	dispose(): void;
}
