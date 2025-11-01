/**
 * Value object representing a pattern for matching protected storage keys.
 *
 * Supports wildcard patterns for flexible key protection:
 * - Exact match: `power-platform-dev-suite-environments`
 * - Wildcard: `power-platform-dev-suite-*` (matches all extension keys)
 *
 * WHY: Provides regex-based pattern matching for protecting entire families
 * of storage keys without hardcoding each individual key. Wildcard support
 * allows protecting all keys with a common prefix.
 *
 * Implementation:
 * - Converts wildcard `*` to regex `.*`
 * - Escapes other regex metacharacters for literal matching
 * - Anchors pattern with `^` and `$` for exact matching
 *
 * @example
 * ```typescript
 * const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');
 * pattern.matches('power-platform-dev-suite-environments'); // true
 * pattern.matches('power-platform-dev-suite-secret-abc'); // true
 * pattern.matches('other-extension-key'); // false
 * ```
 */
export class ProtectedKeyPattern {
	private constructor(private readonly _pattern: string) {}

	public static create(pattern: string): ProtectedKeyPattern {
		return new ProtectedKeyPattern(pattern);
	}

	/**
	 * Checks if a key matches this pattern (supports wildcards)
	 */
	public matches(key: string): boolean {
		if (this._pattern.includes('*')) {
			// Escape regex metacharacters, then replace \* with .*
			const escaped = this._pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
			return regex.test(key);
		}

		return key === this._pattern;
	}
}
