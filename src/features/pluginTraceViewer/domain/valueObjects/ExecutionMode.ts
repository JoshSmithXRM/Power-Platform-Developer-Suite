/**
 * Domain value object: Execution Mode
 *
 * Represents whether a plugin executed synchronously or asynchronously.
 * Synchronous plugins block the user transaction, async plugins run in background.
 */
export class ExecutionMode {
	private constructor(public readonly value: number) {}

	static readonly Synchronous = new ExecutionMode(0);
	static readonly Asynchronous = new ExecutionMode(1);

	/**
	 * @throws Error if value is not a valid execution mode
	 */
	static fromNumber(value: number): ExecutionMode {
		switch (value) {
			case 0:
				return ExecutionMode.Synchronous;
			case 1:
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid execution mode: ${value}`);
		}
	}

	isSynchronous(): boolean {
		return this.value === 0;
	}

	equals(other: ExecutionMode | null): boolean {
		return other !== null && this.value === other.value;
	}
}
