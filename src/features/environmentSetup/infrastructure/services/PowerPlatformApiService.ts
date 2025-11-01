import { Environment } from '../../domain/entities/Environment';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { IPowerPlatformApiService } from '../../domain/interfaces/IPowerPlatformApiService';

/**
 * Service for interacting with Power Platform Business Application Platform (BAP) API
 * Used to discover environment metadata
 */
export class PowerPlatformApiService implements IPowerPlatformApiService {
	private static readonly BAP_API_BASE_URL = 'https://api.bap.microsoft.com' as const;
	private static readonly BAP_API_SCOPE = 'https://api.bap.microsoft.com/.default' as const;

	constructor(private readonly authenticationService: IAuthenticationService) {}

	public async discoverEnvironmentId(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Get access token for BAP API
		const accessToken = await this.authenticationService.getAccessTokenForEnvironment(
			environment,
			clientSecret,
			password,
			PowerPlatformApiService.BAP_API_SCOPE,
			cancellationToken
		);

		// Check for cancellation after authentication (before API call)
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Operation cancelled by user');
		}

		// Extract organization name from Dataverse URL
		const orgName = environment.getDataverseUrl().getOrganizationName();

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

		const data: unknown = await response.json();
		if (!isBapApiResponse(data)) {
			throw new Error('Invalid BAP API response structure');
		}

		// Find environment matching the organization name
		const matchingEnvironment = data.value.find(env => {
			// Match by organization unique name or URL
			const envOrgName = env.properties?.linkedEnvironmentMetadata?.uniqueName?.toLowerCase();
			const envUrl = env.properties?.linkedEnvironmentMetadata?.instanceUrl;

			// Match by unique name directly
			if (envOrgName === orgName.toLowerCase()) {
				return true;
			}

			// Match by extracting org name from environment's instance URL
			if (envUrl) {
				try {
					const envDataverseUrl = new DataverseUrl(envUrl);
					return envDataverseUrl.getOrganizationName().toLowerCase() === orgName.toLowerCase();
				} catch {
					// Invalid URL format, skip this environment
					return false;
				}
			}

			return false;
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

/**
 * Type guard to validate BAP API response structure
 */
function isBapApiResponse(data: unknown): data is BapApiResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'value' in data &&
		Array.isArray((data as BapApiResponse).value)
	);
}
