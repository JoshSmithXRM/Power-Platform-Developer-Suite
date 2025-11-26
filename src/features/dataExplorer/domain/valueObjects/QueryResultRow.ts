/**
 * Value Object: Query Result Row
 *
 * Represents a single row of data in a query result.
 * Contains a map of column names to cell values.
 * Immutable value object - provides raw data access only.
 *
 * Display formatting belongs in application layer mappers.
 */
export class QueryResultRow {
	private readonly cells: ReadonlyMap<string, QueryCellValue>;

	constructor(cells: ReadonlyMap<string, QueryCellValue>) {
		this.cells = cells;
	}

	/**
	 * Creates a row from a plain object.
	 */
	public static fromRecord(record: Record<string, QueryCellValue>): QueryResultRow {
		return new QueryResultRow(new Map(Object.entries(record)));
	}

	/**
	 * Gets a cell value by column name.
	 * Returns null if column doesn't exist.
	 */
	public getValue(columnName: string): QueryCellValue {
		return this.cells.get(columnName) ?? null;
	}

	/**
	 * Gets all column names in this row.
	 */
	public getColumnNames(): readonly string[] {
		return Array.from(this.cells.keys());
	}
}

/**
 * Possible values for a cell in a query result.
 */
export type QueryCellValue =
	| string
	| number
	| boolean
	| Date
	| null
	| undefined
	| QueryLookupValue
	| QueryFormattedValue;

/**
 * Lookup reference value (for lookup columns).
 */
export interface QueryLookupValue {
	readonly id: string;
	readonly name: string | undefined;
	readonly entityType: string;
}

/**
 * Value with formatted display text (for optionsets, money, etc.).
 */
export interface QueryFormattedValue {
	readonly value: string | number | boolean | null;
	readonly formattedValue: string;
}
