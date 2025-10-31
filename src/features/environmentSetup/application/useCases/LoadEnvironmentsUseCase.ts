import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';
import { EnvironmentListViewModelMapper } from '../mappers/EnvironmentListViewModelMapper';

/**
 * Query Use Case: Load all environments
 */
export class LoadEnvironmentsUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentListViewModelMapper
	) {}

	public async execute(): Promise<LoadEnvironmentsResponse> {
		// Get domain entities
		const environments = await this.repository.getAll();

		// Transform to sorted ViewModels (sorting is presentation concern handled by mapper)
		const viewModels = this.mapper.toSortedViewModels(environments);

		return {
			environments: viewModels,
			totalCount: viewModels.length,
			activeEnvironmentId: viewModels.find(vm => vm.isActive)?.id
		};
	}
}

export interface LoadEnvironmentsResponse {
	environments: EnvironmentListViewModel[];
	totalCount: number;
	activeEnvironmentId?: string;
}
