import { DataType } from './DataType';

/**
 * Value object containing metadata about a storage value
 */
export class StorageMetadata {
	private constructor(
		private readonly _dataType: string,
		private readonly _sizeInBytes: number,
		private readonly _isSecret: boolean
	) {}

	public static fromValue(value: unknown): StorageMetadata {
		const dataType = DataType.fromValue(value);
		const sizeInBytes = StorageMetadata.calculateSize(value);

		return new StorageMetadata(dataType.value, sizeInBytes, false);
	}

	public static forSecret(): StorageMetadata {
		return new StorageMetadata('secret', 0, true);
	}

	public get dataType(): string {
		return this._dataType;
	}

	public get sizeInBytes(): number {
		return this._sizeInBytes;
	}

	public get isSecret(): boolean {
		return this._isSecret;
	}

	/**
	 * Calculates approximate storage size in bytes
	 */
	private static calculateSize(value: unknown): number {
		const json = JSON.stringify(value);
		return new Blob([json]).size;
	}
}
