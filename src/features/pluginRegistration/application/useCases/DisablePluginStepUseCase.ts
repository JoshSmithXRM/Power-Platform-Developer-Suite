import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for disabling an enabled plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Fetch step
 * 2. Validate via domain method (canDisable)
 * 3. Call repository to disable
 */
export class DisablePluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Disable a plugin step.
	 * @throws Error if step not found or cannot be disabled
	 */
	public async execute(environmentId: string, stepId: string): Promise<void> {
		this.logger.info('DisablePluginStepUseCase started', { environmentId, stepId });

		const step = await this.stepRepository.findById(environmentId, stepId);
		if (!step) {
			throw new Error(`Plugin step not found: ${stepId}`);
		}

		if (!step.canDisable()) {
			const reason = step.isInManagedState()
				? 'Cannot disable managed step'
				: 'Step is already disabled';
			throw new Error(reason);
		}

		await this.stepRepository.disable(environmentId, stepId);

		this.logger.info('DisablePluginStepUseCase completed', { stepId });
	}
}
