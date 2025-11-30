import { DomainError } from '../../../../shared/domain/errors/DomainError';
import type { FetchXmlValidationError as ValidationErrorDetails } from '../services/FetchXmlValidator';

/**
 * Domain Error: FetchXML Validation Error
 *
 * Thrown when FetchXML validation fails due to syntax or structure errors.
 * Contains all validation errors found during validation.
 */
export class FetchXmlValidationError extends DomainError {
	constructor(
		public readonly errors: readonly ValidationErrorDetails[],
		public readonly fetchXml: string
	) {
		const firstError = errors[0];
		const locationInfo = firstError?.line ? ` at line ${firstError.line}` : '';
		const message = firstError
			? `FetchXML validation failed${locationInfo}: ${firstError.message}`
			: 'FetchXML validation failed';
		super(message);
	}

	/**
	 * Gets all error messages as a formatted string.
	 */
	public getFormattedErrors(): string {
		return this.errors
			.map((e) => {
				const location = e.line ? `Line ${e.line}: ` : '';
				return `${location}${e.message}`;
			})
			.join('\n');
	}

	/**
	 * Gets the count of validation errors.
	 */
	public getErrorCount(): number {
		return this.errors.length;
	}
}
