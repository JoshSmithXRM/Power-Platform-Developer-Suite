import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a storage property is cleared
 * Discriminated union pattern enables exhaustive type checking
 */
export class StoragePropertyCleared extends DomainEvent {
	public readonly type = 'StoragePropertyCleared' as const;

	public constructor(
		public readonly key: string,
		public readonly path: string
	) {
		super();
	}
}
