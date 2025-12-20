import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IDataProviderRepository,
	RegisterDataProviderInput,
} from '../../domain/interfaces/IDataProviderRepository';

/**
 * Use case for registering a new data provider.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to create data provider
 * 2. Return created ID
 */
export class RegisterDataProviderUseCase {
	constructor(
		private readonly dataProviderRepository: IDataProviderRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new data provider.
	 *
	 * @param environmentId - Target environment
	 * @param input - Data provider registration input
	 * @returns The ID of the created data provider
	 */
	public async execute(environmentId: string, input: RegisterDataProviderInput): Promise<string> {
		this.logger.info('RegisterDataProviderUseCase started', {
			environmentId,
			name: input.name,
			dataSourceLogicalName: input.dataSourceLogicalName,
		});

		// Register the data provider
		const dataProviderId = await this.dataProviderRepository.register(environmentId, input);

		this.logger.info('RegisterDataProviderUseCase completed', {
			dataProviderId,
			name: input.name,
		});

		return dataProviderId;
	}
}
