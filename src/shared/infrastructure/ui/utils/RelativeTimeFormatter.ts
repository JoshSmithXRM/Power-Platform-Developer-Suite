/**
 * Formats relative time for display in the UI layer.
 * Provides human-friendly relative time strings (e.g., "2 hours ago", "Just now").
 */
export class RelativeTimeFormatter {
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
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMinutes < 1) {
			return 'Just now';
		} else if (diffMinutes < 60) {
			return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		} else if (diffDays < 7) {
			return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		} else {
			return date.toLocaleDateString();
		}
	}
}
