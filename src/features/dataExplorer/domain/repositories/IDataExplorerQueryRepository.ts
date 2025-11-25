import { QueryResult } from '../entities/QueryResult';

/**
 * Domain Repository Interface: Data Explorer Query Repository
 *
 * Defines contract for executing FetchXML queries against Dataverse.
 * Domain layer defines the interface, infrastructure layer implements it.
 * This enforces Dependency Inversion Principle.
 */
export interface IDataExplorerQueryRepository {
	/**
	 * Executes a FetchXML query and returns the results.
	 * @param environmentId - The environment to query
	 * @param entitySetName - The OData entity set name (e.g., 'accounts')
	 * @param fetchXml - The FetchXML query string
	 * @param signal - Optional AbortSignal for cancellation
	 * @returns Query result with columns, rows, and pagination info
	 */
	executeQuery(
		environmentId: string,
		entitySetName: string,
		fetchXml: string,
		signal?: AbortSignal
	): Promise<QueryResult>;

	/**
	 * Executes a FetchXML query with pagination support.
	 * @param environmentId - The environment to query
	 * @param entitySetName - The OData entity set name
	 * @param fetchXml - The FetchXML query string
	 * @param pagingCookie - Cookie from previous result for pagination
	 * @param pageNumber - Page number (1-based)
	 * @returns Query result with next page of data
	 */
	executeQueryWithPaging(
		environmentId: string,
		entitySetName: string,
		fetchXml: string,
		pagingCookie: string,
		pageNumber: number
	): Promise<QueryResult>;

	/**
	 * Gets the OData entity set name for a logical entity name.
	 * Entity names in SQL/FetchXML are singular (account),
	 * but OData requires plural set names (accounts).
	 * @param environmentId - The environment to query
	 * @param entityLogicalName - The logical entity name (e.g., 'account')
	 * @returns The entity set name (e.g., 'accounts')
	 */
	getEntitySetName(
		environmentId: string,
		entityLogicalName: string
	): Promise<string>;
}
