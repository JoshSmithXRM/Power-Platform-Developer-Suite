import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IStepImageRepository, RegisterImageInput } from '../../domain/interfaces/IStepImageRepository';

/**
 * Use case for registering a new step image.
 *
 * Orchestration only - no business logic:
 * 1. Validate input
 * 2. Call repository to create image
 */
export class RegisterStepImageUseCase {
	constructor(
		private readonly imageRepository: IStepImageRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new step image.
	 *
	 * @param environmentId - Target environment
	 * @param input - Image registration input
	 * @returns The ID of the created image
	 */
	public async execute(environmentId: string, input: RegisterImageInput): Promise<string> {
		this.logger.info('RegisterStepImageUseCase started', {
			environmentId,
			name: input.name,
			stepId: input.stepId,
		});

		// Register the image
		const imageId = await this.imageRepository.register(environmentId, input);

		this.logger.info('RegisterStepImageUseCase completed', {
			imageId,
			name: input.name,
		});

		return imageId;
	}
}
