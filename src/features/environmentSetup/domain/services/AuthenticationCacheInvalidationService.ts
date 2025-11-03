import { Environment } from '../entities/Environment';

/**
 * Domain service for determining when authentication cache should be invalidated.
 *
 * Business logic: Cache must be cleared when credentials or authentication configuration changes
 * to prevent stale tokens from being used.
 */
export class AuthenticationCacheInvalidationService {
	/**
	 * Determines if authentication cache should be invalidated based on environment changes.
	 *
	 * @param previous - Previous environment state (null for new environments)
	 * @param updated - Updated environment state
	 * @returns true if cache should be cleared
	 */
	public shouldInvalidateCache(previous: Environment | null, updated: Environment): boolean {
		// New environments don't have cache to invalidate
		if (!previous) {
			return false;
		}

		// Authentication method changed (e.g., Interactive → Client Credentials)
		const authMethodChanged = previous.getAuthenticationMethod().getType() !==
			updated.getAuthenticationMethod().getType();

		// Client ID changed (affects which Azure AD app is used)
		const clientIdChanged = previous.getClientId()?.getValue() !==
			updated.getClientId()?.getValue();

		// Username changed (affects which account's tokens are cached)
		const usernameChanged = previous.getUsername() !== updated.getUsername();

		// Dataverse URL changed (tokens are scoped to resource URLs)
		const urlChanged = previous.getDataverseUrl().getValue() !==
			updated.getDataverseUrl().getValue();

		// Tenant ID changed (completely different Azure AD tenant)
		const tenantIdChanged = previous.getTenantId().getValue() !==
			updated.getTenantId().getValue();

		return authMethodChanged || clientIdChanged || usernameChanged || urlChanged || tenantIdChanged;
	}
}
