import { StorageEntry } from '../../domain/entities/StorageEntry';
import { StorageEntryViewModel } from '../viewModels/StorageEntryViewModel';

import { StorageMetadataMapper } from './StorageMetadataMapper';

/**
 * Maps storage entry domain entity to view model
 */
export class StorageEntryMapper {
	public static toViewModel(entry: StorageEntry): StorageEntryViewModel {
		return {
			key: entry.key,
			value: entry.value,
			displayValue: StorageEntryMapper.formatDisplayValue(entry),
			storageType: entry.storageType as 'global' | 'secret',
			metadata: StorageMetadataMapper.toViewModel(entry.metadata),
			isProtected: entry.isProtected(),
			isSecret: entry.isSecret(),
			canBeCleared: entry.canBeCleared(),
			isExpandable: StorageEntryMapper.isExpandable(entry.value)
		};
	}

	private static formatDisplayValue(entry: StorageEntry): string {
		if (entry.isSecret()) {
			return '***';
		}

		const value = entry.value;

		if (value === null) {
			return 'null';
		}
		if (value === undefined) {
			return 'undefined';
		}
		if (typeof value === 'string') {
			return `"${value}"`;
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}

		return String(value);
	}

	private static isExpandable(value: unknown): boolean {
		return typeof value === 'object' && value !== null;
	}
}
