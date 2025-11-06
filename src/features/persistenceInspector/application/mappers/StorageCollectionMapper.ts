import { StorageCollection } from '../../domain/entities/StorageCollection';
import { StorageCollectionViewModel } from '../viewModels/StorageCollectionViewModel';

import { StorageEntryMapper } from './StorageEntryMapper';
import { StorageMetadataMapper } from './StorageMetadataMapper';

/**
 * Maps storage collection domain entity to view model
 */
export class StorageCollectionMapper {
	constructor(private readonly entryMapper: StorageEntryMapper) {}

	public toViewModel(collection: StorageCollection): StorageCollectionViewModel {
		const globalEntries = collection.getEntriesByType('global');
		const workspaceEntries = collection.getEntriesByType('workspace');
		const secretEntries = collection.getEntriesByType('secret');

		return {
			totalEntries: collection.getAllEntries().length,
			totalSize: collection.getTotalSize(),
			globalStateEntries: globalEntries.map(e => this.entryMapper.toViewModel(e)),
			workspaceStateEntries: workspaceEntries.map(e => this.entryMapper.toViewModel(e)),
			secretEntries: secretEntries.map(e => this.entryMapper.toViewModel(e))
		};
	}

	/**
	 * Creates a StorageCollectionMapper with all dependencies.
	 * Factory method to simplify instantiation.
	 */
	public static create(): StorageCollectionMapper {
		const metadataMapper = new StorageMetadataMapper();
		const entryMapper = new StorageEntryMapper(metadataMapper);
		return new StorageCollectionMapper(entryMapper);
	}
}
