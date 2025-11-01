import { StorageMetadataViewModel } from './StorageMetadataViewModel';

/**
 * ViewModel for a single storage entry
 */
export interface StorageEntryViewModel {
	readonly key: string;
	readonly value: unknown;
	readonly displayValue: string;
	readonly storageType: 'global' | 'secret';
	readonly metadata: StorageMetadataViewModel;
	readonly isProtected: boolean;
	readonly isSecret: boolean;
	readonly canBeCleared: boolean;
	readonly isExpandable: boolean;
}
