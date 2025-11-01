import * as vscode from 'vscode';

import { IDomainEventPublisher } from '../../application/interfaces/IDomainEventPublisher';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Domain event publisher using VS Code EventEmitter
 * Provides in-process event bus for domain events
 */
export class VsCodeEventPublisher implements IDomainEventPublisher {
	private readonly emitter: vscode.EventEmitter<unknown>;

	constructor(private readonly logger: ILogger) {
		this.emitter = new vscode.EventEmitter<unknown>();
	}

	/**
	 * Publishes a domain event to all subscribers
	 * Events are delivered synchronously to handlers
	 * @param event - Domain event to publish
	 */
	public publish<T>(event: T): void {
		const eventType = event?.constructor?.name || 'Unknown';

		this.logger.debug('Publishing domain event', {
			eventType
		});

		this.emitter.fire(event);
	}

	/**
	 * Subscribes a handler to a specific event type
	 * Handler will be called whenever an event of the specified type is published
	 * @param eventType - Constructor of the event type to subscribe to
	 * @param handler - Function to call when event is published
	 */
	public subscribe<T>(eventType: new (...args: never[]) => T, handler: (event: T) => void): void {
		this.logger.debug('Subscribing to domain event', {
			eventType: eventType.name
		});

		this.emitter.event((event: unknown) => {
			if (event instanceof eventType) {
				handler(event as T);
			}
		});
	}

	/**
	 * Disposes the event emitter and releases resources
	 * Should be called when the publisher is no longer needed
	 */
	public dispose(): void {
		this.logger.debug('Disposing domain event publisher');
		this.emitter.dispose();
	}
}
