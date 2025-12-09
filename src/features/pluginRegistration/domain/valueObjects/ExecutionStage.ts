/**
 * Execution stage for plugin step.
 * Determines when in the pipeline the plugin executes.
 *
 * Values:
 * - PreValidation (10): Before main operation validation
 * - PreOperation (20): Before main operation, within transaction
 * - PostOperation (40): After main operation, within transaction
 */
export class ExecutionStage {
	public static readonly PreValidation = new ExecutionStage(10, 'PreValidation');
	public static readonly PreOperation = new ExecutionStage(20, 'PreOperation');
	public static readonly PostOperation = new ExecutionStage(40, 'PostOperation');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ExecutionStage from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): ExecutionStage {
		switch (value) {
			case 10:
				return ExecutionStage.PreValidation;
			case 20:
				return ExecutionStage.PreOperation;
			case 40:
				return ExecutionStage.PostOperation;
			default:
				throw new Error(`Invalid ExecutionStage value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ExecutionStage): boolean {
		return this.value === other.value;
	}
}
