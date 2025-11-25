/**
 * Shared date and time formatting utilities for presentation layer.
 * Provides consistent date/time formatting across all ViewModels.
 */
export class DateFormatter {
	/**
	 * Formats a Date object to a locale string.
	 * @param date - Date to format (null returns empty string)
	 * @returns Formatted date string or empty string
	 */
	static formatDate(date: Date | null): string {
		return date?.toLocaleString() ?? '';
	}

	/**
	 * Formats duration in milliseconds to a human-readable string.
	 * @param durationMs - Duration in milliseconds (null returns empty string)
	 * @returns Human-readable duration string (e.g., "2h 15m", "45m 30s", "23s")
	 */
	static formatDuration(durationMs: number | null): string {
		if (durationMs === null) {
			return '';
		}

		const seconds = Math.floor(durationMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			const remainingMinutes = minutes % 60;
			return `${hours}h ${remainingMinutes}m`;
		} else if (minutes > 0) {
			const remainingSeconds = seconds % 60;
			return `${minutes}m ${remainingSeconds}s`;
		} else {
			return `${seconds}s`;
		}
	}
}
