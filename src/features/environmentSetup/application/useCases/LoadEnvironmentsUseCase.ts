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

		// Transform to ViewModels
		const viewModels = environments.map(env => this.mapper.toViewModel(env));

		// Sort by last used (most recent first), then by name
		viewModels.sort((a, b) => {
			if (a.lastUsed && b.lastUsed) {
				return b.lastUsed.getTime() - a.lastUsed.getTime();
			}
			if (a.lastUsed) {
				return -1;
			}
			if (b.lastUsed) {
				return 1;
			}
			return a.name.localeCompare(b.name);
		});

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
