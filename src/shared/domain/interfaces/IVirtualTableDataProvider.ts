import type { PaginatedResult } from '../valueObjects/PaginatedResult';

import type { ICancellationToken } from './ICancellationToken';
import type { QueryOptions } from './QueryOptions';

/**
 * Domain interface for paginated data access.
 *
 * Implementations live in infrastructure layer (repositories).
 * Generic type T represents domain entities (not ViewModels - mapping happens in application layer).
 *
 * @example
 * // Repository implements this interface
 * class DataverseWebResourceRepository implements IVirtualTableDataProvider<WebResource> {
 *   async findPaginated(page, pageSize, options) { ... }
 *   async getCount(options) { ... }
 * }
 */
export interface IVirtualTableDataProvider<T> {
	/**
	 * Fetches a single page of records.
	 *
	 * @param page - Page number (1-based: page 1 = first page)
	 * @param pageSize - Records per page
	 * @param options - Optional query options (filter, orderBy, select)
	 * @param cancellationToken - Optional cancellation support
	 * @returns PaginatedResult with domain entities
	 *
	 * @throws Error if page < 1 or pageSize < 1
	 * @throws Error if cancellation requested
	 */
	findPaginated(
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<T>>;

	/**
	 * Gets total count of records matching filter.
	 *
	 * Used to show "X of Y total" in UI.
	 * Lightweight query - only returns count, not data.
	 *
	 * @param options - Optional filter
	 * @param cancellationToken - Optional cancellation support
	 * @returns Total record count
	 */
	getCount(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number>;
}
