import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when storage is inspected
 * Discriminated union pattern enables exhaustive type checking
 */
export class StorageInspected extends DomainEvent {
	public readonly type = 'StorageInspected' as const;

	public constructor(
		public readonly totalEntries: number,
		public readonly globalEntries: number,
		public readonly secretEntries: number
	) {
		super();
	}
}
