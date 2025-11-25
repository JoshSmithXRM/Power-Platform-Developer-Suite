import { DomainEvent } from './DomainEvent';

/**
 * Domain event raised when a secret value is revealed
 * Discriminated union pattern enables exhaustive type checking
 */
export class SecretRevealed extends DomainEvent {
	public readonly type = 'SecretRevealed' as const;

	public constructor(
		public readonly key: string
	) {
		super();
	}
}
