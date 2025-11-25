/**
 * Value object representing validation results with errors and warnings.
 *
 * Immutable result object used throughout the domain layer for validation feedback.
 *
 * Separates validation results from exceptions. Allows collecting multiple
 * errors/warnings before failing, providing better user experience with
 * comprehensive feedback.
 *
 * Patterns:
 * - Errors: Validation failures that prevent the operation
 * - Warnings: Issues that should be communicated but don't prevent operation
 * - isValid: False if any errors exist, true otherwise
 *
 * @example
 * ```typescript
 * const result = ValidationResult.failure(['Name is required', 'URL is invalid']);
 * if (!result.isValid) {
 *   // Return errors to presentation layer for UI display
 *   return { success: false, errors: result.errors };
 * }
 * ```
 */
export class ValidationResult {
	constructor(
		public readonly isValid: boolean,
		public readonly errors: string[],
		public readonly warnings: string[] = []
	) {}

	public static success(): ValidationResult {
		return new ValidationResult(true, [], []);
	}

	public static failure(errors: string[]): ValidationResult {
		return new ValidationResult(false, errors, []);
	}

	public static successWithWarnings(warnings: string[]): ValidationResult {
		return new ValidationResult(true, [], warnings);
	}

	public getFirstError(): string | undefined {
		return this.errors[0];
	}

	public hasWarnings(): boolean {
		return this.warnings.length > 0;
	}
}
