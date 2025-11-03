import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { IDataverseApiService } from '../interfaces/IDataverseApiService';
import { normalizeError } from '../../utils/ErrorUtils';

/**
 * Service for making authenticated HTTP requests to Dataverse Web API.
 * Handles authentication token retrieval and request construction.
 */
export class DataverseApiService implements IDataverseApiService {
  constructor(
    private readonly getAccessToken: (environmentId: string) => Promise<string>,
    private readonly getEnvironmentUrl: (environmentId: string) => Promise<string>,
    private readonly logger: ILogger
  ) {}

  /**
   * Performs a GET request to the Dataverse Web API.
   */
  async get<T = unknown>(
    environmentId: string,
    endpoint: string,
    cancellationToken: ICancellationToken | undefined
  ): Promise<T> {
    return this.request<T>('GET', environmentId, endpoint, undefined, cancellationToken);
  }

  /**
   * Performs a POST request to the Dataverse Web API.
   */
  async post<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken: ICancellationToken | undefined
  ): Promise<T> {
    return this.request<T>('POST', environmentId, endpoint, body, cancellationToken);
  }

  /**
   * Performs a PATCH request to the Dataverse Web API.
   */
  async patch<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken: ICancellationToken | undefined
  ): Promise<T> {
    return this.request<T>('PATCH', environmentId, endpoint, body, cancellationToken);
  }

  /**
   * Performs a DELETE request to the Dataverse Web API.
   */
  async delete(
    environmentId: string,
    endpoint: string,
    cancellationToken: ICancellationToken | undefined
  ): Promise<void> {
    await this.request<void>('DELETE', environmentId, endpoint, undefined, cancellationToken);
  }

  /**
   * Internal method to perform HTTP requests with authentication.
   *
   * Centralized request handling with proper type validation.
   * Type parameter T should match expected API response structure.
   */
  private async request<T>(
    method: string,
    environmentId: string,
    endpoint: string,
    body: unknown | undefined,
    cancellationToken: ICancellationToken | undefined
  ): Promise<T> {
    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    try {
      const [accessToken, environmentUrl] = await Promise.all([
        this.getAccessToken(environmentId),
        this.getEnvironmentUrl(environmentId)
      ]);

      if (cancellationToken?.isCancellationRequested) {
        throw new OperationCancelledException();
      }

      const url = `${environmentUrl}${endpoint}`;
      this.logger.debug(`DataverseApiService: ${method} ${endpoint}`, { environmentId });

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      };

      const fetchOptions: RequestInit = {
        method,
        headers
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Dataverse API request failed: ${response.status} ${response.statusText}`, {
          method,
          endpoint,
          status: response.status,
          errorText
        });
        throw new Error(
          `Dataverse API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      if (method === 'DELETE' || response.status === 204) {
        // No content response - safe for void return type
        return undefined as T;
      }

      const data: unknown = await response.json();

      // Basic runtime validation - ensure response is an object
      if (typeof data !== 'object' || data === null) {
        this.logger.error('Invalid API response: expected object', { data });
        throw new Error('Invalid API response structure: expected object');
      }

      this.logger.debug(`DataverseApiService: ${method} ${endpoint} succeeded`);

      return data as T;
    } catch (error) {
      if (error instanceof OperationCancelledException) {
        throw error;
      }

      const normalizedError = normalizeError(error);
      this.logger.error('DataverseApiService request failed', normalizedError);
      throw normalizedError;
    }
  }
}
