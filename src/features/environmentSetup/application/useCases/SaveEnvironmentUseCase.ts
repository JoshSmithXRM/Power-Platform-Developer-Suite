import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentValidationService } from '../../domain/services/EnvironmentValidationService';
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

/**
 * Command Use Case: Save environment (create or update)
 * Handles credential preservation and orphaned secret cleanup
 */
export class SaveEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly validationService: EnvironmentValidationService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
		// Determine if create or update
		const isUpdate = !!request.existingEnvironmentId;

		let previousEnvironment: Environment | null = null;
		if (isUpdate) {
			previousEnvironment = await this.repository.getById(
				new EnvironmentId(request.existingEnvironmentId!)
			);
			if (!previousEnvironment) {
				throw new ApplicationError('Environment not found');
			}
		}

		// Create domain entity - catch validation errors from value objects
		const environmentId = isUpdate
			? new EnvironmentId(request.existingEnvironmentId!)
			: EnvironmentId.generate();

		let environment: Environment;
		try {
			environment = new Environment(
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
		} catch (error) {
			// Value object validation failed - return as validation error
			return {
				success: false,
				errors: [error instanceof Error ? error.message : 'Invalid input data'],
				environmentId: environmentId.getValue()
			};
		}

		// Gather validation data from repository (use case responsibility)
		const isNameUnique = await this.repository.isNameUnique(
			environment.getName().getValue(),
			environment.getId()
		);

		const hasExistingClientSecret = environment.getClientId()
			? !!(await this.repository.getClientSecret(environment.getClientId()!.getValue()))
			: false;

		const hasExistingPassword = environment.getUsername()
			? !!(await this.repository.getPassword(environment.getUsername()!))
			: false;

		// Domain validation (pure business logic, no infrastructure)
		const validationResult = this.validationService.validateForSave(
			environment,
			isNameUnique,
			hasExistingClientSecret,
			hasExistingPassword,
			request.clientSecret,
			request.password
		);

		if (!validationResult.isValid) {
			// Return validation errors instead of throwing - allows UI to display them inline
			return {
				success: false,
				errors: validationResult.errors,
				environmentId: environmentId.getValue()
			};
		}

		// Extract warnings to return to user
		const warnings = validationResult.warnings;

		// Handle orphaned secrets if auth method changed
		if (previousEnvironment) {
			const orphanedKeys = environment.getOrphanedSecretKeys(
				previousEnvironment.getAuthenticationMethod(),
				previousEnvironment.getClientId(),
				previousEnvironment.getUsername()
			);
			if (orphanedKeys.length > 0) {
				await this.repository.deleteSecrets(orphanedKeys);
			}
		}

		// Save environment
		await this.repository.save(
			environment,
			request.clientSecret,
			request.password,
			request.preserveExistingCredentials
		);

		// Detect if auth method or credentials changed
		let shouldInvalidateCache = false;
		let invalidationReason: 'credentials_changed' | 'auth_method_changed' = 'credentials_changed';

		if (previousEnvironment) {
			const authMethodChanged = previousEnvironment.getAuthenticationMethod().getType() !==
				environment.getAuthenticationMethod().getType();

			const clientIdChanged = previousEnvironment.getClientId()?.getValue() !==
				environment.getClientId()?.getValue();

			const usernameChanged = previousEnvironment.getUsername() !==
				environment.getUsername();

			// Only consider credentials "changed" if they were explicitly provided (not undefined)
			// and not using preserveExistingCredentials
			const credentialsChanged = !request.preserveExistingCredentials &&
				(!!request.clientSecret || !!request.password);

			shouldInvalidateCache = authMethodChanged || clientIdChanged ||
				usernameChanged || credentialsChanged;

			if (authMethodChanged) {
				invalidationReason = 'auth_method_changed';
			}
		}

		// Invalidate cache if needed
		if (shouldInvalidateCache) {
			this.eventPublisher.publish(
				new AuthenticationCacheInvalidationRequested(
					environmentId,
					invalidationReason
				)
			);
		}

		// Publish domain event
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

		return {
			success: true,
			environmentId: environmentId.getValue(),
			warnings: warnings
		};
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
