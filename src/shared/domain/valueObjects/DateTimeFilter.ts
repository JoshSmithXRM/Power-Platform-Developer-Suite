/**
 * DateTimeFilter Value Object
 *
 * Encapsulates datetime filtering with timezone-aware conversions.
 * Maintains a canonical UTC ISO format as the single source of truth,
 * enabling consistent datetime handling across all application layers.
 *
 * Business Rules:
 * - Canonical format is UTC ISO 8601: "YYYY-MM-DDTHH:MM:SS.sssZ"
 * - HTML datetime-local uses local timezone: "YYYY-MM-DDTHH:MM"
 * - OData requires UTC with seconds: "YYYY-MM-DDTHH:MM:SSZ"
 * - All dates are validated and immutable
 *
 * Note: Includes format conversion methods for pragmatic reasons (eliminates
 * boilerplate in calling code). See docs/architecture/TECHNICAL_DEBT.md for
 * future refactoring plan to extract presentation/infrastructure helpers.
 */
export class DateTimeFilter {
	private constructor(private readonly utcIsoValue: string) {
		this.validateUtcIso(utcIsoValue);
	}

	/**
	 * Creates DateTimeFilter from HTML datetime-local input value.
	 * Converts local timezone to UTC.
	 *
	 * @param localDateTime Local datetime string (e.g., "2025-11-10T16:46")
	 * @returns DateTimeFilter instance
	 * @throws ValidationError if datetime is invalid
	 *
	 * @example
	 * // User in PST enters 4:46 PM local time
	 * const filter = DateTimeFilter.fromLocalDateTime("2025-11-10T16:46");
	 * filter.getUtcIso(); // "2025-11-11T00:46:00.000Z"
	 */
	static fromLocalDateTime(localDateTime: string): DateTimeFilter {
		// Parse as local time and convert to UTC
		const date = new Date(localDateTime);

		if (isNaN(date.getTime())) {
			throw new ValidationError(`Invalid local datetime: ${localDateTime}`);
		}

		// Convert to canonical UTC ISO format
		return new DateTimeFilter(date.toISOString());
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
	 * Converts to HTML datetime-local format (local timezone without seconds).
	 * Use when rendering datetime-local input values.
	 *
	 * @returns Local datetime string (e.g., "2025-11-10T16:46")
	 *
	 * @example
	 * // Filter stored as "2025-11-11T00:46:00.000Z" (UTC)
	 * const local = filter.getLocalDateTime(); // "2025-11-10T16:46" (PST)
	 *
	 * TODO: Extract to presentation layer helper function (see TECHNICAL_DEBT.md)
	 */
	getLocalDateTime(): string {
		const date = new Date(this.utcIsoValue);

		// Format as YYYY-MM-DDTHH:MM in local timezone
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	/**
	 * Formats for Dataverse OData API requirements.
	 * Ensures format is "YYYY-MM-DDTHH:MM:SSZ" (no milliseconds).
	 *
	 * @returns OData-compatible datetime string
	 *
	 * @example
	 * const odata = filter.getODataFormat(); // "2025-11-11T00:46:00Z"
	 * // Used in: `createdon ge ${odata}`
	 *
	 * TODO: Extract to infrastructure layer helper function (see TECHNICAL_DEBT.md)
	 */
	getODataFormat(): string {
		// Remove milliseconds from ISO format
		// "2025-11-11T00:46:00.000Z" → "2025-11-11T00:46:00Z"
		return this.utcIsoValue.replace(/\.\d{3}Z$/, 'Z');
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
