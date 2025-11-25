/**
 * Value Object: Query Result Column
 *
 * Represents a column in a query result with its metadata.
 * Immutable value object - stores data only, no display formatting.
 *
 * Display formatting (e.g., header text) belongs in application layer mappers.
 */
export class QueryResultColumn {
	constructor(
		public readonly logicalName: string,
		public readonly displayName: string,
		public readonly dataType: QueryColumnDataType
	) {}
}

/**
 * Supported data types for query result columns.
 */
export type QueryColumnDataType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'datetime'
	| 'guid'
	| 'lookup'
	| 'optionset'
	| 'money'
	| 'unknown';
