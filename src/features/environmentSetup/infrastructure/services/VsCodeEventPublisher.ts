import * as vscode from 'vscode';

import { IDomainEventPublisher } from '../../application/interfaces/IDomainEventPublisher';

/**
 * Domain event publisher using VS Code EventEmitter
 */
export class VsCodeEventPublisher implements IDomainEventPublisher {
	private readonly emitter: vscode.EventEmitter<unknown>;

	constructor() {
		this.emitter = new vscode.EventEmitter<unknown>();
	}

	public publish<T>(event: T): void {
		this.emitter.fire(event);
	}

	public subscribe<T>(eventType: new (...args: never[]) => T, handler: (event: T) => void): void {
		this.emitter.event((event: unknown) => {
			if (event instanceof eventType) {
				handler(event as T);
			}
		});
	}

	public dispose(): void {
		this.emitter.dispose();
	}
}
