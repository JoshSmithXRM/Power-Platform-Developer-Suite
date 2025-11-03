import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentValidationService } from '../../domain/services/EnvironmentValidationService';
import { AuthenticationCacheInvalidationService } from '../../domain/services/AuthenticationCacheInvalidationService';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentCreated } from '../../domain/events/EnvironmentCreated';
import { EnvironmentUpdated } from '../../domain/events/EnvironmentUpdated';
import { AuthenticationCacheInvalidationRequested } from '../../domain/events/AuthenticationCacheInvalidationRequested';
import { ApplicationError } from '../errors/ApplicationError';
import { IDomainEventPublisher } from '../interfaces/IDomainEventPublisher';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ValidationResult } from '../../domain/valueObjects/ValidationResult';

/**
 * Command Use Case: Save environment (create or update)
 * Handles credential preservation, orphaned secret cleanup, and cache invalidation
 */
export class SaveEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly validationService: EnvironmentValidationService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly cacheInvalidationService: AuthenticationCacheInvalidationService,
		private readonly logger: ILogger
	) {}

	/**
	 * Creates or updates an environment with validation and credential management
	 * @param request Environment data including credentials
	 * @returns Response indicating success/failure with validation errors or warnings
	 */
	public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
		const isUpdate = !!request.existingEnvironmentId;
		this.logger.debug(`SaveEnvironmentUseCase: ${isUpdate ? 'Updating' : 'Creating'} environment "${request.name}"`);

		try {
			const previousEnvironment = await this.loadPreviousEnvironment(request.existingEnvironmentId);
			const environmentId = this.createEnvironmentId(request.existingEnvironmentId);

			const environmentResult = this.createEnvironment(request, environmentId, previousEnvironment);
			if (!environmentResult.success) {
				return environmentResult;
			}
			// Type narrowing: success === true means environment is defined
			if (!environmentResult.environment) {
				throw new Error('Unexpected: environment is undefined after successful creation');
			}
			const environment = environmentResult.environment;

			const validationResult = await this.validateEnvironment(environment, request);
			if (!validationResult.isValid) {
				return this.createValidationErrorResponse(environmentId, validationResult.errors, request.name);
			}

			await this.cleanupOrphanedSecrets(previousEnvironment, environment);
			await this.repository.save(environment, request.clientSecret, request.password, request.preserveExistingCredentials);
			await this.handleCacheInvalidation(previousEnvironment, environment, environmentId);
			this.publishDomainEvent(isUpdate, environmentId, environment, previousEnvironment);

			this.logger.info(`Environment ${isUpdate ? 'updated' : 'created'}: ${environment.getName().getValue()}`);

			return {
				success: true,
				environmentId: environmentId.getValue(),
				warnings: validationResult.warnings
			};
		} catch (error) {
			this.logger.error('SaveEnvironmentUseCase: Failed to save environment', error);
			throw error;
		}
	}

	private async loadPreviousEnvironment(existingEnvironmentId: string | undefined): Promise<Environment | null> {
		if (!existingEnvironmentId) {
			return null;
		}
		const environment = await this.repository.getById(new EnvironmentId(existingEnvironmentId));
		if (!environment) {
			throw new ApplicationError('Environment not found');
		}
		return environment;
	}

	private createEnvironmentId(existingEnvironmentId: string | undefined): EnvironmentId {
		return existingEnvironmentId
			? new EnvironmentId(existingEnvironmentId)
			: EnvironmentId.generate();
	}

	private createEnvironment(
		request: SaveEnvironmentRequest,
		environmentId: EnvironmentId,
		previousEnvironment: Environment | null
	): { success: true; environment: Environment } | { success: false; errors: string[]; environmentId: string } {
		try {
			const environment = new Environment(
				environmentId,
				new EnvironmentName(request.name),
				new DataverseUrl(request.dataverseUrl),
				new TenantId(request.tenantId),
				new AuthenticationMethod(request.authenticationMethod),
				new ClientId(request.publicClientId),
				previousEnvironment?.getIsActive() ?? false,
				previousEnvironment?.getLastUsed(),
				request.powerPlatformEnvironmentId,
				request.clientId ? new ClientId(request.clientId) : undefined,
				request.username
			);
			return { success: true, environment };
		} catch (error) {
			return {
				success: false,
				errors: [error instanceof Error ? error.message : 'Invalid input data'],
				environmentId: environmentId.getValue()
			};
		}
	}

	private async validateEnvironment(
		environment: Environment,
		request: SaveEnvironmentRequest
	): Promise<ValidationResult> {
		const isNameUnique = await this.repository.isNameUnique(
			environment.getName().getValue(),
			environment.getId()
		);

		const clientId = environment.getClientId();
		const hasExistingClientSecret = clientId
			? !!(await this.repository.getClientSecret(clientId.getValue()))
			: false;

		const username = environment.getUsername();
		const hasExistingPassword = username
			? !!(await this.repository.getPassword(username))
			: false;

		return this.validationService.validateForSave(
			environment,
			isNameUnique,
			hasExistingClientSecret,
			hasExistingPassword,
			request.clientSecret,
			request.password
		);
	}

	private createValidationErrorResponse(
		environmentId: EnvironmentId,
		errors: string[],
		environmentName: string
	): SaveEnvironmentResponse {
		this.logger.warn(`SaveEnvironmentUseCase: Validation failed for "${environmentName}"`, { errors });
		return {
			success: false,
			errors,
			environmentId: environmentId.getValue()
		};
	}

	private async cleanupOrphanedSecrets(
		previousEnvironment: Environment | null,
		environment: Environment
	): Promise<void> {
		if (!previousEnvironment) {
			return;
		}
		const orphanedKeys = environment.getOrphanedSecretKeys(
			previousEnvironment.getAuthenticationMethod(),
			previousEnvironment.getClientId(),
			previousEnvironment.getUsername()
		);
		if (orphanedKeys.length > 0) {
			await this.repository.deleteSecrets(orphanedKeys);
		}
	}

	private async handleCacheInvalidation(
		previousEnvironment: Environment | null,
		environment: Environment,
		environmentId: EnvironmentId
	): Promise<void> {
		const shouldInvalidateCache = this.cacheInvalidationService.shouldInvalidateCache(
			previousEnvironment,
			environment
		);

		if (!shouldInvalidateCache) {
			return;
		}

		const invalidationReason = this.determineInvalidationReason(previousEnvironment, environment);
		this.eventPublisher.publish(
			new AuthenticationCacheInvalidationRequested(environmentId, invalidationReason)
		);
	}

	private determineInvalidationReason(
		previousEnvironment: Environment | null,
		environment: Environment
	): 'credentials_changed' | 'auth_method_changed' {
		if (!previousEnvironment) {
			return 'credentials_changed';
		}
		const authMethodChanged = previousEnvironment.getAuthenticationMethod().getType() !==
			environment.getAuthenticationMethod().getType();
		return authMethodChanged ? 'auth_method_changed' : 'credentials_changed';
	}

	private publishDomainEvent(
		isUpdate: boolean,
		environmentId: EnvironmentId,
		environment: Environment,
		previousEnvironment: Environment | null
	): void {
		if (isUpdate) {
			this.eventPublisher.publish(new EnvironmentUpdated(
				environmentId,
				environment.getName().getValue(),
				previousEnvironment?.getName().getValue()
			));
		} else {
			this.eventPublisher.publish(new EnvironmentCreated(
				environmentId,
				environment.getName().getValue()
			));
		}
	}
}

export interface SaveEnvironmentResponse {
	success: boolean;
	environmentId: string;
	warnings?: string[];
	errors?: string[];
}

export interface SaveEnvironmentRequest {
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
	preserveExistingCredentials?: boolean;
}
