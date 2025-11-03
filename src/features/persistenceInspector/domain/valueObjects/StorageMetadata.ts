import { DataType } from './DataType';

/**
 * Value object containing metadata about a storage value.
 *
 * Provides descriptive information about storage values without exposing
 * the actual value (important for secrets).
 *
 * Metadata:
 * - dataType: JavaScript type (string, number, object, etc.)
 * - sizeInBytes: Approximate storage size (for monitoring)
 * - isSecret: Whether value is from SecretStorage
 *
 * Separates value metadata from value itself. Allows displaying
 * information about secrets without revealing their contents.
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
	 * Calculates approximate storage size in bytes.
	 *
	 * Provides visibility into storage usage for monitoring and debugging.
	 * Uses JSON serialization size as approximation.
	 *
	 * @param {unknown} value - Value to calculate size for
	 * @returns {number} Approximate size in bytes
	 * @private
	 */
	private static calculateSize(value: unknown): number {
		const json = JSON.stringify(value);
		return new Blob([json]).size;
	}
}
