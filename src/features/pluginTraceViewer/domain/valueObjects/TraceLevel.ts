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

	/**
	 * Creates TraceLevel from string representation.
	 * Factory method for value object construction (legitimate pattern).
	 * @throws Error if value is not a valid trace level string
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods
	static fromString(value: string): TraceLevel {
		switch (value) {
			case 'Off':
				return TraceLevel.Off;
			case 'Exception':
				return TraceLevel.Exception;
			case 'All':
				return TraceLevel.All;
			default:
				throw new Error(`Invalid trace level string: ${value}`);
		}
	}

	equals(other: TraceLevel | null): boolean {
		return other !== null && this.value === other.value;
	}

	/**
	 * Determines if this trace level may impact system performance.
	 * TraceLevel.All logs every plugin execution, which can generate
	 * significant data volume and affect system performance.
	 *
	 * @returns true if this level may impact performance
	 */
	isPerformanceIntensive(): boolean {
		return this.value === TraceLevel.All.value;
	}
}
