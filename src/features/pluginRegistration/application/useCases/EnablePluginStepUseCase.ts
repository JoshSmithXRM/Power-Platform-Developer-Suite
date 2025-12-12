import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for enabling a disabled plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Fetch step to verify it exists and is disabled
 * 2. Call repository to enable
 *
 * Note: Some Microsoft-registered steps cannot be enabled (error 0x8004419a).
 * We allow the attempt and let the server reject if not allowed.
 */
export class EnablePluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Enable a plugin step.
	 * @throws Error if step not found, already enabled, or server rejects the operation
	 */
	public async execute(environmentId: string, stepId: string): Promise<void> {
		this.logger.info('EnablePluginStepUseCase started', { environmentId, stepId });

		const step = await this.stepRepository.findById(environmentId, stepId);
		if (!step) {
			throw new Error(`Plugin step not found: ${stepId}`);
		}

		if (!step.canEnable()) {
			throw new Error('Step is already enabled');
		}

		try {
			await this.stepRepository.enable(environmentId, stepId);
			this.logger.info('EnablePluginStepUseCase completed', { stepId });
		} catch (error: unknown) {
			// Provide helpful error message for Microsoft-registered steps
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('0x8004419a') || errorMessage.includes('registered by Microsoft')) {
				throw new Error(
					'This step is registered by Microsoft and cannot be enabled. ' +
						'Use the "Hide hidden steps" filter to reduce noise from system steps.'
				);
			}
			throw error;
		}
	}
}
