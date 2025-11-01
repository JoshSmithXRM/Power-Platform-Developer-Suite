/**
 * Value object representing a storage key
 */
export class StorageKey {
	private constructor(private readonly _value: string) {
		if (!_value || _value.trim().length === 0) {
			throw new Error('Storage key cannot be empty');
		}
	}

	public static create(value: string): StorageKey {
		return new StorageKey(value);
	}

	public get value(): string {
		return this._value;
	}

	/**
	 * Checks if this is the protected environments key
	 */
	public isProtectedEnvironmentsKey(): boolean {
		return this._value === 'power-platform-dev-suite-environments';
	}

	/**
	 * Detects legacy keys from pre-refactor codebase
	 */
	public isLegacyKey(): boolean {
		return this._value.startsWith('power-platform-') &&
			!this._value.startsWith('power-platform-dev-suite-');
	}

	public equals(other: StorageKey): boolean {
		return this._value === other._value;
	}
}
