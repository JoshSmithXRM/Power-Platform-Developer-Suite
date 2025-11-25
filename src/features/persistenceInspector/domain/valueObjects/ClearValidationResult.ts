/**
 * Value object representing validation result for a single entry clear operation.
 *
 * Encapsulates three possible outcomes:
 * - Allowed: Entry exists and can be cleared
 * - Protected: Entry exists but is protected (cannot be cleared)
 * - Not Found: Entry does not exist in storage
 *
 * Type-safe result object instead of throwing exceptions for validation
 * failures. Allows domain layer to return rich validation information without
 * exception handling overhead.
 *
 * Pattern: Factory methods enforce valid states (allowed/protected/notFound).
 *
 * @example
 * ```typescript
 * const result = collection.validateClearOperation(key);
 * if (!result.isAllowed) {
 *   // Handle validation failure (show reason in UI)
 *   throw new Error(result.reason);
 * }
 * ```
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
