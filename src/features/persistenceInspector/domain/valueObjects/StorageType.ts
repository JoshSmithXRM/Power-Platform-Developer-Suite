/**
 * Value object representing VS Code storage type.
 *
 * VS Code provides two storage mechanisms:
 * - Global: WorkspaceState/GlobalState (plain text, visible in storage inspector)
 * - Secret: SecretStorage (encrypted, credentials/sensitive data)
 *
 * Type-safe enumeration of storage types. Prevents invalid storage type strings
 * and provides query methods. Constants provide single source of truth.
 */
export class StorageType {
	/** Global storage type constant - single source of truth */
	public static readonly GLOBAL = 'global' as const;

	/** Secret storage type constant - single source of truth */
	public static readonly SECRET = 'secret' as const;

	private constructor(private readonly _value: 'global' | 'secret') {}

	public static create(value: 'global' | 'secret'): StorageType {
		return new StorageType(value);
	}

	/** Factory method for global storage type */
	public static createGlobal(): StorageType {
		return new StorageType(StorageType.GLOBAL);
	}

	/** Factory method for secret storage type */
	public static createSecret(): StorageType {
		return new StorageType(StorageType.SECRET);
	}

	public get value(): 'global' | 'secret' {
		return this._value;
	}

	public isGlobal(): boolean {
		return this._value === StorageType.GLOBAL;
	}

	public isSecret(): boolean {
		return this._value === StorageType.SECRET;
	}
}

/** Type alias for storage type literal values */
export type StorageTypeValue = typeof StorageType.GLOBAL | typeof StorageType.SECRET;
