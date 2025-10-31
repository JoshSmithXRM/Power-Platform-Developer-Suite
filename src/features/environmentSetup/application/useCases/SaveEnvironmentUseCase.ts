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

	public async execute(request: SaveEnvironmentRequest): Promise<void> {
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

		// Create domain entity
		const environmentId = isUpdate
			? new EnvironmentId(request.existingEnvironmentId!)
			: EnvironmentId.generate();

		const environment = new Environment(
			environmentId,
			new EnvironmentName(request.name),
			new DataverseUrl(request.dataverseUrl),
			new TenantId(request.tenantId),
			new AuthenticationMethod(request.authenticationMethod as AuthenticationMethodType),
			new ClientId(request.publicClientId),
			previousEnvironment?.getIsActive() ?? false,
			previousEnvironment?.getLastUsed(),
			request.powerPlatformEnvironmentId,
			request.clientId ? new ClientId(request.clientId) : undefined,
			request.username
		);

		// Domain validation
		const validationResult = await this.validationService.validateForSave(
			environment,
			request.clientSecret,
			request.password
		);

		if (!validationResult.isValid) {
			throw new ApplicationError(validationResult.errors.join(', '));
		}

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
	}
}

export interface SaveEnvironmentRequest {
	existingEnvironmentId?: string;
	name: string;
	dataverseUrl: string;
	tenantId: string;
	authenticationMethod: string;
	publicClientId: string;
	powerPlatformEnvironmentId?: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	password?: string;
	preserveExistingCredentials?: boolean;
}
