import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageClearedAll } from '../../domain/events/StorageClearedAll';
import { ClearAllResultViewModel } from '../viewModels/ClearAllResultViewModel';
import { ClearAllResultMapper } from '../mappers/ClearAllResultMapper';

/**
 * Use case for clearing all non-protected storage
 * Orchestrates only - no business logic
 */
export class ClearAllStorageUseCase {
	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher
	) {}

	public async execute(): Promise<ClearAllResultViewModel> {
		// Orchestrate: get current collection for validation
		const collection = await this.storageInspectionService.inspectStorage();

		// Orchestrate: call domain service
		const result = await this.storageClearingService.clearAll(collection);

		// Orchestrate: raise domain event
		this.eventPublisher.publish(
			new StorageClearedAll(result.totalCleared, collection.getProtectedEntries().length)
		);

		// Orchestrate: map to view model
		return ClearAllResultMapper.toViewModel(result);
	}
}
