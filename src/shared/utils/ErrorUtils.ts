/**
 * Utility functions for error handling
 * JavaScript allows throwing any type - these utilities ensure consistent Error instances.
 */

/**
 * Normalizes an unknown error value to an Error instance.
 *
 * TypeScript catch blocks receive `unknown` because JavaScript can throw anything.
 * This utility ensures we always have a proper Error instance for logging and re-throwing.
 *
 * @param error - Unknown error value from catch block
 * @returns Normalized Error instance
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const normalized = normalizeError(error);
 *   this.logger.error('Operation failed', normalized);
 *   throw normalized;
 * }
 * ```
 */
export function normalizeError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === 'string') {
		return new Error(error);
	}

	if (typeof error === 'object' && error !== null) {
		// Try to extract message property if it exists
		const obj = error as Record<string, unknown>;
		if ('message' in obj && typeof obj['message'] === 'string') {
			return new Error(obj['message']);
		}
		return new Error(JSON.stringify(error));
	}

	return new Error(String(error));
}

/**
 * Type guard to check if a value is an Error instance.
 *
 * @param value - Unknown value to check
 * @returns True if value is an Error instance
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}
