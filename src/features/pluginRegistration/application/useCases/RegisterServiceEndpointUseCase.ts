import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IServiceEndpointRepository,
	RegisterServiceEndpointInput,
} from '../../domain/interfaces/IServiceEndpointRepository';

/**
 * Registers a new Azure Service Bus Service Endpoint.
 *
 * Orchestrates: Validation → Repository create
 */
export class RegisterServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to register a new Service Endpoint.
	 *
	 * @param environmentId - The Dataverse environment ID
	 * @param input - The registration input data
	 * @returns The ID of the newly created Service Endpoint
	 * @throws Error if validation fails or registration fails
	 */
	public async execute(
		environmentId: string,
		input: RegisterServiceEndpointInput
	): Promise<string> {
		this.logger.info('RegisterServiceEndpointUseCase: Starting', {
			environmentId,
			name: input.name,
			contract: input.contract,
		});

		// Basic validation
		if (!input.name || input.name.trim() === '') {
			throw new Error('Name is required');
		}
		if (!input.solutionNamespace || input.solutionNamespace.trim() === '') {
			throw new Error('Solution namespace is required');
		}

		// Register via repository
		const serviceEndpointId = await this.repository.register(environmentId, input);

		this.logger.info('RegisterServiceEndpointUseCase: Completed', {
			serviceEndpointId,
			name: input.name,
		});

		return serviceEndpointId;
	}
}
