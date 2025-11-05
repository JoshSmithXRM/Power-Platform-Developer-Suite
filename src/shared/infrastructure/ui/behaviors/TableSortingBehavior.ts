/**
 * TableSortingBehavior - Manages table sorting state and logic.
 *
 * Provides reusable sorting functionality for data table panels.
 * Owns sort state, provides type-safe sorting, and exposes state for rendering.
 *
 * Note: This behavior is not passed to PanelCoordinator behaviors array.
 * Instead, panels hold a reference and call methods directly.
 */

/**
 * Behavior that manages table sorting state and logic.
 * Generic, type-safe sorting for any view model with Record<string, unknown> structure.
 *
 * @template TViewModel - View model type (must extend Record<string, unknown>)
 */
export class TableSortingBehavior<TViewModel extends Record<string, unknown>> {
	private sortColumn: string;
	private sortDirection: 'asc' | 'desc';

	constructor(
		defaultColumn: string,
		defaultDirection: 'asc' | 'desc' = 'asc'
	) {
		this.sortColumn = defaultColumn;
		this.sortDirection = defaultDirection;
	}

	/**
	 * Handles sort column change request.
	 * Toggles direction if same column, resets to 'asc' if different column.
	 *
	 * @param column - Column key to sort by
	 * @returns True if sort state changed, false otherwise
	 */
	public handleSortRequest(column: string): boolean {
		let changed = false;

		if (this.sortColumn === column) {
			// Same column - toggle direction
			const newDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			if (newDirection !== this.sortDirection) {
				this.sortDirection = newDirection;
				changed = true;
			}
		} else {
			// Different column - reset to asc
			this.sortColumn = column;
			this.sortDirection = 'asc';
			changed = true;
		}

		return changed;
	}

	/**
	 * Sorts view models by current sort state.
	 * Uses locale-aware string comparison with null/undefined handling.
	 *
	 * @param viewModels - Array of view models to sort
	 * @returns New sorted array (does not mutate original)
	 */
	public sort(viewModels: ReadonlyArray<TViewModel>): TViewModel[] {
		return [...viewModels].sort((a, b) => {
			const aVal = a[this.sortColumn];
			const bVal = b[this.sortColumn];

			// Handle null/undefined (push to end)
			if (aVal === null || aVal === undefined) return 1;
			if (bVal === null || bVal === undefined) return -1;

			// String comparison (locale-aware)
			const comparison = String(aVal).localeCompare(String(bVal));
			return this.sortDirection === 'asc' ? comparison : -comparison;
		});
	}

	/**
	 * Gets current sort state for rendering.
	 *
	 * @returns Current sort column and direction
	 */
	public getSortState(): { column: string; direction: 'asc' | 'desc' } {
		return {
			column: this.sortColumn,
			direction: this.sortDirection,
		};
	}

	/**
	 * Resets sort state to specified values.
	 *
	 * @param column - Optional new sort column
	 * @param direction - Optional new sort direction
	 */
	public reset(column?: string, direction?: 'asc' | 'desc'): void {
		if (column) {
			this.sortColumn = column;
		}
		if (direction) {
			this.sortDirection = direction;
		}
	}
}
