import type { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import type { QueryOptions } from '../../domain/interfaces/QueryOptions';
import type { PaginatedResult } from '../../domain/valueObjects/PaginatedResult';
import { VirtualTableConfig } from '../../domain/valueObjects/VirtualTableConfig';
import { VirtualTableCacheState } from '../../domain/valueObjects/VirtualTableCacheState';
import type { ILogger } from '../../../infrastructure/logging/ILogger';

/**
 * Callback for cache state changes.
 * Used to notify panels of background loading progress.
 */
export type CacheStateChangeCallback<T> = (
	state: VirtualTableCacheState,
	cachedRecords: readonly T[]
) => void;

/**
 * Orchestrates background loading of paginated data into cache.
 *
 * Responsibilities:
 * - Load initial page
 * - Schedule background page loads
 * - Track cache state
 * - Support cancellation
 * - Emit progress events
 *
 * NO business logic - delegates to domain value objects and providers.
 *
 * @example
 * const cacheManager = new VirtualTableCacheManager(
 *   repository,
 *   VirtualTableConfig.createDefault(),
 *   logger
 * );
 *
 * // Load initial page (background loading starts automatically)
 * const result = await cacheManager.loadInitialPage(cancellationToken);
 *
 * // Get current cache state
 * const state = cacheManager.getCacheState();
 *
 * // Search cached records
 * const filtered = cacheManager.searchCached(r => r.name.includes('foo'));
 */
export class VirtualTableCacheManager<T> {
	private cachedRecords: T[] = [];
	private cacheState: VirtualTableCacheState = VirtualTableCacheState.createEmpty();
	private backgroundLoadingPromise: Promise<void> | null = null;
	private isCancelled: boolean = false;
	private stateChangeCallback: CacheStateChangeCallback<T> | null = null;

	constructor(
		private readonly provider: IVirtualTableDataProvider<T>,
		private readonly config: VirtualTableConfig,
		private readonly logger: ILogger
	) {}

	/**
	 * Registers a callback to be notified of cache state changes.
	 *
	 * Useful for updating UI during background loading.
	 */
	public onStateChange(callback: CacheStateChangeCallback<T>): void {
		this.stateChangeCallback = callback;
	}

	/**
	 * Loads initial page of data.
	 *
	 * Orchestration:
	 * 1. Fetch first page from provider
	 * 2. Cache domain entities
	 * 3. Update cache state
	 * 4. Start background loading (if enabled)
	 *
	 * @param options - Optional query options (filter, orderBy)
	 * @param cancellationToken - Optional cancellation support
	 * @returns PaginatedResult with domain entities (caller maps to ViewModels)
	 */
	public async loadInitialPage(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<T>> {
		this.logger.debug('VirtualTableCacheManager: Loading initial page', {
			pageSize: this.config.getInitialPageSize()
		});

		// Reset cancellation flag
		this.isCancelled = false;

		// Update state: loading started
		this.cacheState = this.cacheState.withLoading(true).withPage(1);
		this.notifyStateChange();

		// Fetch first page from provider (domain entities, not ViewModels)
		const result = await this.provider.findPaginated(
			1,
			this.config.getInitialPageSize(),
			options,
			cancellationToken
		);

		// Cache domain entities
		this.cachedRecords = [...result.getItems()];

		// Update state
		this.cacheState = VirtualTableCacheState.create(
			this.cachedRecords.length,
			result.getTotalCount(),
			false, // loading complete
			1,
			null
		);
		this.notifyStateChange();

		this.logger.info('VirtualTableCacheManager: Initial page loaded', {
			cachedCount: this.cachedRecords.length,
			totalCount: result.getTotalCount()
		});

		// Start background loading (non-blocking)
		if (this.config.shouldLoadInBackground() && result.hasNextPage()) {
			void this.startBackgroundLoading(options, cancellationToken);
		}

		return result;
	}

	/**
	 * Starts background loading of remaining pages (non-blocking).
	 *
	 * Orchestration:
	 * - Loop through pages until maxCachedRecords reached
	 * - Fetch in batches (backgroundPageSize)
	 * - Update cache state after each page
	 * - Stop on cancellation
	 */
	private async startBackgroundLoading(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		if (this.backgroundLoadingPromise !== null) {
			return; // Already loading
		}

		this.backgroundLoadingPromise = this.loadBackgroundPages(options, cancellationToken);

		try {
			await this.backgroundLoadingPromise;
		} finally {
			this.backgroundLoadingPromise = null;
		}
	}

	/**
	 * Loads background pages until cache limit reached.
	 */
	private async loadBackgroundPages(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		this.logger.debug('VirtualTableCacheManager: Starting background loading', {
			maxCachedRecords: this.config.getMaxCachedRecords(),
			backgroundPageSize: this.config.getBackgroundPageSize()
		});

		let currentPage = 2; // Page 1 already loaded
		const maxCachedRecords = this.config.getMaxCachedRecords();

		while (this.cachedRecords.length < maxCachedRecords) {
			// Check cancellation
			if (this.isCancelled) {
				this.logger.debug('VirtualTableCacheManager: Background loading cancelled (manual)');
				break;
			}

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('VirtualTableCacheManager: Background loading cancelled (token)');
				break;
			}

			// Update state: loading
			this.cacheState = this.cacheState.withLoading(true).withPage(currentPage);
			this.notifyStateChange();

			try {
				// Fetch next page
				const result = await this.provider.findPaginated(
					currentPage,
					this.config.getBackgroundPageSize(),
					options,
					cancellationToken
				);

				// Add to cache (defensive: stop if exceeds max)
				const remainingCapacity = maxCachedRecords - this.cachedRecords.length;
				const itemsToAdd = result.getItems().slice(0, remainingCapacity);
				this.cachedRecords.push(...itemsToAdd);

				// Update state
				this.cacheState = VirtualTableCacheState.create(
					this.cachedRecords.length,
					result.getTotalCount(),
					false, // loading complete for this page
					currentPage,
					null
				);
				this.notifyStateChange();

				this.logger.debug('VirtualTableCacheManager: Background page loaded', {
					page: currentPage,
					cachedCount: this.cachedRecords.length,
					totalCount: result.getTotalCount()
				});

				// Stop if no more pages
				if (!result.hasNextPage()) {
					break;
				}

				currentPage++;
			} catch (error: unknown) {
				// Log error but don't throw - background loading is non-critical
				this.logger.warn('VirtualTableCacheManager: Background page load failed', {
					page: currentPage,
					error: error instanceof Error ? error.message : String(error)
				});
				break;
			}
		}

		// Update state: loading complete
		this.cacheState = this.cacheState.withLoading(false);
		this.notifyStateChange();

		this.logger.info('VirtualTableCacheManager: Background loading complete', {
			cachedCount: this.cachedRecords.length,
			totalCount: this.cacheState.getTotalRecordCount()
		});
	}

	/**
	 * Searches cached records using provided filter function.
	 *
	 * Client-side search - instant for cached records.
	 * Caller provides domain-specific filter logic.
	 *
	 * @param filterFn - Predicate function to filter records
	 * @returns Filtered domain entities (subset of cache)
	 */
	public searchCached(filterFn: (record: T) => boolean): T[] {
		return this.cachedRecords.filter(filterFn);
	}

	/**
	 * Clears cache and resets state.
	 *
	 * Used when environment changes or panel disposed.
	 * Cancels any ongoing background loading.
	 */
	public clearCache(): void {
		this.isCancelled = true;
		this.cachedRecords = [];
		this.cacheState = VirtualTableCacheState.createEmpty();
		this.logger.debug('VirtualTableCacheManager: Cache cleared');
	}

	/**
	 * Gets current cache state (immutable snapshot).
	 */
	public getCacheState(): VirtualTableCacheState {
		return this.cacheState;
	}

	/**
	 * Gets all cached records (defensive copy).
	 */
	public getCachedRecords(): readonly T[] {
		return [...this.cachedRecords];
	}

	/**
	 * Checks if background loading is in progress.
	 */
	public isBackgroundLoading(): boolean {
		return this.backgroundLoadingPromise !== null;
	}

	/**
	 * Cancels background loading.
	 *
	 * Non-blocking - sets flag that background loader checks.
	 */
	public cancelBackgroundLoading(): void {
		if (this.backgroundLoadingPromise !== null) {
			this.logger.debug('VirtualTableCacheManager: Cancelling background loading');
			this.isCancelled = true;
		}
	}

	/**
	 * Waits for background loading to complete.
	 *
	 * Useful for tests or cleanup.
	 */
	public async waitForBackgroundLoading(): Promise<void> {
		if (this.backgroundLoadingPromise !== null) {
			await this.backgroundLoadingPromise;
		}
	}

	/**
	 * Notifies registered callback of state change.
	 */
	private notifyStateChange(): void {
		if (this.stateChangeCallback !== null) {
			this.stateChangeCallback(this.cacheState, [...this.cachedRecords]);
		}
	}
}
