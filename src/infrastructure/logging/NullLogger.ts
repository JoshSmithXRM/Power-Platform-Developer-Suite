import { ILogger } from './ILogger';

/**
 * Null logger implementation for testing
 * Discards all log messages
 */
export class NullLogger implements ILogger {
	public debug(_message: string, ..._args: unknown[]): void {}

	public info(_message: string, ..._args: unknown[]): void {}

	public warn(_message: string, ..._args: unknown[]): void {}

	public error(_message: string, _error?: unknown): void {}
}
