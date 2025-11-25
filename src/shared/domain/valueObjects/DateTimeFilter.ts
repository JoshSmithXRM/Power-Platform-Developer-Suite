/**
 * DateTimeFilter Value Object
 *
 * Encapsulates datetime filtering with timezone-aware validation.
 * Maintains a canonical UTC ISO format as the single source of truth,
 * enabling consistent datetime handling across all application layers.
 *
 * Business Rules:
 * - Canonical format is UTC ISO 8601: "YYYY-MM-DDTHH:MM:SS.sssZ"
 * - All dates are validated and immutable
 * - Domain layer concerns only - no presentation or infrastructure formatting
 *
 * For format conversions:
 * - HTML datetime-local: Use presentation/utils/DateTimeFormatters
 * - OData API format: Use infrastructure/utils/ODataFormatters
 */
export class DateTimeFilter {
	private constructor(private readonly utcIsoValue: string) {
		this.validateUtcIso(utcIsoValue);
	}

	/**
	 * Creates DateTimeFilter from UTC ISO 8601 string.
	 * Used when loading from storage or receiving from backend.
	 *
	 * @param utcIso UTC ISO string (e.g., "2025-11-11T00:46:00.000Z")
	 * @returns DateTimeFilter instance
	 * @throws ValidationError if datetime is invalid
	 *
	 * @example
	 * const filter = DateTimeFilter.fromUtcIso("2025-11-11T00:46:00.000Z");
	 */
	static fromUtcIso(utcIso: string): DateTimeFilter {
		return new DateTimeFilter(utcIso);
	}

	/**
	 * Returns canonical UTC ISO 8601 format.
	 * Use for storage, domain entities, and inter-layer communication.
	 *
	 * @returns UTC ISO string (e.g., "2025-11-11T00:46:00.000Z")
	 *
	 * @example
	 * const utc = filter.getUtcIso(); // Store in FilterCondition.value
	 */
	getUtcIso(): string {
		return this.utcIsoValue;
	}

	/**
	 * Validates UTC ISO format and ensures date is valid.
	 */
	private validateUtcIso(utcIso: string): void {
		const date = new Date(utcIso);

		if (isNaN(date.getTime())) {
			throw new ValidationError(`Invalid UTC ISO datetime: ${utcIso}`);
		}

		// Ensure it's actually in ISO format with timezone
		if (!utcIso.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
			throw new ValidationError(
				`UTC datetime must be in ISO 8601 format: ${utcIso}`
			);
		}
	}

	/**
	 * Equality comparison based on UTC value.
	 */
	equals(other: DateTimeFilter): boolean {
		return this.utcIsoValue === other.utcIsoValue;
	}
}

/**
 * Validation error for invalid datetime values.
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}
