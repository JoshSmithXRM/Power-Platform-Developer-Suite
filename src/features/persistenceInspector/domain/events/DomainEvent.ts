/**
 * Base class for all domain events
 */
export abstract class DomainEvent {
	public readonly occurredAt: Date;

	protected constructor() {
		this.occurredAt = new Date();
	}
}
