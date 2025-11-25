import { Duration } from '../../application/types';

/**
 * Presentation formatter for Duration.
 * Converts domain value objects to display strings for UI.
 */
export class DurationFormatter {
	/** Milliseconds threshold for displaying as milliseconds (< 1 second) */
	private static readonly MILLISECOND_THRESHOLD_MS = 1000;

	/** Milliseconds in one second (for conversion) */
	private static readonly MILLISECONDS_PER_SECOND = 1000;

	/** Milliseconds in one minute (for conversion) */
	private static readonly MILLISECONDS_PER_MINUTE = 60000;

	/** Decimal places for seconds display (e.g., "3.2s") */
	private static readonly SECONDS_DECIMAL_PLACES = 1;

	/** Decimal places for seconds in minute format (e.g., "2m 15s") */
	private static readonly MINUTE_SECONDS_DECIMAL_PLACES = 0;

	/**
	 * Formats duration for display.
	 * Returns "125ms", "3.2s", or "2m 15s" based on magnitude.
	 */
	static format(duration: Duration): string {
		const ms = duration.milliseconds;

		if (ms < DurationFormatter.MILLISECOND_THRESHOLD_MS) {
			return `${ms}ms`;
		} else if (ms < DurationFormatter.MILLISECONDS_PER_MINUTE) {
			const seconds = (ms / DurationFormatter.MILLISECONDS_PER_SECOND).toFixed(DurationFormatter.SECONDS_DECIMAL_PLACES);
			return `${seconds}s`;
		} else {
			const minutes = Math.floor(ms / DurationFormatter.MILLISECONDS_PER_MINUTE);
			const seconds = ((ms % DurationFormatter.MILLISECONDS_PER_MINUTE) / DurationFormatter.MILLISECONDS_PER_SECOND).toFixed(DurationFormatter.MINUTE_SECONDS_DECIMAL_PLACES);
			return `${minutes}m ${seconds}s`;
		}
	}
}
