import { Duration } from '../../application/types';

/**
 * Presentation formatter for Duration.
 * Converts domain value objects to display strings for UI.
 */
export class DurationFormatter {
	/**
	 * Formats duration for display.
	 * Returns "125ms", "3.2s", or "2m 15s" based on magnitude.
	 */
	static format(duration: Duration): string {
		const ms = duration.milliseconds;

		if (ms < 1000) {
			return `${ms}ms`;
		} else if (ms < 60000) {
			const seconds = (ms / 1000).toFixed(1);
			return `${seconds}s`;
		} else {
			const minutes = Math.floor(ms / 60000);
			const seconds = ((ms % 60000) / 1000).toFixed(0);
			return `${minutes}m ${seconds}s`;
		}
	}
}
