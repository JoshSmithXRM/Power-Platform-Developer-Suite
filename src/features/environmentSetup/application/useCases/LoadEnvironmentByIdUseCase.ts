import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentFormViewModel } from '../viewModels/EnvironmentFormViewModel';
import { EnvironmentFormViewModelMapper } from '../mappers/EnvironmentFormViewModelMapper';
import { ApplicationError } from '../errors/ApplicationError';

/**
 * Query Use Case: Load single environment for editing
 */
export class LoadEnvironmentByIdUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentFormViewModelMapper
	) {}

	public async execute(request: LoadEnvironmentByIdRequest): Promise<EnvironmentFormViewModel> {
		const environmentId = new EnvironmentId(request.environmentId);

		// Get domain entity
		const environment = await this.repository.getById(environmentId);
		if (!environment) {
			throw new ApplicationError(`Environment not found: ${request.environmentId}`);
		}

		// Check for stored credentials
		const hasStoredClientSecret = environment.getClientId()
			? !!(await this.repository.getClientSecret(environment.getClientId()!.getValue()))
			: false;

		const hasStoredPassword = environment.getUsername()
			? !!(await this.repository.getPassword(environment.getUsername()!))
			: false;

		// Transform to ViewModel for editing
		return this.mapper.toFormViewModel(environment, hasStoredClientSecret, hasStoredPassword);
	}
}

export interface LoadEnvironmentByIdRequest {
	environmentId: string;
}
