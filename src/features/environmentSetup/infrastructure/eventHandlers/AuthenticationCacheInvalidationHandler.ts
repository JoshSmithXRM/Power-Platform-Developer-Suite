import { AuthenticationCacheInvalidationRequested } from '../../domain/events/AuthenticationCacheInvalidationRequested';
import { IAuthenticationService } from '../services/IAuthenticationService';

/**
 * Infrastructure event handler: Clear authentication cache when requested
 */
export class AuthenticationCacheInvalidationHandler {
	constructor(private readonly authenticationService: IAuthenticationService) {}

	public handle(event: AuthenticationCacheInvalidationRequested): void {
		this.authenticationService.clearCacheForEnvironment(event.environmentId);
	}
}
