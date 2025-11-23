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
	 * Accepts both 'Exception' and 'Failed' as exception status for flexibility.
	 *
	 * @param value - String status ('Success', 'Exception', or 'Failed')
	 * @returns TraceStatus instance
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	static fromString(value: string): TraceStatus {
		switch (value) {
			case 'Success':
				return TraceStatus.Success;
			case 'Exception':
			case 'Failed':
				return TraceStatus.Exception;
			default:
				throw new Error(`Invalid TraceStatus: unknown value "${value}"`);
		}
	}

	/**
	 * Checks if status represents an exception/failure.
	 *
	 * @returns True if status is Exception
	 */
	isException(): boolean {
		return this.value === 'Exception';
	}

	/**
	 * Converts to string for display.
	 *
	 * @returns String representation ('Success' or 'Exception')
	 */
	toString(): string {
		return this.value;
	}

	/**
	 * Checks equality with another TraceStatus.
	 *
	 * @param other - TraceStatus to compare with (or null)
	 * @returns True if values are equal
	 */
	equals(other: TraceStatus | null): boolean {
		return other !== null && this.value === other.value;
	}
}
