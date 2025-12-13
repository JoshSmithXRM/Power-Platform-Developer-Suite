/**
 * Represents an SDK message filter - links a message to an entity.
 * Used to determine which entity a step is registered against.
 */
export class SdkMessageFilter {
	constructor(
		private readonly id: string,
		private readonly sdkMessageId: string,
		private readonly primaryObjectTypeCode: string, // Entity logical name
		private readonly isCustomProcessingStepAllowed: boolean
	) {}

	public getId(): string {
		return this.id;
	}

	public getSdkMessageId(): string {
		return this.sdkMessageId;
	}

	/**
	 * Gets the primary entity logical name for this filter.
	 * Returns 'none' for entity-agnostic messages.
	 */
	public getPrimaryEntityLogicalName(): string {
		return this.primaryObjectTypeCode;
	}

	public isCustomStepAllowed(): boolean {
		return this.isCustomProcessingStepAllowed;
	}
}
