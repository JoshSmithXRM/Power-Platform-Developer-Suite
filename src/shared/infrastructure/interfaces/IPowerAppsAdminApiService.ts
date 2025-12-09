import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';

/**
 * Service interface for making Power Apps Admin API calls.
 * Used for admin operations like fetching connections, connectors, etc.
 *
 * This API is separate from Dataverse - uses api.powerapps.com endpoint
 * with a different authentication scope (https://service.powerapps.com/).
 */
export interface IPowerAppsAdminApiService {
	/**
	 * Performs a GET request to the Power Apps Admin API.
	 * @param environmentId - Power Platform environment GUID
	 * @param endpoint - Relative endpoint path (e.g., '/connections')
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to the JSON response
	 */
	get<T = unknown>(
		environmentId: string,
		endpoint: string,
		cancellationToken?: ICancellationToken
	): Promise<T>;
}
