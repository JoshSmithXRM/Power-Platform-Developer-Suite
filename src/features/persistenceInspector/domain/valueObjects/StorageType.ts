/**
 * Value object representing VS Code storage type.
 *
 * VS Code provides two storage mechanisms:
 * - Global: WorkspaceState/GlobalState (plain text, visible in storage inspector)
 * - Secret: SecretStorage (encrypted, credentials/sensitive data)
 *
 * WHY: Type-safe enumeration of storage types. Prevents invalid storage
 * type strings and provides query methods.
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
