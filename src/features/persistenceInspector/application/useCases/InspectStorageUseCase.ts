import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageInspected } from '../../domain/events/StorageInspected';
import { StorageCollectionViewModel } from '../viewModels/StorageCollectionViewModel';
import { StorageCollectionMapper } from '../mappers/StorageCollectionMapper';

/**
 * Use case for inspecting all storage
 * Orchestrates only - no business logic
 */
export class InspectStorageUseCase {
	public constructor(
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(): Promise<StorageCollectionViewModel> {
		// Orchestrate: call domain service
		const collection = await this.storageInspectionService.inspectStorage();

		// Orchestrate: raise domain event
		const entries = collection.getAllEntries();
		const globalCount = collection.getEntriesByType('global').length;
		const secretCount = collection.getEntriesByType('secret').length;

		this.eventPublisher.publish(
			new StorageInspected(entries.length, globalCount, secretCount)
		);

		// Orchestrate: map to view model
		return StorageCollectionMapper.toViewModel(collection);
	}
}
