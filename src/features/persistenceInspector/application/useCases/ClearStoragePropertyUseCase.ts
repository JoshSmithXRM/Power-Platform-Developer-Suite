import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { PropertyPath } from '../../domain/valueObjects/PropertyPath';
import { StoragePropertyCleared } from '../../domain/events/StoragePropertyCleared';

/**
 * Use case for clearing a property within a storage entry
 * Orchestrates only - no business logic
 */
export class ClearStoragePropertyUseCase {
	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(key: string, propertyPath: string): Promise<void> {
		// Orchestrate: get current collection for validation
		const collection = await this.storageInspectionService.inspectStorage();
		const entry = collection.getEntry(key);

		if (!entry) {
			throw new Error(`Entry not found: ${key}`);
		}

		// Orchestrate: create value object
		const path = PropertyPath.create(propertyPath);

		// Orchestrate: call domain service
		await this.storageClearingService.clearProperty(entry, path, collection);

		// Orchestrate: raise domain event
		this.eventPublisher.publish(
			new StoragePropertyCleared(entry.key, path.toString())
		);
	}
}
