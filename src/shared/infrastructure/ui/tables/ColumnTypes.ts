/**
 * Column type definitions for data table consistency.
 *
 * Provides semantic types for columns with appropriate min/max bounds.
 * Used by ColumnWidthCalculator to determine optimal column widths.
 */

/**
 * Semantic column types for data tables.
 *
 * Each type has predefined bounds (min/max width) appropriate for its content.
 */
export type ColumnType =
	| 'name'        // Solution Name, Job Name - primary identifiers
	| 'identifier'  // Unique Name, IDs - technical identifiers
	| 'status'      // Status, Type - short categorical values
	| 'boolean'     // Yes/No, True/False, Visible
	| 'version'     // Version numbers (1.0.0.0)
	| 'date'        // Dates (short format)
	| 'datetime'    // Full datetime with time
	| 'user'        // User names, Created By, Modified By
	| 'description' // Long text - caps with ellipsis
	| 'progress'    // Progress indicators
	| 'numeric';    // Numbers, counts

/**
 * Width bounds for a column type.
 */
export interface ColumnBounds {
	/** Minimum column width in pixels */
	readonly min: number;
	/** Maximum column width in pixels */
	readonly max: number;
	/** Average character width for content estimation */
	readonly avgCharWidth: number;
}

/**
 * Standard bounds for each column type.
 *
 * Values based on typical VS Code panel widths and content patterns:
 * - name: Primary identifiers, often longest text
 * - identifier: Technical IDs, usually alphanumeric
 * - status: Short categorical (Success, Failed, Managed)
 * - boolean: Yes/No values
 * - version: Semantic versions (1.0.0.0)
 * - date: Date-only formats
 * - datetime: Full timestamps
 * - user: Names with potential email suffixes
 * - description: Long text, capped with ellipsis
 * - progress: Percentage or fraction indicators
 * - numeric: Numbers and counts
 */
export const COLUMN_TYPE_BOUNDS: Readonly<Record<ColumnType, ColumnBounds>> = {
	name:        { min: 150, max: 350, avgCharWidth: 8 },
	identifier:  { min: 120, max: 300, avgCharWidth: 7 },
	status:      { min: 80,  max: 150, avgCharWidth: 8 },
	boolean:     { min: 70,  max: 110, avgCharWidth: 8 },
	version:     { min: 80,  max: 130, avgCharWidth: 8 },
	date:        { min: 100, max: 140, avgCharWidth: 8 },
	datetime:    { min: 140, max: 180, avgCharWidth: 8 },
	user:        { min: 100, max: 200, avgCharWidth: 8 },
	description: { min: 150, max: 400, avgCharWidth: 7 },
	progress:    { min: 80,  max: 150, avgCharWidth: 8 },
	numeric:     { min: 60,  max: 120, avgCharWidth: 9 },
};

/**
 * Extended column configuration with type information.
 *
 * Extends the base column config with semantic type for width calculation.
 */
export interface TypedColumnConfig {
	/** Column key matching data property name */
	readonly key: string;
	/** Column header label */
	readonly label: string;
	/** Semantic column type for width bounds */
	readonly type: ColumnType;
	/** Optional override for minimum width */
	readonly minWidth?: number;
	/** Optional override for maximum width */
	readonly maxWidth?: number;
}

/**
 * Column with calculated pixel width.
 */
export interface CalculatedColumn extends TypedColumnConfig {
	/** Calculated pixel width */
	readonly width: number;
}
