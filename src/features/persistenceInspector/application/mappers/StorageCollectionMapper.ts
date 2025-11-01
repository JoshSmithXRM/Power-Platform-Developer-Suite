import { StorageCollection } from '../../domain/entities/StorageCollection';
import { StorageCollectionViewModel } from '../viewModels/StorageCollectionViewModel';

import { StorageEntryMapper } from './StorageEntryMapper';

/**
 * Maps storage collection domain entity to view model
 */
export class StorageCollectionMapper {
	public static toViewModel(collection: StorageCollection): StorageCollectionViewModel {
		const globalEntries = collection.getEntriesByType('global');
		const secretEntries = collection.getEntriesByType('secret');

		return {
			totalEntries: collection.getAllEntries().length,
			totalSize: collection.getTotalSize(),
			globalStateEntries: globalEntries.map(e => StorageEntryMapper.toViewModel(e)),
			secretEntries: secretEntries.map(e => StorageEntryMapper.toViewModel(e))
		};
	}
}
