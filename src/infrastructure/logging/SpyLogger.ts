import { ILogger } from './ILogger';

/**
 * Spy logger implementation for testing
 * Captures all log messages for assertion
 */
export class SpyLogger implements ILogger {
	public readonly debugMessages: string[] = [];
	public readonly infoMessages: string[] = [];
	public readonly warnMessages: string[] = [];
	public readonly errorMessages: string[] = [];

	public debug(message: string, ..._args: unknown[]): void {
		this.debugMessages.push(message);
	}

	public info(message: string, ..._args: unknown[]): void {
		this.infoMessages.push(message);
	}

	public warn(message: string, ..._args: unknown[]): void {
		this.warnMessages.push(message);
	}

	public error(message: string, _error: unknown | undefined): void {
		this.errorMessages.push(message);
	}

	public reset(): void {
		this.debugMessages.length = 0;
		this.infoMessages.length = 0;
		this.warnMessages.length = 0;
		this.errorMessages.length = 0;
	}
}
