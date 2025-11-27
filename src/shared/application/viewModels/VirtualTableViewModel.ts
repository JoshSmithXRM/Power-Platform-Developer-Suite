/**
 * ViewModel for virtual table data.
 *
 * Extends base table data with pagination, filter state, and virtualization hints.
 * Consumed by VirtualDataTableSection for rendering in webview.
 *
 * Generic type TRow represents feature-specific row ViewModels
 * (e.g., WebResourceViewModel, SolutionViewModel).
 *
 * @example
 * // Create a VirtualTableViewModel for web resources
 * const vm: VirtualTableViewModel<WebResourceViewModel> = {
 *   rows: webResourceViewModels,
 *   pagination: {
 *     cachedCount: 100,
 *     totalCount: 70000,
 *     isLoading: true,
 *     currentPage: 1,
 *     isFullyCached: false
 *   },
 *   filter: { query: null, isActive: false, visibleCount: 100 },
 *   virtualization: { totalItems: 100, estimatedItemHeight: 32 }
 * };
 */
export interface VirtualTableViewModel<TRow = Record<string, unknown>> {
	/**
	 * Row data (array of ViewModels specific to feature).
	 *
	 * Each row is a feature-specific ViewModel (WebResourceViewModel, SolutionViewModel, etc.)
	 * mapped from domain entities.
	 */
	readonly rows: readonly TRow[];

	/**
	 * Pagination metadata for status display.
	 *
	 * Shows loading progress and cache status to user.
	 */
	readonly pagination: VirtualTablePaginationState;

	/**
	 * Search/filter state.
	 *
	 * Tracks active search query and filtered result count.
	 */
	readonly filter: VirtualTableFilterState;

	/**
	 * Virtualization hints for webview renderer.
	 *
	 * Used by VirtualTableRenderer.js to configure TanStack Virtual.
	 */
	readonly virtualization: VirtualTableVirtualizationState;
}

/**
 * Pagination metadata for virtual table status display.
 */
export interface VirtualTablePaginationState {
	/** Number of records currently cached client-side */
	readonly cachedCount: number;

	/** Total records available on server */
	readonly totalCount: number;

	/** Whether background loading is in progress */
	readonly isLoading: boolean;

	/** Current page being loaded (1-based) */
	readonly currentPage: number;

	/** Whether all records are cached (no more server queries needed) */
	readonly isFullyCached: boolean;
}

/**
 * Filter/search state for virtual table.
 */
export interface VirtualTableFilterState {
	/** Active search query (null if not filtering) */
	readonly query: string | null;

	/** Whether a filter is currently active */
	readonly isActive: boolean;

	/** Count of records visible after applying filter */
	readonly visibleCount: number;
}

/**
 * Virtualization configuration for webview renderer.
 */
export interface VirtualTableVirtualizationState {
	/** Total items available for virtualization (after filtering) */
	readonly totalItems: number;

	/** Estimated height per row in pixels (for scrollbar sizing) */
	readonly estimatedItemHeight: number;
}
