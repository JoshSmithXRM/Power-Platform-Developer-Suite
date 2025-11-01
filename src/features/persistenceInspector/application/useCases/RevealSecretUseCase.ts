import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { SecretRevealed } from '../../domain/events/SecretRevealed';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for revealing a secret value
 * Exposes masked secret values for diagnostic purposes
 */
export class RevealSecretUseCase {
	public constructor(
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {}

	/**
	 * Reveals the actual value of a secret storage entry
	 * @param key Secret storage key to reveal
	 * @returns The revealed secret value
	 */
	public async execute(key: string): Promise<string> {
		this.logger.debug(`RevealSecretUseCase: Revealing secret "${key}"`);

		try {
			// Orchestrate: call domain service
			const value = await this.storageInspectionService.revealSecret(key);

			if (value === undefined) {
				this.logger.warn(`Secret not found: ${key}`);
				throw new Error(`Secret not found: ${key}`);
			}

			// Orchestrate: raise domain event
			this.eventPublisher.publish(new SecretRevealed(key));

			this.logger.info(`Secret revealed: ${key}`);

			return value;
		} catch (error) {
			this.logger.error('RevealSecretUseCase: Failed to reveal secret', error);
			throw error;
		}
	}
}
