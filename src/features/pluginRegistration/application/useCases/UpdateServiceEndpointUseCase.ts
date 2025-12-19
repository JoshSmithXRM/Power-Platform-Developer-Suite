import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IServiceEndpointRepository,
	UpdateServiceEndpointInput,
} from '../../domain/interfaces/IServiceEndpointRepository';

/**
 * Updates an existing Service Endpoint.
 *
 * Orchestrates: Repository update
 */
export class UpdateServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to update a Service Endpoint.
	 *
	 * @param environmentId - The Dataverse environment ID
	 * @param serviceEndpointId - The ID of the Service Endpoint to update
	 * @param input - The update input data (partial update)
	 */
	public async execute(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void> {
		this.logger.info('UpdateServiceEndpointUseCase: Starting', {
			serviceEndpointId,
			environmentId,
		});

		await this.repository.update(environmentId, serviceEndpointId, input);

		this.logger.info('UpdateServiceEndpointUseCase: Completed', {
			serviceEndpointId,
		});
	}
}
