import { Environment } from '../entities/Environment';

/**
 * Domain interface for Power Platform Business Application Platform (BAP) API
 * Used to discover environment metadata
 */
export interface IPowerPlatformApiService {
	/**
	 * Discover Power Platform environment ID from Dataverse URL
	 * @param environment Environment configuration
	 * @param clientSecret Optional client secret (for Service Principal)
	 * @param password Optional password (for Username/Password)
	 * @returns Power Platform environment ID (GUID)
	 */
	discoverEnvironmentId(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<string>;
}
