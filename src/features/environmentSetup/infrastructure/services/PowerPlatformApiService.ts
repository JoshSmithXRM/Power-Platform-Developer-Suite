import { Environment } from '../../domain/entities/Environment';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { IPowerPlatformApiService } from '../../domain/interfaces/IPowerPlatformApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Service for interacting with Power Platform Business Application Platform (BAP) API
 * Used to discover environment metadata
 */
export class PowerPlatformApiService implements IPowerPlatformApiService {
	private static readonly BAP_API_BASE_URL = 'https://api.bap.microsoft.com' as const;
	private static readonly BAP_API_SCOPE = 'https://api.bap.microsoft.com/.default' as const;

	constructor(
		private readonly authenticationService: IAuthenticationService,
		private readonly logger: ILogger
	) {}

	/**
	 * Discovers Power Platform environment ID from Dataverse URL
	 * Calls BAP API to list environments and matches by organization name
	 * @param environment Environment with Dataverse URL
	 * @param clientSecret Optional client secret for authentication
	 * @param password Optional password for authentication
	 * @param cancellationToken Optional cancellation token
	 * @returns Power Platform environment ID (GUID)
	 */
	public async discoverEnvironmentId(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
		const orgName = environment.getDataverseUrl().getOrganizationName();
		this.logger.debug('PowerPlatformApiService: Discovering environment ID', {
			organizationName: orgName,
			authMethod: environment.getAuthenticationMethod().getType()
		});

		try {
		// Get access token for BAP API
		const accessToken = await this.authenticationService.getAccessTokenForEnvironment(
			environment,
			clientSecret,
			password,
			PowerPlatformApiService.BAP_API_SCOPE,
			cancellationToken
		);

		this.logger.debug('PowerPlatformApiService: Access token acquired for BAP API');

		// Check for cancellation after authentication (before API call)
		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('PowerPlatformApiService: Operation cancelled by user');
			throw new Error('Operation cancelled by user');
		}

		// Call BAP API to list environments
		this.logger.debug('PowerPlatformApiService: Calling BAP API to list environments');

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
			this.logger.error(`BAP API request failed: ${response.status} ${response.statusText}`);
			throw new Error(`BAP API request failed: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data: unknown = await response.json();
		if (!isBapApiResponse(data)) {
			this.logger.error('Invalid BAP API response structure');
			throw new Error('Invalid BAP API response structure');
		}

		this.logger.debug(`BAP API returned ${data.value.length} environments`);

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
			this.logger.warn(`No Power Platform environment found matching organization: ${orgName}`);
			throw new Error(`No Power Platform environment found matching organization: ${orgName}`);
		}

		// Extract environment ID from the name field (format: /providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/{guid})
		const environmentId = matchingEnvironment.name.split('/').pop();
		if (!environmentId) {
			this.logger.error('Failed to extract environment ID from BAP API response');
			throw new Error('Failed to extract environment ID from BAP API response');
		}

		this.logger.info(`Environment ID discovered: ${environmentId} for organization: ${orgName}`);

		return environmentId;
		} catch (error) {
			this.logger.error('PowerPlatformApiService: Failed to discover environment ID', error);
			throw error;
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
