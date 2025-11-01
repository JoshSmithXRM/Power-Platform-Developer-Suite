import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageEntryCleared } from '../../domain/events/StorageEntryCleared';

/**
 * Use case for clearing a single storage entry
 * Orchestrates only - no business logic
 */
export class ClearStorageEntryUseCase {
	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(key: string): Promise<void> {
		// Orchestrate: get current collection for validation
		const collection = await this.storageInspectionService.inspectStorage();
		const entry = collection.getEntry(key);

		if (!entry) {
			throw new Error(`Entry not found: ${key}`);
		}

		// Orchestrate: call domain service
		await this.storageClearingService.clearEntry(entry, collection);

		// Orchestrate: raise domain event
		this.eventPublisher.publish(
			new StorageEntryCleared(entry.key, entry.storageType as 'global' | 'secret')
		);
	}
}
