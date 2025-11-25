/**
 * Domain value object: Pipeline Stage
 *
 * Power Platform plugin pipeline stages.
 * https://docs.microsoft.com/en-us/power-apps/developer/data-platform/event-framework
 */
export class PipelineStage {
	private constructor(
		public readonly value: number,
		public readonly name: string
	) {}

	static readonly PreValidation = new PipelineStage(10, 'PreValidation');
	static readonly PreOperation = new PipelineStage(20, 'PreOperation');
	static readonly PostOperation = new PipelineStage(30, 'PostOperation');
	static readonly PostOperationDeprecated = new PipelineStage(40, 'PostOperationDeprecated');

	/**
	 * @throws Error if value is not a valid pipeline stage
	 */
	static fromNumber(value: number): PipelineStage {
		switch (value) {
			case 10:
				return PipelineStage.PreValidation;
			case 20:
				return PipelineStage.PreOperation;
			case 30:
				return PipelineStage.PostOperation;
			case 40:
				return PipelineStage.PostOperationDeprecated;
			default:
				throw new Error(`Invalid pipeline stage: ${value}`);
		}
	}

	equals(other: PipelineStage | null): boolean {
		return other !== null && this.value === other.value;
	}

	isDeprecated(): boolean {
		return this.value === 40;
	}
}
