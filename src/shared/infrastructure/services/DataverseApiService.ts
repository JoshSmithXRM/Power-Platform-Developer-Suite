import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { IDataverseApiService } from '../interfaces/IDataverseApiService';
import { IConfigurationService } from '../../domain/services/IConfigurationService';
import { normalizeError } from '../../utils/ErrorUtils';
import { ErrorSanitizer } from '../../utils/ErrorSanitizer';

/**
 * Service for making authenticated HTTP requests to Dataverse Web API.
 * Handles authentication token retrieval and request construction.
 */
export class DataverseApiService implements IDataverseApiService {
  /** Default maximum retry attempts (configurable via api.maxRetries setting) */
  private static readonly DEFAULT_MAX_RETRY_ATTEMPTS = 3;

  /**
   * Base delay in milliseconds for exponential backoff calculation.
   * Formula: 2^(attempt-1) * BASE_BACKOFF_MS = 1s, 2s, 4s for attempts 1, 2, 3.
   */
  private static readonly BASE_BACKOFF_MS = 1000;

  /**
   * HTTP status code for rate limiting (Too Many Requests).
   * Triggers automatic retry with exponential backoff.
   */
  private static readonly HTTP_STATUS_RATE_LIMIT = 429;

  /**
   * HTTP status code for service unavailable.
   * Triggers automatic retry with exponential backoff.
   */
  private static readonly HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

  /**
   * HTTP status code for gateway timeout.
   * Triggers automatic retry with exponential backoff.
   */
  private static readonly HTTP_STATUS_GATEWAY_TIMEOUT = 504;

  /**
   * HTTP status code for no content (successful deletion).
   */
  private static readonly HTTP_STATUS_NO_CONTENT = 204;

  /** Configured maximum retry attempts */
  private readonly maxRetryAttempts: number;

  constructor(
    private readonly getAccessToken: (environmentId: string) => Promise<string>,
    private readonly getEnvironmentUrl: (environmentId: string) => Promise<string>,
    private readonly logger: ILogger,
    configService?: IConfigurationService
  ) {
    this.maxRetryAttempts = configService?.get('api.maxRetries', DataverseApiService.DEFAULT_MAX_RETRY_ATTEMPTS)
      ?? DataverseApiService.DEFAULT_MAX_RETRY_ATTEMPTS;
  }

  /**
   * Performs a GET request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path (e.g., '/api/data/v9.2/solutions')
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the JSON response
   */
  async get<T = unknown>(
    environmentId: string,
    endpoint: string,
    cancellationToken?: ICancellationToken
  ): Promise<T> {
    return this.request<T>('GET', environmentId, endpoint, undefined, cancellationToken);
  }

  /**
   * Performs a POST request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param body - Request body
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the JSON response
   */
  async post<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken?: ICancellationToken
  ): Promise<T> {
    return this.request<T>('POST', environmentId, endpoint, body, cancellationToken);
  }

  /**
   * Performs a PATCH request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param body - Request body
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the JSON response
   */
  async patch<T = unknown>(
    environmentId: string,
    endpoint: string,
    body: unknown,
    cancellationToken?: ICancellationToken
  ): Promise<T> {
    return this.request<T>('PATCH', environmentId, endpoint, body, cancellationToken);
  }

  /**
   * Performs a DELETE request to the Dataverse Web API.
   * @param environmentId - Power Platform environment GUID
   * @param endpoint - Relative endpoint path
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving when deletion is complete
   */
  async delete(
    environmentId: string,
    endpoint: string,
    cancellationToken?: ICancellationToken
  ): Promise<void> {
    await this.request<void>('DELETE', environmentId, endpoint, undefined, cancellationToken);
  }

  /**
   * Performs batch DELETE operations using OData $batch API.
   * Deletes multiple records in a single HTTP request for better performance.
   * Batch size limited to 100 operations (Dataverse supports up to 1000, but 100 is safer).
   * @param environmentId - Power Platform environment GUID
   * @param entitySetName - Entity set name (e.g., 'plugintracelogs', 'solutions')
   * @param entityIds - Array of entity IDs to delete
   * @param cancellationToken - Optional token to cancel the operation
   * @returns Promise resolving to the number of successfully deleted records
   */
  async batchDelete(
    environmentId: string,
    entitySetName: string,
    entityIds: readonly string[],
    cancellationToken?: ICancellationToken
  ): Promise<number> {
    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    if (entityIds.length === 0) {
      return 0;
    }

    try {
      const [accessToken, environmentUrl] = await Promise.all([
        this.getAccessToken(environmentId),
        this.getEnvironmentUrl(environmentId)
      ]);

      if (cancellationToken?.isCancellationRequested) {
        throw new OperationCancelledException();
      }

      const batchBoundary = `batch_${Date.now()}`;
      const changesetBoundary = `changeset_${Date.now()}`;

      let batchBody = `--${batchBoundary}\r\n`;
      batchBody += `Content-Type: multipart/mixed; boundary=${changesetBoundary}\r\n\r\n`;

      entityIds.forEach((entityId, index) => {
        batchBody += `--${changesetBoundary}\r\n`;
        batchBody += `Content-Type: application/http\r\n`;
        batchBody += `Content-Transfer-Encoding: binary\r\n`;
        batchBody += `Content-ID: ${index + 1}\r\n\r\n`;
        batchBody += `DELETE ${environmentUrl}/api/data/v9.2/${entitySetName}(${entityId}) HTTP/1.1\r\n`;
        batchBody += `Content-Type: application/json\r\n\r\n`;
      });

      batchBody += `--${changesetBoundary}--\r\n`;
      batchBody += `--${batchBoundary}--\r\n`;

      const batchUrl = `${environmentUrl}/api/data/v9.2/$batch`;

      this.logger.debug('DataverseApiService: Batch DELETE', { environmentId, count: entityIds.length, entitySetName });

      const response = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/mixed; boundary=${batchBoundary}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        },
        body: batchBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Log full error details for developers
        this.logger.error('Batch delete failed', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        // Throw sanitized error for users
        const sanitizedMessage = ErrorSanitizer.sanitize(
          `Batch delete failed: ${response.status} ${response.statusText} - ${errorText}`
        );
        throw new Error(sanitizedMessage);
      }

      const responseText = await response.text();
      const successCount = (responseText.match(/HTTP\/1\.1 204/g) || []).length;

      this.logger.debug('DataverseApiService: Batch DELETE succeeded', { environmentId, successCount, totalCount: entityIds.length });

      return successCount;
    } catch (error) {
      if (error instanceof OperationCancelledException) {
        throw error;
      }

      const normalizedError = normalizeError(error);
      this.logger.error('DataverseApiService batch delete failed', normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Internal method to perform HTTP requests with authentication.
   * Includes retry logic with exponential backoff for transient failures.
   * Retries up to 3 times for retryable errors (429, 503, 504, network failures).
   */
  private async request<T>(
    method: string,
    environmentId: string,
    endpoint: string,
    body: unknown | undefined,
    cancellationToken?: ICancellationToken,
    retries?: number
  ): Promise<T> {
    const effectiveRetries = retries ?? this.maxRetryAttempts;
    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    for (let attempt = 1; attempt <= effectiveRetries; attempt++) {
      try {
        return await this.executeRequest<T>(
          method,
          environmentId,
          endpoint,
          body,
          cancellationToken,
          attempt,
          effectiveRetries
        );
      } catch (error) {
        if (error instanceof OperationCancelledException) {
          throw error;
        }

        const isLastAttempt = attempt === effectiveRetries;
        const status = (error as Error & { status?: number }).status || 0;
        const isRetryable = this.isRetryableError(status, error);

        if (!isRetryable || isLastAttempt) {
          const normalizedError = normalizeError(error);
          this.logger.error('DataverseApiService request failed', normalizedError);
          throw normalizedError;
        }

        const delay = this.calculateBackoff(attempt);
        this.logger.warn(
          'Retrying request after backoff delay',
          { method, endpoint, error: String(error), status, delayMs: delay, attempt, retries }
        );
        await this.sleep(delay);
      }
    }

    throw new Error('Dataverse API request failed: all retry attempts exhausted');
  }

  private async executeRequest<T>(
    method: string,
    environmentId: string,
    endpoint: string,
    body: unknown | undefined,
    cancellationToken: ICancellationToken | undefined,
    attempt: number,
    retries: number
  ): Promise<T> {
    const [accessToken, environmentUrl] = await Promise.all([
      this.getAccessToken(environmentId),
      this.getEnvironmentUrl(environmentId)
    ]);

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const url = `${environmentUrl}${endpoint}`;
    this.logger.debug('DataverseApiService: Making API request', { environmentId, method, endpoint, attempt, retries });

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      // Request all OData annotations (formatted values, lookup entity types, etc.)
      'Prefer': 'odata.include-annotations="*"'
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
      // Log full error details for developers
      this.logger.error('Dataverse API request failed', {
        method,
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorText,
        attempt,
        retries
      });

      // Throw sanitized error for users
      const sanitizedMessage = ErrorSanitizer.sanitize(
        `Dataverse API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
      const error = new Error(sanitizedMessage);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    if (method === 'DELETE' || response.status === DataverseApiService.HTTP_STATUS_NO_CONTENT) {
      return undefined as T;
    }

    const data: unknown = await response.json();

    if (typeof data !== 'object' || data === null) {
      this.logger.error('Invalid API response: expected object', { data });
      throw new Error('Invalid Dataverse API response: expected JSON object');
    }

    this.logger.debug('DataverseApiService: Request succeeded', { method, endpoint });

    return data as T;
  }

  /**
   * Determines if an error should trigger a retry.
   * Retryable: 429 (rate limit), 503/504 (service unavailable), network errors.
   */
  private isRetryableError(status: number, error: unknown): boolean {
    if (status === DataverseApiService.HTTP_STATUS_RATE_LIMIT ||
        status === DataverseApiService.HTTP_STATUS_SERVICE_UNAVAILABLE ||
        status === DataverseApiService.HTTP_STATUS_GATEWAY_TIMEOUT) {
      return true;
    }

    const errorStr = String(error).toLowerCase();
    return (
      errorStr.includes('timeout') ||
      errorStr.includes('econnreset') ||
      errorStr.includes('network') ||
      errorStr.includes('fetch failed')
    );
  }

  /**
   * Calculates exponential backoff delay in milliseconds.
   * Formula: 2^(attempt-1) * 1000ms = 1s, 2s, 4s for attempts 1, 2, 3.
   */
  private calculateBackoff(attempt: number): number {
    return Math.pow(2, attempt - 1) * DataverseApiService.BASE_BACKOFF_MS;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
