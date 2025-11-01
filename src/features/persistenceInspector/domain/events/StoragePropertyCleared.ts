import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a storage property is cleared
 */
export class StoragePropertyCleared extends DomainEvent {
	public constructor(
		public readonly key: string,
		public readonly path: string
	) {
		super();
	}
}
