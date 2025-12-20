import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ICustomApiRepository } from '../../domain/interfaces/ICustomApiRepository';

/**
 * Use case for unregistering (deleting) a Custom API.
 *
 * Orchestration only - no business logic:
 * 1. Call repository to delete Custom API
 *
 * Note: Dataverse cascade deletes associated parameters automatically.
 */
export class UnregisterCustomApiUseCase {
	constructor(
		private readonly customApiRepository: ICustomApiRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Unregister (delete) a Custom API.
	 *
	 * @param environmentId - Target environment
	 * @param customApiId - ID of the Custom API to delete
	 */
	public async execute(environmentId: string, customApiId: string): Promise<void> {
		this.logger.info('UnregisterCustomApiUseCase started', {
			environmentId,
			customApiId,
		});

		await this.customApiRepository.delete(environmentId, customApiId);

		this.logger.info('UnregisterCustomApiUseCase completed', {
			customApiId,
		});
	}
}
