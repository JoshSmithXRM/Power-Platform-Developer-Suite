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
			// Domain entity validates configuration in constructor (Environment.ts lines 62-131).
			// If construction succeeds, environment is valid by definition.
			const tempEnvironment = this.createTemporaryEnvironment(request);

			if (!this.whoAmIService) {
				return this.createServiceUnavailableResponse();
			}

			const credentials = await this.loadCredentials(request, tempEnvironment);
			const whoAmIResponse = await this.whoAmIService.testConnection(
				tempEnvironment,
				credentials.clientSecret,
				credentials.password
			);

			this.logger.info(`Connection test successful for "${request.name}"`);
			return this.createSuccessResponse(whoAmIResponse);
		} catch (error) {
			this.logger.error('TestConnectionUseCase: Connection test failed', error);
			return this.createErrorResponse(error);
		}
	}

	/**
	 * Creates temporary environment entity from request data
	 */
	private createTemporaryEnvironment(request: TestConnectionRequest): Environment {
		const environmentId = request.existingEnvironmentId
			? new EnvironmentId(request.existingEnvironmentId)
			: EnvironmentId.generate();

		return new Environment(
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
	}

	/**
	 * Loads credentials from request or storage fallback
	 */
	private async loadCredentials(
		request: TestConnectionRequest,
		environment: Environment
	): Promise<{ clientSecret?: string; password?: string }> {
		const authMethod = environment.getAuthenticationMethod();

		const clientSecret = await this.loadClientSecretIfNeeded(
			request.clientSecret,
			authMethod,
			environment
		);

		const password = await this.loadPasswordIfNeeded(
			request.password,
			authMethod,
			environment
		);

		const result: { clientSecret?: string; password?: string } = {};
		if (clientSecret !== undefined) {
			result.clientSecret = clientSecret;
		}
		if (password !== undefined) {
			result.password = password;
		}
		return result;
	}

	/**
	 * Loads client secret from storage if not provided in request
	 */
	private async loadClientSecretIfNeeded(
		requestSecret: string | undefined,
		authMethod: AuthenticationMethod,
		environment: Environment
	): Promise<string | undefined> {
		if (requestSecret) {
			return requestSecret;
		}

		if (!authMethod.requiresClientCredentials()) {
			return undefined;
		}

		// Domain guarantees clientId exists when requiresClientCredentials() is true.
		// Environment constructor validates this invariant (Environment.ts lines 114-124).
		const clientId = environment.getClientId()!.getValue();

		const secret = await this.repository.getClientSecret(clientId);
		if (secret) {
			this.logger.debug('Loaded client secret from storage');
		}
		return secret;
	}

	/**
	 * Loads password from storage if not provided in request
	 */
	private async loadPasswordIfNeeded(
		requestPassword: string | undefined,
		authMethod: AuthenticationMethod,
		environment: Environment
	): Promise<string | undefined> {
		if (requestPassword) {
			return requestPassword;
		}

		if (!authMethod.requiresUsernamePassword()) {
			return undefined;
		}

		// Domain guarantees username exists when requiresUsernamePassword() is true.
		// Environment constructor validates this invariant (Environment.ts lines 126-136).
		const username = environment.getUsername()!;

		const password = await this.repository.getPassword(username);
		if (password) {
			this.logger.debug('Loaded password from storage');
		}
		return password;
	}

	/**
	 * Creates response for when WhoAmI service is unavailable
	 */
	private createServiceUnavailableResponse(): TestConnectionResponse {
		this.logger.warn('TestConnectionUseCase: WhoAmI service not available');
		return {
			success: false,
			errorMessage: 'WhoAmI service not yet implemented'
		};
	}

	/**
	 * Creates success response from WhoAmI API response
	 */
	private createSuccessResponse(whoAmIResponse: {
		userId: string;
		businessUnitId: string;
		organizationId: string;
	}): TestConnectionResponse {
		return {
			success: true,
			userId: whoAmIResponse.userId,
			businessUnitId: whoAmIResponse.businessUnitId,
			organizationId: whoAmIResponse.organizationId
		};
	}

	/**
	 * Creates error response from exception
	 */
	private createErrorResponse(error: unknown): TestConnectionResponse {
		return {
			success: false,
			errorMessage: error instanceof Error ? error.message : 'Unknown error'
		};
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
