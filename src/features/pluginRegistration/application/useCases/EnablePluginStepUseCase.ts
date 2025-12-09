import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for enabling a disabled plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Fetch step
 * 2. Validate via domain method (canEnable)
 * 3. Call repository to enable
 */
export class EnablePluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Enable a plugin step.
	 * @throws Error if step not found or cannot be enabled
	 */
	public async execute(environmentId: string, stepId: string): Promise<void> {
		this.logger.info('EnablePluginStepUseCase started', { environmentId, stepId });

		const step = await this.stepRepository.findById(environmentId, stepId);
		if (!step) {
			throw new Error(`Plugin step not found: ${stepId}`);
		}

		if (!step.canEnable()) {
			const reason = step.isInManagedState()
				? 'Cannot enable managed step'
				: 'Step is already enabled';
			throw new Error(reason);
		}

		await this.stepRepository.enable(environmentId, stepId);

		this.logger.info('EnablePluginStepUseCase completed', { stepId });
	}
}
