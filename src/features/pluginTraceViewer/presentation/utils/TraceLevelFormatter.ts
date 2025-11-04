import { TraceLevel } from '../../application/types';

/**
 * Presentation formatter for TraceLevel.
 * Converts domain value objects to display strings for UI.
 */
export class TraceLevelFormatter {
	/**
	 * Gets display name for UI.
	 */
	static getDisplayName(level: TraceLevel): string {
		switch (level.value) {
			case 0:
				return 'Off';
			case 1:
				return 'Exception';
			case 2:
				return 'All';
			default:
				return 'Unknown';
		}
	}
}
