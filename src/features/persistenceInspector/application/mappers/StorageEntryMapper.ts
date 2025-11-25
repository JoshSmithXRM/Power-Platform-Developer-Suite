import { StorageEntry } from '../../domain/entities/StorageEntry';
import { StorageEntryViewModel } from '../viewModels/StorageEntryViewModel';
import { StorageValueFormatter } from '../../../../shared/infrastructure/ui/utils/StorageValueFormatter';

import { StorageMetadataMapper } from './StorageMetadataMapper';

/**
 * Maps storage entry domain entity to view model
 */
export class StorageEntryMapper {
	constructor(private readonly metadataMapper: StorageMetadataMapper) {}

	public toViewModel(entry: StorageEntry): StorageEntryViewModel {
		return {
			key: entry.key,
			value: entry.value,
			displayValue: StorageValueFormatter.formatDisplayValue(entry.value, entry.isSecret()),
			storageType: entry.storageType as 'global' | 'workspace' | 'secret',
			metadata: this.metadataMapper.toViewModel(entry.metadata),
			isProtected: entry.isProtected(),
			isSecret: entry.isSecret(),
			canBeCleared: entry.canBeCleared(),
			isExpandable: StorageValueFormatter.isExpandable(entry.value)
		};
	}
}
