/**
 * Value object representing a pattern for protected keys
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
