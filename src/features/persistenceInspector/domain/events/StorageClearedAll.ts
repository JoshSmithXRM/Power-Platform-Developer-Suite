import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when all non-protected storage is cleared
 * Discriminated union pattern enables exhaustive type checking
 */
export class StorageClearedAll extends DomainEvent {
	public readonly type = 'StorageClearedAll' as const;

	public constructor(
		public readonly clearedCount: number,
		public readonly protectedCount: number
	) {
		super();
	}
}
