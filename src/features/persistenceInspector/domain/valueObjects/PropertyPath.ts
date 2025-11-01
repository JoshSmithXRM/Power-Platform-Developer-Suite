/**
 * Value object representing a property path (e.g., "environments[0].dataverseUrl")
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
	 * Parses bracket and dot notation into segments
	 * "environments[0].dataverseUrl" -> ["environments", "0", "dataverseUrl"]
	 */
	private static parsePath(path: string): string[] {
		return path
			.replace(/\[(\d+)\]/g, '.$1')
			.split('.')
			.filter(s => s.length > 0);
	}
}
