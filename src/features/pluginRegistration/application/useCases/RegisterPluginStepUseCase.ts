import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginStepRepository, RegisterStepInput } from '../../domain/interfaces/IPluginStepRepository';

/**
 * Use case for registering a new plugin step.
 *
 * Orchestration only - no business logic:
 * 1. Validate input
 * 2. Call repository to create step
 */
export class RegisterPluginStepUseCase {
	constructor(
		private readonly stepRepository: IPluginStepRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new plugin step.
	 *
	 * @param environmentId - Target environment
	 * @param input - Step registration input
	 * @returns The ID of the created step
	 */
	public async execute(environmentId: string, input: RegisterStepInput): Promise<string> {
		this.logger.info('RegisterPluginStepUseCase started', {
			environmentId,
			name: input.name,
			sdkMessageId: input.sdkMessageId,
			pluginTypeId: input.pluginTypeId,
		});

		// Register the step
		const stepId = await this.stepRepository.register(environmentId, input);

		this.logger.info('RegisterPluginStepUseCase completed', {
			stepId,
			name: input.name,
		});

		return stepId;
	}
}
