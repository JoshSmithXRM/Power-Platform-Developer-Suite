/**
 * Query options for repository queries.
 * Supports OData-style filtering, selection, ordering, and pagination.
 */
export interface QueryOptions {
	/**
	 * Fields to select. If not specified, all fields are returned.
	 * Example: ['id', 'name', 'createdon']
	 */
	select?: string[];

	/**
	 * OData filter expression.
	 * Example: "ismanaged eq true" or "createdon gt 2024-01-01"
	 */
	filter?: string;

	/**
	 * Field(s) to order by with optional direction.
	 * Example: "createdon desc" or "name asc"
	 */
	orderBy?: string;

	/**
	 * Maximum number of records to return.
	 */
	top?: number;

	/**
	 * OData expand expression for related entities.
	 * Example: "createdby($select=fullname)"
	 */
	expand?: string;
}
