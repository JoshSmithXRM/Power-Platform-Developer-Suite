/**
 * Low-level storage abstraction for state persistence
 *
 * Provides a clean interface for storing and retrieving typed state data.
 * Implementations can use different storage backends (in-memory, VS Code GlobalState, etc.)
 *
 * Design Principles:
 * - Single Responsibility: Only handles storage operations
 * - Dependency Inversion: Consumers depend on this interface, not concrete implementations
 * - Open/Closed: Can add new storage backends without changing consumers
 */
export interface IStateRepository {
    /**
     * Retrieve a value by key
     * @param key Storage key
     * @returns Stored value or null if not found
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Store a value by key
     * @param key Storage key
     * @param value Value to store
     */
    set<T>(key: string, value: T): Promise<void>;

    /**
     * Delete a value by key
     * @param key Storage key
     */
    delete(key: string): Promise<void>;

    /**
     * Get all storage keys
     * @returns Array of all keys in storage
     */
    keys(): Promise<string[]>;

    /**
     * Clear all keys matching a prefix
     * @param prefix Key prefix to match
     */
    clearWithPrefix(prefix: string): Promise<void>;
}
