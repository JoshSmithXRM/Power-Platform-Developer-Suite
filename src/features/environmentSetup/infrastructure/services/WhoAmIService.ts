import { Environment } from '../../domain/entities/Environment';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { IWhoAmIService, WhoAmIResponse } from '../../domain/interfaces/IWhoAmIService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * WhoAmI service implementation
 * Tests connection using Dataverse WhoAmI API
 */
export class WhoAmIService implements IWhoAmIService {
	private static readonly TIMEOUT_MS = 10000;

	constructor(
		private readonly authService: IAuthenticationService,
		private readonly logger: ILogger
	) {}

	/**
	 * Tests connection to Dataverse environment using WhoAmI API
	 * @param environment Environment to test
	 * @param clientSecret Optional client secret (for service principal auth)
	 * @param password Optional password (for username/password auth)
	 * @returns WhoAmI response containing user and organization identifiers
	 */
	public async testConnection(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<WhoAmIResponse> {
		const url = `${environment.getDataverseUrl().getApiBaseUrl()}/WhoAmI`;
		this.logger.debug(`WhoAmIService: Testing connection to ${url}`, {
			authMethod: environment.getAuthenticationMethod().getType(),
			hasClientSecret: !!clientSecret,
			hasPassword: !!password
		});

		try {
			// Get access token
			const token = await this.authService.getAccessTokenForEnvironment(
				environment,
				clientSecret,
				password
			);

			this.logger.debug('WhoAmIService: Access token acquired', {
				tokenPrefix: token.substring(0, 10) + '...'
			});

			// Call WhoAmI API
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
					this.logger.error(`WhoAmI API failed: ${response.status} ${response.statusText}`);
					throw new Error(`WhoAmI API returned ${response.status}: ${response.statusText}`);
				}

				const data: unknown = await response.json();

				if (!data || typeof data !== 'object') {
					this.logger.error('Invalid WhoAmI response structure');
					throw new Error('Invalid WhoAmI response structure');
				}

				const whoAmI = data as Record<string, unknown>;

				if (typeof whoAmI.UserId !== 'string' ||
					typeof whoAmI.BusinessUnitId !== 'string' ||
					typeof whoAmI.OrganizationId !== 'string') {
					this.logger.error('WhoAmI response missing required fields');
					throw new Error('WhoAmI response missing required fields');
				}

				this.logger.info('WhoAmI API call successful', {
					userId: whoAmI.UserId,
					organizationId: whoAmI.OrganizationId
				});

				return {
					userId: whoAmI.UserId,
					businessUnitId: whoAmI.BusinessUnitId,
					organizationId: whoAmI.OrganizationId
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
