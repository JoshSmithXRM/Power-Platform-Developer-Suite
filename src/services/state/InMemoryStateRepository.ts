import { IStateRepository } from './IStateRepository';

/**
 * Volatile in-memory state repository
 *
 * Purpose: Store transient state that should not persist across extension reloads.
 * Use cases:
 * - Per-instance panel state (which environment a specific tab is viewing)
 * - Runtime-only state that should be cleared when extension deactivates
 *
 * Lifecycle: Data is lost when extension reloads or VS Code restarts.
 *
 * Design Principles:
 * - Single Responsibility: Only manages in-memory storage
 * - Simple: Uses native Map for storage
 */
export class InMemoryStateRepository implements IStateRepository {
    private storage = new Map<string, unknown>();

    async get<T>(key: string): Promise<T | null> {
        const value = this.storage.get(key);
        return value !== undefined ? (value as T) : null;
    }

    async set<T>(key: string, value: T): Promise<void> {
        this.storage.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async keys(): Promise<string[]> {
        return Array.from(this.storage.keys());
    }

    async clearWithPrefix(prefix: string): Promise<void> {
        const keysToDelete = Array.from(this.storage.keys()).filter(key => key.startsWith(prefix));
        for (const key of keysToDelete) {
            this.storage.delete(key);
        }
    }

    /**
     * Clear all stored data
     * Useful for testing or extension deactivation
     */
    clear(): void {
        this.storage.clear();
    }

    /**
     * Get current size (for debugging/testing)
     */
    size(): number {
        return this.storage.size;
    }
}
