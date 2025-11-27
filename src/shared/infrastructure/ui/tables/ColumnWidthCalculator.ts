/**
 * Column width calculator for data table consistency.
 *
 * Calculates optimal column widths from actual data content.
 * Ensures columns don't resize during scroll by pre-calculating from all data.
 */

import {
	type ColumnType,
	type TypedColumnConfig,
	type CalculatedColumn,
	COLUMN_TYPE_BOUNDS,
} from './ColumnTypes';

/** Padding added to cell content (left + right) */
const CELL_PADDING = 24;

/** Extra width for header (sort indicator space) */
const HEADER_EXTRA = 20;

/**
 * Column definition that may or may not have a type.
 * Used for backwards compatibility with existing DataTableColumn.
 */
export interface ColumnWithOptionalType {
	readonly key: string;
	readonly label: string;
	readonly type?: ColumnType;
	readonly width?: string;
}

/**
 * Column with calculated width string for rendering.
 */
export interface ColumnWithCalculatedWidth extends ColumnWithOptionalType {
	/** Calculated CSS width string (e.g., "150px") */
	readonly calculatedWidth?: string;
}

/**
 * Calculates optimal widths for all columns based on data content.
 *
 * Scans all data to find maximum content width per column,
 * then bounds the result within the column type's min/max.
 *
 * @param data - Array of data records to scan
 * @param columns - Column configurations with types
 * @returns Columns with calculated pixel widths
 */
export function calculateColumnWidths(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<TypedColumnConfig>
): ReadonlyArray<CalculatedColumn> {
	return columns.map(column => ({
		...column,
		width: calculateSingleColumnWidth(data, column),
	}));
}

/**
 * Calculates widths for columns that have types defined.
 *
 * For columns without types, preserves the original width (or undefined).
 * This provides backwards compatibility with existing panel configs.
 *
 * @param data - Array of data records to scan
 * @param columns - Column configurations with optional types
 * @returns Columns with calculated width strings where types are defined
 */
export function calculateColumnWidthsWithOptionalTypes(
	data: ReadonlyArray<Record<string, unknown>>,
	columns: ReadonlyArray<ColumnWithOptionalType>
): ReadonlyArray<ColumnWithCalculatedWidth> {
	return columns.map(column => {
		if (column.type === undefined) {
			// No type - return original column unchanged
			return column;
		}

		// Has type - calculate width
		const bounds = COLUMN_TYPE_BOUNDS[column.type];
		const width = calculateSingleColumnWidthWithType(data, column, column.type, bounds);
		return {
			...column,
			calculatedWidth: `${width}px`,
		};
	});
}

/**
 * Checks if any columns have types defined (require width calculation).
 */
export function hasTypedColumns(columns: ReadonlyArray<ColumnWithOptionalType>): boolean {
	return columns.some(col => col.type !== undefined);
}

/**
 * Helper to calculate width for a column with known type.
 */
function calculateSingleColumnWidthWithType(
	data: ReadonlyArray<Record<string, unknown>>,
	column: ColumnWithOptionalType,
	type: ColumnType,
	bounds: { min: number; max: number; avgCharWidth: number }
): number {
	// Header width includes sort indicator space
	const headerWidth = column.label.length * bounds.avgCharWidth + HEADER_EXTRA;

	// Scan all data for maximum content width
	let maxContentWidth = 0;
	for (const row of data) {
		const value = row[column.key];
		const displayValue = formatForMeasurement(value, type);
		const contentWidth = displayValue.length * bounds.avgCharWidth + CELL_PADDING;
		maxContentWidth = Math.max(maxContentWidth, contentWidth);
	}

	// Use larger of header or content, bounded by min/max
	const optimalWidth = Math.max(headerWidth, maxContentWidth);
	return Math.min(Math.max(optimalWidth, bounds.min), bounds.max);
}

/**
 * Calculates optimal width for a single column.
 *
 * Algorithm:
 * 1. Get type bounds (min/max) with optional overrides
 * 2. Calculate header width
 * 3. Scan all data for maximum content width
 * 4. Return bounded optimal width
 */
function calculateSingleColumnWidth(
	data: ReadonlyArray<Record<string, unknown>>,
	column: TypedColumnConfig
): number {
	const bounds = COLUMN_TYPE_BOUNDS[column.type];
	const minWidth = column.minWidth ?? bounds.min;
	const maxWidth = column.maxWidth ?? bounds.max;

	// Header width includes sort indicator space
	const headerWidth = column.label.length * bounds.avgCharWidth + HEADER_EXTRA;

	// Scan all data for maximum content width
	let maxContentWidth = 0;
	for (const row of data) {
		const value = row[column.key];
		const displayValue = formatForMeasurement(value, column.type);
		const contentWidth = displayValue.length * bounds.avgCharWidth + CELL_PADDING;
		maxContentWidth = Math.max(maxContentWidth, contentWidth);
	}

	// Use larger of header or content, bounded by min/max
	const optimalWidth = Math.max(headerWidth, maxContentWidth);
	return Math.min(Math.max(optimalWidth, minWidth), maxWidth);
}

/**
 * Formats a value for width measurement.
 *
 * Converts values to their display representation for accurate width estimation.
 * Uses type-specific formatting for consistent measurement.
 */
function formatForMeasurement(value: unknown, type: ColumnType): string {
	if (value === null || value === undefined) {
		return '';
	}

	switch (type) {
		case 'boolean':
			// Booleans display as Yes/No
			return value ? 'Yes' : 'No';

		case 'date':
			// Use standard date format length
			return '12/31/2024';

		case 'datetime':
			// Use standard datetime format length
			return '12/31/2024, 11:59 PM';

		case 'numeric':
			// Format numbers with locale separators
			if (typeof value === 'number') {
				return value.toLocaleString();
			}
			return String(value);

		default:
			return String(value);
	}
}

/**
 * Generates CSS width value for a column.
 *
 * @param width - Pixel width
 * @returns CSS width string (e.g., "150px")
 */
export function formatColumnWidth(width: number): string {
	return `${width}px`;
}
