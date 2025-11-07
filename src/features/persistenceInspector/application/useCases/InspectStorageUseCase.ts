import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { StorageInspected } from '../../domain/events/StorageInspected';
import { StorageCollectionViewModel } from '../viewModels/StorageCollectionViewModel';
import { StorageCollectionMapper } from '../mappers/StorageCollectionMapper';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for inspecting all storage
 * Retrieves all global state and secrets for diagnostic viewing
 */
export class InspectStorageUseCase {
	private readonly mapper: StorageCollectionMapper;

	public constructor(
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {
		this.mapper = StorageCollectionMapper.create();
	}

	/**
	 * Inspects all storage entries (global state and secrets)
	 * @returns View model containing all storage entries with metadata
	 */
	public async execute(): Promise<StorageCollectionViewModel> {
		this.logger.debug('InspectStorageUseCase: Starting storage inspection');

		try {
			// Orchestrate: call domain service
			const collection = await this.storageInspectionService.inspectStorage();

			// Orchestrate: raise domain event
			const entries = collection.getAllEntries();
			const globalCount = collection.getEntriesByType('global').length;
			const workspaceCount = collection.getEntriesByType('workspace').length;
			const secretCount = collection.getEntriesByType('secret').length;

			this.logger.info('Storage inspected', {
				totalEntries: entries.length,
				globalCount,
				workspaceCount,
				secretCount
			});

			this.eventPublisher.publish(
				new StorageInspected(entries.length, globalCount, workspaceCount, secretCount)
			);

			// Orchestrate: map to view model
			return this.mapper.toViewModel(collection);
		} catch (error) {
			this.logger.error('InspectStorageUseCase: Failed to inspect storage', error);
			throw error;
		}
	}
}
