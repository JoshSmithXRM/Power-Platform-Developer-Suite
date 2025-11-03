import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageEntryCleared } from '../../domain/events/StorageEntryCleared';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for clearing a single storage entry
 * Validates protection rules and removes the entry from storage
 */
export class ClearStorageEntryUseCase {
	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {}

	/**
	 * Clears a single storage entry if not protected
	 * @param key Storage key to clear
	 */
	public async execute(key: string): Promise<void> {
		this.logger.debug(`ClearStorageEntryUseCase: Clearing entry "${key}"`);

		try {
			// Orchestrate: get current collection for validation
			const collection = await this.storageInspectionService.inspectStorage();
			const entry = collection.getEntry(key);

			if (!entry) {
				this.logger.warn(`Entry not found: ${key}`);
				throw new Error(`Entry not found: ${key}`);
			}

			// Orchestrate: call domain service
			await this.storageClearingService.clearEntry(entry, collection);

			// Orchestrate: raise domain event
			this.eventPublisher.publish(
				new StorageEntryCleared(entry.key, entry.storageType)
			);

			this.logger.info(`Storage entry cleared: ${key}`);
		} catch (error) {
			this.logger.error('ClearStorageEntryUseCase: Failed to clear entry', error);
			throw error;
		}
	}
}
