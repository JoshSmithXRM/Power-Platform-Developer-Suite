/**
 * Value object representing VS Code storage type.
 *
 * VS Code provides three storage mechanisms:
 * - Global: GlobalState (plain text, persists across workspaces)
 * - Workspace: WorkspaceState (plain text, workspace-specific like panel preferences)
 * - Secret: SecretStorage (encrypted, credentials/sensitive data)
 *
 * Type-safe enumeration of storage types. Prevents invalid storage type strings
 * and provides query methods. Constants provide single source of truth.
 */
export class StorageType {
	/** Global storage type constant - single source of truth */
	public static readonly GLOBAL = 'global' as const;

	/** Workspace storage type constant - single source of truth */
	public static readonly WORKSPACE = 'workspace' as const;

	/** Secret storage type constant - single source of truth */
	public static readonly SECRET = 'secret' as const;

	private constructor(private readonly _value: 'global' | 'workspace' | 'secret') {}

	public static create(value: 'global' | 'workspace' | 'secret'): StorageType {
		return new StorageType(value);
	}

	/** Factory method for global storage type */
	public static createGlobal(): StorageType {
		return new StorageType(StorageType.GLOBAL);
	}

	/** Factory method for workspace storage type */
	public static createWorkspace(): StorageType {
		return new StorageType(StorageType.WORKSPACE);
	}

	/** Factory method for secret storage type */
	public static createSecret(): StorageType {
		return new StorageType(StorageType.SECRET);
	}

	public get value(): 'global' | 'workspace' | 'secret' {
		return this._value;
	}

	public isGlobal(): boolean {
		return this._value === StorageType.GLOBAL;
	}

	public isWorkspace(): boolean {
		return this._value === StorageType.WORKSPACE;
	}

	public isSecret(): boolean {
		return this._value === StorageType.SECRET;
	}
}

/** Type alias for storage type literal values */
export type StorageTypeValue = typeof StorageType.GLOBAL | typeof StorageType.WORKSPACE | typeof StorageType.SECRET;
