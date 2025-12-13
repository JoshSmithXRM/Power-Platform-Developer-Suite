/**
 * Represents an SDK message filter - links a message to an entity.
 * Used to determine which entity a step is registered against.
 */
export class SdkMessageFilter {
	constructor(
		private readonly id: string,
		private readonly sdkMessageId: string,
		private readonly primaryObjectTypeCode: string, // Entity logical name
		private readonly secondaryObjectTypeCode: string, // Secondary entity (for Associate/Disassociate)
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

	/**
	 * Gets the secondary entity logical name for this filter.
	 * Returns 'none' for messages that don't have a secondary entity.
	 */
	public getSecondaryEntityLogicalName(): string {
		return this.secondaryObjectTypeCode;
	}

	/**
	 * Checks if this filter has a secondary entity (non-'none').
	 */
	public hasSecondaryEntity(): boolean {
		return this.secondaryObjectTypeCode !== 'none' && this.secondaryObjectTypeCode !== '';
	}

	public isCustomStepAllowed(): boolean {
		return this.isCustomProcessingStepAllowed;
	}
}
