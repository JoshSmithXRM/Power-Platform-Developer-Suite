import { IPowerPlatformApiService } from '../../domain/interfaces/IPowerPlatformApiService';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';

/**
 * Command Use Case: Discover Power Platform Environment ID
 * Calls BAP API to find environment ID from Dataverse URL
 */
export class DiscoverEnvironmentIdUseCase {
	constructor(
		private readonly powerPlatformApiService: IPowerPlatformApiService,
		private readonly repository: IEnvironmentRepository
	) {}

	public async execute(request: DiscoverEnvironmentIdRequest): Promise<DiscoverEnvironmentIdResponse> {
		// Create temporary domain entity from draft data
		const tempEnvironment = new Environment(
			request.existingEnvironmentId
				? new EnvironmentId(request.existingEnvironmentId)
				: EnvironmentId.generate(),
			new EnvironmentName(request.name),
			new DataverseUrl(request.dataverseUrl),
			new TenantId(request.tenantId),
			new AuthenticationMethod(request.authenticationMethod),
			new ClientId(request.publicClientId),
			false,
			undefined,
			undefined,
			request.clientId ? new ClientId(request.clientId) : undefined,
			request.username
		);

		// Load credentials from storage if not provided
		let clientSecret = request.clientSecret;
		let password = request.password;

		const authMethod = tempEnvironment.getAuthenticationMethod();

		if (authMethod.requiresClientCredentials() && !clientSecret) {
			const clientId = tempEnvironment.getClientId()?.getValue();
			if (clientId) {
				clientSecret = await this.repository.getClientSecret(clientId);
			}
		}

		if (authMethod.requiresUsernamePassword() && !password) {
			const username = tempEnvironment.getUsername();
			if (username) {
				password = await this.repository.getPassword(username);
			}
		}

		try {
			// Call BAP API to discover environment ID
			const environmentId = await this.powerPlatformApiService.discoverEnvironmentId(
				tempEnvironment,
				clientSecret,
				password
			);

			return {
				success: true,
				environmentId: environmentId
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Check if this is a 403 permissions error (common with Service Principal)
			const isForbidden = errorMessage.includes('403') || errorMessage.includes('Forbidden');

			return {
				success: false,
				errorMessage: errorMessage,
				requiresInteractiveAuth: isForbidden
			};
		}
	}
}

export interface DiscoverEnvironmentIdRequest {
	existingEnvironmentId?: string;
	name: string;
	dataverseUrl: string;
	tenantId: string;
	authenticationMethod: AuthenticationMethodType;
	publicClientId: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	password?: string;
}

export interface DiscoverEnvironmentIdResponse {
	success: boolean;
	environmentId?: string;
	errorMessage?: string;
	requiresInteractiveAuth?: boolean;
}
