/**
 * Data passed to sections during rendering.
 *
 * This is a union type with optional fields for all section types.
 * Trade-off: Couples sections via shared contract, but pragmatic for <10 section types.
 * If section types exceed 10, refactor to discriminated union.
 *
 * Optional discriminant added for future type narrowing (zero-cost now).
 */
export interface SectionRenderData {
	/**
	 * Optional discriminant for type narrowing.
	 * Enables future refactoring to discriminated union without breaking changes.
	 */
	readonly sectionType?: 'table' | 'tree' | 'detail' | 'filter' | 'custom';

	/**
	 * Table data (for DataTableSection).
	 * Array of row objects where keys are column IDs.
	 */
	readonly tableData?: Record<string, unknown>[];

	/**
	 * Detail data (for DetailPanelSection).
	 * Typically a view model for the selected item.
	 */
	readonly detailData?: unknown;

	/**
	 * Filter state (for FilterControlsSection).
	 * Current filter values keyed by filter ID.
	 */
	readonly filterState?: Record<string, unknown>;

	/**
	 * Loading state (for all sections).
	 * Indicates whether data is currently being loaded.
	 */
	readonly isLoading?: boolean;

	/**
	 * Error message (for all sections).
	 * Error to display if data loading failed.
	 */
	readonly errorMessage?: string;

	/**
	 * Custom data (for feature-specific sections).
	 * Escape hatch for unique section needs.
	 * Use type guards (TypeGuards.ts) to safely access custom data.
	 */
	readonly customData?: Record<string, unknown>;
}
