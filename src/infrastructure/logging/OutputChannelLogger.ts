import * as vscode from 'vscode';

import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code LogOutputChannel
 * Provides structured logging with automatic timestamps and level formatting
 */
export class OutputChannelLogger implements ILogger {
	constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

	public trace(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.trace(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.trace(message);
		}
	}

	public debug(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.debug(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.debug(message);
		}
	}

	public info(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.info(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.info(message);
		}
	}

	public warn(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.warn(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.warn(message);
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

	/**
	 * Converts values to string for logging with safe JSON serialization.
	 * Uses tab indentation to match VS Code's JSON formatting.
	 * Falls back to String() for circular references or non-serializable objects.
	 */
	private stringify(value: unknown): string {
		try {
			if (typeof value === 'string') return value;
			if (typeof value === 'number') return String(value);
			if (typeof value === 'boolean') return String(value);
			if (value === null) return 'null';
			if (value === undefined) return 'undefined';
			return JSON.stringify(value, null, '\t');
		} catch {
			return String(value);
		}
	}
}
