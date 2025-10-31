import { Environment } from '../../domain/entities/Environment';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { IPowerPlatformApiService } from '../../domain/interfaces/IPowerPlatformApiService';

/**
 * Service for interacting with Power Platform Business Application Platform (BAP) API
 * Used to discover environment metadata
 */
export class PowerPlatformApiService implements IPowerPlatformApiService {
	private static readonly BAP_API_BASE_URL = 'https://api.bap.microsoft.com';
	private static readonly BAP_API_SCOPE = 'https://api.bap.microsoft.com/.default';

	constructor(private readonly authenticationService: IAuthenticationService) {}

	public async discoverEnvironmentId(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<string> {
		// Get access token for BAP API
		const accessToken = await this.authenticationService.getAccessTokenForEnvironment(
			environment,
			clientSecret,
			password,
			PowerPlatformApiService.BAP_API_SCOPE
		);

		// Extract organization name from Dataverse URL
		// Example: https://org.crm.dynamics.com -> org
		const dataverseUrl = environment.getDataverseUrl().getValue();
		const orgName = this.extractOrgName(dataverseUrl);

		// Call BAP API to list environments
		const response = await fetch(
			`${PowerPlatformApiService.BAP_API_BASE_URL}/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments?api-version=2023-06-01`,
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`BAP API request failed: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json() as BapApiResponse;

		// Find environment matching the organization name
		const matchingEnvironment = data.value.find((env: BapEnvironment) => {
			// Match by organization unique name or URL
			const envOrgName = env.properties?.linkedEnvironmentMetadata?.uniqueName?.toLowerCase();
			const envUrl = env.properties?.linkedEnvironmentMetadata?.instanceUrl?.toLowerCase();

			return envOrgName === orgName.toLowerCase() ||
				(envUrl && this.extractOrgName(envUrl) === orgName.toLowerCase());
		});

		if (!matchingEnvironment) {
			throw new Error(`No Power Platform environment found matching organization: ${orgName}`);
		}

		// Extract environment ID from the name field (format: /providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/{guid})
		const environmentId = matchingEnvironment.name.split('/').pop();
		if (!environmentId) {
			throw new Error('Failed to extract environment ID from BAP API response');
		}

		return environmentId;
	}

	/**
	 * Extract organization name from Dataverse URL
	 * Examples:
	 *   https://org.crm.dynamics.com -> org
	 *   https://org.crm2.dynamics.com -> org
	 *   https://org.api.crm.dynamics.com -> org
	 */
	private extractOrgName(url: string): string {
		try {
			const urlObj = new URL(url);
			const hostname = urlObj.hostname;

			// Extract first part before .crm or .api
			const parts = hostname.split('.');
			if (parts.length > 0) {
				return parts[0];
			}

			throw new Error('Unable to extract organization name from URL');
		} catch (_error) {
			throw new Error(`Invalid Dataverse URL: ${url}`);
		}
	}
}

interface BapApiResponse {
	value: BapEnvironment[];
}

interface BapEnvironment {
	name: string;
	properties?: {
		linkedEnvironmentMetadata?: {
			uniqueName?: string;
			instanceUrl?: string;
		};
	};
}
