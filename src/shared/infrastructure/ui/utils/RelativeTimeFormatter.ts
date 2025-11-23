/**
 * Formats relative time for display in the UI layer.
 * Provides human-friendly relative time strings (e.g., "2 hours ago", "Just now").
 */
export class RelativeTimeFormatter {
	/**
	 * Number of milliseconds in one minute.
	 */
	private static readonly MILLISECONDS_PER_MINUTE = 60000;

	/**
	 * Number of minutes in one hour.
	 */
	private static readonly MINUTES_PER_HOUR = 60;

	/**
	 * Number of hours in one day.
	 */
	private static readonly HOURS_PER_DAY = 24;

	/**
	 * Number of days after which to show absolute date instead of relative time.
	 */
	private static readonly DAYS_THRESHOLD_FOR_ABSOLUTE_DATE = 7;

	/**
	 * Formats a date as a relative time string from now.
	 * @param date - Date to format (undefined returns "Never")
	 * @returns Human-readable relative time string
	 */
	static formatRelativeTime(date: Date | undefined): string {
		if (!date) {
			return 'Never';
		}

		const now = Date.now();
		const diffMs = now - date.getTime();
		const diffMinutes = Math.floor(diffMs / RelativeTimeFormatter.MILLISECONDS_PER_MINUTE);
		const diffHours = Math.floor(diffMinutes / RelativeTimeFormatter.MINUTES_PER_HOUR);
		const diffDays = Math.floor(diffHours / RelativeTimeFormatter.HOURS_PER_DAY);

		if (diffMinutes < 1) {
			return 'Just now';
		} else if (diffMinutes < RelativeTimeFormatter.MINUTES_PER_HOUR) {
			return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
		} else if (diffHours < RelativeTimeFormatter.HOURS_PER_DAY) {
			return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		} else if (diffDays < RelativeTimeFormatter.DAYS_THRESHOLD_FOR_ABSOLUTE_DATE) {
			return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		} else {
			return date.toLocaleDateString();
		}
	}
}
