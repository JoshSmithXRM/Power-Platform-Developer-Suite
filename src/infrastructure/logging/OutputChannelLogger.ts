import * as vscode from 'vscode';

import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code LogOutputChannel
 * Provides structured logging with automatic timestamps and level formatting
 */
export class OutputChannelLogger implements ILogger {
	constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

	public debug(message: string, ...args: unknown[]): void {
		this.outputChannel.debug(message);
		if (args.length > 0) {
			args.forEach(arg => {
				this.outputChannel.debug(this.stringify(arg));
			});
		}
	}

	public info(message: string, ...args: unknown[]): void {
		this.outputChannel.info(message);
		if (args.length > 0) {
			args.forEach(arg => {
				this.outputChannel.info(this.stringify(arg));
			});
		}
	}

	public warn(message: string, ...args: unknown[]): void {
		this.outputChannel.warn(message);
		if (args.length > 0) {
			args.forEach(arg => {
				this.outputChannel.warn(this.stringify(arg));
			});
		}
	}

	public error(message: string, error?: unknown): void {
		if (error instanceof Error) {
			this.outputChannel.error(`${message}: ${error.message}`);
			if (error.stack) {
				this.outputChannel.error(error.stack);
			}
		} else if (error) {
			this.outputChannel.error(`${message}: ${String(error)}`);
		} else {
			this.outputChannel.error(message);
		}
	}

	private stringify(value: unknown): string {
		try {
			if (typeof value === 'string') return value;
			if (typeof value === 'number') return String(value);
			if (typeof value === 'boolean') return String(value);
			if (value === null) return 'null';
			if (value === undefined) return 'undefined';
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}
}
