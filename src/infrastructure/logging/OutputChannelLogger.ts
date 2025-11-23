import * as vscode from 'vscode';

import { ILogger } from './ILogger';

/**
 * Logger implementation using VS Code LogOutputChannel
 * Provides structured logging with automatic timestamps and level formatting
 */
export class OutputChannelLogger implements ILogger {
	/**
	 * Creates an OutputChannelLogger instance.
	 *
	 * @param outputChannel - VS Code LogOutputChannel for logging output
	 */
	constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

	/**
	 * Logs trace-level message with optional structured data.
	 *
	 * Trace level is for extremely verbose logging like loop iterations,
	 * raw payloads, or method entry/exit points.
	 *
	 * @param message - Log message
	 * @param args - Optional structured data to log
	 */
	public trace(message: string, ...args: unknown[]): void {
		if (args.length > 0) {
			const argsStr = args.map(arg => this.stringify(arg)).join('\n');
			this.outputChannel.trace(`${message}\n${argsStr}`);
		} else {
			this.outputChannel.trace(message);
		}
	}

	/**
	 * Logs debug-level message with optional structured data.
	 *
	 * Debug level is for technical details, method flow, and API calls
	 * useful during development and troubleshooting.
	 *
	 * @param message - Log message
	 * @param args - Optional structured data to log
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
	 * Logs info-level message with optional structured data.
	 *
	 * Info level is for business events, use case completion,
	 * and state changes important to users.
	 *
	 * @param message - Log message
	 * @param args - Optional structured data to log
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
	 * Logs warning-level message with optional structured data.
	 *
	 * Warning level is for recoverable issues, fallbacks,
	 * or missing optional configuration.
	 *
	 * @param message - Log message
	 * @param args - Optional structured data to log
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
	 * Logs error-level message with optional error object.
	 *
	 * Error level is for failures and exceptions. Always pass the error
	 * object when available to include stack traces for debugging.
	 *
	 * @param message - Error message describing what failed
	 * @param error - Optional error object or additional context
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
