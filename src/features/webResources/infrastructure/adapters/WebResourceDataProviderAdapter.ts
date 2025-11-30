/**
 * Adapter that binds an environment ID to IWebResourceRepository
 * to implement IVirtualTableDataProvider<WebResource>.
 *
 * This allows the repository to be used with VirtualTableCacheManager
 * which expects a provider that doesn't take environmentId per call.
 */

import type { IVirtualTableDataProvider } from '../../../../shared/domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import type { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import type { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import type { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import type { WebResource } from '../../domain/entities/WebResource';

/**
 * Wraps IWebResourceRepository to implement IVirtualTableDataProvider<WebResource>.
 *
 * Binds a specific environmentId to the repository, allowing it to be used
 * with VirtualTableCacheManager which doesn't pass environmentId per call.
 *
 * @example
 * const adapter = new WebResourceDataProviderAdapter(repository, environmentId);
 * const cacheManager = new VirtualTableCacheManager(adapter, config, logger);
 */
export class WebResourceDataProviderAdapter implements IVirtualTableDataProvider<WebResource> {
	constructor(
		private readonly repository: IWebResourceRepository,
		private readonly environmentId: string
	) {}

	/**
	 * Retrieves a paginated subset of web resources.
	 * Delegates to repository.findPaginated with bound environmentId.
	 */
	public async findPaginated(
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<WebResource>> {
		return this.repository.findPaginated(
			this.environmentId,
			page,
			pageSize,
			options,
			cancellationToken
		);
	}

	/**
	 * Gets the total count of web resources.
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
