import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IDataProviderRepository } from '../../domain/interfaces/IDataProviderRepository';

/**
 * Use case for unregistering (deleting) a data provider.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to delete data provider
 */
export class UnregisterDataProviderUseCase {
	constructor(
		private readonly dataProviderRepository: IDataProviderRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a data provider.
	 *
	 * @param environmentId - Target environment
	 * @param dataProviderId - ID of the data provider to delete
	 */
	public async execute(environmentId: string, dataProviderId: string): Promise<void> {
		this.logger.info('UnregisterDataProviderUseCase started', {
			environmentId,
			dataProviderId,
		});

		await this.dataProviderRepository.delete(environmentId, dataProviderId);

		this.logger.info('UnregisterDataProviderUseCase completed', {
			dataProviderId,
		});
	}
}
