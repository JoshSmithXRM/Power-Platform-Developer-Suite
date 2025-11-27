import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
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
}
