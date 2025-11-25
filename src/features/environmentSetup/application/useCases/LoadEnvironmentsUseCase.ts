import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentListViewModel } from '../viewModels/EnvironmentListViewModel';
import { EnvironmentListViewModelMapper } from '../mappers/EnvironmentListViewModelMapper';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Query Use Case: Load all environments
 * Retrieves all configured environments and transforms them to sorted view models
 */
export class LoadEnvironmentsUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentListViewModelMapper,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads all environments from storage
	 * @returns Response containing environments, total count, and active environment ID
	 */
	public async execute(): Promise<LoadEnvironmentsResponse> {
		this.logger.debug('LoadEnvironmentsUseCase: Starting');

		try {
			// Get domain entities
			const environments = await this.repository.getAll();

			// Transform to sorted ViewModels (sorting is presentation concern handled by mapper)
			const viewModels = this.mapper.toViewModels(environments, true);

			this.logger.info('Loaded environments', { count: viewModels.length });

			const result: LoadEnvironmentsResponse = {
				environments: viewModels,
				totalCount: viewModels.length
			};

			const activeId = viewModels.find(vm => vm.isActive)?.id;
			if (activeId !== undefined) {
				result.activeEnvironmentId = activeId;
			}

			return result;
		} catch (error) {
			this.logger.error('LoadEnvironmentsUseCase: Failed to load environments', error);
			throw error;
		}
	}
}

export interface LoadEnvironmentsResponse {
	environments: EnvironmentListViewModel[];
	totalCount: number;
	activeEnvironmentId?: string;
}
