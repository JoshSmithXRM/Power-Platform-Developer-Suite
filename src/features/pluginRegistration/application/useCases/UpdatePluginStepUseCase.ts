import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository, UpdateStepInput } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for updating an existing plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Verify step exists
 * 2. Call repository to update step
 */
export class UpdatePluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update an existing plugin step.
	 *
	 * @param environmentId - Target environment
	 * @param stepId - ID of the step to update
	 * @param input - Fields to update
	 */
	public async execute(
		environmentId: string,
		stepId: string,
		input: UpdateStepInput
	): Promise<void> {
		this.logger.info('UpdatePluginStepUseCase started', {
			environmentId,
			stepId,
		});

		// Verify step exists
		const step = await this.stepRepository.findById(environmentId, stepId);
		if (step === null) {
			throw new Error(`Step not found: ${stepId}`);
		}

		// Update the step
		await this.stepRepository.update(environmentId, stepId, input);

		this.logger.info('UpdatePluginStepUseCase completed', { stepId });
	}
}
