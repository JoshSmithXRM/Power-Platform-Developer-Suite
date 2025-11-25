import { ExecutionMode } from '../../application/types';

/**
 * Presentation formatter for ExecutionMode.
 * Converts domain value objects to display strings for UI.
 */
export class ExecutionModeFormatter {
	/**
	 * Gets display name for UI.
	 */
	static getDisplayName(mode: ExecutionMode): string {
		switch (mode.value) {
			case 0:
				return 'Synchronous';
			case 1:
				return 'Asynchronous';
			default:
				return 'Unknown';
		}
	}
}
