/**
 * Execution stage for plugin step.
 * Determines when in the pipeline the plugin executes.
 *
 * Values:
 * - PreValidation (10): Before main operation validation
 * - PreOperation (20): Before main operation, within transaction
 * - InternalPreOperation (25): Internal pre-operation (system use)
 * - MainOperation (30): Internal system use (platform core operations)
 * - InternalPostOperation (35): Internal post-main operation (system use)
 * - PostOperation (40): After main operation, within transaction
 * - PostOperationAsync (45): Async post-operation (deprecated naming)
 * - PostOperationDeprecated (50): Outside transaction (deprecated, legacy)
 * - FinalPostOperation (55): Final post operation (some system steps)
 *
 * Note: Some values (25, 35, 45, 55) are internal/undocumented but appear in real data.
 */
export class ExecutionStage {
	public static readonly PreValidation = new ExecutionStage(10, 'PreValidation');
	public static readonly PreOperation = new ExecutionStage(20, 'PreOperation');
	public static readonly InternalPreOperation = new ExecutionStage(25, 'Internal Pre-Operation');
	public static readonly MainOperation = new ExecutionStage(30, 'MainOperation');
	public static readonly InternalPostOperation = new ExecutionStage(35, 'Internal Post-Operation');
	public static readonly PostOperation = new ExecutionStage(40, 'PostOperation');
	public static readonly PostOperationAsync = new ExecutionStage(45, 'PostOperation (Async)');
	public static readonly PostOperationDeprecated = new ExecutionStage(50, 'PostOperation (Deprecated)');
	public static readonly FinalPostOperation = new ExecutionStage(55, 'Final Post-Operation');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates ExecutionStage from Dataverse numeric value.
	 * Returns an "Unknown" stage for unrecognized values instead of throwing.
	 */
	public static fromValue(value: number): ExecutionStage {
		switch (value) {
			case 10:
				return ExecutionStage.PreValidation;
			case 20:
				return ExecutionStage.PreOperation;
			case 25:
				return ExecutionStage.InternalPreOperation;
			case 30:
				return ExecutionStage.MainOperation;
			case 35:
				return ExecutionStage.InternalPostOperation;
			case 40:
				return ExecutionStage.PostOperation;
			case 45:
				return ExecutionStage.PostOperationAsync;
			case 50:
				return ExecutionStage.PostOperationDeprecated;
			case 55:
				return ExecutionStage.FinalPostOperation;
			default:
				// Return a dynamic "Unknown" stage for unrecognized values
				return new ExecutionStage(value, `Unknown (${value})`);
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
