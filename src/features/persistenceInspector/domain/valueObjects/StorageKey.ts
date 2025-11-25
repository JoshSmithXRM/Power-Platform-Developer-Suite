import { DomainError } from '../../../environmentSetup/domain/errors/DomainError';

/**
 * Value object representing a storage key in VS Code storage.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Business Rules:
 * - Cannot be empty
 * - Immutable once created
 * - Provides detection for protected and legacy keys
 *
 * Key Patterns:
 * - Current: `power-platform-dev-suite-*`
 * - Legacy: `power-platform-*` (pre-refactor)
 * - Protected: `power-platform-dev-suite-environments` (critical data)
 *
 * @throws {DomainError} If key is empty
 */
export class StorageKey {
	private constructor(private readonly _value: string) {
		if (!_value || _value.trim().length === 0) {
			throw new DomainError('Storage key cannot be empty');
		}
	}

	public static create(value: string): StorageKey {
		return new StorageKey(value);
	}

	public get value(): string {
		return this._value;
	}

	/**
	 * Checks if this is the protected environments key.
	 *
	 * Environment configurations are critical extension data that must be protected
	 * from accidental deletion. This is the only hardcoded protected key.
	 *
	 * @returns {boolean} True if this is the environments key
	 */
	public isProtectedEnvironmentsKey(): boolean {
		return this._value === 'power-platform-dev-suite-environments';
	}

	/**
	 * Detects legacy keys from pre-refactor codebase.
	 *
	 * Codebase was refactored to use `power-platform-dev-suite-` prefix.
	 * Legacy keys with old prefix may exist in user storage and should be
	 * flagged for migration or cleanup.
	 *
	 * @returns {boolean} True if key uses legacy prefix
	 */
	public isLegacyKey(): boolean {
		return this._value.startsWith('power-platform-') &&
			!this._value.startsWith('power-platform-dev-suite-');
	}

	public equals(other: StorageKey): boolean {
		return this._value === other._value;
	}
}
