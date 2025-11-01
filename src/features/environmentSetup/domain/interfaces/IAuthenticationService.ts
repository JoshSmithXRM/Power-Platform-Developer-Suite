import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';

import { ICancellationToken } from './ICancellationToken';

/**
 * Authentication service interface for infrastructure layer
 */
export interface IAuthenticationService {
	/**
	 * Get access token for environment
	 * @param environment Environment configuration
	 * @param clientSecret Optional client secret (for Service Principal)
	 * @param password Optional password (for Username/Password)
	 * @param customScope Optional custom scope (defaults to Dataverse scope)
	 * @param cancellationToken Optional cancellation token to abort authentication
	 */
	getAccessTokenForEnvironment(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		customScope?: string,
		cancellationToken?: ICancellationToken
	): Promise<string>;

	/**
	 * Clear cached tokens for specific environment
	 * Called when auth method changes or credentials are updated
	 */
	clearCacheForEnvironment(environmentId: EnvironmentId): void;

	/**
	 * Clear all cached tokens
	 * Called when user explicitly requests cache clear
	 */
	clearAllCache(): void;
}
