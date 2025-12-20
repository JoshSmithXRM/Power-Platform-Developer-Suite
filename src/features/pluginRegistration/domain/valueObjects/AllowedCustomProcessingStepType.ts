/**
 * Allowed processing step types for Custom API.
 * Determines which execution modes are allowed for plugins implementing the API.
 *
 * Values:
 * - None (0): No plugin execution allowed
 * - AsyncOnly (1): Only asynchronous execution allowed
 * - SyncAndAsync (2): Both synchronous and asynchronous execution allowed
 */
export class AllowedCustomProcessingStepType {
	public static readonly None = new AllowedCustomProcessingStepType(0, 'None');
	public static readonly AsyncOnly = new AllowedCustomProcessingStepType(1, 'Async Only');
	public static readonly SyncAndAsync = new AllowedCustomProcessingStepType(2, 'Sync and Async');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates AllowedCustomProcessingStepType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): AllowedCustomProcessingStepType {
		switch (value) {
			case 0:
				return AllowedCustomProcessingStepType.None;
			case 1:
				return AllowedCustomProcessingStepType.AsyncOnly;
			case 2:
				return AllowedCustomProcessingStepType.SyncAndAsync;
			default:
				throw new Error(`Invalid AllowedCustomProcessingStepType value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns true if asynchronous execution is allowed.
	 */
	public isAsyncAllowed(): boolean {
		return this.value === 1 || this.value === 2;
	}

	/**
	 * Returns true if synchronous execution is allowed.
	 */
	public isSyncAllowed(): boolean {
		return this.value === 2;
	}

	public equals(other: AllowedCustomProcessingStepType): boolean {
		return this.value === other.value;
	}
}
