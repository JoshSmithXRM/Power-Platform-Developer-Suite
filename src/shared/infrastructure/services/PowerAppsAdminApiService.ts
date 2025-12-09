import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { IPowerAppsAdminApiService } from '../interfaces/IPowerAppsAdminApiService';
import { normalizeError } from '../../utils/ErrorUtils';
import { ErrorSanitizer } from '../../utils/ErrorSanitizer';

/**
 * Service for making authenticated HTTP requests to Power Apps Admin API.
 * Used for admin operations like fetching connections that aren't in Dataverse.
 *
 * API Base URL: https://api.powerapps.com
 * Auth Scope: https://service.powerapps.com/.default
 */
export class PowerAppsAdminApiService implements IPowerAppsAdminApiService {
	private static readonly API_BASE_URL = 'https://api.powerapps.com';
	private static readonly API_VERSION = '2016-11-01';

	constructor(
		private readonly getAccessToken: (environmentId: string) => Promise<string>,
		private readonly logger: ILogger
	) {}

	/**
	 * Performs a GET request to the Power Apps Admin API.
	 * @param environmentId - Power Platform environment GUID
	 * @param endpoint - Relative endpoint path (e.g., '/connections')
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to the JSON response
	 */
	async get<T = unknown>(
		environmentId: string,
		endpoint: string,
		cancellationToken?: ICancellationToken
	): Promise<T> {
		if (cancellationToken?.isCancellationRequested) {
			throw new OperationCancelledException();
		}

		try {
			const accessToken = await this.getAccessToken(environmentId);

			if (cancellationToken?.isCancellationRequested) {
				throw new OperationCancelledException();
			}

			// Build full URL with environment scope
			const baseEndpoint = `/providers/Microsoft.PowerApps/scopes/admin/environments/${environmentId}${endpoint}`;
			const separator = endpoint.includes('?') ? '&' : '?';
			const url = `${PowerAppsAdminApiService.API_BASE_URL}${baseEndpoint}${separator}api-version=${PowerAppsAdminApiService.API_VERSION}`;

			this.logger.debug('PowerAppsAdminApiService: Making API request', {
				environmentId,
				endpoint
			});

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/json',
					// Prevent HTTP caching - admin tools must always get fresh data
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					Pragma: 'no-cache'
				},
				cache: 'no-store'
			});

			if (!response.ok) {
				const errorText = await response.text();
				// Log full error details for developers
				this.logger.error('Power Apps Admin API request failed', {
					endpoint,
					status: response.status,
					statusText: response.statusText,
					errorText
				});

				// Throw sanitized error for users
				const sanitizedMessage = ErrorSanitizer.sanitize(
					`Power Apps Admin API request failed: ${response.status} ${response.statusText} - ${errorText}`
				);
				throw new Error(sanitizedMessage);
			}

			const data: unknown = await response.json();

			if (typeof data !== 'object' || data === null) {
				this.logger.error('Invalid API response: expected object', { data });
				throw new Error('Invalid Power Apps Admin API response: expected JSON object');
			}

			this.logger.debug('PowerAppsAdminApiService: Request succeeded', { endpoint });

			return data as T;
		} catch (error) {
			if (error instanceof OperationCancelledException) {
				throw error;
			}

			const normalizedError = normalizeError(error);
			this.logger.error('PowerAppsAdminApiService request failed', normalizedError);
			throw normalizedError;
		}
	}
}
