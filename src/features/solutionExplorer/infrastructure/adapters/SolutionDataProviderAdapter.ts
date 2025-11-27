/**
 * Adapter that binds an environment ID to ISolutionRepository
 * to implement IVirtualTableDataProvider<Solution>.
 *
 * This allows the repository to be used with VirtualTableCacheManager
 * which expects a provider that doesn't take environmentId per call.
 */

import type { IVirtualTableDataProvider } from '../../../../shared/domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import type { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import type { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import type { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import type { Solution } from '../../domain/entities/Solution';

/**
 * Wraps ISolutionRepository to implement IVirtualTableDataProvider<Solution>.
 *
 * Binds a specific environmentId to the repository, allowing it to be used
 * with VirtualTableCacheManager which doesn't pass environmentId per call.
 *
 * @example
 * const adapter = new SolutionDataProviderAdapter(repository, environmentId);
 * const cacheManager = new VirtualTableCacheManager(adapter, config, logger);
 */
export class SolutionDataProviderAdapter implements IVirtualTableDataProvider<Solution> {
	constructor(
		private readonly repository: ISolutionRepository,
		private readonly environmentId: string
	) {}

	/**
	 * Retrieves a paginated subset of solutions.
	 * Delegates to repository.findPaginated with bound environmentId.
	 */
	public async findPaginated(
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<Solution>> {
		return this.repository.findPaginated(
			this.environmentId,
			page,
			pageSize,
			options,
			cancellationToken
		);
	}

	/**
	 * Gets the total count of solutions.
	 * Delegates to repository.getCount with bound environmentId.
	 */
	public async getCount(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number> {
		return this.repository.getCount(
			this.environmentId,
			options,
			cancellationToken
		);
	}
}
