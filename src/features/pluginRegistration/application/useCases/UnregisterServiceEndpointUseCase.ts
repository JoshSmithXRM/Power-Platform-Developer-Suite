import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IServiceEndpointRepository } from '../../domain/interfaces/IServiceEndpointRepository';

/**
 * Deletes (unregisters) a Service Endpoint.
 *
 * Orchestrates: Repository delete
 */
export class UnregisterServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to delete a Service Endpoint.
	 *
	 * @param environmentId - The Dataverse environment ID
	 * @param serviceEndpointId - The ID of the Service Endpoint to delete
	 */
	public async execute(environmentId: string, serviceEndpointId: string): Promise<void> {
		this.logger.info('UnregisterServiceEndpointUseCase: Starting', {
			serviceEndpointId,
			environmentId,
		});

		await this.repository.delete(environmentId, serviceEndpointId);

		this.logger.info('UnregisterServiceEndpointUseCase: Completed', {
			serviceEndpointId,
		});
	}
}
