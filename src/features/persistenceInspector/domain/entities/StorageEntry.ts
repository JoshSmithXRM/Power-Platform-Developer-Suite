import { StorageKey } from '../valueObjects/StorageKey';
import { StorageValue } from '../valueObjects/StorageValue';
import { StorageType } from '../valueObjects/StorageType';
import { StorageMetadata } from '../valueObjects/StorageMetadata';

/**
 * Domain entity representing a single storage entry
 * Rich model with behavior, not anemic
 */
export class StorageEntry {
	private constructor(
		private readonly _key: StorageKey,
		private readonly _value: StorageValue,
		private readonly _storageType: StorageType
	) {}

	public static create(
		key: string,
		value: unknown,
		storageType: 'global' | 'secret'
	): StorageEntry {
		return new StorageEntry(
			StorageKey.create(key),
			storageType === 'secret' ? StorageValue.createSecret() : StorageValue.create(value),
			StorageType.create(storageType)
		);
	}

	public get key(): string {
		return this._key.value;
	}

	public get value(): unknown {
		return this._value.value;
	}

	public get storageType(): string {
		return this._storageType.value;
	}

	public get metadata(): StorageMetadata {
		return this._value.metadata;
	}

	/**
	 * Business logic: Determines if this entry is protected
	 */
	public isProtected(): boolean {
		return this._key.isProtectedEnvironmentsKey();
	}

	public isSecret(): boolean {
		return this._storageType.isSecret();
	}

	/**
	 * Business logic: Determines if this entry can be cleared
	 */
	public canBeCleared(): boolean {
		return !this.isProtected();
	}

	public getPropertyAtPath(path: string[]): unknown {
		return this._value.getPropertyAtPath(path);
	}

	public hasProperty(path: string[]): boolean {
		return this._value.hasProperty(path);
	}
}
