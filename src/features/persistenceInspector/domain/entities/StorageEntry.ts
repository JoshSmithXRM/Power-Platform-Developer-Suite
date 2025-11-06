import { StorageKey } from '../valueObjects/StorageKey';
import { StorageValue } from '../valueObjects/StorageValue';
import { StorageType, StorageTypeValue } from '../valueObjects/StorageType';
import { StorageMetadata } from '../valueObjects/StorageMetadata';

/**
 * Domain entity representing a single storage entry in VS Code storage.
 * Encapsulates storage data and business rules for storage operations.
 *
 * This is a rich domain model (not anemic) - it contains behavior and enforces
 * business invariants related to storage entries.
 *
 * Responsibilities:
 * - Determine if entry is protected from clearing
 * - Determine if entry is a secret
 * - Provide access to nested properties within complex values
 * - Enforce immutability (value objects pattern)
 *
 * Business Rules:
 * - Protected keys cannot be cleared (e.g., 'power-platform-dev-suite-environments')
 * - Secret values are hidden by default (show '***')
 * - Storage entries are immutable once created
 *
 * @example
 * ```typescript
 * const entry = StorageEntry.create(
 *   'power-platform-dev-suite-environments',
 *   { environments: [...] },
 *   'global'
 * );
 * entry.isProtected(); // true
 * entry.canBeCleared(); // false
 * ```
 */
export class StorageEntry {
	private constructor(
		private readonly _key: StorageKey,
		private readonly _value: StorageValue,
		private readonly _storageType: StorageType
	) {}

	/**
	 * Factory method to create a StorageEntry.
	 *
	 * Private constructor enforces creation through factory method,
	 * ensuring all value objects are properly constructed.
	 * Uses StorageTypeValue for type safety and consistency.
	 *
	 * @param {string} key - Storage key
	 * @param {unknown} value - Storage value (hidden if secret)
	 * @param {StorageTypeValue} storageType - Type of storage (use StorageType.GLOBAL or StorageType.SECRET)
	 * @returns {StorageEntry} New storage entry instance
	 */
	public static create(
		key: string,
		value: unknown,
		storageType: StorageTypeValue
	): StorageEntry {
		return new StorageEntry(
			StorageKey.create(key),
			storageType === StorageType.SECRET ? StorageValue.createSecret() : StorageValue.create(value),
			StorageType.create(storageType)
		);
	}

	public get key(): string {
		return this._key.value;
	}

	public get value(): unknown {
		return this._value.value;
	}

	public get storageType(): StorageTypeValue {
		return this._storageType.value;
	}

	public get metadata(): StorageMetadata {
		return this._value.metadata;
	}

	/**
	 * Determines if this entry is protected from clearing.
	 *
	 * Critical extension data (like environment configurations) must be protected
	 * from accidental deletion. Protected keys cannot be cleared through the
	 * Persistence Inspector UI.
	 *
	 * @returns {boolean} True if entry is protected
	 */
	public isProtected(): boolean {
		return this._key.isProtectedEnvironmentsKey();
	}

	/**
	 * Determines if this entry is stored in secret storage.
	 *
	 * @returns {boolean} True if stored in VS Code SecretStorage
	 */
	public isSecret(): boolean {
		return this._storageType.isSecret();
	}

	/**
	 * Determines if this entry is stored in workspace state.
	 *
	 * @returns {boolean} True if stored in VS Code WorkspaceState
	 */
	public isWorkspace(): boolean {
		return this._storageType.isWorkspace();
	}

	/**
	 * Determines if this entry can be cleared.
	 *
	 * Business Rule: Protected entries cannot be cleared.
	 *
	 * @returns {boolean} True if entry can be safely cleared
	 */
	public canBeCleared(): boolean {
		return !this.isProtected();
	}

	/**
	 * Retrieves property value at specified path within the entry value.
	 *
	 * Storage values can be complex objects/arrays. This allows navigation
	 * to nested properties (e.g., ['environments', '0', 'name']).
	 *
	 * @param {string[]} path - Property path segments
	 * @returns {unknown} Property value or undefined if not found
	 */
	public getPropertyAtPath(path: string[]): unknown {
		return this._value.getPropertyAtPath(path);
	}

	/**
	 * Checks if property exists at specified path.
	 *
	 * @param {string[]} path - Property path segments
	 * @returns {boolean} True if property exists
	 */
	public hasProperty(path: string[]): boolean {
		return this._value.hasProperty(path);
	}
}
