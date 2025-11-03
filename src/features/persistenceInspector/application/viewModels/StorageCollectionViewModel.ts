import { StorageEntryViewModel } from './StorageEntryViewModel';

/**
 * ViewModel for the entire storage collection
 * ReadonlyArray prevents mutation of entry arrays.
 */
export interface StorageCollectionViewModel {
	readonly totalEntries: number;
	readonly totalSize: number;
	readonly globalStateEntries: ReadonlyArray<StorageEntryViewModel>;
	readonly secretEntries: ReadonlyArray<StorageEntryViewModel>;
}
