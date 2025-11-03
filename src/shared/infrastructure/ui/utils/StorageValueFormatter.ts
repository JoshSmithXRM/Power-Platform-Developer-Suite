/**
 * Formats storage values for display in the UI layer.
 * Handles different data types and secret masking.
 */
export class StorageValueFormatter {
	/**
	 * Formats a value for display.
	 * Adds quotes to strings and pretty-prints objects.
	 * @param value - Value to format
	 * @param isSecret - Whether to mask the value as a secret
	 * @returns Formatted value string for display
	 */
	static formatDisplayValue(value: unknown, isSecret: boolean): string {
		if (isSecret) {
			return '***';
		}

		if (value === null) {
			return 'null';
		}
		if (value === undefined) {
			return 'undefined';
		}
		if (typeof value === 'string') {
			return `"${value}"`;
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}

		return String(value);
	}

	/**
	 * Determines if a value should be expandable in the UI.
	 * @param value - Value to check
	 * @returns True if value is an object (excludes null)
	 */
	static isExpandable(value: unknown): boolean {
		return typeof value === 'object' && value !== null;
	}
}
