import { StorageClearingService } from '../../domain/services/StorageClearingService';
import { StorageInspectionService } from '../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from '../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { PropertyPath } from '../../domain/valueObjects/PropertyPath';
import { StoragePropertyCleared } from '../../domain/events/StoragePropertyCleared';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Use case for clearing a property within a storage entry
 * Removes a specific nested property without deleting the entire entry
 */
export class ClearStoragePropertyUseCase {
	public constructor(
		private readonly storageClearingService: StorageClearingService,
		private readonly storageInspectionService: StorageInspectionService,
		private readonly eventPublisher: IDomainEventPublisher,
		private readonly logger: ILogger
	) {}

	/**
	 * Clears a specific property within a storage entry
	 * @param key Storage key containing the property
	 * @param propertyPath Dot-notation path to the property (e.g., "user.settings.theme")
	 */
	public async execute(key: string, propertyPath: string): Promise<void> {
		this.logger.debug('ClearStoragePropertyUseCase: Clearing property', { key, propertyPath });

		try {
			// Orchestrate: get current collection for validation
			const collection = await this.storageInspectionService.inspectStorage();
			const entry = collection.getEntry(key);

			if (!entry) {
				this.logger.warn('Entry not found', { key });
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

			this.logger.info('Property cleared', { key, propertyPath });
		} catch (error) {
			this.logger.error('ClearStoragePropertyUseCase: Failed to clear property', error);
			throw error;
		}
	}
}
