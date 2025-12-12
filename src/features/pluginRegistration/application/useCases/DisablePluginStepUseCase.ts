import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for disabling an enabled plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Fetch step to verify it exists and is enabled
 * 2. Call repository to disable
 *
 * Note: Some steps cannot be disabled:
 * - Microsoft-registered steps (error 0x8004419a)
 * - Custom API implementation steps (error 0x80044184) - registered at a special internal stage
 * We allow the attempt and let the server reject if not allowed, then provide a friendly error.
 */
export class DisablePluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Disable a plugin step.
	 * @throws Error if step not found, already disabled, or server rejects the operation
	 */
	public async execute(environmentId: string, stepId: string): Promise<void> {
		this.logger.info('DisablePluginStepUseCase started', { environmentId, stepId });

		const step = await this.stepRepository.findById(environmentId, stepId);
		if (!step) {
			throw new Error(`Plugin step not found: ${stepId}`);
		}

		if (!step.canDisable()) {
			throw new Error('Step is already disabled');
		}

		try {
			await this.stepRepository.disable(environmentId, stepId);
			this.logger.info('DisablePluginStepUseCase completed', { stepId });
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Provide helpful error message for Microsoft-registered steps
			if (errorMessage.includes('0x8004419a') || errorMessage.includes('registered by Microsoft')) {
				throw new Error(
					'This step is registered by Microsoft and cannot be disabled. ' +
						'Use the "Hide hidden steps" filter to reduce noise from system steps.'
				);
			}

			// Provide helpful error message for Custom API implementation steps
			// These are registered at a special internal stage that doesn't allow modification
			if (errorMessage.includes('0x80044184') || errorMessage.includes('Invalid plug-in registration stage')) {
				throw new Error(
					'Custom API implementation steps cannot be disabled. ' +
						'These steps are registered at a special internal stage that does not allow modification.'
				);
			}

			throw error;
		}
	}
}
