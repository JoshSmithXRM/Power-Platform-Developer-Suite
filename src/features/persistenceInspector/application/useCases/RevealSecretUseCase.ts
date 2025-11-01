import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { SecretRevealed } from '../../domain/events/SecretRevealed';

/**
 * Use case for revealing a secret value
 * Orchestrates only - no business logic
 */
export class RevealSecretUseCase {
	public constructor(
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(key: string): Promise<string> {
		// Orchestrate: call domain service
		const value = await this.storageInspectionService.revealSecret(key);

		if (value === undefined) {
			throw new Error(`Secret not found: ${key}`);
		}

		// Orchestrate: raise domain event
		this.eventPublisher.publish(new SecretRevealed(key));

		return value;
	}
}
