import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IStepImageRepository } from '../../domain/interfaces/IStepImageRepository';

/**
 * Use case for unregistering (deleting) a step image.
 *
 * Orchestration only - no business logic:
 * 1. Validate image exists
 * 2. Call repository to delete
 */
export class UnregisterStepImageUseCase {
	constructor(
		private readonly imageRepository: IStepImageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a step image.
	 *
	 * @param environmentId - Target environment
	 * @param imageId - ID of the image to delete
	 * @param imageName - Name of the image (for logging/messages)
	 * @throws Error if deletion fails
	 */
	public async execute(
		environmentId: string,
		imageId: string,
		imageName: string
	): Promise<void> {
		this.logger.info('UnregisterStepImageUseCase started', {
			environmentId,
			imageId,
			imageName,
		});

		// Verify image exists
		const image = await this.imageRepository.findById(environmentId, imageId);
		if (image === null) {
			throw new Error(`Image not found: ${imageName}`);
		}

		// Delete the image
		await this.imageRepository.delete(environmentId, imageId);

		this.logger.info('UnregisterStepImageUseCase completed', {
			imageId,
			imageName,
		});
	}
}
