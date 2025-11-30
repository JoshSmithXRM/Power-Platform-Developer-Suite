import type { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import type { QueryOptions } from '../../domain/interfaces/QueryOptions';
import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import type { VirtualTableCacheManager } from '../services/VirtualTableCacheManager';
import type { ILogger } from '../../../infrastructure/logging/ILogger';

/**
 * Result from virtual table search.
 *
 * Includes source to inform UI (e.g., "Searching server..." indicator).
 */
export interface SearchResult<T> {
	readonly results: readonly T[];
	readonly source: 'cache' | 'server';
}

/**
 * Function that builds OData $filter expression from search query.
 *
 * Domain-specific implementation provided by caller.
 *
 * @example
 * // For web resources:
 * const builder = (query) => `contains(name, '${query}') or contains(displayname, '${query}')`;
 *
 * // For solutions:
 * const builder = (query) => `contains(friendlyname, '${query}')`;
 */
export type ODataFilterBuilder = (query: string) => string;

/**
 * Orchestrates virtual table search with client-side cache + server fallback.
 *
 * Flow:
 * 1. User enters search query
 * 2. Filter cached records (instant)
 * 3. If 0 results AND cache not fully loaded: search server
 * 4. Return filtered results with source indicator
 *
 * NO business logic - delegates to cache manager and provider.
 *
 * @example
 * const searchUseCase = new SearchVirtualTableUseCase(
 *   cacheManager,
 *   provider,
 *   (record, query) => record.name.toLowerCase().includes(query),
 *   (query) => `contains(name, '${query}')`,
 *   logger
 * );
 *
 * // Search (tries cache first, falls back to server)
 * const { results, source } = await searchUseCase.execute('my-resource');
 */
export class SearchVirtualTableUseCase<T> {
	/**
	 * Default limit for server search results.
	 * Large enough to find matches, small enough to be responsive.
	 */
	private static readonly SERVER_SEARCH_LIMIT = 1000;

	constructor(
		private readonly cacheManager: VirtualTableCacheManager<T>,
		private readonly provider: IVirtualTableDataProvider<T>,
		private readonly filterFn: (record: T, query: string) => boolean,
		private readonly odataFilterBuilder: ODataFilterBuilder,
		private readonly logger: ILogger
	) {}

	/**
	 * Searches virtual table data.
	 *
	 * Orchestration:
	 * 1. If query empty, return all cached records
	 * 2. Filter cached records by query
	 * 3. If 0 results AND cache not fully loaded: search server with $filter
	 * 4. Return results with source indicator
	 *
	 * @param query - Search query string
	 * @param cancellationToken - Optional cancellation support
	 * @returns Domain entities with source indicator (caller maps to ViewModels)
	 */
	public async execute(
		query: string,
		cancellationToken?: ICancellationToken
	): Promise<SearchResult<T>> {
		this.logger.debug('SearchVirtualTableUseCase: Executing search', { query });

		// Empty query = return all cached
		if (!query || query.trim().length === 0) {
			const cached = this.cacheManager.getCachedRecords();
			this.logger.debug('SearchVirtualTableUseCase: Empty query, returning cached', {
				count: cached.length
			});
			return { results: cached, source: 'cache' };
		}

		// Normalize query for case-insensitive search
		const normalizedQuery = query.toLowerCase().trim();

		// Filter cached records
		const cachedResults = this.cacheManager.searchCached(record =>
			this.filterFn(record, normalizedQuery)
		);

		this.logger.debug('SearchVirtualTableUseCase: Cached search results', {
			query,
			count: cachedResults.length
		});

		// If found results in cache, return them
		if (cachedResults.length > 0) {
			return { results: cachedResults, source: 'cache' };
		}

		// Check if cache is fully loaded
		const cacheState = this.cacheManager.getCacheState();
		if (cacheState.isFullyCached()) {
			// Cache is complete and no results found - genuinely no matches
			this.logger.debug('SearchVirtualTableUseCase: Cache fully loaded, no matches');
			return { results: [], source: 'cache' };
		}

		// No cached results and cache not fully loaded - search server
		this.logger.info('SearchVirtualTableUseCase: No cached results, searching server', {
			query,
			cachedCount: cacheState.getCachedRecordCount(),
			totalCount: cacheState.getTotalRecordCount()
		});

		return await this.searchServer(query, cancellationToken);
	}

	/**
	 * Searches server with OData $filter query.
	 *
	 * Orchestration:
	 * - Build OData filter from query (domain-specific via builder function)
	 * - Fetch filtered results from server
	 * - Return results (do NOT cache - these are filtered results)
	 */
	private async searchServer(
		query: string,
		cancellationToken?: ICancellationToken
	): Promise<SearchResult<T>> {
		// Build OData filter using domain-specific builder
		const filterExpression = this.odataFilterBuilder(query);

		this.logger.debug('SearchVirtualTableUseCase: Server search with filter', {
			query,
			filter: filterExpression
		});

		const queryOptions: QueryOptions = {
			filter: filterExpression,
			top: SearchVirtualTableUseCase.SERVER_SEARCH_LIMIT
		};

		// Fetch filtered results from server
		const result = await this.provider.findPaginated(
			1,
			SearchVirtualTableUseCase.SERVER_SEARCH_LIMIT,
			queryOptions,
			cancellationToken
		);

		this.logger.info('SearchVirtualTableUseCase: Server search complete', {
			query,
			count: result.getItems().length,
			totalMatches: result.getTotalCount()
		});

		return {
			results: result.getItems(),
			source: 'server'
		};
	}
}
