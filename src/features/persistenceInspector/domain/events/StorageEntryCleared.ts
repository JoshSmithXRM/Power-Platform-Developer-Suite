import { StorageTypeValue } from '../valueObjects/StorageType';

import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a storage entry is cleared
 * Uses StorageTypeValue for type safety and consistency.
 * Discriminated union pattern enables exhaustive type checking.
 */
export class StorageEntryCleared extends DomainEvent {
	public readonly type = 'StorageEntryCleared' as const;

	public constructor(
		public readonly key: string,
		public readonly storageType: StorageTypeValue
	) {
		super();
	}
}
