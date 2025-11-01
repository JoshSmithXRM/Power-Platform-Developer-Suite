/**
 * Value object representing a property path for nested object navigation.
 *
 * Supports both dot notation and bracket notation for array indices:
 * - Dot notation: `environments.0.dataverseUrl`
 * - Bracket notation: `environments[0].dataverseUrl`
 * - Mixed: `environments[0].credentials.clientId`
 *
 * Internal Representation:
 * - Stored as array of string segments: `["environments", "0", "dataverseUrl"]`
 * - Bracket notation converted to dot notation internally
 *
 * WHY: Provides type-safe property path handling for clearing individual
 * properties within complex storage values. Supports flexible input formats
 * while maintaining consistent internal representation.
 *
 * @example
 * ```typescript
 * const path = PropertyPath.create('environments[0].dataverseUrl');
 * path.segments; // ["environments", "0", "dataverseUrl"]
 * path.toString(); // "environments.0.dataverseUrl"
 * ```
 */
export class PropertyPath {
	private constructor(private readonly _segments: string[]) {}

	public static create(path: string): PropertyPath {
		const segments = PropertyPath.parsePath(path);
		return new PropertyPath(segments);
	}

	public static fromSegments(segments: string[]): PropertyPath {
		return new PropertyPath(segments);
	}

	public get segments(): ReadonlyArray<string> {
		return this._segments;
	}

	public toString(): string {
		return this._segments.join('.');
	}

	/**
	 * Parses bracket and dot notation into segments.
	 *
	 * Conversion Process:
	 * 1. Convert bracket notation to dot notation: `[0]` → `.0`
	 * 2. Split on dots
	 * 3. Filter empty segments
	 *
	 * WHY: Internal representation uses consistent format (array of segments)
	 * regardless of input notation style.
	 *
	 * @param {string} path - Property path string
	 * @returns {string[]} Array of path segments
	 * @private
	 * @example "environments[0].dataverseUrl" → ["environments", "0", "dataverseUrl"]
	 */
	private static parsePath(path: string): string[] {
		return path
			.replace(/\[(\d+)\]/g, '.$1')
			.split('.')
			.filter(s => s.length > 0);
	}
}
