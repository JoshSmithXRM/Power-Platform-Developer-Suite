import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentDeleted } from '../../domain/events/EnvironmentDeleted';
import { AuthenticationCacheInvalidationRequested } from '../../domain/events/AuthenticationCacheInvalidationRequested';
import { ApplicationError } from '../errors/ApplicationError';
import { IDomainEventPublisher } from '../interfaces/IDomainEventPublisher';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Command Use Case: Delete environment
 * Handles environment removal, secret cleanup, and cache invalidation
 */
export class DeleteEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {}

	/**
	 * Deletes an environment and all associated secrets
	 * @param request Request containing environment ID to delete
	 */
	public async execute(request: DeleteEnvironmentRequest): Promise<void> {
		this.logger.debug('DeleteEnvironmentUseCase: Deleting environment', { environmentId: request.environmentId });

		try {
			const environmentId = new EnvironmentId(request.environmentId);

			// Get environment to emit proper event
			const environment = await this.repository.getById(environmentId);
			if (!environment) {
				this.logger.warn('Environment not found', { environmentId: request.environmentId });
				throw new ApplicationError('Environment not found');
			}

			const environmentName = environment.getName().getValue();

			// Delete from repository (handles secret cleanup)
			await this.repository.delete(environmentId);

			// Invalidate authentication cache
			this.eventPublisher.publish(
				new AuthenticationCacheInvalidationRequested(
					environmentId,
					'environment_deleted'
				)
			);

			// Publish domain event
			this.eventPublisher.publish(new EnvironmentDeleted(
				environmentId,
				environmentName,
				environment.getIsActive()
			));

			this.logger.info('Environment deleted', { environmentName });
		} catch (error) {
			this.logger.error('DeleteEnvironmentUseCase: Failed to delete environment', error);
			throw error;
		}
	}
}

export interface DeleteEnvironmentRequest {
	environmentId: string;
}
