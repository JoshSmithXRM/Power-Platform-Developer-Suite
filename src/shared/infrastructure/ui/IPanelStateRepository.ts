/**
 * Key for identifying panel state by panel type and environment
 */
export interface PanelStateKey {
	panelType: string;
	environmentId: string;
}

/**
 * Panel state data that is persisted.
 *
 * Design Note: This interface supports partial updates where behaviors can
 * save specific properties without providing all fields. The repository
 * merges partial updates with existing state automatically.
 *
 * Core fields (selectedSolutionId, lastUpdated) are optional to support
 * partial state updates. They are typically set during initial panel load
 * and preserved through subsequent partial updates.
 *
 * The index signature allows panels to store additional custom properties
 * beyond the defined fields, enabling extensibility without interface changes.
 */
export interface PanelState {
	selectedSolutionId?: string; // Solution filter selection (optional for partial updates)
	lastUpdated?: string; // Last update timestamp (optional for partial updates)
	filterCriteria?: unknown; // Must be JSON-serializable (enforced by VS Code workspace storage)
	detailPanelWidth?: number; // Optional detail panel width in pixels
	autoRefreshInterval?: number; // Optional auto-refresh interval in milliseconds
	[key: string]: unknown; // Must be JSON-serializable (enforced by VS Code workspace storage)
}

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
