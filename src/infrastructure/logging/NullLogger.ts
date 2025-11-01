import { ILogger } from './ILogger';

/**
 * Null logger implementation for testing
 * Discards all log messages
 */
export class NullLogger implements ILogger {
	public debug(_message: string, ..._args: unknown[]): void {
		// No-op
	}

	public info(_message: string, ..._args: unknown[]): void {
		// No-op
	}

	public warn(_message: string, ..._args: unknown[]): void {
		// No-op
	}

	public error(_message: string, _error?: unknown): void {
		// No-op
	}
}
