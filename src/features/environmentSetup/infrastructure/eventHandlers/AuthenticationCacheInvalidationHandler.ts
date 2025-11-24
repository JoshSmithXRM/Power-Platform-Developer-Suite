import { AuthenticationCacheInvalidationRequested } from '../../domain/events/AuthenticationCacheInvalidationRequested';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Infrastructure event handler: Clear authentication cache when requested
 * Listens to domain events and coordinates cache invalidation
 */
export class AuthenticationCacheInvalidationHandler {
	constructor(
		private readonly authenticationService: IAuthenticationService,
		private readonly logger: ILogger
	) {}

	/**
	 * Handles authentication cache invalidation requests from domain events
	 * Clears cached tokens for the specified environment
	 * @param event - Domain event containing environment ID and invalidation reason
	 */
	public handle(event: AuthenticationCacheInvalidationRequested): void {
		this.logger.info('Invalidating authentication cache', {
			environmentId: event.environmentId.getValue(),
			reason: event.reason
		});

		this.authenticationService.clearCacheForEnvironment(event.environmentId);

		this.logger.info('Authentication cache invalidation completed');
	}
}
