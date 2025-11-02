import * as vscode from 'vscode';

import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code LogOutputChannel
 * Provides structured logging with automatic timestamps and level formatting
 */
export class OutputChannelLogger implements ILogger {
	constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

	/**
	 * Logs debug-level messages for diagnostic information.
	 * @param message - The message to log
	 * @param args - Additional data to log (objects, numbers, strings)
	 */
	public debug(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.debug(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.debug(message);
		}
	}

	/**
	 * Logs info-level messages for general information.
	 * @param message - The message to log
	 * @param args - Additional data to log (objects, numbers, strings)
	 */
	public info(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.info(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.info(message);
		}
	}

	/**
	 * Logs warning-level messages for potentially problematic situations.
	 * @param message - The message to log
	 * @param args - Additional data to log (objects, numbers, strings)
	 */
	public warn(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.warn(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.warn(message);
		}
	}

	/**
	 * Logs error-level messages with optional error object details.
	 * @param message - The error message to log
	 * @param error - Optional error object or value to log
	 */
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
	 * Converts values to string representation for logging.
	 * Handles primitive types and objects with JSON serialization fallback.
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
