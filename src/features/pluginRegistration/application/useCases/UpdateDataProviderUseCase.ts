import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IDataProviderRepository,
	UpdateDataProviderInput,
} from '../../domain/interfaces/IDataProviderRepository';

/**
 * Use case for updating an existing data provider.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to update data provider
 */
export class UpdateDataProviderUseCase {
	constructor(
		private readonly dataProviderRepository: IDataProviderRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Update an existing data provider.
	 *
	 * @param environmentId - Target environment
	 * @param dataProviderId - ID of the data provider to update
	 * @param input - Data provider update input (only changed fields)
	 */
	public async execute(
		environmentId: string,
		dataProviderId: string,
		input: UpdateDataProviderInput
	): Promise<void> {
		this.logger.info('UpdateDataProviderUseCase started', {
			environmentId,
			dataProviderId,
			fieldsToUpdate: Object.keys(input).filter(
				(k) => input[k as keyof UpdateDataProviderInput] !== undefined
			),
		});

		await this.dataProviderRepository.update(environmentId, dataProviderId, input);

		this.logger.info('UpdateDataProviderUseCase completed', {
			dataProviderId,
		});
	}
}
