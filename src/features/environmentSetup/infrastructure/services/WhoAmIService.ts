import { Environment } from '../../domain/entities/Environment';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { IWhoAmIService, WhoAmIResponse } from '../../domain/interfaces/IWhoAmIService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Internal interface for WhoAmI API response structure
 */
interface WhoAmIApiResponse {
	UserId: string;
	BusinessUnitId: string;
	OrganizationId: string;
}

/**
 * Type guard to validate WhoAmI API response structure
 * External API responses need runtime validation to ensure type safety.
 */
function isWhoAmIApiResponse(data: unknown): data is WhoAmIApiResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'UserId' in data &&
		typeof (data as WhoAmIApiResponse).UserId === 'string' &&
		'BusinessUnitId' in data &&
		typeof (data as WhoAmIApiResponse).BusinessUnitId === 'string' &&
		'OrganizationId' in data &&
		typeof (data as WhoAmIApiResponse).OrganizationId === 'string'
	);
}

/**
 * WhoAmI service implementation
 * Tests connection using Dataverse WhoAmI API
 */
export class WhoAmIService implements IWhoAmIService {
	/**
	 * Timeout duration for WhoAmI API request in milliseconds.
	 * Connection test fails if no response received within this window.
	 */
	private static readonly TIMEOUT_MS = 10000;

	/**
	 * Length of token prefix to log for debugging (truncated for security).
	 */
	private static readonly TOKEN_PREFIX_LOG_LENGTH = 10;

	constructor(
		private readonly authService: IAuthenticationService,
		private readonly logger: ILogger
	) {}

	/**
	 * Tests connection to Dataverse environment using WhoAmI API.
	 * @param environment - Environment to test
	 * @param clientSecret - Optional client secret (for service principal auth)
	 * @param password - Optional password (for username/password auth)
	 * @returns WhoAmI response containing user and organization identifiers
	 */
	public async testConnection(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<WhoAmIResponse> {
		const url = `${environment.getDataverseUrl().getApiBaseUrl()}/WhoAmI`;
		this.logger.debug('WhoAmIService: Testing connection', {
			url,
			authMethod: environment.getAuthenticationMethod().getType(),
			hasClientSecret: !!clientSecret,
			hasPassword: !!password
		});

		try {
			const token = await this.authService.getAccessTokenForEnvironment(
				environment,
				clientSecret,
				password
			);

			this.logger.debug('WhoAmIService: Access token acquired', {
				tokenPrefix: token.substring(0, WhoAmIService.TOKEN_PREFIX_LOG_LENGTH) + '...'
			});

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), WhoAmIService.TIMEOUT_MS);

			try {
				const response = await fetch(url, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json',
						'OData-MaxVersion': '4.0',
						'OData-Version': '4.0'
					},
					signal: controller.signal
				});

				if (!response.ok) {
					this.logger.error('WhoAmI API failed', { status: response.status, statusText: response.statusText });
					throw new Error(`WhoAmI API returned ${response.status}: ${response.statusText}`);
				}

				const data: unknown = await response.json();

				if (!isWhoAmIApiResponse(data)) {
					this.logger.error('Invalid WhoAmI response structure', { data });
					throw new Error('WhoAmI API response missing required fields (UserId, BusinessUnitId, OrganizationId)');
				}

				this.logger.info('WhoAmI API call successful', {
					userId: data.UserId,
					organizationId: data.OrganizationId
				});

				return {
					userId: data.UserId,
					businessUnitId: data.BusinessUnitId,
					organizationId: data.OrganizationId
				};
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					this.logger.error('WhoAmI API call timed out');
					throw new Error('Connection test timed out after 10 seconds');
				}
				throw error;
			} finally {
				clearTimeout(timeoutId);
			}
		} catch (error) {
			this.logger.error('WhoAmIService: Connection test failed', error);
			throw error;
		}
	}
}
