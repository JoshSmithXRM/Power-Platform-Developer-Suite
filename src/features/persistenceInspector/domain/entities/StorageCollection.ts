import { ClearAllValidationResult } from '../valueObjects/ClearAllValidationResult';
import { ClearValidationResult } from '../valueObjects/ClearValidationResult';
import { ProtectedKeyPattern } from '../valueObjects/ProtectedKeyPattern';

import { StorageEntry } from './StorageEntry';

/**
 * Aggregate root managing a collection of storage entries.
 * Enforces business rules for clearing operations and protected key patterns.
 *
 * This is an aggregate root in DDD terms - it controls access to StorageEntry
 * entities and enforces consistency boundaries for the storage collection.
 *
 * Responsibilities:
 * - Manage collection of storage entries
 * - Apply protected key patterns to determine clearability
 * - Validate clear operations before execution
 * - Calculate aggregate metrics (total size, counts)
 * - Filter entries by type, protection status, etc.
 *
 * Business Rules:
 * - Protected keys cannot be cleared (environments, critical data)
 * - Protected patterns are regex-based for flexibility
 * - Clear all operations skip protected entries
 * - Secret entries require special handling
 *
 * WHY Aggregate Root: Ensures that clearing operations are validated
 * consistently across the entire collection, preventing accidental deletion
 * of critical data.
 *
 * @example
 * ```typescript
 * const collection = StorageCollection.create(
 *   entries,
 *   ['power-platform-dev-suite-environments']
 * );
 * const validation = collection.validateClearOperation(key);
 * if (validation.isAllowed) {
 *   // Safe to clear
 * }
 * ```
 */
export class StorageCollection {
	private constructor(
		private readonly _entries: Map<string, StorageEntry>,
		private readonly _protectedKeyPatterns: ProtectedKeyPattern[]
	) {}

	/**
	 * Factory method to create a StorageCollection.
	 *
	 * WHY: Converts arrays to appropriate internal data structures (Map for O(1) lookup)
	 * and wraps protected patterns in value objects.
	 *
	 * @param {StorageEntry[]} entries - Array of storage entries
	 * @param {string[]} protectedPatterns - Array of protected key patterns (regex)
	 * @returns {StorageCollection} New storage collection instance
	 */
	public static create(
		entries: StorageEntry[],
		protectedPatterns: string[]
	): StorageCollection {
		const entryMap = new Map<string, StorageEntry>();
		entries.forEach(entry => entryMap.set(entry.key, entry));

		return new StorageCollection(
			entryMap,
			protectedPatterns.map(p => ProtectedKeyPattern.create(p))
		);
	}

	/**
	 * Gets all storage entries in the collection.
	 *
	 * @returns {ReadonlyArray<StorageEntry>} Readonly array of all entries
	 */
	public getAllEntries(): ReadonlyArray<StorageEntry> {
		return Array.from(this._entries.values());
	}

	/**
	 * Gets a specific entry by key.
	 *
	 * @param {string} key - Storage key to lookup
	 * @returns {StorageEntry | undefined} Entry if found, undefined otherwise
	 */
	public getEntry(key: string): StorageEntry | undefined {
		return this._entries.get(key);
	}

	/**
	 * Filters entries by storage type.
	 *
	 * @param {'global' | 'secret'} storageType - Type to filter by
	 * @returns {ReadonlyArray<StorageEntry>} Entries matching the type
	 */
	public getEntriesByType(storageType: 'global' | 'secret'): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.storageType === storageType);
	}

	/**
	 * Gets all entries that can be cleared (non-protected).
	 *
	 * @returns {ReadonlyArray<StorageEntry>} Clearable entries
	 */
	public getClearableEntries(): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.canBeCleared());
	}

	/**
	 * Gets all protected entries that cannot be cleared.
	 *
	 * @returns {ReadonlyArray<StorageEntry>} Protected entries
	 */
	public getProtectedEntries(): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.isProtected());
	}

	/**
	 * Calculates total storage size across all entries.
	 *
	 * WHY: Provides aggregate metric for storage usage monitoring.
	 *
	 * @returns {number} Total size in bytes
	 */
	public getTotalSize(): number {
		return this.getAllEntries().reduce(
			(sum, entry) => sum + entry.metadata.sizeInBytes,
			0
		);
	}

	/**
	 * Checks if a key matches any protected key patterns.
	 *
	 * WHY: Protected patterns use regex for flexible matching beyond
	 * exact key comparison. Allows protecting entire key families
	 * (e.g., 'power-platform-dev-suite-*').
	 *
	 * @param {string} key - Storage key to check
	 * @returns {boolean} True if key matches a protected pattern
	 */
	public isKeyProtected(key: string): boolean {
		return this._protectedKeyPatterns.some(pattern => pattern.matches(key));
	}

	/**
	 * Validates a clear operation for a specific storage key.
	 *
	 * Business Rules:
	 * - Entry must exist
	 * - Entry must not be protected
	 *
	 * Returns result object indicating if operation is allowed and why.
	 *
	 * @param {string} key - Storage key to validate
	 * @returns {ClearValidationResult} Validation result with reason
	 */
	public validateClearOperation(key: string): ClearValidationResult {
		const entry = this.getEntry(key);
		if (!entry) {
			return ClearValidationResult.notFound(key);
		}

		if (entry.isProtected()) {
			return ClearValidationResult.protected(key);
		}

		return ClearValidationResult.allowed(key);
	}

	/**
	 * Validates a clear all operation.
	 *
	 * Business Rules:
	 * - Protected entries are skipped (not cleared)
	 * - Must have at least one clearable entry
	 *
	 * Returns counts for user confirmation message.
	 *
	 * @returns {ClearAllValidationResult} Validation result with counts
	 */
	public validateClearAllOperation(): ClearAllValidationResult {
		const protectedEntries = this.getProtectedEntries();
		const clearableEntries = this.getClearableEntries();

		return ClearAllValidationResult.create(
			clearableEntries.length,
			protectedEntries.length
		);
	}
}
