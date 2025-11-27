/**
 * Immutable snapshot of cache state at a point in time.
 *
 * Tracks:
 * - How many records are cached
 * - Loading status
 * - Total records on server
 * - Current search filter
 *
 * Business Rules:
 * - cachedRecordCount must be >= 0
 * - totalRecordCount must be >= 0
 * - currentPage must be >= 0 (0 = no page loaded yet)
 *
 * @example
 * // Create initial empty state
 * const state = VirtualTableCacheState.createEmpty();
 *
 * // Update state immutably
 * const loadingState = state.withLoading(true).withPage(1);
 * const loadedState = loadingState.withLoading(false).withCachedCount(100);
 */
export class VirtualTableCacheState {
	private constructor(
		private readonly cachedRecordCount: number,
		private readonly totalRecordCount: number,
		private readonly isLoading: boolean,
		private readonly currentPage: number,
		private readonly searchFilter: string | null
	) {
		this.validate();
	}

	/**
	 * Creates initial empty state.
	 */
	public static createEmpty(): VirtualTableCacheState {
		return new VirtualTableCacheState(
			0, // cachedRecordCount
			0, // totalRecordCount
			false, // isLoading
			0, // currentPage (0 = no page loaded)
			null // searchFilter
		);
	}

	/**
	 * Creates state from values.
	 *
	 * @param cachedRecordCount - Number of records currently in cache
	 * @param totalRecordCount - Total records available on server
	 * @param isLoading - Whether data is currently being loaded
	 * @param currentPage - Current page being loaded or last loaded page
	 * @param searchFilter - Active search filter text (or null)
	 * @returns Immutable VirtualTableCacheState instance
	 * @throws Error if validation fails
	 */
	public static create(
		cachedRecordCount: number,
		totalRecordCount: number,
		isLoading: boolean,
		currentPage: number,
		searchFilter: string | null = null
	): VirtualTableCacheState {
		return new VirtualTableCacheState(
			cachedRecordCount,
			totalRecordCount,
			isLoading,
			currentPage,
			searchFilter
		);
	}

	/**
	 * Validates business rules.
	 *
	 * @throws Error if constraints violated
	 */
	private validate(): void {
		if (this.cachedRecordCount < 0) {
			throw new Error('Cached record count must be >= 0');
		}

		if (this.totalRecordCount < 0) {
			throw new Error('Total record count must be >= 0');
		}

		if (this.currentPage < 0) {
			throw new Error('Current page must be >= 0');
		}
	}

	/**
	 * Checks if all available records are cached.
	 *
	 * Business Rule: cached >= total AND not loading
	 */
	public isFullyCached(): boolean {
		return !this.isLoading && this.cachedRecordCount >= this.totalRecordCount;
	}

	/**
	 * Checks if cache is empty.
	 */
	public isEmpty(): boolean {
		return this.cachedRecordCount === 0;
	}

	/**
	 * Checks if cache has records.
	 */
	public hasRecords(): boolean {
		return this.cachedRecordCount > 0;
	}

	/**
	 * Checks if currently searching/filtering.
	 */
	public isFiltered(): boolean {
		return this.searchFilter !== null && this.searchFilter.length > 0;
	}

	/**
	 * Gets cache completion percentage (0-100).
	 *
	 * Business Rule: (cached / total) * 100
	 * Returns 100 if total is 0 (avoid division by zero)
	 */
	public getCachePercentage(): number {
		if (this.totalRecordCount === 0) {
			return 100;
		}

		const percentage = (this.cachedRecordCount / this.totalRecordCount) * 100;
		return Math.min(Math.round(percentage), 100);
	}

	/**
	 * Gets the remaining records to be cached.
	 *
	 * Returns 0 if fully cached or if totalRecordCount < cachedRecordCount.
	 */
	public getRemainingRecords(): number {
		const remaining = this.totalRecordCount - this.cachedRecordCount;
		return Math.max(0, remaining);
	}

	/**
	 * Checks if there are more records on the server beyond what's cached.
	 */
	public hasMoreRecordsOnServer(): boolean {
		return this.totalRecordCount > this.cachedRecordCount;
	}

	/**
	 * Creates updated state with new cached count (immutable).
	 */
	public withCachedCount(count: number): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			count,
			this.totalRecordCount,
			this.isLoading,
			this.currentPage,
			this.searchFilter
		);
	}

	/**
	 * Creates updated state with new total count (immutable).
	 */
	public withTotalCount(count: number): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			count,
			this.isLoading,
			this.currentPage,
			this.searchFilter
		);
	}

	/**
	 * Creates updated state with new loading status (immutable).
	 */
	public withLoading(loading: boolean): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			loading,
			this.currentPage,
			this.searchFilter
		);
	}

	/**
	 * Creates updated state with new page (immutable).
	 */
	public withPage(page: number): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			this.isLoading,
			page,
			this.searchFilter
		);
	}

	/**
	 * Creates updated state with new search filter (immutable).
	 */
	public withSearchFilter(filter: string | null): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			this.isLoading,
			this.currentPage,
			filter
		);
	}

	/**
	 * Creates updated state with multiple values at once (immutable).
	 *
	 * Useful for updating several values without creating intermediate objects.
	 */
	public withUpdates(updates: {
		cachedCount?: number;
		totalCount?: number;
		loading?: boolean;
		page?: number;
		filter?: string | null;
	}): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			updates.cachedCount ?? this.cachedRecordCount,
			updates.totalCount ?? this.totalRecordCount,
			updates.loading ?? this.isLoading,
			updates.page ?? this.currentPage,
			updates.filter !== undefined ? updates.filter : this.searchFilter
		);
	}

	/**
	 * Gets the cached record count.
	 */
	public getCachedRecordCount(): number {
		return this.cachedRecordCount;
	}

	/**
	 * Gets the total record count on server.
	 */
	public getTotalRecordCount(): number {
		return this.totalRecordCount;
	}

	/**
	 * Gets whether data is currently loading.
	 */
	public getIsLoading(): boolean {
		return this.isLoading;
	}

	/**
	 * Gets the current page number.
	 */
	public getCurrentPage(): number {
		return this.currentPage;
	}

	/**
	 * Gets the active search filter (or null if not filtering).
	 */
	public getSearchFilter(): string | null {
		return this.searchFilter;
	}
}
