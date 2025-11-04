/**
 * Branded types for compile-time type safety.
 * Prevents typos and misuse of primitive string types.
 */

/**
 * Branded type for button IDs to prevent typos at compile time.
 *
 * @example
 * ```typescript
 * const refreshBtn = createButtonId('refresh');
 * coordinator.registerHandler('refresh', ...);  // Type-safe
 * coordinator.registerHandler('refres', ...);   // Compile error!
 * ```
 */
export type ButtonId = string & { readonly __brand: 'ButtonId' };

/**
 * Creates a branded ButtonId from a string.
 * Use this helper to ensure compile-time type safety for button IDs.
 */
export function createButtonId(id: string): ButtonId {
	return id as ButtonId;
}
