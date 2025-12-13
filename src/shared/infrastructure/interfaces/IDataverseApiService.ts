import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';

/**
 * Service interface for making Dataverse Web API calls.
 * Infrastructure layer service for HTTP operations against Dataverse.
 */
export interface IDataverseApiService {
  /**
   * Performs a GET request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path (e.g., '/api/data/v9.2/solutions')
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the JSON response
   */
  get<T = unknown>(
    environmentId: string,
    endpoint: string,
    cancellationToken?: ICancellationToken
  ): Promise<T>;

  /**
   * Performs a POST request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param body - Request body
   * @param cancellationToken - Optional token to cancel the operation
   * @param additionalHeaders - Optional additional headers (e.g., MSCRM.SolutionUniqueName)
   * @returns Promise resolving to the JSON response
   */
  post<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken?: ICancellationToken,
    additionalHeaders?: Record<string, string>
  ): Promise<T>;

  /**
   * Performs a PATCH request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param body - Request body
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the JSON response
   */
  patch<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken?: ICancellationToken
  ): Promise<T>;

  /**
   * Performs a DELETE request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving when deletion is complete
   */
  delete(
    environmentId: string,
    endpoint: string,
    cancellationToken?: ICancellationToken
  ): Promise<void>;

  /**
   * Performs batch DELETE operations using OData $batch API.
   * Deletes multiple records in a single HTTP request for better performance.
   * @param environmentId - Power Platform environment GUID
   * @param entitySetName - Entity set name (e.g., 'plugintracelogs', 'solutions')
   * @param entityIds - Array of entity IDs to delete
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the number of successfully deleted records
   */
  batchDelete(
    environmentId: string,
    entitySetName: string,
    entityIds: readonly string[],
    cancellationToken?: ICancellationToken
  ): Promise<number>;
}
