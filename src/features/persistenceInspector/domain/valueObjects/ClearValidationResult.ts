/**
 * Value object representing the result of validating a clear operation
 */
export class ClearValidationResult {
	private constructor(
		private readonly _isAllowed: boolean,
		private readonly _reason: string,
		private readonly _key: string
	) {}

	public static allowed(key: string): ClearValidationResult {
		return new ClearValidationResult(true, '', key);
	}

	public static protected(key: string): ClearValidationResult {
		return new ClearValidationResult(
			false,
			'This key is protected and cannot be cleared',
			key
		);
	}

	public static notFound(key: string): ClearValidationResult {
		return new ClearValidationResult(
			false,
			'Key not found in storage',
			key
		);
	}

	public get isAllowed(): boolean {
		return this._isAllowed;
	}

	public get reason(): string {
		return this._reason;
	}

	public get key(): string {
		return this._key;
	}
}
