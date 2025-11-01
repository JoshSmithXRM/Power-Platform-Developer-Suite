import { ClearAllValidationResult } from '../valueObjects/ClearAllValidationResult';
import { ClearValidationResult } from '../valueObjects/ClearValidationResult';
import { ProtectedKeyPattern } from '../valueObjects/ProtectedKeyPattern';

import { StorageEntry } from './StorageEntry';

/**
 * Aggregate root managing a collection of storage entries
 * Enforces business rules for clearing operations
 */
export class StorageCollection {
	private constructor(
		private readonly _entries: Map<string, StorageEntry>,
		private readonly _protectedKeyPatterns: ProtectedKeyPattern[]
	) {}

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

	public getAllEntries(): ReadonlyArray<StorageEntry> {
		return Array.from(this._entries.values());
	}

	public getEntry(key: string): StorageEntry | undefined {
		return this._entries.get(key);
	}

	public getEntriesByType(storageType: 'global' | 'secret'): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.storageType === storageType);
	}

	public getClearableEntries(): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.canBeCleared());
	}

	public getProtectedEntries(): ReadonlyArray<StorageEntry> {
		return this.getAllEntries().filter(e => e.isProtected());
	}

	/**
	 * Business logic: Calculates total storage size
	 */
	public getTotalSize(): number {
		return this.getAllEntries().reduce(
			(sum, entry) => sum + entry.metadata.sizeInBytes,
			0
		);
	}

	/**
	 * Business logic: Checks if a key matches protected patterns
	 */
	public isKeyProtected(key: string): boolean {
		return this._protectedKeyPatterns.some(pattern => pattern.matches(key));
	}

	/**
	 * Business logic: Validates a clear operation for a specific key
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
	 * Business logic: Validates a clear all operation
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
