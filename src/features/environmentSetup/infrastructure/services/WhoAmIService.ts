import { IWhoAmIService, WhoAmIResponse } from '../../domain/interfaces/IWhoAmIService';
import { Environment } from '../../domain/entities/Environment';

import { IAuthenticationService } from './IAuthenticationService';

/**
 * WhoAmI service implementation
 * Tests connection using Dataverse WhoAmI API
 */
export class WhoAmIService implements IWhoAmIService {
	private static readonly TIMEOUT_MS = 10000;

	constructor(
		private readonly authService: IAuthenticationService
	) {}

	public async testConnection(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<WhoAmIResponse> {
		// Get access token
		const token = await this.authService.getAccessTokenForEnvironment(
			environment,
			clientSecret,
			password
		);

		// Call WhoAmI API
		const url = `${environment.getDataverseUrl().getApiBaseUrl()}/WhoAmI`;

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
				throw new Error(`WhoAmI API returned ${response.status}: ${response.statusText}`);
			}

			const data: unknown = await response.json();

			if (!data || typeof data !== 'object') {
				throw new Error('Invalid WhoAmI response structure');
			}

			const whoAmI = data as Record<string, unknown>;

			if (typeof whoAmI.UserId !== 'string' ||
				typeof whoAmI.BusinessUnitId !== 'string' ||
				typeof whoAmI.OrganizationId !== 'string') {
				throw new Error('WhoAmI response missing required fields');
			}

			return {
				userId: whoAmI.UserId,
				businessUnitId: whoAmI.BusinessUnitId,
				organizationId: whoAmI.OrganizationId
			};
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Connection test timed out after 10 seconds');
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
