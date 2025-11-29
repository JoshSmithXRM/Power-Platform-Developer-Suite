/**
 * Adapter that binds an environment ID to IImportJobRepository
 * to implement IVirtualTableDataProvider<ImportJob>.
 *
 * This allows the repository to be used with VirtualTableCacheManager
 * which expects a provider that doesn't take environmentId per call.
 */

import type { IVirtualTableDataProvider } from '../../../../shared/domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import type { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import type { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import type { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import type { ImportJob } from '../../domain/entities/ImportJob';

/**
 * Wraps IImportJobRepository to implement IVirtualTableDataProvider<ImportJob>.
 *
 * Binds a specific environmentId to the repository, allowing it to be used
 * with VirtualTableCacheManager which doesn't pass environmentId per call.
 *
 * @example
 * const adapter = new ImportJobDataProviderAdapter(repository, environmentId);
 * const cacheManager = new VirtualTableCacheManager(adapter, config, logger);
 */
export class ImportJobDataProviderAdapter implements IVirtualTableDataProvider<ImportJob> {
	constructor(
		private readonly repository: IImportJobRepository,
		private readonly environmentId: string
	) {}

	/**
	 * Retrieves a paginated subset of import jobs.
	 * Delegates to repository.findPaginated with bound environmentId.
	 */
	public async findPaginated(
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<ImportJob>> {
		return this.repository.findPaginated(
			this.environmentId,
			page,
			pageSize,
			options,
			cancellationToken
		);
	}

	/**
	 * Gets the total count of import jobs.
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
