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
	 * Lookup metadata for each row, enabling clickable record links.
	 * Index matches the rows array.
	 */
	readonly rowLookups: readonly RowLookupsViewModel[];

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

	/**
	 * The main entity logical name from the query (e.g., "contact", "account").
	 * Used to create links for primary key columns.
	 */
	readonly entityLogicalName: string | null;
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

/**
 * Lookup metadata for a row.
 * Maps column names to lookup info for cells that contain record references.
 */
export interface RowLookupsViewModel {
	/**
	 * Lookups keyed by column name.
	 * Only columns with lookup values are included.
	 */
	readonly [columnName: string]: LookupViewModel;
}

/**
 * Lookup value for a single cell.
 * Contains the entity type and record ID for opening in browser.
 */
export interface LookupViewModel {
	/**
	 * The entity logical name (e.g., "contact", "account").
	 */
	readonly entityType: string;

	/**
	 * The record GUID.
	 */
	readonly id: string;
}
