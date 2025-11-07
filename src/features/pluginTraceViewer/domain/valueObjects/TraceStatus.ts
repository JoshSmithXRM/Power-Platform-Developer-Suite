/**
 * Domain value object: Trace Status
 *
 * Represents whether a plugin execution succeeded or failed.
 * Derived from presence of exception details in the trace.
 */
export class TraceStatus {
	private constructor(public readonly value: string) {}

	static readonly Success = new TraceStatus('Success');
	static readonly Exception = new TraceStatus('Exception');

	/**
	 * Creates TraceStatus from string value.
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods
	static fromString(value: string): TraceStatus {
		switch (value) {
			case 'Success':
				return TraceStatus.Success;
			case 'Exception':
			case 'Failed':
				return TraceStatus.Exception;
			default:
				throw new Error(`Invalid trace status: ${value}`);
		}
	}

	isException(): boolean {
		return this.value === 'Exception';
	}

	toString(): string {
		return this.value;
	}

	equals(other: TraceStatus | null): boolean {
		return other !== null && this.value === other.value;
	}
}
