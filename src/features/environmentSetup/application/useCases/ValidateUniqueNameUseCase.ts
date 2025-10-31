import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';

/**
 * Query Use Case: Validate name uniqueness
 */
export class ValidateUniqueNameUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository
	) {}

	public async execute(request: ValidateUniqueNameRequest): Promise<ValidateUniqueNameResponse> {
		const excludeId = request.excludeEnvironmentId
			? new EnvironmentId(request.excludeEnvironmentId)
			: undefined;

		const isUnique = await this.repository.isNameUnique(request.name, excludeId);

		return {
			isUnique,
			message: isUnique ? undefined : 'Environment name must be unique'
		};
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
