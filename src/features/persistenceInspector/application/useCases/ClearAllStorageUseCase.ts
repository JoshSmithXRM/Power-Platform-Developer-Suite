import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageClearedAll } from '../../domain/events/StorageClearedAll';
import { ClearAllResultViewModel } from '../viewModels/ClearAllResultViewModel';
import { ClearAllResultMapper } from '../mappers/ClearAllResultMapper';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for clearing all non-protected storage
 * Removes all clearable entries while preserving protected system data
 */
export class ClearAllStorageUseCase {
	private readonly mapper: ClearAllResultMapper;

	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {
		this.mapper = new ClearAllResultMapper();
	}

	/**
	 * Clears all non-protected storage entries
	 * @returns Result view model containing counts of cleared and skipped entries
	 */
	public async execute(): Promise<ClearAllResultViewModel> {
		this.logger.debug('ClearAllStorageUseCase: Starting clear all operation');

		try {
			// Orchestrate: get current collection for validation
			const collection = await this.storageInspectionService.inspectStorage();

			// Orchestrate: call domain service
			const result = await this.storageClearingService.clearAll(collection);

			this.logger.info(`Clear all completed: ${result.totalCleared} entries cleared, ${collection.getProtectedEntries().length} protected entries skipped`);

			// Orchestrate: raise domain event
			this.eventPublisher.publish(
				new StorageClearedAll(result.totalCleared, collection.getProtectedEntries().length)
			);

			// Orchestrate: map to view model
			return this.mapper.toViewModel(result);
		} catch (error) {
			this.logger.error('ClearAllStorageUseCase: Failed to clear storage', error);
			throw error;
		}
	}
}
