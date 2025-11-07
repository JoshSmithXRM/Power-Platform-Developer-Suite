import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Query Use Case: Validate name uniqueness
 * Checks if environment name is unique across all environments
 */
export class ValidateUniqueNameUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Validates that an environment name is unique
	 * @param request Request containing name to validate and optional environment to exclude
	 * @returns Response indicating uniqueness status
	 */
	public async execute(request: ValidateUniqueNameRequest): Promise<ValidateUniqueNameResponse> {
		this.logger.debug('ValidateUniqueNameUseCase: Checking uniqueness', { name: request.name });

		const excludeId = request.excludeEnvironmentId
			? new EnvironmentId(request.excludeEnvironmentId)
			: undefined;

		const isUnique = await this.repository.isNameUnique(request.name, excludeId);

		this.logger.debug('Name uniqueness check result', { name: request.name, isUnique });

		const result: ValidateUniqueNameResponse = {
			isUnique
		};

		if (!isUnique) {
			result.message = 'Environment name must be unique';
		}

		return result;
	}
}

export interface ValidateUniqueNameRequest {
	name: string;
	excludeEnvironmentId?: string;
}

export interface ValidateUniqueNameResponse {
	isUnique: boolean;
	message?: string;
}
