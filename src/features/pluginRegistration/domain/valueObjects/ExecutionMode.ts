/**
 * Execution mode for plugin step.
 * Determines synchronous vs asynchronous execution.
 *
 * Values:
 * - Synchronous (0): Executes in same transaction, blocks operation
 * - Asynchronous (1): Executes in background, does not block
 */
export class ExecutionMode {
	public static readonly Synchronous = new ExecutionMode(0, 'Synchronous');
	public static readonly Asynchronous = new ExecutionMode(1, 'Asynchronous');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ExecutionMode from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): ExecutionMode {
		switch (value) {
			case 0:
				return ExecutionMode.Synchronous;
			case 1:
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid ExecutionMode value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if this is asynchronous execution.
	 */
	public isAsync(): boolean {
		return this.value === 1;
	}

	public equals(other: ExecutionMode): boolean {
		return this.value === other.value;
	}
}
