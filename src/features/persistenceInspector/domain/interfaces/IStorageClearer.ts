import { PropertyPath } from '../valueObjects/PropertyPath';
import { ClearAllResult } from '../results/ClearAllResult';

/**
 * Domain interface for clearing VS Code storage.
 *
 * Clean Architecture Principle: Domain defines the interface, infrastructure implements it.
 * This inverts the dependency: domain does NOT depend on VS Code APIs.
 *
 * WHY Interface in Domain: Allows domain services to perform storage operations
 * without coupling to VS Code storage APIs. Infrastructure layer implements this
 * contract using actual VS Code storage.
 *
 * Responsibilities:
 * - Clear individual keys (global or secret)
 * - Clear nested properties within complex values
 * - Clear all non-protected entries (bulk operation)
 */
export interface IStorageClearer {
	/**
	 * Clears a specific key from global state.
	 *
	 * @param {string} key - Global state key to clear
	 */
	clearGlobalStateKey(key: string): Promise<void>;

	/**
	 * Clears a specific key from secret storage.
	 *
	 * @param {string} key - Secret storage key to clear
	 */
	clearSecretKey(key: string): Promise<void>;

	/**
	 * Clears a specific property within a global state entry.
	 *
	 * Allows fine-grained clearing without removing entire entry.
	 * Example: Remove one environment from array without clearing all environments.
	 *
	 * @param {string} key - Global state key containing the property
	 * @param {PropertyPath} path - Path to property within the value
	 */
	clearGlobalStateProperty(key: string, path: PropertyPath): Promise<void>;

	/**
	 * Clears all non-protected entries from both storage types.
	 *
	 * Provides "nuclear option" for clearing extension storage while
	 * protecting critical data.
	 *
	 * @param {string[]} protectedKeys - Array of protected key patterns
	 * @returns {Promise<ClearAllResult>} Result with cleared/skipped counts
	 */
	clearAllNonProtected(protectedKeys: string[]): Promise<ClearAllResult>;
}
