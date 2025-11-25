import { OperationType } from '../../application/types';

/**
 * Presentation formatter for OperationType.
 * Converts domain value objects to display strings for UI.
 */
export class OperationTypeFormatter {
	/**
	 * Gets display name for UI.
	 */
	static getDisplayName(type: OperationType): string {
		switch (type.value) {
			case 1:
				return 'Plugin';
			case 2:
				return 'Workflow';
			default:
				return 'Unknown';
		}
	}
}
