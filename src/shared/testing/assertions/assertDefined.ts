/**
 * Assert that a value is defined (not null or undefined).
 * Throws if value is null/undefined, otherwise narrows type to T.
 */
export function assertDefined<T>(
	value: T | undefined | null,
	message?: string
): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message || 'Expected value to be defined');
	}
}
