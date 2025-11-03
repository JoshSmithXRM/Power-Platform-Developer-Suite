/**
 * Key for identifying panel state by panel type and environment
 */
export type PanelStateKey = {
	panelType: string;
	environmentId: string;
};

/**
 * Panel state data that is persisted
 */
export type PanelState = {
	selectedSolutionId: string | null;
	lastUpdated: string;
};

/**
 * Repository interface for persisting and retrieving panel state.
 * Used for storing UI preferences like solution filter selections per environment.
 */
export interface IPanelStateRepository {
	/**
	 * Load persisted state for a specific panel and environment
	 */
	load(key: PanelStateKey): Promise<PanelState | null>;

	/**
	 * Save state for a specific panel and environment
	 */
	save(key: PanelStateKey, state: PanelState): Promise<void>;

	/**
	 * Clear state for a specific panel and environment
	 */
	clear(key: PanelStateKey): Promise<void>;

	/**
	 * Clear all state for a specific panel type across all environments
	 */
	clearAll(panelType: string): Promise<void>;
}
