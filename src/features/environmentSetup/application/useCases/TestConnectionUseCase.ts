import { IWhoAmIService } from '../../domain/interfaces/IWhoAmIService';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { ApplicationError } from '../errors/ApplicationError';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Command Use Case: Test connection to Dataverse
 * Works with draft (unsaved) environment data
 * Falls back to stored credentials if not provided
 */
export class TestConnectionUseCase {
	constructor(
		private readonly whoAmIService: IWhoAmIService | null,
		private readonly repository: IEnvironmentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Tests connection to Dataverse using draft environment configuration
	 * @param request Environment configuration including optional credentials
	 * @returns Response indicating success/failure and user/organization information
	 */
	public async execute(request: TestConnectionRequest): Promise<TestConnectionResponse> {
		this.logger.debug('TestConnectionUseCase: Starting connection test', {
			name: request.name,
			dataverseUrl: request.dataverseUrl,
			authMethod: request.authenticationMethod,
			hasClientSecret: !!request.clientSecret,
			hasPassword: !!request.password
		});

		try {
		// Create temporary domain entity from draft data (NOT saved)
		// Use existing environment ID if provided (to preserve token cache)
		const environmentId = request.existingEnvironmentId
			? new EnvironmentId(request.existingEnvironmentId)
			: EnvironmentId.generate();

		const tempEnvironment = new Environment(
			environmentId,
			new EnvironmentName(request.name),
			new DataverseUrl(request.dataverseUrl),
			new TenantId(request.tenantId),
			new AuthenticationMethod(request.authenticationMethod),
			new ClientId(request.publicClientId),
			false,
			undefined,
			request.powerPlatformEnvironmentId,
			request.clientId ? new ClientId(request.clientId) : undefined,
			request.username
		);

		// Domain validation
		if (!tempEnvironment.canTestConnection()) {
			const validationResult = tempEnvironment.validateConfiguration();
			throw new ApplicationError(`Cannot test connection: ${validationResult.errors.join(', ')}`);
		}

		// Test connection using WhoAmI API
		if (!this.whoAmIService) {
			this.logger.warn('TestConnectionUseCase: WhoAmI service not available');
			return {
				success: false,
				errorMessage: 'WhoAmI service not yet implemented'
			};
		}

		// Load credentials from storage if not provided
		let clientSecret = request.clientSecret;
		let password = request.password;

		const authMethod = tempEnvironment.getAuthenticationMethod();

		// If credentials not provided, try to load from storage
		if (authMethod.requiresClientCredentials() && !clientSecret) {
			const clientId = tempEnvironment.getClientId()?.getValue();
			if (clientId) {
				clientSecret = await this.repository.getClientSecret(clientId);
				this.logger.debug('Loaded client secret from storage');
			}
		}

		if (authMethod.requiresUsernamePassword() && !password) {
			const username = tempEnvironment.getUsername();
			if (username) {
				password = await this.repository.getPassword(username);
				this.logger.debug('Loaded password from storage');
			}
		}

		const whoAmIResponse = await this.whoAmIService.testConnection(
			tempEnvironment,
			clientSecret,
			password
		);

		this.logger.info(`Connection test successful for "${request.name}"`);

		return {
			success: true,
			userId: whoAmIResponse.userId,
			businessUnitId: whoAmIResponse.businessUnitId,
			organizationId: whoAmIResponse.organizationId
		};
		} catch (error) {
			this.logger.error('TestConnectionUseCase: Connection test failed', error);
			return {
				success: false,
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}

export interface TestConnectionRequest {
	existingEnvironmentId?: string;
	name: string;
	dataverseUrl: string;
	tenantId: string;
	authenticationMethod: AuthenticationMethodType;
	publicClientId: string;
	powerPlatformEnvironmentId?: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	password?: string;
}

export interface TestConnectionResponse {
	success: boolean;
	userId?: string;
	businessUnitId?: string;
	organizationId?: string;
	errorMessage?: string;
}
