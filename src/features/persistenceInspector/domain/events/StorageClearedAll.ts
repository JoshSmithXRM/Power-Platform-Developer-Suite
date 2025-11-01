import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when all non-protected storage is cleared
 */
export class StorageClearedAll extends DomainEvent {
	public constructor(
		public readonly clearedCount: number,
		public readonly protectedCount: number
	) {
		super();
	}
}
