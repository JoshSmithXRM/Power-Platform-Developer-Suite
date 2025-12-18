import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IStepImageRepository } from '../../domain/interfaces/IStepImageRepository';

/**
 * Input for updating an existing step image.
 * Note: stepId is NOT required from callers - the use case retrieves it
 * from the existing image record.
 */
export interface UpdateStepImageInput {
	readonly name?: string | undefined;
	readonly imageType?: number | undefined;
	readonly entityAlias?: string | undefined;
	readonly messagePropertyName?: string | undefined;
	readonly attributes?: string | undefined;
}

/**
 * Use case for updating an existing step image.
 *
 * Orchestration only - no business logic:
 * 1. Verify image exists
 * 2. Get stepId from existing image (required for Dataverse update)
 * 3. Call repository to update image
 */
export class UpdateStepImageUseCase {
	constructor(
		private readonly imageRepository: IStepImageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update an existing step image.
	 *
	 * @param environmentId - Target environment
	 * @param imageId - ID of the image to update
	 * @param input - Fields to update (stepId is retrieved from existing image)
	 */
	public async execute(
		environmentId: string,
		imageId: string,
		input: UpdateStepImageInput
	): Promise<void> {
		this.logger.info('UpdateStepImageUseCase started', {
			environmentId,
			imageId,
		});

		// Verify image exists and get its stepId
		const image = await this.imageRepository.findById(environmentId, imageId);
		if (image === null) {
			throw new Error(`Image not found: ${imageId}`);
		}

		// Update the image - stepId is required by Dataverse (observed from PRT SOAP trace)
		await this.imageRepository.update(environmentId, imageId, {
			stepId: image.getStepId(),
			...input,
		});

		this.logger.info('UpdateStepImageUseCase completed', { imageId });
	}
}
