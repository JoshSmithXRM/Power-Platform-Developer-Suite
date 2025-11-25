import { StorageMetadata } from './StorageMetadata';

/**
 * Value object representing a storage value with metadata
 */
export class StorageValue {
	private constructor(
		private readonly _value: unknown,
		private readonly _metadata: StorageMetadata
	) {}

	public static create(value: unknown): StorageValue {
		return new StorageValue(
			value,
			StorageMetadata.fromValue(value)
		);
	}

	public static createSecret(): StorageValue {
		return new StorageValue(
			'***',
			StorageMetadata.forSecret()
		);
	}

	public get value(): unknown {
		return this._value;
	}

	public get metadata(): StorageMetadata {
		return this._metadata;
	}

	public isObject(): boolean {
		return this._metadata.dataType === 'object';
	}

	public isArray(): boolean {
		return this._metadata.dataType === 'array';
	}

	public isSecret(): boolean {
		return this._metadata.isSecret;
	}

	/**
	 * Retrieves property at specified path (e.g., ['environments', '0', 'name'])
	 */
	public getPropertyAtPath(path: string[]): unknown {
		if (path.length === 0) {
			return this._value;
		}

		let current = this._value;
		for (const segment of path) {
			if (current === null || current === undefined) {
				return undefined;
			}

			if (typeof current === 'object') {
				current = (current as Record<string, unknown>)[segment];
			} else {
				return undefined;
			}
		}

		return current;
	}

	/**
	 * Checks if property exists at specified path
	 */
	public hasProperty(path: string[]): boolean {
		return this.getPropertyAtPath(path) !== undefined;
	}
}
