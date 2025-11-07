import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { IWhoAmIService } from '../../domain/interfaces/IWhoAmIService';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { ApplicationError } from '../errors/ApplicationError';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use Case: Test connection to existing (saved) environment
 *
 * Single Responsibility: Test connection for environments already persisted in storage.
 * For draft/unsaved environments, use TestConnectionUseCase.
 *
 * This use case uses domain value objects (EnvironmentId) instead of primitives,
 * providing stronger type safety and clearer intent.
 */
export class TestExistingEnvironmentConnectionUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly whoAmIService: IWhoAmIService | null,
		private readonly logger: ILogger
	) {}

	/**
	 * Tests connection to an existing environment
	 * @param request Request containing environment ID
	 * @returns Response indicating success/failure and user/organization information
	 */
	public async execute(request: TestExistingEnvironmentConnectionRequest): Promise<TestExistingEnvironmentConnectionResponse> {
		this.logger.debug('TestExistingEnvironmentConnectionUseCase: Starting connection test', {
			environmentId: request.environmentId.getValue()
		});

		try {
			// Load environment entity from repository
			const environment = await this.repository.getById(request.environmentId);
			if (!environment) {
				const errorMessage = `Environment not found: ${request.environmentId.getValue()}`;
				this.logger.warn(errorMessage);
				throw new ApplicationError(errorMessage);
			}

			// Validate environment can be tested
			if (!environment.canTestConnection()) {
				const validationResult = environment.validateConfiguration();
				throw new ApplicationError(`Cannot test connection: ${validationResult.errors.join(', ')}`);
			}

			// Check if WhoAmI service is available
			if (!this.whoAmIService) {
				this.logger.warn('TestExistingEnvironmentConnectionUseCase: WhoAmI service not available');
				return {
					success: false,
					errorMessage: 'WhoAmI service not yet implemented'
				};
			}

			// Load credentials from storage
			const credentials = await this.loadCredentials(environment);

			// Test connection via domain service
			const whoAmIResponse = await this.whoAmIService.testConnection(
				environment,
				credentials.clientSecret,
				credentials.password
			);

			this.logger.info('Connection test successful', { environmentName: environment.getName().getValue() });

			return {
				success: true,
				userId: whoAmIResponse.userId,
				businessUnitId: whoAmIResponse.businessUnitId,
				organizationId: whoAmIResponse.organizationId
			};
		} catch (error) {
			this.logger.error('TestExistingEnvironmentConnectionUseCase: Connection test failed', error);
			return {
				success: false,
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Loads credentials from storage for the environment
	 */
	private async loadCredentials(environment: {
		getAuthenticationMethod(): { requiresClientCredentials(): boolean; requiresUsernamePassword(): boolean };
		getClientId(): { getValue(): string } | undefined;
		getUsername(): string | undefined;
	}): Promise<{ clientSecret?: string; password?: string }> {
		const authMethod = environment.getAuthenticationMethod();
		const result: { clientSecret?: string; password?: string } = {};

		// Load client secret if needed
		if (authMethod.requiresClientCredentials()) {
			const clientId = environment.getClientId()?.getValue();
			if (clientId) {
				const secret = await this.repository.getClientSecret(clientId);
				if (secret) {
					result.clientSecret = secret;
					this.logger.debug('Loaded client secret from storage');
				}
			}
		}

		// Load password if needed
		if (authMethod.requiresUsernamePassword()) {
			const username = environment.getUsername();
			if (username) {
				const password = await this.repository.getPassword(username);
				if (password) {
					result.password = password;
					this.logger.debug('Loaded password from storage');
				}
			}
		}

		return result;
	}
}

export interface TestExistingEnvironmentConnectionRequest {
	readonly environmentId: EnvironmentId;
}

export interface TestExistingEnvironmentConnectionResponse {
	readonly success: boolean;
	readonly userId?: string;
	readonly businessUnitId?: string;
	readonly organizationId?: string;
	readonly errorMessage?: string;
}
