import { ImageType } from '../valueObjects/ImageType';

/**
 * Represents a step image (pre-image or post-image).
 *
 * Business Rules:
 * - Images capture entity state before/after operation
 * - PreImage: Entity state before operation
 * - PostImage: Entity state after operation
 * - EntityAlias: Reference name for accessing image in plugin code
 * - Attributes: Comma-separated list of attributes to include
 *
 * Rich behavior (NOT anemic):
 * - getAttributesArray(): string[]
 */
export class StepImage {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly stepId: string,
		private readonly imageType: ImageType,
		private readonly entityAlias: string,
		private readonly attributes: string,
		private readonly createdOn: Date
	) {}

	/**
	 * Gets image attributes as array.
	 */
	public getAttributesArray(): string[] {
		if (!this.attributes) {
			return [];
		}
		return this.attributes.split(',').map((attr) => attr.trim());
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getStepId(): string {
		return this.stepId;
	}

	public getImageType(): ImageType {
		return this.imageType;
	}

	public getEntityAlias(): string {
		return this.entityAlias;
	}

	public getAttributes(): string {
		return this.attributes;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}
}
