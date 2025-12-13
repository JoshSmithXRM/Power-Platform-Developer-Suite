import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IStepImageRepository, UpdateImageInput } from '../../domain/interfaces/IStepImageRepository';

/**
 * Use case for updating an existing step image.
 *
 * Orchestration only - no business logic:
 * 1. Verify image exists
 * 2. Call repository to update image
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
	 * @param input - Fields to update
	 */
	public async execute(
		environmentId: string,
		imageId: string,
		input: UpdateImageInput
	): Promise<void> {
		this.logger.info('UpdateStepImageUseCase started', {
			environmentId,
			imageId,
		});

		// Verify image exists
		const image = await this.imageRepository.findById(environmentId, imageId);
		if (image === null) {
			throw new Error(`Image not found: ${imageId}`);
		}

		// Update the image
		await this.imageRepository.update(environmentId, imageId, input);

		this.logger.info('UpdateStepImageUseCase completed', { imageId });
	}
}
