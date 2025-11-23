/**
 * HTML datetime-local Formatting Utilities
 *
 * Handles conversion between UTC ISO 8601 and HTML datetime-local format.
 * Presentation layer helpers for rendering datetime inputs in user's local timezone.
 */

/**
 * Converts local datetime string (HTML datetime-local format) to UTC ISO 8601.
 * Used when user submits a datetime-local input value that needs to be stored in UTC.
 *
 * @param localDateTime Local datetime string (e.g., "2025-11-10T16:46")
 * @returns UTC ISO 8601 string (e.g., "2025-11-11T00:46:00.000Z")
 * @throws Error if datetime is invalid
 *
 * @example
 * // User in PST enters 4:46 PM local time
 * const utc = localDateTimeToUtc("2025-11-10T16:46");
 * // Returns: "2025-11-11T00:46:00.000Z"
 */
export function localDateTimeToUtc(localDateTime: string): string {
	const date = new Date(localDateTime);

	if (isNaN(date.getTime())) {
		throw new Error(`Invalid local datetime: ${localDateTime}`);
	}

	return date.toISOString();
}

/**
 * Converts UTC ISO 8601 string to HTML datetime-local format.
 * Used when rendering datetime-local input values from stored UTC timestamps.
 *
 * @param utcIso UTC ISO 8601 string (e.g., "2025-11-11T00:46:00.000Z")
 * @returns Local datetime string without seconds (e.g., "2025-11-10T16:46")
 * @throws Error if datetime is invalid
 *
 * @example
 * // Filter stored as "2025-11-11T00:46:00.000Z" (UTC)
 * const local = utcToLocalDateTime("2025-11-11T00:46:00.000Z");
 * // User in PST sees: "2025-11-10T16:46"
 */
export function utcToLocalDateTime(utcIso: string): string {
	const date = new Date(utcIso);

	if (isNaN(date.getTime())) {
		throw new Error(`Invalid UTC ISO datetime: ${utcIso}`);
	}

	// Format as YYYY-MM-DDTHH:MM in local timezone
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}
