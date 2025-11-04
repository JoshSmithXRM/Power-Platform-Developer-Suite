/**
 * Domain value object: Operation Type
 *
 * Represents the type of operation that was traced.
 * Plugin (1): Custom plugin assembly execution
 * Workflow (2): Custom workflow activity execution
 */
export class OperationType {
	private constructor(public readonly value: number) {}

	static readonly Plugin = new OperationType(1);
	static readonly Workflow = new OperationType(2);

	/**
	 * @throws Error if value is not a valid operation type
	 */
	static fromNumber(value: number): OperationType {
		switch (value) {
			case 1:
				return OperationType.Plugin;
			case 2:
				return OperationType.Workflow;
			default:
				throw new Error(`Invalid operation type: ${value}`);
		}
	}

	equals(other: OperationType | null): boolean {
		return other !== null && this.value === other.value;
	}
}
