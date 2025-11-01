import { StorageEntryViewModel } from './StorageEntryViewModel';

/**
 * ViewModel for the entire storage collection
 */
export interface StorageCollectionViewModel {
	readonly totalEntries: number;
	readonly totalSize: number;
	readonly globalStateEntries: StorageEntryViewModel[];
	readonly secretEntries: StorageEntryViewModel[];
}
