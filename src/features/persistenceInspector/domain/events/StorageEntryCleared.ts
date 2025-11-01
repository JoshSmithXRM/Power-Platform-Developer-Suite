import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a storage entry is cleared
 */
export class StorageEntryCleared extends DomainEvent {
	public constructor(
		public readonly key: string,
		public readonly storageType: 'global' | 'secret'
	) {
		super();
	}
}
