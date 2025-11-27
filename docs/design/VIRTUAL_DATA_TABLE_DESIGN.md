# Virtual Data Table Infrastructure - Technical Design

**Status:** Draft
**Date:** 2025-11-27
**Complexity:** Complex

---

## Overview

**User Problem:** Current `DataTableSection` loads ALL records into memory and renders ALL rows to DOM, causing browser freezes and memory issues with large datasets (70,000+ web resources). Users experience multi-second delays, unresponsive UI, and browser warnings.

**Solution:** Build a new `VirtualDataTableSection` component with server-side pagination, client-side caching, virtual scrolling, and intelligent search fallback. Initial page loads instantly (100 records), background loading continues, and only visible rows (~50) render to DOM.

**Value:** Enables performant browsing of large Power Platform datasets (70k+ web resources, trace logs, solutions) without browser freezes or memory issues. 10x faster initial load, smooth 60fps scrolling, instant client-side search.

---

## Requirements

### Functional Requirements
- [x] R1: Initial page load fetches first `pageSize` records (default: 100, configurable)
- [x] R2: Background loading continues until `maxCachedRecords` reached (default: 5000, configurable)
- [x] R3: Virtual scrolling renders only visible rows (~50-100 in DOM)
- [x] R4: Client-side search filters cached records instantly (< 100ms)
- [x] R5: When search term not found in cache, query server with `$filter` OData query
- [x] R6: "X of Y loaded, Z total on server" status indicator shows progress
- [x] R7: Configurable page sizes via `IConfigurationService` (blocked by `feature/configuration-settings`)
- [x] R8: Backward compatible - existing panels continue using `DataTableSection`
- [x] R9: Column sorting works with virtualized data (client-side for cached, server-side for full dataset)
- [x] R10: Smooth scroll experience with placeholder rows for un-cached data
- [x] R11: Cancel background loading when panel disposed or environment changed

### Non-Functional Requirements
- [x] NF1: 70k records initial load < 2 seconds (first page only)
- [x] NF2: Smooth 60fps scrolling through large datasets
- [x] NF3: No browser memory warnings at 70k records (only ~5k cached)
- [x] NF4: Search within cache < 100ms response time
- [x] NF5: Server search fallback shows loading indicator, no UI freeze
- [x] NF6: Memory footprint: ~200MB max for 5k cached records (ViewModels in memory)

### Success Criteria
- [x] Web Resources panel (70k records) loads instantly (first 100 records)
- [x] Scrolling through virtualized table is smooth (no jank, 60fps maintained)
- [x] Search within cache feels instant
- [x] Memory usage stays under 200MB for 5k cached records
- [x] All existing `DataTableSection` panel tests still pass (backward compatibility)
- [x] Server search fallback works seamlessly when search term not in cache

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can load first page and scroll virtually"
**Goal:** Prove virtual scrolling works with initial page load (no background loading yet)

**Domain:**
- `IVirtualTableDataProvider<T>` interface (paginated data access contract)
- `PaginatedResult<T>` value object (wraps page data + metadata)
- `VirtualTableConfig` value object (page sizes, cache limits)

**Application:**
- `VirtualTableViewModel` (extends table data with pagination info)
- Basic state management (current page, total records)

**Infrastructure:**
- `VirtualDataTableSection` skeleton (delegates to view)
- `virtualTableSectionView.ts` (initial HTML with virtual container)
- `VirtualTableRenderer.js` (TanStack Virtual integration, renders visible rows only)
- Repository method: `findPaginated(envId, page, pageSize)` (single page fetch)

**Presentation:**
- CSS for virtual scroll container (fixed height, overflow)
- Basic loading indicator

**Result:** WORKING VIRTUAL SCROLLING ✅ (first page only, proves entire stack)

---

### Slice 2: "User sees background loading progress"
**Builds on:** Slice 1

**Domain:**
- `VirtualTableCacheState` value object (tracks cached records, loading status)

**Application:**
- `VirtualTableCacheManager` (orchestrates background loading)
- Enhanced `VirtualTableViewModel` (adds loading progress fields)

**Infrastructure:**
- Background page fetcher (loads pages 2+ until cache limit)
- Status indicator updates (X of Y loaded)
- Cancellation token support (stop loading on dispose)

**Presentation:**
- Progress indicator UI ("Loading... 2,500 of 5,000 cached, 70,000 total")
- Loading spinner during background fetch

**Result:** BACKGROUND LOADING ✅ (progressive enhancement, user sees progress)

---

### Slice 3: "User can search cached records instantly"
**Builds on:** Slice 2

**Domain:**
- No new domain entities (search is application concern)

**Application:**
- `SearchVirtualTableUseCase` (filters cached records by query)
- Enhanced `VirtualTableViewModel` (filtered results)

**Infrastructure:**
- `VirtualTableRenderer.js` enhanced with search behavior
- Client-side filtering of cached ViewModels
- Real-time re-virtualization on search results

**Presentation:**
- Search input wired to client-side filter
- "X of Y visible" footer during search

**Result:** INSTANT CLIENT-SIDE SEARCH ✅ (< 100ms response)

---

### Slice 4: "User can search server when term not in cache"
**Builds on:** Slice 3

**Domain:**
- No changes (repository already supports `filter` in `QueryOptions`)

**Application:**
- Enhanced `SearchVirtualTableUseCase` (detects no results, triggers server search)

**Infrastructure:**
- Server search fallback (`findPaginated` with `$filter` OData query)
- Replace cache with server results (discard previous cache)
- Loading indicator during server search

**Presentation:**
- "Searching server..." indicator
- Seamless transition from client → server search

**Result:** SERVER SEARCH FALLBACK ✅ (complete search experience)

---

### Slice 5: "User can sort virtualized columns"
**Builds on:** Slice 4

**Domain:**
- No changes (sorting is application/infrastructure concern)

**Application:**
- Sorting aware of cache state (client-side if all cached, server-side if not)

**Infrastructure:**
- Client-side sort for cached records (instant)
- Server-side sort for full dataset (re-fetch with `$orderby`)
- Indicator shows "Sorting cached records" vs "Sorting all records (loading...)"

**Presentation:**
- Column headers clickable
- Sort indicators (▲ ▼)
- Loading state during server sort

**Result:** COMPLETE SORTING ✅ (intelligent client/server decision)

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - Panels use VirtualDataTableSection (opt-in)               │
│ - VirtualTableRenderer.js (webview-side virtual scrolling)  │
│ - Data-driven updates (postMessage with ViewModels)         │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - VirtualTableCacheManager (orchestrates background load)   │
│ - SearchVirtualTableUseCase (client search + fallback)      │
│ - VirtualTableViewModel (pagination + loading state)        │
│ - NO business logic (delegates to domain)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - IVirtualTableDataProvider<T> (paginated data contract)    │
│ - PaginatedResult<T> (immutable page wrapper)               │
│ - VirtualTableConfig (page sizes, cache limits)             │
│ - VirtualTableCacheState (tracks cache status)              │
│ - ZERO external dependencies                               │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - VirtualDataTableSection (section implementation)          │
│ - Repository.findPaginated() (implements IProvider)         │
│ - VirtualTableRenderer.js (TanStack Virtual integration)    │
│ - InMemoryVirtualTableCache (cache implementation)          │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

❌ **NEVER:**
- Domain → Infrastructure (no TanStack Virtual imports in domain)
- Domain → Presentation (no webview logic in domain)
- Application → Infrastructure (use cases depend on interfaces, not implementations)

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### IVirtualTableDataProvider Interface

```typescript
// src/shared/domain/interfaces/IVirtualTableDataProvider.ts

/**
 * Domain interface for paginated data access.
 * Implementations live in infrastructure layer (repositories).
 *
 * Generic type T represents domain entities (not ViewModels - mapping happens in application layer).
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
```

#### PaginatedResult Value Object

```typescript
// src/shared/domain/valueObjects/PaginatedResult.ts

/**
 * Immutable value object representing a single page of results.
 *
 * Contains domain entities (T) and pagination metadata.
 * Created by repositories, consumed by use cases.
 */
export class PaginatedResult<T> {
	private constructor(
		private readonly items: readonly T[],
		private readonly page: number,
		private readonly pageSize: number,
		private readonly totalCount: number
	) {
		this.validate();
	}

	/**
	 * Creates a paginated result.
	 *
	 * Business Rules:
	 * - Page must be >= 1 (1-based pagination)
	 * - Page size must be > 0
	 * - Total count must be >= 0
	 * - Items length must be <= pageSize
	 *
	 * @throws Error if invariants violated
	 */
	public static create<T>(
		items: readonly T[],
		page: number,
		pageSize: number,
		totalCount: number
	): PaginatedResult<T> {
		return new PaginatedResult(items, page, pageSize, totalCount);
	}

	/**
	 * Validates business rules on construction.
	 *
	 * @throws Error if page < 1
	 * @throws Error if pageSize < 1
	 * @throws Error if totalCount < 0
	 * @throws Error if items.length > pageSize
	 */
	private validate(): void {
		if (this.page < 1) {
			throw new Error('Page must be >= 1 (1-based pagination)');
		}

		if (this.pageSize < 1) {
			throw new Error('Page size must be > 0');
		}

		if (this.totalCount < 0) {
			throw new Error('Total count must be >= 0');
		}

		if (this.items.length > this.pageSize) {
			throw new Error(`Items length (${this.items.length}) exceeds page size (${this.pageSize})`);
		}
	}

	/**
	 * Checks if this is the first page.
	 */
	public isFirstPage(): boolean {
		return this.page === 1;
	}

	/**
	 * Checks if this is the last page.
	 *
	 * Business Rule: Last page when start index + items >= total count
	 */
	public isLastPage(): boolean {
		const startIndex = (this.page - 1) * this.pageSize;
		return startIndex + this.items.length >= this.totalCount;
	}

	/**
	 * Calculates total number of pages.
	 *
	 * Business Rule: Math.ceil(totalCount / pageSize)
	 * Empty dataset = 0 pages
	 */
	public getTotalPages(): number {
		if (this.totalCount === 0) {
			return 0;
		}
		return Math.ceil(this.totalCount / this.pageSize);
	}

	/**
	 * Checks if more pages exist after this one.
	 */
	public hasNextPage(): boolean {
		return !this.isLastPage();
	}

	/**
	 * Gets next page number (or null if last page).
	 */
	public getNextPage(): number | null {
		return this.hasNextPage() ? this.page + 1 : null;
	}

	// Getters (immutable access)
	public getItems(): readonly T[] { return this.items; }
	public getPage(): number { return this.page; }
	public getPageSize(): number { return this.pageSize; }
	public getTotalCount(): number { return this.totalCount; }
}
```

#### VirtualTableConfig Value Object

```typescript
// src/shared/domain/valueObjects/VirtualTableConfig.ts

/**
 * Immutable configuration for virtual table behavior.
 *
 * Business Rules:
 * - initialPageSize: First page load (default: 100, range: 10-1000)
 * - maxCachedRecords: Max records in memory (default: 5000, range: 100-50000)
 * - backgroundPageSize: Background load page size (default: 500, range: 100-5000)
 * - maxCachedRecords must be >= initialPageSize
 * - backgroundPageSize should be >= initialPageSize (for efficiency)
 */
export class VirtualTableConfig {
	private constructor(
		private readonly initialPageSize: number,
		private readonly maxCachedRecords: number,
		private readonly backgroundPageSize: number,
		private readonly enableBackgroundLoading: boolean
	) {
		this.validate();
	}

	/**
	 * Creates default configuration.
	 *
	 * Defaults optimized for 70k record datasets:
	 * - initialPageSize: 100 (instant load)
	 * - maxCachedRecords: 5000 (reasonable memory footprint)
	 * - backgroundPageSize: 500 (efficient batching)
	 * - enableBackgroundLoading: true
	 */
	public static createDefault(): VirtualTableConfig {
		return new VirtualTableConfig(
			100,   // initialPageSize
			5000,  // maxCachedRecords
			500,   // backgroundPageSize
			true   // enableBackgroundLoading
		);
	}

	/**
	 * Creates custom configuration.
	 *
	 * @throws Error if validation fails
	 */
	public static create(
		initialPageSize: number,
		maxCachedRecords: number,
		backgroundPageSize: number,
		enableBackgroundLoading: boolean = true
	): VirtualTableConfig {
		return new VirtualTableConfig(
			initialPageSize,
			maxCachedRecords,
			backgroundPageSize,
			enableBackgroundLoading
		);
	}

	/**
	 * Validates business rules.
	 *
	 * @throws Error if constraints violated
	 */
	private validate(): void {
		if (this.initialPageSize < 10 || this.initialPageSize > 1000) {
			throw new Error('Initial page size must be between 10 and 1000');
		}

		if (this.maxCachedRecords < 100 || this.maxCachedRecords > 50000) {
			throw new Error('Max cached records must be between 100 and 50000');
		}

		if (this.backgroundPageSize < 100 || this.backgroundPageSize > 5000) {
			throw new Error('Background page size must be between 100 and 5000');
		}

		if (this.maxCachedRecords < this.initialPageSize) {
			throw new Error('Max cached records must be >= initial page size');
		}

		// Recommendation, not hard constraint
		if (this.backgroundPageSize < this.initialPageSize) {
			console.warn(
				`Background page size (${this.backgroundPageSize}) is smaller than ` +
				`initial page size (${this.initialPageSize}). Consider increasing for efficiency.`
			);
		}
	}

	/**
	 * Checks if background loading is enabled.
	 */
	public shouldLoadInBackground(): boolean {
		return this.enableBackgroundLoading;
	}

	/**
	 * Calculates how many background pages to load.
	 *
	 * Business Rule: (maxCachedRecords - initialPageSize) / backgroundPageSize
	 */
	public getBackgroundPageCount(): number {
		if (!this.enableBackgroundLoading) {
			return 0;
		}

		const remainingRecords = this.maxCachedRecords - this.initialPageSize;
		return Math.ceil(remainingRecords / this.backgroundPageSize);
	}

	// Getters
	public getInitialPageSize(): number { return this.initialPageSize; }
	public getMaxCachedRecords(): number { return this.maxCachedRecords; }
	public getBackgroundPageSize(): number { return this.backgroundPageSize; }
}
```

#### VirtualTableCacheState Value Object

```typescript
// src/shared/domain/valueObjects/VirtualTableCacheState.ts

/**
 * Immutable snapshot of cache state at a point in time.
 *
 * Tracks:
 * - How many records cached
 * - Loading status
 * - Total records on server
 * - Current search filter
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
			0,    // cachedRecordCount
			0,    // totalRecordCount
			false, // isLoading
			0,    // currentPage
			null  // searchFilter
		);
	}

	/**
	 * Creates state from values.
	 *
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

		// Note: cachedRecordCount can exceed totalRecordCount during filtered search
		// (cache may have different results than current filter)
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
	 * Creates updated state with new values (immutable).
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

	public withTotalCount(count: number): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			count,
			this.isLoading,
			this.currentPage,
			this.searchFilter
		);
	}

	public withLoading(loading: boolean): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			loading,
			this.currentPage,
			this.searchFilter
		);
	}

	public withPage(page: number): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			this.isLoading,
			page,
			this.searchFilter
		);
	}

	public withSearchFilter(filter: string | null): VirtualTableCacheState {
		return VirtualTableCacheState.create(
			this.cachedRecordCount,
			this.totalRecordCount,
			this.isLoading,
			this.currentPage,
			filter
		);
	}

	// Getters
	public getCachedRecordCount(): number { return this.cachedRecordCount; }
	public getTotalRecordCount(): number { return this.totalRecordCount; }
	public getIsLoading(): boolean { return this.isLoading; }
	public getCurrentPage(): number { return this.currentPage; }
	public getSearchFilter(): string | null { return this.searchFilter; }
}
```

---

### Application Layer Types

#### VirtualTableViewModel

```typescript
// src/shared/application/viewModels/VirtualTableViewModel.ts

/**
 * ViewModel for virtual table data.
 * Extends base table data with pagination and cache state.
 *
 * Consumed by VirtualDataTableSection for rendering.
 */
export interface VirtualTableViewModel<TRow = Record<string, unknown>> {
	/**
	 * Row data (array of ViewModels specific to feature).
	 * Example: WebResourceViewModel[], SolutionViewModel[], etc.
	 */
	readonly rows: readonly TRow[];

	/**
	 * Pagination metadata for status display.
	 */
	readonly pagination: {
		readonly cachedCount: number;
		readonly totalCount: number;
		readonly isLoading: boolean;
		readonly currentPage: number;
		readonly isFullyCached: boolean;
	};

	/**
	 * Search/filter state.
	 */
	readonly filter: {
		readonly query: string | null;
		readonly isActive: boolean;
		readonly visibleCount: number; // After client-side filter
	};

	/**
	 * Virtualization hint (calculated by use case).
	 * Webview uses this to configure virtual scroller.
	 */
	readonly virtualization: {
		readonly totalItems: number; // Total virtualizable items
		readonly estimatedItemHeight: number; // Pixels per row (for scrollbar sizing)
	};
}
```

#### VirtualTableCacheManager

```typescript
// src/shared/application/services/VirtualTableCacheManager.ts

import { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import { PaginatedResult } from '../../domain/valueObjects/PaginatedResult';
import { VirtualTableConfig } from '../../domain/valueObjects/VirtualTableConfig';
import { VirtualTableCacheState } from '../../domain/valueObjects/VirtualTableCacheState';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { ILogger } from '../../../infrastructure/logging/ILogger';

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
 * NO business logic - delegates to domain entities and providers.
 */
export class VirtualTableCacheManager<T> {
	private cachedRecords: T[] = [];
	private cacheState: VirtualTableCacheState = VirtualTableCacheState.createEmpty();
	private backgroundLoadingPromise: Promise<void> | null = null;

	constructor(
		private readonly provider: IVirtualTableDataProvider<T>,
		private readonly config: VirtualTableConfig,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads initial page of data.
	 *
	 * Orchestration:
	 * 1. Fetch first page from provider
	 * 2. Cache domain entities
	 * 3. Update cache state
	 * 4. Start background loading (if enabled)
	 *
	 * @returns PaginatedResult with domain entities (NOT ViewModels - caller maps)
	 */
	public async loadInitialPage(
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<T>> {
		this.logger.debug('VirtualTableCacheManager: Loading initial page', {
			pageSize: this.config.getInitialPageSize()
		});

		// Update state: loading started
		this.cacheState = this.cacheState.withLoading(true).withPage(1);

		// Fetch first page from provider (domain entities, not ViewModels)
		const result = await this.provider.findPaginated(
			1,
			this.config.getInitialPageSize(),
			undefined,
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

		this.logger.info('VirtualTableCacheManager: Initial page loaded', {
			cachedCount: this.cachedRecords.length,
			totalCount: result.getTotalCount()
		});

		// Start background loading (non-blocking)
		if (this.config.shouldLoadInBackground() && result.hasNextPage()) {
			void this.startBackgroundLoading(cancellationToken);
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
		cancellationToken?: ICancellationToken
	): Promise<void> {
		if (this.backgroundLoadingPromise) {
			return; // Already loading
		}

		this.backgroundLoadingPromise = this.loadBackgroundPages(cancellationToken);

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
			if (cancellationToken?.isCancellationRequested()) {
				this.logger.debug('VirtualTableCacheManager: Background loading cancelled');
				break;
			}

			// Update state: loading
			this.cacheState = this.cacheState.withLoading(true).withPage(currentPage);

			// Fetch next page
			const result = await this.provider.findPaginated(
				currentPage,
				this.config.getBackgroundPageSize(),
				undefined,
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
		}

		this.logger.info('VirtualTableCacheManager: Background loading complete', {
			cachedCount: this.cachedRecords.length,
			totalCount: this.cacheState.getTotalRecordCount()
		});
	}

	/**
	 * Searches cached records (client-side filter).
	 *
	 * Business logic: Case-insensitive substring match across all record fields.
	 * Implementation: Caller provides filter function (domain-specific logic).
	 *
	 * @param filterFn - Domain-specific filter function
	 * @returns Filtered domain entities
	 */
	public searchCached(filterFn: (record: T) => boolean): T[] {
		return this.cachedRecords.filter(filterFn);
	}

	/**
	 * Clears cache and resets state.
	 *
	 * Used when environment changes or panel disposed.
	 */
	public clearCache(): void {
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
	 * Cancels background loading.
	 */
	public async cancelBackgroundLoading(): Promise<void> {
		if (this.backgroundLoadingPromise) {
			this.logger.debug('VirtualTableCacheManager: Cancelling background loading');
			// Cancellation token handles actual cancellation
			await this.backgroundLoadingPromise;
		}
	}
}
```

#### SearchVirtualTableUseCase

```typescript
// src/shared/application/useCases/SearchVirtualTableUseCase.ts

import { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import { VirtualTableCacheManager } from '../services/VirtualTableCacheManager';
import { QueryOptions } from '../../domain/interfaces/QueryOptions';
import { ILogger } from '../../../infrastructure/logging/ILogger';

/**
 * Orchestrates virtual table search with client-side cache + server fallback.
 *
 * Flow:
 * 1. User enters search query
 * 2. Filter cached records (instant)
 * 3. If 0 results AND cache not fully loaded: search server
 * 4. Return filtered results
 *
 * NO business logic - delegates to cache manager and provider.
 */
export class SearchVirtualTableUseCase<T> {
	constructor(
		private readonly cacheManager: VirtualTableCacheManager<T>,
		private readonly provider: IVirtualTableDataProvider<T>,
		private readonly filterFn: (record: T, query: string) => boolean,
		private readonly logger: ILogger
	) {}

	/**
	 * Searches virtual table data.
	 *
	 * Orchestration:
	 * 1. If query empty, return all cached records
	 * 2. Filter cached records by query
	 * 3. If 0 results AND cache not full: search server with $filter
	 * 4. Return results (caller maps to ViewModels)
	 *
	 * @param query - Search query string
	 * @returns Domain entities (NOT ViewModels)
	 */
	public async execute(query: string): Promise<{
		results: readonly T[];
		source: 'cache' | 'server';
	}> {
		this.logger.debug('SearchVirtualTableUseCase: Executing search', { query });

		// Empty query = return all cached
		if (!query || query.trim().length === 0) {
			const cached = this.cacheManager.getCachedRecords();
			this.logger.debug('SearchVirtualTableUseCase: Empty query, returning cached', {
				count: cached.length
			});
			return { results: cached, source: 'cache' };
		}

		// Filter cached records
		const normalizedQuery = query.toLowerCase();
		const cachedResults = this.cacheManager.searchCached(record =>
			this.filterFn(record, normalizedQuery)
		);

		this.logger.debug('SearchVirtualTableUseCase: Cached search results', {
			query,
			count: cachedResults.length
		});

		// If found results OR cache fully loaded, return cached results
		const cacheState = this.cacheManager.getCacheState();
		if (cachedResults.length > 0 || cacheState.isFullyCached()) {
			return { results: cachedResults, source: 'cache' };
		}

		// No cached results and cache not full - search server
		this.logger.info('SearchVirtualTableUseCase: No cached results, searching server', {
			query
		});

		return await this.searchServer(query);
	}

	/**
	 * Searches server with OData $filter query.
	 *
	 * Orchestration:
	 * - Build OData filter from query (domain-specific)
	 * - Fetch filtered results from server
	 * - Return results (do NOT cache - user may change filter)
	 */
	private async searchServer(query: string): Promise<{
		results: readonly T[];
		source: 'server';
	}> {
		// Build OData filter (domain-specific - implemented by caller via strategy)
		const filterExpression = this.buildODataFilter(query);

		const queryOptions: QueryOptions = {
			filter: filterExpression,
			top: 1000 // Limit server search results
		};

		// Fetch first page of filtered results
		const result = await this.provider.findPaginated(
			1,
			1000, // Page size for server search
			queryOptions
		);

		this.logger.info('SearchVirtualTableUseCase: Server search complete', {
			query,
			count: result.getItems().length
		});

		return {
			results: result.getItems(),
			source: 'server'
		};
	}

	/**
	 * Builds OData $filter expression from search query.
	 *
	 * Domain-specific implementation provided by caller.
	 * Example for web resources: contains(name, 'query') or contains(displayname, 'query')
	 *
	 * NOTE: This is a placeholder - actual implementation injected via strategy pattern.
	 */
	private buildODataFilter(query: string): string {
		// This will be overridden by feature-specific implementation
		throw new Error('OData filter builder must be provided by caller');
	}
}
```

---

### Infrastructure Layer Types

#### VirtualDataTableSection

```typescript
// src/shared/infrastructure/ui/sections/VirtualDataTableSection.ts

import type { DataTableConfig } from '../DataTablePanel';
import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';
import { renderVirtualTableSection } from '../views/virtualTableSectionView';
import type { ISection } from './ISection';

/**
 * Section for rendering virtualized data tables with pagination.
 *
 * Stateless section that delegates HTML generation to view layer.
 * Renders virtual scroll container - actual virtualization happens client-side.
 */
export class VirtualDataTableSection implements ISection {
	public readonly position = SectionPosition.Main;

	constructor(private readonly config: DataTableConfig) {}

	/**
	 * Renders virtual table HTML.
	 *
	 * Delegates to view layer for HTML generation.
	 * Initial render creates empty virtual container.
	 * Data populated via postMessage (data-driven updates).
	 */
	public render(data: SectionRenderData): string {
		const tableData = data.tableData || [];
		const customData = data.customData || {};

		return renderVirtualTableSection({
			data: tableData,
			config: this.config,
			pagination: customData['pagination'] as {
				cachedCount: number;
				totalCount: number;
				isLoading: boolean;
			} | undefined,
			isLoading: data.isLoading,
			errorMessage: data.errorMessage,
		});
	}
}
```

#### Virtual Table Section View

```typescript
// src/shared/infrastructure/ui/views/virtualTableSectionView.ts

import type { DataTableConfig } from '../DataTablePanel';
import { escapeHtml } from './htmlHelpers';

export interface VirtualTableViewData {
	readonly data: ReadonlyArray<Record<string, unknown>>;
	readonly config: DataTableConfig;
	readonly pagination?: {
		readonly cachedCount: number;
		readonly totalCount: number;
		readonly isLoading: boolean;
	};
	readonly isLoading?: boolean;
	readonly errorMessage?: string;
}

/**
 * Renders virtual table section with placeholder container.
 *
 * Virtual scrolling happens client-side via VirtualTableRenderer.js.
 * This creates the scaffolding - data populated via postMessage.
 */
export function renderVirtualTableSection(viewData: VirtualTableViewData): string {
	const { config, isLoading, errorMessage } = viewData;

	if (errorMessage) {
		return renderError(errorMessage);
	}

	if (isLoading) {
		return renderLoading();
	}

	return `
		<div class="virtual-table-wrapper">
			${config.enableSearch !== false ? renderSearchBox(config.searchPlaceholder) : ''}
			<div class="virtual-table-container" id="virtualTableContainer">
				<table id="virtualTable">
					<thead>
						<tr>
							${config.columns.map(col => renderTableHeader(col)).join('')}
						</tr>
					</thead>
					<tbody id="virtualTableBody">
						<!-- Rows rendered by VirtualTableRenderer.js -->
					</tbody>
				</table>
			</div>
			${renderFooter(viewData.pagination)}
		</div>
	`;
}

function renderSearchBox(placeholder: string): string {
	return `
		<div class="search-container">
			<input
				type="text"
				id="searchInput"
				placeholder="${escapeHtml(placeholder)}"
				autocomplete="off"
			>
		</div>
	`;
}

function renderTableHeader(
	column: { key: string; label: string; width?: string }
): string {
	const widthAttr = column.width ? ` style="width: ${column.width}"` : '';
	return `<th data-sort="${column.key}"${widthAttr}>${escapeHtml(column.label)}</th>`;
}

function renderFooter(
	pagination?: { cachedCount: number; totalCount: number; isLoading: boolean }
): string {
	if (!pagination) {
		return '<div class="table-footer">0 records</div>';
	}

	const { cachedCount, totalCount, isLoading } = pagination;
	const loadingIndicator = isLoading ? ' <span class="spinner-small"></span>' : '';

	let text = '';
	if (cachedCount === totalCount) {
		const recordText = totalCount === 1 ? 'record' : 'records';
		text = `${totalCount} ${recordText}`;
	} else {
		text = `${cachedCount} of ${totalCount} loaded`;
	}

	return `<div class="table-footer">${text}${loadingIndicator}</div>`;
}

function renderLoading(): string {
	return `
		<div class="loading-container">
			<span class="spinner"></span>
			<span>Loading...</span>
		</div>
	`;
}

function renderError(message: string): string {
	return `
		<div class="error">
			${escapeHtml(message)}
		</div>
	`;
}
```

#### VirtualTableRenderer.js (Webview-side)

```typescript
// resources/webview/js/renderers/VirtualTableRenderer.js

/**
 * Virtual Table Renderer
 *
 * Implements virtual scrolling using TanStack Virtual Core.
 * Renders only visible rows to DOM for performance.
 *
 * Integration with extension:
 * - Extension sends ViewModels via postMessage
 * - Renderer updates virtual scroller with new data
 * - Only ~50-100 rows in DOM at any time
 *
 * Dependencies:
 * - @tanstack/virtual-core (bundled in webview)
 * - TableRenderer.renderTableRow() (shared row rendering)
 */

import { Virtualizer } from '@tanstack/virtual-core';

class VirtualTableRenderer {
	constructor(tableId, columns, options = {}) {
		this.tableId = tableId;
		this.columns = columns;
		this.viewModels = [];
		this.virtualizer = null;

		this.estimatedItemHeight = options.estimatedItemHeight || 32; // px per row
		this.overscan = options.overscan || 10; // Extra rows to render

		this.initialize();
	}

	/**
	 * Initializes virtual scroller.
	 */
	initialize() {
		const container = document.querySelector(`#${this.tableId}Container`);
		const tbody = document.querySelector(`#${this.tableId} tbody`);

		if (!container || !tbody) {
			console.error('VirtualTableRenderer: Container or tbody not found');
			return;
		}

		// Create TanStack Virtualizer
		this.virtualizer = new Virtualizer({
			count: this.viewModels.length,
			getScrollElement: () => container,
			estimateSize: () => this.estimatedItemHeight,
			overscan: this.overscan,

			// Custom element rect observer (required for vanilla JS)
			observeElementRect: (instance, cb) => {
				const element = instance.scrollElement;
				if (!element) return;

				const resizeObserver = new ResizeObserver(() => {
					cb(element.getBoundingClientRect());
				});
				resizeObserver.observe(element);

				return () => resizeObserver.disconnect();
			},

			// Custom element offset observer (required for vanilla JS)
			observeElementOffset: (instance, cb) => {
				const element = instance.scrollElement;
				if (!element) return;

				const handleScroll = () => cb(element.scrollTop);
				element.addEventListener('scroll', handleScroll);

				return () => element.removeEventListener('scroll', handleScroll);
			},

			// Render visible items
			onChange: () => this.renderVisibleRows()
		});

		// Initial render
		this.renderVisibleRows();
	}

	/**
	 * Updates table with new ViewModels (called from extension via postMessage).
	 */
	updateData(viewModels) {
		this.viewModels = viewModels;

		if (this.virtualizer) {
			this.virtualizer.setOptions({
				count: viewModels.length
			});
		}

		this.renderVisibleRows();
	}

	/**
	 * Renders only visible rows to DOM.
	 *
	 * TanStack Virtual calculates which rows are visible based on scroll position.
	 * We render those rows + overscan buffer.
	 */
	renderVisibleRows() {
		if (!this.virtualizer) return;

		const tbody = document.querySelector(`#${this.tableId} tbody`);
		if (!tbody) return;

		const virtualItems = this.virtualizer.getVirtualItems();

		// Create spacer elements for virtualization
		const totalHeight = this.virtualizer.getTotalSize();
		const topSpacerHeight = virtualItems.length > 0 ? virtualItems[0].start : 0;
		const bottomSpacerHeight = totalHeight - (virtualItems.length > 0
			? virtualItems[virtualItems.length - 1].end
			: 0);

		// Build HTML for visible rows
		let html = '';

		// Top spacer (invisible placeholder for scrolled-past rows)
		if (topSpacerHeight > 0) {
			html += `<tr style="height: ${topSpacerHeight}px;"><td colspan="${this.columns.length}"></td></tr>`;
		}

		// Visible rows
		virtualItems.forEach(virtualRow => {
			const viewModel = this.viewModels[virtualRow.index];
			if (viewModel) {
				// Use shared TableRenderer.renderTableRow() for consistency
				html += window.TableRenderer.renderTableRow(viewModel, this.columns, virtualRow.index);
			}
		});

		// Bottom spacer (invisible placeholder for not-yet-scrolled rows)
		if (bottomSpacerHeight > 0) {
			html += `<tr style="height: ${bottomSpacerHeight}px;"><td colspan="${this.columns.length}"></td></tr>`;
		}

		// Update DOM (only visible rows + spacers)
		tbody.innerHTML = html;
	}

	/**
	 * Scrolls to specific index.
	 */
	scrollToIndex(index, options = {}) {
		if (this.virtualizer) {
			this.virtualizer.scrollToIndex(index, options);
		}
	}

	/**
	 * Gets scroll element for external control.
	 */
	getScrollElement() {
		return this.virtualizer?.scrollElement || null;
	}
}

// Make available globally
window.VirtualTableRenderer = VirtualTableRenderer;
```

#### Repository Implementation (findPaginated)

```typescript
// src/features/webResources/infrastructure/repositories/DataverseWebResourceRepository.ts
// (Add new method to existing repository)

/**
 * Fetches a single page of web resources.
 *
 * Implements IVirtualTableDataProvider<WebResource>.
 *
 * @param page - Page number (1-based)
 * @param pageSize - Records per page
 * @param options - Optional filter, orderBy, select
 * @param cancellationToken - Optional cancellation support
 * @returns PaginatedResult with WebResource entities
 */
async findPaginated(
	page: number,
	pageSize: number,
	options?: QueryOptions,
	cancellationToken?: ICancellationToken
): Promise<PaginatedResult<WebResource>> {
	// Validate inputs (business rules)
	if (page < 1) {
		throw new Error('Page must be >= 1 (1-based pagination)');
	}

	if (pageSize < 1) {
		throw new Error('Page size must be > 0');
	}

	// Build OData query with pagination
	const mergedOptions: QueryOptions = {
		select: [
			'webresourceid',
			'name',
			'displayname',
			'webresourcetype',
			'ismanaged',
			'modifiedon'
		],
		orderBy: 'name',
		...options,
		top: pageSize
	};

	// Calculate $skip for pagination
	const skip = (page - 1) * pageSize;

	const queryString = ODataQueryBuilder.build(mergedOptions);
	const skipParam = skip > 0 ? `$skip=${skip}` : '';
	const separator = queryString && skipParam ? '&' : '';
	const endpoint = `/api/data/v9.2/webresourceset?${queryString}${separator}${skipParam}`;

	this.logger.debug('Fetching web resources page from Dataverse API', {
		page,
		pageSize,
		skip
	});

	CancellationHelper.throwIfCancelled(cancellationToken);

	try {
		// Fetch page + total count (parallel for efficiency)
		const [response, totalCount] = await Promise.all([
			this.apiService.get<DataverseWebResourcesResponse>(
				this.environmentId,
				endpoint,
				cancellationToken
			),
			this.getCount(options, cancellationToken)
		]);

		CancellationHelper.throwIfCancelled(cancellationToken);

		// Map DTOs to domain entities
		const webResources = response.value.map(dto => this.mapToEntity(dto));

		this.logger.debug('Fetched web resources page', {
			page,
			pageSize,
			count: webResources.length,
			totalCount
		});

		// Create immutable PaginatedResult value object
		return PaginatedResult.create(
			webResources,
			page,
			pageSize,
			totalCount
		);
	} catch (error) {
		const normalizedError = normalizeError(error);
		this.logger.error('Failed to fetch web resources page', normalizedError);
		throw normalizedError;
	}
}

/**
 * Gets total count of web resources matching filter.
 *
 * Implements IVirtualTableDataProvider<WebResource>.getCount().
 *
 * @param options - Optional filter
 * @param cancellationToken - Optional cancellation support
 * @returns Total record count
 */
async getCount(
	options?: QueryOptions,
	cancellationToken?: ICancellationToken
): Promise<number> {
	// Build count query (OData $count endpoint)
	const filterParam = options?.filter ? `$filter=${options.filter}` : '';
	const endpoint = `/api/data/v9.2/webresourceset/$count${filterParam ? '?' + filterParam : ''}`;

	this.logger.debug('Fetching web resources count', { filter: options?.filter });

	CancellationHelper.throwIfCancelled(cancellationToken);

	try {
		// OData $count returns plain number, not JSON
		const count = await this.apiService.get<number>(
			this.environmentId,
			endpoint,
			cancellationToken
		);

		this.logger.debug('Fetched web resources count', { count });

		return count;
	} catch (error) {
		const normalizedError = normalizeError(error);
		this.logger.error('Failed to fetch web resources count', normalizedError);
		throw normalizedError;
	}
}
```

---

### Presentation Layer Types

#### Panel Integration Example

```typescript
// src/features/webResources/presentation/panels/WebResourcesPanel.ts
// (Modified to use VirtualDataTableSection)

type WebResourcesPanelCommands = 'refresh' | 'openResource' | 'environmentChange';

export class WebResourcesPanel {
	private readonly cacheManager: VirtualTableCacheManager<WebResource>;
	private readonly config: VirtualTableConfig;

	private constructor(
		// ... existing constructor params
	) {
		// Create virtual table config
		this.config = VirtualTableConfig.createDefault();

		// Create cache manager
		this.cacheManager = new VirtualTableCacheManager(
			this.repository, // implements IVirtualTableDataProvider<WebResource>
			this.config,
			this.logger
		);

		// ... rest of constructor
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<WebResourcesPanelCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		// Use VirtualDataTableSection instead of DataTableSection
		const sections = [
			new ActionButtonsSection({
				buttons: [
					{ id: 'refresh', label: 'Refresh' }
				]
			}, SectionPosition.Toolbar),
			new EnvironmentSelectorSection(),
			new VirtualDataTableSection({ // NEW: Virtual table section
				viewType: WebResourcesPanel.viewType,
				columns: [
					{ key: 'name', label: 'Name', width: '30%' },
					{ key: 'type', label: 'Type', width: '15%' },
					{ key: 'size', label: 'Size', width: '15%' },
					{ key: 'modifiedOn', label: 'Modified', width: '20%' },
					{ key: 'isManaged', label: 'Managed', width: '10%' }
				],
				searchPlaceholder: 'Search web resources...',
				noDataMessage: 'No web resources found.'
			})
		];

		// ... rest of coordinator setup (same as before)
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing web resources (virtual table)');

		try {
			// Load initial page (background loading starts automatically)
			const result = await this.cacheManager.loadInitialPage();

			// Map domain entities to ViewModels
			const viewModels = result.getItems().map(wr =>
				this.viewModelMapper.toViewModel(wr)
			);

			// Get cache state
			const cacheState = this.cacheManager.getCacheState();

			// Send VirtualTableViewModel to client
			await this.panel.webview.postMessage({
				command: 'updateVirtualTable',
				data: {
					rows: viewModels,
					pagination: {
						cachedCount: cacheState.getCachedRecordCount(),
						totalCount: cacheState.getTotalRecordCount(),
						isLoading: cacheState.getIsLoading(),
						currentPage: cacheState.getCurrentPage(),
						isFullyCached: cacheState.isFullyCached()
					},
					filter: {
						query: null,
						isActive: false,
						visibleCount: viewModels.length
					},
					virtualization: {
						totalItems: viewModels.length,
						estimatedItemHeight: 32 // pixels per row
					}
				}
			});
		} catch (error: unknown) {
			this.logger.error('Error refreshing web resources', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh: ${errorMessage}`);
		}
	}

	/**
	 * Handles environment change - clears cache and reloads.
	 */
	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.currentEnvironmentId = environmentId;

		// Clear cache (important: prevents stale data)
		this.cacheManager.clearCache();

		// Reload data
		await this.handleRefresh();
	}

	/**
	 * Panel disposal - cancel background loading.
	 */
	public dispose(): void {
		void this.cacheManager.cancelBackgroundLoading();
		// ... rest of disposal
	}
}
```

---

## File Structure

```
src/shared/
├── domain/
│   ├── interfaces/
│   │   └── IVirtualTableDataProvider.ts       # NEW - Paginated data provider contract
│   └── valueObjects/
│       ├── PaginatedResult.ts                 # NEW - Immutable page wrapper
│       ├── VirtualTableConfig.ts              # NEW - Configuration value object
│       └── VirtualTableCacheState.ts          # NEW - Cache state snapshot
│
├── application/
│   ├── services/
│   │   └── VirtualTableCacheManager.ts        # NEW - Cache orchestration
│   ├── useCases/
│   │   └── SearchVirtualTableUseCase.ts       # NEW - Search with fallback
│   └── viewModels/
│       └── VirtualTableViewModel.ts           # NEW - Virtual table ViewModel
│
└── infrastructure/
    └── ui/
        ├── sections/
        │   └── VirtualDataTableSection.ts     # NEW - Virtual table section
        └── views/
            └── virtualTableSectionView.ts     # NEW - Virtual table HTML

resources/webview/js/renderers/
└── VirtualTableRenderer.js                    # NEW - TanStack Virtual integration

src/features/webResources/infrastructure/repositories/
└── DataverseWebResourceRepository.ts          # MODIFIED - Add findPaginated() + getCount()

src/features/webResources/presentation/panels/
└── WebResourcesPanel.ts                       # MODIFIED - Use VirtualDataTableSection
```

**New Files:** 8 files
**Modified Files:** 2 existing files (repository + panel)
**Total:** 10 files for MVP (Slice 1)

**Additional files for Slices 2-5:** ~5 files (search use case, enhanced renderer, CSS styles)

---

## Data Flow Diagrams

### Initial Page Load Flow

```
User Opens Panel
       ↓
Panel.handleRefresh()
       ↓
VirtualTableCacheManager.loadInitialPage()
       ↓
IVirtualTableDataProvider.findPaginated(page=1, pageSize=100)
       ↓
Repository fetches page 1 from Dataverse API
       ↓
PaginatedResult<WebResource> (domain entities)
       ↓
CacheManager caches entities, starts background loading
       ↓
Panel maps entities → ViewModels
       ↓
Panel sends VirtualTableViewModel via postMessage
       ↓
VirtualTableRenderer.updateData(viewModels)
       ↓
TanStack Virtual calculates visible rows
       ↓
Renderer updates DOM (only ~50 visible rows)
       ↓
User sees instant table (100 records loaded, 69,900 remaining in background)
```

### Background Loading Flow

```
Background Loading Task (non-blocking)
       ↓
Loop: page 2, 3, 4... until maxCachedRecords reached
       ↓
For each page:
  ├─ Check cancellation token
  ├─ Fetch page from provider (500 records per page)
  ├─ Add to cache
  ├─ Update cache state
  ├─ Send progress update to panel (optional)
  └─ Continue if more pages
       ↓
Stop when:
  - Cache limit reached (5000 records cached)
  - No more pages on server
  - Cancellation requested (environment changed, panel disposed)
```

### Client-Side Search Flow

```
User types in search box
       ↓
VirtualTableRenderer debounces input (300ms)
       ↓
SearchVirtualTableUseCase.execute(query)
       ↓
CacheManager.searchCached(filterFn)
       ↓
Filter cached domain entities by query
       ↓
Results found? ──Yes─→ Return cached results
       ↓ No
Cache fully loaded? ──Yes─→ Return empty results
       ↓ No
Server search fallback
       ↓
Provider.findPaginated(page=1, options={ filter: OData query })
       ↓
Return server results
       ↓
Panel maps results → ViewModels
       ↓
VirtualTableRenderer updates with filtered ViewModels
       ↓
User sees instant search results
```

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
// src/shared/domain/valueObjects/PaginatedResult.test.ts

describe('PaginatedResult', () => {
	describe('create', () => {
		it('should create valid paginated result', () => {
			const items = [{ id: '1' }, { id: '2' }];
			const result = PaginatedResult.create(items, 1, 10, 100);

			expect(result.getItems()).toEqual(items);
			expect(result.getPage()).toBe(1);
			expect(result.getPageSize()).toBe(10);
			expect(result.getTotalCount()).toBe(100);
		});

		it('should throw if page < 1', () => {
			expect(() => PaginatedResult.create([], 0, 10, 100))
				.toThrow('Page must be >= 1');
		});

		it('should throw if pageSize < 1', () => {
			expect(() => PaginatedResult.create([], 1, 0, 100))
				.toThrow('Page size must be > 0');
		});

		it('should throw if items exceed pageSize', () => {
			const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
			expect(() => PaginatedResult.create(items, 1, 2, 100))
				.toThrow('Items length (3) exceeds page size (2)');
		});
	});

	describe('isFirstPage', () => {
		it('should return true for page 1', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.isFirstPage()).toBe(true);
		});

		it('should return false for page 2', () => {
			const result = PaginatedResult.create([], 2, 10, 100);
			expect(result.isFirstPage()).toBe(false);
		});
	});

	describe('isLastPage', () => {
		it('should return true when on last page', () => {
			// Page 10, items 91-100 of 100 total
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 10, 10, 100);
			expect(result.isLastPage()).toBe(true);
		});

		it('should return true when partial last page', () => {
			// Page 11, items 101-105 of 105 total
			const items = Array(5).fill({ id: '1' });
			const result = PaginatedResult.create(items, 11, 10, 105);
			expect(result.isLastPage()).toBe(true);
		});

		it('should return false when more pages exist', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 1, 10, 100);
			expect(result.isLastPage()).toBe(false);
		});
	});

	describe('getTotalPages', () => {
		it('should calculate total pages correctly', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.getTotalPages()).toBe(10);
		});

		it('should handle partial last page', () => {
			const result = PaginatedResult.create([], 1, 10, 105);
			expect(result.getTotalPages()).toBe(11);
		});

		it('should return 0 for empty dataset', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.getTotalPages()).toBe(0);
		});
	});
});

// Similar tests for VirtualTableConfig, VirtualTableCacheState
```

### Application Tests (Target: 90% coverage)

```typescript
// src/shared/application/services/VirtualTableCacheManager.test.ts

describe('VirtualTableCacheManager', () => {
	let cacheManager: VirtualTableCacheManager<TestEntity>;
	let mockProvider: jest.Mocked<IVirtualTableDataProvider<TestEntity>>;
	let mockLogger: NullLogger;

	beforeEach(() => {
		mockProvider = {
			findPaginated: jest.fn(),
			getCount: jest.fn()
		} as any;

		mockLogger = new NullLogger();

		const config = VirtualTableConfig.createDefault();
		cacheManager = new VirtualTableCacheManager(mockProvider, config, mockLogger);
	});

	describe('loadInitialPage', () => {
		it('should load first page and cache records', async () => {
			const entities = [{ id: '1' }, { id: '2' }];
			const paginatedResult = PaginatedResult.create(entities, 1, 100, 1000);

			mockProvider.findPaginated.mockResolvedValue(paginatedResult);

			const result = await cacheManager.loadInitialPage();

			expect(result.getItems()).toEqual(entities);
			expect(mockProvider.findPaginated).toHaveBeenCalledWith(1, 100, undefined, undefined);

			const cacheState = cacheManager.getCacheState();
			expect(cacheState.getCachedRecordCount()).toBe(2);
			expect(cacheState.getTotalRecordCount()).toBe(1000);
		});

		it('should start background loading if more pages exist', async () => {
			const entities = Array(100).fill({ id: '1' });
			const paginatedResult = PaginatedResult.create(entities, 1, 100, 1000);

			mockProvider.findPaginated.mockResolvedValue(paginatedResult);

			await cacheManager.loadInitialPage();

			// Wait for background loading to start
			await new Promise(resolve => setTimeout(resolve, 10));

			// Background loading should have called findPaginated for page 2
			expect(mockProvider.findPaginated).toHaveBeenCalledWith(
				2,
				500, // background page size
				undefined,
				undefined
			);
		});
	});

	describe('searchCached', () => {
		it('should filter cached records', async () => {
			const entities = [
				{ id: '1', name: 'foo' },
				{ id: '2', name: 'bar' },
				{ id: '3', name: 'foobar' }
			];
			const paginatedResult = PaginatedResult.create(entities, 1, 100, 3);

			mockProvider.findPaginated.mockResolvedValue(paginatedResult);
			await cacheManager.loadInitialPage();

			const results = cacheManager.searchCached(r => r.name.includes('foo'));

			expect(results).toHaveLength(2);
			expect(results[0].name).toBe('foo');
			expect(results[1].name).toBe('foobar');
		});
	});

	describe('clearCache', () => {
		it('should clear cached records and reset state', async () => {
			const entities = [{ id: '1' }];
			const paginatedResult = PaginatedResult.create(entities, 1, 100, 1);

			mockProvider.findPaginated.mockResolvedValue(paginatedResult);
			await cacheManager.loadInitialPage();

			cacheManager.clearCache();

			const cacheState = cacheManager.getCacheState();
			expect(cacheState.getCachedRecordCount()).toBe(0);
			expect(cacheState.getTotalRecordCount()).toBe(0);
		});
	});
});
```

### Infrastructure Tests (Optional - only for complex logic)

Test complex query building, DTO transformations, virtual scroll math.

Skip simple pass-through code (section rendering, HTML generation).

### Manual Testing Scenarios

**Scenario 1: Initial Load (70k records)**
1. Open Web Resources panel
2. Verify first 100 records load instantly (< 1 second)
3. Verify background loading indicator shows "100 of 5,000 loaded, 70,000 total"
4. Wait for background loading to complete
5. Verify footer shows "5,000 of 70,000 loaded"
6. Scroll through table - verify smooth 60fps scrolling
7. Verify only ~50-100 rows in DOM (check DevTools Elements)

**Scenario 2: Client-Side Search**
1. With cache loaded (5,000 records), type in search box
2. Verify instant results (< 100ms)
3. Verify "X of Y visible" footer
4. Clear search - verify all cached records shown

**Scenario 3: Server Search Fallback**
1. With partial cache (5,000 of 70,000), search for term not in cache
2. Verify "Searching server..." indicator
3. Verify server results returned
4. Verify search works correctly

**Scenario 4: Environment Change**
1. Load panel for Environment A
2. Switch to Environment B via dropdown
3. Verify cache cleared
4. Verify new environment data loads

**Scenario 5: Column Sorting**
1. Click column header
2. Verify sort indicator (▲ or ▼)
3. Verify cached records sorted instantly
4. If not fully cached, verify server sort works

---

## Dependencies & Prerequisites

### External Dependencies
- **VS Code APIs:** `vscode.WebviewPanel`, `vscode.Uri`, `vscode.window`
- **NPM packages:** `@tanstack/virtual-core` (NEW - bundled in webview, ~5KB gzipped)
- **Dataverse APIs:**
  - `/api/data/v9.2/{entity}set` (existing - paginated queries)
  - `/api/data/v9.2/{entity}set/$count` (existing - count queries)
  - OData `$top`, `$skip`, `$filter`, `$orderby` (existing)

### Internal Prerequisites
- **BLOCKED:** `feature/configuration-settings` branch
  - `IConfigurationService` interface (for reading user settings)
  - `ppds.table.defaultPageSize` setting (default: 100)
  - `ppds.table.maxCachedRecords` setting (default: 5000)

- **Available Now:**
  - `IDataverseApiService` (existing - API communication)
  - `ICancellationToken` (existing - cancellation support)
  - `QueryOptions` interface (existing - OData query building)
  - `ODataQueryBuilder` (existing - builds OData query strings)
  - `PanelCoordinator` pattern (existing - panel orchestration)
  - `DataTableSection` (existing - fallback for non-virtual tables)

### Breaking Changes
- **None** - Fully backward compatible
- Existing panels continue using `DataTableSection`
- New panels opt-in to `VirtualDataTableSection`
- No changes to public APIs

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (PaginatedResult has business logic methods)
- [x] Zero external dependencies (no TanStack, no vscode, no infrastructure)
- [x] Business logic in value objects (VirtualTableConfig validation)
- [x] Repository interface defined in domain (IVirtualTableDataProvider)
- [x] Value objects are immutable (readonly fields, defensive copies)
- [x] No logging (pure business logic, no ILogger)

**Application Layer:**
- [x] Use cases orchestrate only (CacheManager delegates to provider)
- [x] ViewModels are DTOs (VirtualTableViewModel has no behavior)
- [x] Mappers transform only (no sorting params, no business decisions)
- [x] Logging at use case boundaries (CacheManager logs orchestration)
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces (DataverseWebResourceRepository implements IVirtualTableDataProvider)
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories (validation in domain)
- [x] Logging for API calls (repository logs Dataverse queries)

**Presentation Layer:**
- [x] Panels use PanelCoordinator<TCommands> pattern
- [x] Command type defined (WebResourcesPanelCommands union type)
- [x] Sections defined (VirtualDataTableSection, ActionButtonsSection, EnvironmentSelectorSection)
- [x] Layout chosen (SingleColumn default)
- [x] Command handlers registered with coordinator
- [x] EnvironmentSelectorSection included (panel operates within environment)
- [x] Data-driven updates via postMessage (no HTML re-renders)
- [x] Panels call use cases only (NO business logic)
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types (all generics properly constrained)
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions, explicit null checks)
- [x] Type guards for runtime safety (ViewModel type narrowing)

---

## Extension Integration Checklist

**Commands (for package.json):**
- [x] No new commands required (uses existing panel commands)
- [x] Web Resources panel command already registered

**Extension Registration (for extension.ts):**
- [x] No changes required (panel initialization unchanged)
- [x] WebResourcesPanel already registered in extension.ts

**Verification:**
- [x] `npm run compile` passes after implementation
- [x] Manual testing completed (F5, invoke command, panel opens with virtual table)
- [x] Existing DataTableSection panels still work (backward compatibility)

---

## Key Architectural Decisions

### Decision 1: TanStack Virtual Core (Not React Virtual)

**Considered:**
- TanStack React Virtual (React-specific, not applicable)
- react-window (React-specific, not applicable)
- Custom virtual scrolling implementation (reinventing wheel)
- TanStack Virtual Core (framework-agnostic)

**Chosen:** TanStack Virtual Core

**Rationale:**
- Framework-agnostic (works with vanilla JS in webview)
- Battle-tested library (used by TanStack Table)
- Small bundle size (~5KB gzipped)
- Handles complex virtualization math (scrollbar sizing, overscan, dynamic heights)

**Tradeoffs:**
- Requires manual setup of `observeElementRect` and `observeElementOffset` (no React hooks)
- Additional NPM dependency (minimal - 5KB)
- Learning curve for maintainers unfamiliar with TanStack Virtual

### Decision 2: Server-Side Pagination with Client-Side Cache (Hybrid Approach)

**Considered:**
- Pure server-side pagination (click "Next Page" button) - poor UX, no search
- Pure client-side (load all 70k records) - browser freeze, memory issues
- Hybrid: Server pagination + client cache + virtual scrolling

**Chosen:** Hybrid approach

**Rationale:**
- Best of both worlds: instant initial load + smooth scrolling + search
- Configurable cache limit prevents memory issues
- Intelligent search fallback (client-side instant, server-side when needed)

**Tradeoffs:**
- More complex implementation (cache management, state tracking)
- Cache invalidation complexity (environment changes, stale data)
- Memory footprint depends on cache size (5k records ~= 50-100MB ViewModels)

### Decision 3: Background Loading (Non-Blocking Progressive Enhancement)

**Considered:**
- Load all pages upfront (blocks UI, defeats purpose)
- Load pages on demand (complex scroll position tracking)
- Background loading (load pages 2+ non-blocking)

**Chosen:** Background loading

**Rationale:**
- Instant initial page load (best first-impression)
- Progressive enhancement (user sees data immediately, more loads in background)
- Configurable (`enableBackgroundLoading` can be disabled for low-memory environments)

**Tradeoffs:**
- Background task management complexity (cancellation, disposal)
- Race conditions possible (user changes environment during background load)
- Network usage (loads pages user may never scroll to)

### Decision 4: Domain Provider Interface (Not Repository Extension)

**Considered:**
- Extend existing `IWebResourceRepository` with `findPaginated()` (tight coupling)
- Create new `IVirtualTableDataProvider<T>` interface (generic, reusable)

**Chosen:** New generic interface

**Rationale:**
- Reusable across all features (web resources, solutions, trace logs)
- Domain layer defines contract (infrastructure implements)
- Testable (mock provider in use case tests)
- Backward compatible (existing repository methods unchanged)

**Tradeoffs:**
- Repositories implement two interfaces (IWebResourceRepository + IVirtualTableDataProvider)
- Slight code duplication (findAll() vs findPaginated() - different pagination strategies)

### Decision 5: Immutable Value Objects (PaginatedResult, VirtualTableConfig, CacheState)

**Considered:**
- Mutable state objects (simple, flexible)
- Immutable value objects (defensive, predictable)

**Chosen:** Immutable value objects

**Rationale:**
- Prevents accidental mutation bugs
- Easier to reason about (snapshot at point in time)
- Follows Clean Architecture principles (value objects are immutable)
- Testable (no hidden state changes)

**Tradeoffs:**
- More verbose (create new instance for each state change)
- Memory overhead (new objects vs mutating existing)
- Requires `withX()` methods for updates

---

## Performance Benchmarks

| Dataset Size | Target Load Time (Initial Page) | Target Memory | Actual (TBD) |
|--------------|----------------------------------|---------------|--------------|
| 1,000 records | < 500ms | < 50MB | TBD |
| 5,000 records | < 1s | < 100MB | TBD |
| 10,000 records | < 2s | < 150MB | TBD |
| 70,000 records | < 2s (first 100) | < 200MB (5k cached) | TBD |

**Measurement Methodology:**
1. Use VS Code Extension Development Host (F5)
2. Open Web Resources panel for environment with target record count
3. Measure time from panel open to first 100 records rendered
4. Check Chrome DevTools → Performance → Memory (heap size)
5. Verify smooth scrolling (Performance → Rendering → FPS meter shows 60fps)

**Acceptance Criteria:**
- 70k records: First page < 2 seconds ✅
- Scrolling: 60fps maintained during scroll ✅
- Memory: < 200MB for 5k cached records ✅
- Search: < 100ms for cached search ✅

---

## Migration Guide for Existing Panels

### Step 1: Replace DataTableSection with VirtualDataTableSection

```diff
// src/features/webResources/presentation/panels/WebResourcesPanel.ts

- import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
+ import { VirtualDataTableSection } from '../../../../shared/infrastructure/ui/sections/VirtualDataTableSection';

  const sections = [
    new ActionButtonsSection({...}),
    new EnvironmentSelectorSection(),
-   new DataTableSection(config)
+   new VirtualDataTableSection(config) // Same config interface
  ];
```

### Step 2: Update Repository to Implement IVirtualTableDataProvider

```typescript
// src/features/webResources/infrastructure/repositories/DataverseWebResourceRepository.ts

export class DataverseWebResourceRepository
	implements IWebResourceRepository, IVirtualTableDataProvider<WebResource> {

	// Add two new methods:

	async findPaginated(
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<WebResource>> {
		// Implementation shown in "Type Contracts" section above
	}

	async getCount(
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number> {
		// Implementation shown in "Type Contracts" section above
	}
}
```

### Step 3: Add VirtualTableCacheManager to Panel

```typescript
// src/features/webResources/presentation/panels/WebResourcesPanel.ts

import { VirtualTableCacheManager } from '../../../../shared/application/services/VirtualTableCacheManager';
import { VirtualTableConfig } from '../../../../shared/domain/valueObjects/VirtualTableConfig';

export class WebResourcesPanel {
	private readonly cacheManager: VirtualTableCacheManager<WebResource>;
	private readonly config: VirtualTableConfig;

	private constructor(...) {
		// Create config
		this.config = VirtualTableConfig.createDefault();

		// Create cache manager
		this.cacheManager = new VirtualTableCacheManager(
			this.repository, // implements IVirtualTableDataProvider<WebResource>
			this.config,
			this.logger
		);

		// ... rest of constructor
	}
}
```

### Step 4: Update handleRefresh to Use Cache Manager

```diff
  private async handleRefresh(): Promise<void> {
    try {
-     // Old: Load all records
-     const webResources = await this.repository.findAll(this.currentEnvironmentId);

+     // New: Load initial page (background loading starts automatically)
+     const result = await this.cacheManager.loadInitialPage();
+     const cacheState = this.cacheManager.getCacheState();

      // Map to ViewModels
-     const viewModels = webResources.map(wr => this.mapper.toViewModel(wr));
+     const viewModels = result.getItems().map(wr => this.mapper.toViewModel(wr));

      // Send to client
      await this.panel.webview.postMessage({
-       command: 'updateTableData',
+       command: 'updateVirtualTable', // NEW command for virtual table
        data: {
-         viewModels,
-         columns: this.config.columns
+         rows: viewModels,
+         pagination: {
+           cachedCount: cacheState.getCachedRecordCount(),
+           totalCount: cacheState.getTotalRecordCount(),
+           isLoading: cacheState.getIsLoading(),
+           currentPage: cacheState.getCurrentPage(),
+           isFullyCached: cacheState.isFullyCached()
+         },
+         filter: { query: null, isActive: false, visibleCount: viewModels.length },
+         virtualization: { totalItems: viewModels.length, estimatedItemHeight: 32 }
        }
      });
    } catch (error) {
      // ... error handling
    }
  }
```

### Step 5: Clear Cache on Environment Change

```typescript
private async handleEnvironmentChange(environmentId: string): Promise<void> {
	this.currentEnvironmentId = environmentId;

	// Clear cache (prevents stale data)
	this.cacheManager.clearCache();

	// Reload data
	await this.handleRefresh();
}
```

### Step 6: Cancel Background Loading on Dispose

```typescript
public dispose(): void {
	// Cancel background loading
	void this.cacheManager.cancelBackgroundLoading();

	// ... rest of disposal
}
```

**Total Migration Time:** ~30 minutes per panel
**Risk:** Low (backward compatible, opt-in)

---

## Open Questions

- [x] Q1: Should we support dynamic row heights (variable height rows)?
  - **Answer:** No (Slice 1 uses fixed height). Future enhancement if needed.

- [x] Q2: Should cache be per-environment or global across environments?
  - **Answer:** Per-environment (each panel instance has own cache). Clear cache on environment change.

- [x] Q3: Should background loading be cancellable by user (stop button)?
  - **Answer:** No user-facing control (Slice 1). Cancels automatically on environment change or panel dispose.

- [x] Q4: How to handle OData filter building for server search fallback (domain-specific)?
  - **Answer:** Strategy pattern - caller provides filter builder function to SearchVirtualTableUseCase.

- [x] Q5: Should we cache server search results or discard after display?
  - **Answer:** Discard (Slice 1). User may change filter again, caching adds complexity.

- [ ] Q6: Should we implement LRU eviction when cache exceeds limit?
  - **Answer:** TBD (future enhancement). Slice 1 stops loading at max, no eviction.

- [ ] Q7: Should we support column resizing in virtual table?
  - **Answer:** TBD (not in Slice 1). Use existing column width config.

- [ ] Q8: Should we show estimated scroll position ("Records 500-600 of 70,000")?
  - **Answer:** TBD (nice-to-have). Not critical for Slice 1.

---

## References

- **TanStack Virtual Core:** https://tanstack.com/virtual/latest/docs/introduction
- **TanStack Virtual Vanilla JS Example:** https://github.com/TanStack/virtual/discussions/455
- **OData Pagination Spec:** https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_ServerDrivenPaging
- **Related features:** `DataTableSection`, `PanelCoordinator`, `ODataQueryBuilder`
- **Architecture guides:**
  - `.claude/WORKFLOW.md` - Feature development workflow
  - `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Clean Architecture patterns
  - `docs/architecture/PANEL_ARCHITECTURE.md` - Panel composition patterns
  - `docs/architecture/MAPPER_PATTERNS.md` - ViewModel mapping patterns
  - `docs/testing/TESTING_GUIDE.md` - Unit testing patterns

---

**Next Steps:**
1. Get human approval of design
2. Start Slice 1 implementation (domain layer first - not blocked)
3. Wait for `feature/configuration-settings` merge before implementing application/infrastructure layers
4. Implement remaining slices (2-5) incrementally
5. Migrate Web Resources panel (critical - 70k records)
6. Migrate other high-volume panels (Plugin Trace Viewer, Solutions)
7. Performance benchmarking and optimization

**Design Status:** Ready for review and approval
