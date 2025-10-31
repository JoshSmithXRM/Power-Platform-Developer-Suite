import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Domain event: Authentication cache should be invalidated
 * Emitted when credentials change or auth method changes
 */
export class AuthenticationCacheInvalidationRequested {
	public readonly occurredAt: Date;

	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly reason: 'credentials_changed' | 'auth_method_changed' | 'environment_deleted'
	) {
		this.occurredAt = new Date();
	}
}
