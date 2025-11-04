/**
 * Domain value object: Trace Level
 *
 * Represents the organization-wide trace logging level setting.
 * Controls which plugin executions are logged to the PluginTraceLog table.
 *
 * Values:
 * - Off (0): No tracing
 * - Exception (1): Log only failed executions
 * - All (2): Log all executions (performance impact)
 */
export class TraceLevel {
	private constructor(public readonly value: number) {}

	static readonly Off = new TraceLevel(0);
	static readonly Exception = new TraceLevel(1);
	static readonly All = new TraceLevel(2);

	/**
	 * @throws Error if value is not a valid trace level
	 */
	static fromNumber(value: number): TraceLevel {
		switch (value) {
			case 0:
				return TraceLevel.Off;
			case 1:
				return TraceLevel.Exception;
			case 2:
				return TraceLevel.All;
			default:
				throw new Error(`Invalid trace level: ${value}`);
		}
	}

	equals(other: TraceLevel | null): boolean {
		return other !== null && this.value === other.value;
	}

	/**
	 * "All" level can impact performance and should warn.
	 */
	requiresWarning(): boolean {
		return this.value === 2; // All
	}
}
