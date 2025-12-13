import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for unregistering (deleting) a plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Validate step exists and can be deleted
 * 2. Call repository to delete
 *
 * Note: Dataverse will reject deletion if the step has images.
 * The error message will indicate this to the user.
 */
export class UnregisterPluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a plugin step.
	 *
	 * @param environmentId - Target environment
	 * @param stepId - ID of the step to delete
	 * @param stepName - Name of the step (for logging/messages)
	 * @throws Error if deletion fails (e.g., step has images, step is managed)
	 */
	public async execute(
		environmentId: string,
		stepId: string,
		stepName: string
	): Promise<void> {
		this.logger.info('UnregisterPluginStepUseCase started', {
			environmentId,
			stepId,
			stepName,
		});

		// Verify step exists
		const step = await this.stepRepository.findById(environmentId, stepId);
		if (step === null) {
			throw new Error(`Step not found: ${stepName}`);
		}

		// Check if can delete (not managed)
		if (!step.canDelete()) {
			throw new Error(`Cannot unregister managed step: ${stepName}`);
		}

		// Delete the step
		// Note: Dataverse will reject if there are images registered to this step
		await this.stepRepository.delete(environmentId, stepId);

		this.logger.info('UnregisterPluginStepUseCase completed', {
			stepId,
			stepName,
		});
	}
}
