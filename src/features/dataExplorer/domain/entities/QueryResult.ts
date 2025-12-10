import { QueryResultColumn } from '../valueObjects/QueryResultColumn';
import { QueryResultRow } from '../valueObjects/QueryResultRow';

/**
 * Domain Entity: Query Result
 *
 * Represents the result of executing a FetchXML query against Dataverse.
 * Contains columns (metadata) and rows (data) with rich behavior.
 *
 * Rich domain model responsibilities:
 * - Track execution metadata (timing, counts)
 * - Provide pagination information
 * - Support data access patterns
 */
export class QueryResult {
	constructor(
		public readonly columns: readonly QueryResultColumn[],
		public readonly rows: readonly QueryResultRow[],
		public readonly totalRecordCount: number | null,
		public readonly moreRecords: boolean,
		public readonly pagingCookie: string | null,
		public readonly executedFetchXml: string,
		public readonly executionTimeMs: number
	) {}

	/**
	 * Creates an empty result (no rows).
	 */
	public static empty(fetchXml: string, executionTimeMs: number = 0): QueryResult {
		return new QueryResult([], [], 0, false, null, fetchXml, executionTimeMs);
	}

	/**
	 * Gets the number of rows returned in this result set.
	 */
	public getRowCount(): number {
		return this.rows.length;
	}

	/**
	 * Gets the number of columns in the result.
	 */
	public getColumnCount(): number {
		return this.columns.length;
	}

	/**
	 * Checks if the result set is empty.
	 */
	public isEmpty(): boolean {
		return this.rows.length === 0;
	}

	/**
	 * Checks if there are more records available for pagination.
	 */
	public hasMoreRecords(): boolean {
		return this.moreRecords && this.pagingCookie !== null;
	}

	/**
	 * Gets column by logical name.
	 */
	public getColumn(logicalName: string): QueryResultColumn | null {
		return this.columns.find((c) => c.logicalName === logicalName) ?? null;
	}

	/**
	 * Gets row by index.
	 */
	public getRow(index: number): QueryResultRow | null {
		return this.rows[index] ?? null;
	}

	/**
	 * Gets cell value at row/column intersection.
	 */
	public getCellValue(rowIndex: number, columnName: string): unknown {
		const row = this.getRow(rowIndex);
		if (row === null) {
			return null;
		}
		return row.getValue(columnName);
	}

	/**
	 * Creates a new result with only the specified columns.
	 * Used for virtual column transformation - shows only user-requested columns.
	 *
	 * @param columnNames - Column names to include (case-insensitive)
	 * @returns New QueryResult with filtered columns
	 */
	public withFilteredColumns(columnNames: string[]): QueryResult {
		if (columnNames.length === 0) {
			return this;
		}

		const columnNamesLower = new Set(columnNames.map(c => c.toLowerCase()));

		// Filter columns to only those requested
		const filteredColumns = this.columns.filter(col =>
			columnNamesLower.has(col.logicalName.toLowerCase())
		);

		// If no columns match, return original (shouldn't happen in practice)
		if (filteredColumns.length === 0) {
			return this;
		}

		return new QueryResult(
			filteredColumns,
			this.rows,
			this.totalRecordCount,
			this.moreRecords,
			this.pagingCookie,
			this.executedFetchXml,
			this.executionTimeMs
		);
	}
}
