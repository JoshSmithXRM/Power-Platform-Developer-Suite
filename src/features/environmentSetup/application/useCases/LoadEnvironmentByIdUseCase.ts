import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentFormViewModel } from '../viewModels/EnvironmentFormViewModel';
import { EnvironmentFormViewModelMapper } from '../mappers/EnvironmentFormViewModelMapper';
import { ApplicationError } from '../errors/ApplicationError';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Query Use Case: Load single environment for editing
 * Retrieves environment details and credential availability for form population
 */
export class LoadEnvironmentByIdUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentFormViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads a single environment by ID with credential metadata
	 * @param request Request containing environment ID
	 * @returns Form view model with environment data and credential availability flags
	 */
	public async execute(request: LoadEnvironmentByIdRequest): Promise<EnvironmentFormViewModel> {
		this.logger.debug(`LoadEnvironmentByIdUseCase: Loading environment ${request.environmentId}`);

		try {
			const environmentId = new EnvironmentId(request.environmentId);

			// Get domain entity
			const environment = await this.repository.getById(environmentId);
			if (!environment) {
				this.logger.warn(`Environment not found: ${request.environmentId}`);
				throw new ApplicationError(`Environment not found: ${request.environmentId}`);
			}

			// Check for stored credentials
			const clientId = environment.getClientId();
			const hasStoredClientSecret = clientId
				? !!(await this.repository.getClientSecret(clientId.getValue()))
				: false;

			const username = environment.getUsername();
			const hasStoredPassword = username
				? !!(await this.repository.getPassword(username))
				: false;

			this.logger.info(`Environment loaded: ${environment.getName().getValue()}`);

			// Transform to ViewModel for editing
			return this.mapper.toFormViewModel(environment, hasStoredClientSecret, hasStoredPassword);
		} catch (error) {
			this.logger.error('LoadEnvironmentByIdUseCase: Failed to load environment', error);
			throw error;
		}
	}
}

export interface LoadEnvironmentByIdRequest {
	environmentId: string;
}
