import { Environment } from '../../domain/entities/Environment';

/**
 * Authentication service interface for infrastructure layer
 */
export interface IAuthenticationService {
	/**
	 * Get access token for environment
	 */
	getAccessTokenForEnvironment(
		environment: Environment,
		clientSecret?: string,
		password?: string
	): Promise<string>;
}
