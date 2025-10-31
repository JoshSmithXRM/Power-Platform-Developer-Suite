import { Environment } from '../entities/Environment';

/**
 * WhoAmI service interface (for connection testing)
 * Domain defines contract, infrastructure implements
 */
export interface IWhoAmIService {
	/**
	 * Test connection to Dataverse using WhoAmI API
	 * @param environment Environment to test
	 * @param clientSecret Optional client secret (if needed)
	 * @param password Optional password (if needed)
	 * @returns WhoAmI response data
	 */
	testConnection(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<WhoAmIResponse>;
}

export interface WhoAmIResponse {
	userId: string;
	businessUnitId: string;
	organizationId: string;
}
