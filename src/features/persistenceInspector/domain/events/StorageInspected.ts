import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when storage is inspected
 */
export class StorageInspected extends DomainEvent {
	public constructor(
		public readonly totalEntries: number,
		public readonly globalEntries: number,
		public readonly secretEntries: number
	) {
		super();
	}
}
