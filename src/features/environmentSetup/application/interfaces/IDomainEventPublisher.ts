/**
 * Domain event publisher interface
 * Infrastructure implements this (e.g., VS Code EventEmitter)
 */
export interface IDomainEventPublisher {
	publish<T>(event: T): void;
	subscribe<T>(eventType: new (...args: never[]) => T, handler: (event: T) => void): void;
}
