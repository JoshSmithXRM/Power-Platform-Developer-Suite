import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a secret value is revealed
 */
export class SecretRevealed extends DomainEvent {
	public constructor(
		public readonly key: string
	) {
		super();
	}
}
