/**
 * Type-safe state manager for panel instances
 *
 * Manages two types of state:
 * 1. Instance State (TInstance): Volatile state tied to a specific panel instance
 *    - Example: Which environment this specific tab is viewing
 *    - Stored in-memory, cleared when panel closes
 *
 * 2. Environment Preferences (TPreferences): Persistent preferences per environment
 *    - Example: Filters, sort order, split ratio for a specific environment
 *    - Persists across sessions, tied to environment not panel instance
 *
 * Design Principles:
 * - Type Safety: Generic types provide compile-time checking
 * - Automatic Sync: State saves automatically without manual panel intervention
 * - Interface Segregation: Focused interface with only what panels need
 * - Dependency Inversion: Depends on IStateRepository abstraction
 */
export interface IPanelStateManager<TInstance, TPreferences> {
    /**
     * Get the current instance state
     * Instance state is volatile - cleared when panel closes
     */
    getInstanceState(): Promise<TInstance | null>;

    /**
     * Set the instance state
     * Automatically saves to repository
     */
    setInstanceState(state: TInstance): Promise<void>;

    /**
     * Get preferences for a specific environment
     * Preferences persist across sessions
     */
    getPreferences(environmentId: string): Promise<TPreferences | null>;

    /**
     * Set preferences for a specific environment
     * Automatically saves to repository
     */
    setPreferences(environmentId: string, preferences: TPreferences): Promise<void>;

    /**
     * Get the currently active environment ID
     * Returns null if no environment is selected
     */
    readonly currentEnvironmentId: string | null;

    /**
     * Switch to a different environment
     * Automatically:
     * - Saves current environment's preferences
     * - Loads new environment's preferences
     * - Updates instance state
     */
    switchEnvironment(environmentId: string): Promise<void>;

    /**
     * Get the current environment's preferences
     * Convenience method - equivalent to getPreferences(currentEnvironmentId)
     */
    getCurrentPreferences(): Promise<TPreferences | null>;

    /**
     * Update current environment's preferences
     * Convenience method - equivalent to setPreferences(currentEnvironmentId, prefs)
     */
    updateCurrentPreferences(preferences: Partial<TPreferences>): Promise<void>;

    /**
     * Clean up resources and save final state
     * Call when panel is disposed
     */
    dispose(): Promise<void>;
}
