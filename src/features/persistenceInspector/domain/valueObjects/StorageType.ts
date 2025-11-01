/**
 * Value object representing storage type (global or secret)
 */
export class StorageType {
	private constructor(private readonly _value: 'global' | 'secret') {}

	public static create(value: 'global' | 'secret'): StorageType {
		return new StorageType(value);
	}

	public get value(): 'global' | 'secret' {
		return this._value;
	}

	public isGlobal(): boolean {
		return this._value === 'global';
	}

	public isSecret(): boolean {
		return this._value === 'secret';
	}
}
