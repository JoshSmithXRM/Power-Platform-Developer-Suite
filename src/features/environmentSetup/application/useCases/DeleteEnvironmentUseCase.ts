import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentDeleted } from '../../domain/events/EnvironmentDeleted';
import { ApplicationError } from '../errors/ApplicationError';
import { IDomainEventPublisher } from '../interfaces/IDomainEventPublisher';

/**
 * Command Use Case: Delete environment
 */
export class DeleteEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(request: DeleteEnvironmentRequest): Promise<void> {
		const environmentId = new EnvironmentId(request.environmentId);

		// Get environment to emit proper event
		const environment = await this.repository.getById(environmentId);
		if (!environment) {
			throw new ApplicationError('Environment not found');
		}

		// Delete from repository (handles secret cleanup)
		await this.repository.delete(environmentId);

		// Publish domain event
		this.eventPublisher.publish(new EnvironmentDeleted(
			environmentId,
			environment.getName().getValue(),
			environment.getIsActive()
		));
	}
}

export interface DeleteEnvironmentRequest {
	environmentId: string;
}
