import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import { WebResource } from '../entities/WebResource';

/**
 * Repository interface for web resources (defined in domain).
 * Implemented by infrastructure layer.
 */
export interface IWebResourceRepository {
	/**
	 * Finds all web resources for a specific environment.
	 *
	 * @param environmentId - Environment ID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Array of web resources
	 */
	findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]>;

	/**
	 * Finds a specific web resource by ID.
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Web resource or null if not found
	 */
	findById(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResource | null>;

	/**
	 * Gets the content of a web resource (base64 encoded).
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Base64 encoded content string
	 */
	getContent(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<string>;

	/**
	 * Updates the content of a web resource.
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param base64Content - New content encoded as base64
	 * @param cancellationToken - Optional token to cancel the operation
	 */
	updateContent(
		environmentId: string,
		webResourceId: string,
		base64Content: string,
		cancellationToken?: ICancellationToken
	): Promise<void>;

	/**
	 * Retrieves a paginated subset of web resources.
	 * Used for virtual scrolling with large datasets (65k+ records).
	 *
	 * @param environmentId - Environment ID
	 * @param page - Page number (1-based)
	 * @param pageSize - Number of records per page
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns PaginatedResult containing WebResource entities
	 */
	findPaginated(
		environmentId: string,
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<WebResource>>;

	/**
	 * Gets the total count of web resources in the specified environment.
	 * Used for pagination calculations and UI display.
	 *
	 * @param environmentId - Environment ID
	 * @param options - Optional query options for filtering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Total count of web resources
	 */
	getCount(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number>;
}
