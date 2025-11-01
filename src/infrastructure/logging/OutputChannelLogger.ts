import * as vscode from 'vscode';

import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code OutputChannel
 * Provides structured logging visible to users
 */
export class OutputChannelLogger implements ILogger {
	constructor(private readonly outputChannel: vscode.OutputChannel) {}

	public debug(message: string, ...args: unknown[]): void {
		this.log('DEBUG', message, args);
	}

	public info(message: string, ...args: unknown[]): void {
		this.log('INFO', message, args);
	}

	public warn(message: string, ...args: unknown[]): void {
		this.log('WARN', message, args);
	}

	public error(message: string, error?: unknown): void {
		this.log('ERROR', message);
		if (error instanceof Error) {
			this.outputChannel.appendLine(`  ${error.message}`);
			if (error.stack) {
				this.outputChannel.appendLine(`  ${error.stack}`);
			}
		} else if (error) {
			this.outputChannel.appendLine(`  ${String(error)}`);
		}
	}

	private log(level: string, message: string, args?: unknown[]): void {
		const timestamp = new Date().toISOString();
		const formattedMessage = `[${timestamp}] [${level}] ${message}`;

		this.outputChannel.appendLine(formattedMessage);

		if (args && args.length > 0) {
			args.forEach(arg => {
				this.outputChannel.appendLine(`  ${this.stringify(arg)}`);
			});
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
