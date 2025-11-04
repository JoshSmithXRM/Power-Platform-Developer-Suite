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

	isError(): boolean {
		return this.value === 'Exception';
	}

	equals(other: TraceStatus | null): boolean {
		return other !== null && this.value === other.value;
	}
}
