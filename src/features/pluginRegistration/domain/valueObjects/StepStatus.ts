/**
 * Status for plugin step (enabled/disabled).
 *
 * Values:
 * - Enabled (0): Step is active and will execute
 * - Disabled (1): Step is inactive and will not execute
 */
export class StepStatus {
	public static readonly Enabled = new StepStatus(0, 'Enabled');
	public static readonly Disabled = new StepStatus(1, 'Disabled');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates StepStatus from Dataverse statecode value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): StepStatus {
		switch (value) {
			case 0:
				return StepStatus.Enabled;
			case 1:
				return StepStatus.Disabled;
			default:
				throw new Error(`Invalid StepStatus value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if step is enabled.
	 */
	public isEnabled(): boolean {
		return this.value === 0;
	}

	public equals(other: StepStatus): boolean {
		return this.value === other.value;
	}
}
