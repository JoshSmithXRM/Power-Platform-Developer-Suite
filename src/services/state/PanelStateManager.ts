import { IStateRepository } from './IStateRepository';
import { IPanelStateManager } from './IPanelStateManager';

/**
 * Concrete implementation of panel state manager
 *
 * Handles automatic state persistence with two-tier storage:
 * 1. Instance state (volatile) → InMemoryStateRepository
 * 2. Environment preferences (persistent) → VSCodeStateRepository
 *
 * Key Features:
 * - Automatic save on environment switch
 * - Automatic save on dispose
 * - Type-safe state access
 * - No manual save calls needed from panels
 *
 * Design Principles:
 * - Single Responsibility: Only manages state lifecycle
 * - Automatic Sync: Panels don't need to remember to save
 * - Type Safety: Generics provide compile-time checking
 */
export class PanelStateManager<TInstance, TPreferences> implements IPanelStateManager<TInstance, TPreferences> {
    private _currentEnvironmentId: string | null = null;
    private _currentPreferences: TPreferences | null = null;

    constructor(
        private readonly panelId: string,
        private readonly panelType: string,
        private readonly instanceRepository: IStateRepository,
        private readonly preferencesRepository: IStateRepository
    ) {}

    // ============================================================================
    // Instance State (Volatile)
    // ============================================================================

    async getInstanceState(): Promise<TInstance | null> {
        const key = this.getInstanceKey();
        return this.instanceRepository.get<TInstance>(key);
    }

    async setInstanceState(state: TInstance): Promise<void> {
        const key = this.getInstanceKey();
        await this.instanceRepository.set(key, state);
    }

    // ============================================================================
    // Environment Preferences (Persistent)
    // ============================================================================

    async getPreferences(environmentId: string): Promise<TPreferences | null> {
        const key = this.getPreferencesKey(environmentId);
        return this.preferencesRepository.get<TPreferences>(key);
    }

    async setPreferences(environmentId: string, preferences: TPreferences): Promise<void> {
        const key = this.getPreferencesKey(environmentId);
        await this.preferencesRepository.set(key, preferences);

        // Update cached preferences if this is the current environment
        if (environmentId === this._currentEnvironmentId) {
            this._currentPreferences = preferences;
        }
    }

    // ============================================================================
    // Current Environment Tracking
    // ============================================================================

    get currentEnvironmentId(): string | null {
        return this._currentEnvironmentId;
    }

    async switchEnvironment(environmentId: string): Promise<void> {
        // Save current environment's preferences before switching
        if (this._currentEnvironmentId && this._currentPreferences) {
            await this.setPreferences(this._currentEnvironmentId, this._currentPreferences);
        }

        // Update to new environment
        this._currentEnvironmentId = environmentId;

        // Load new environment's preferences
        this._currentPreferences = await this.getPreferences(environmentId);

        // Update instance state to track current environment
        await this.setInstanceState({ selectedEnvironmentId: environmentId } as TInstance);
    }

    // ============================================================================
    // Convenience Methods
    // ============================================================================

    async getCurrentPreferences(): Promise<TPreferences | null> {
        if (!this._currentEnvironmentId) {
            return null;
        }

        // Return cached preferences if available
        if (this._currentPreferences) {
            return this._currentPreferences;
        }

        // Otherwise load from repository
        this._currentPreferences = await this.getPreferences(this._currentEnvironmentId);
        return this._currentPreferences;
    }

    async updateCurrentPreferences(partialPreferences: Partial<TPreferences>): Promise<void> {
        if (!this._currentEnvironmentId) {
            throw new Error('Cannot update preferences: no environment selected');
        }

        // Get current preferences
        const currentPrefs = await this.getCurrentPreferences() || {} as TPreferences;

        // Merge with partial update
        const updatedPrefs = { ...currentPrefs, ...partialPreferences };

        // Save merged preferences
        await this.setPreferences(this._currentEnvironmentId, updatedPrefs);
    }

    // ============================================================================
    // Lifecycle Management
    // ============================================================================

    async dispose(): Promise<void> {
        // Save final preferences state before cleanup
        if (this._currentEnvironmentId && this._currentPreferences) {
            await this.setPreferences(this._currentEnvironmentId, this._currentPreferences);
        }

        // Clear instance state (volatile - should not persist after panel closes)
        const instanceKey = this.getInstanceKey();
        await this.instanceRepository.delete(instanceKey);

        // Clear cached state
        this._currentEnvironmentId = null;
        this._currentPreferences = null;
    }

    // ============================================================================
    // Key Generation (Private)
    // ============================================================================

    private getInstanceKey(): string {
        return `instance:${this.panelId}`;
    }

    private getPreferencesKey(environmentId: string): string {
        return `prefs:${this.panelType}:${environmentId}`;
    }
}
