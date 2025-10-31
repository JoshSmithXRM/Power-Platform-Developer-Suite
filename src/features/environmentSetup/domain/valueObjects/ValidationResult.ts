/**
 * ValidationResult value object
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
