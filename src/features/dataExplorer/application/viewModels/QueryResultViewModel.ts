/**
 * ViewModel for displaying query results in a table.
 *
 * Mapped from QueryResult domain entity.
 * Contains display-ready data for the presentation layer.
 */
export interface QueryResultViewModel {
	/**
	 * Column definitions for table header.
	 */
	readonly columns: readonly QueryColumnViewModel[];

	/**
	 * Data rows for table body.
	 */
	readonly rows: readonly QueryRowViewModel[];

	/**
	 * Total number of records (if available from server).
	 */
	readonly totalRecordCount: number | null;

	/**
	 * Whether more records are available for paging.
	 */
	readonly hasMoreRecords: boolean;

	/**
	 * Query execution time in milliseconds.
	 */
	readonly executionTimeMs: number;

	/**
	 * The FetchXML that was executed.
	 */
	readonly executedFetchXml: string;
}

/**
 * Column definition for table display.
 */
export interface QueryColumnViewModel {
	/**
	 * Column logical name (used as key in row data).
	 */
	readonly name: string;

	/**
	 * Display header for column (formatted for UI).
	 */
	readonly header: string;

	/**
	 * Data type hint for rendering.
	 */
	readonly dataType: string;
}

/**
 * Row data for table display.
 * Map of column name to formatted display value.
 */
export interface QueryRowViewModel {
	/**
	 * Cell values keyed by column name.
	 * All values are pre-formatted strings ready for display.
	 */
	readonly [columnName: string]: string;
}
