import { TraceStatus } from '../../application/types';

/**
 * Presentation formatter for TraceStatus.
 * Converts domain value objects to display strings and CSS classes for UI.
 */
export class TraceStatusFormatter {
	/**
	 * Gets display name for UI.
	 */
	static getDisplayName(status: TraceStatus): string {
		return status.value;
	}

	/**
	 * Gets CSS class for badge styling.
	 */
	static getBadgeClass(status: TraceStatus): string {
		switch (status.value) {
			case 'Success':
				return 'badge-success';
			case 'Exception':
				return 'badge-error';
			default:
				return 'badge-default';
		}
	}
}
