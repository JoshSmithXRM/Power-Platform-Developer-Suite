/**
 * Table utilities for data table consistency.
 *
 * Re-exports column types and width calculator for clean imports.
 */

export type {
	ColumnType,
	ColumnBounds,
	TypedColumnConfig,
	CalculatedColumn,
} from './ColumnTypes';

export { COLUMN_TYPE_BOUNDS } from './ColumnTypes';

export type {
	ColumnWithOptionalType,
	ColumnWithCalculatedWidth,
} from './ColumnWidthCalculator';

export {
	calculateColumnWidths,
	calculateColumnWidthsWithOptionalTypes,
	hasTypedColumns,
	formatColumnWidth,
} from './ColumnWidthCalculator';
