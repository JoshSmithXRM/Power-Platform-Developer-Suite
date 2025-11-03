import { StorageTypeValue } from '../../domain/valueObjects/StorageType';

import { StorageMetadataViewModel } from './StorageMetadataViewModel';

/**
 * ViewModel for a single storage entry
 * Uses StorageTypeValue for type safety and consistency.
 */
export interface StorageEntryViewModel {
	readonly key: string;
	readonly value: unknown;
	readonly displayValue: string;
	readonly storageType: StorageTypeValue;
	readonly metadata: StorageMetadataViewModel;
	readonly isProtected: boolean;
	readonly isSecret: boolean;
	readonly canBeCleared: boolean;
	readonly isExpandable: boolean;
}
