/**
 * Logger interface for cross-cutting logging concerns
 * Abstraction over VS Code OutputChannel and other logging mechanisms
 */
export interface ILogger {
	/**
	 * Log trace information (extremely verbose, deep diagnostics)
	 * Use for: Method entry/exit, loop iterations, raw payloads
	 */
	trace(message: string, ...args: unknown[]): void;

	/**
	 * Log debug information (verbose, development details)
	 * Use for: Technical details, method flow, API calls
	 */
	debug(message: string, ...args: unknown[]): void;

	/**
	 * Log informational messages (normal operations)
	 * Use for: Business events, use case completion, state changes
	 */
	info(message: string, ...args: unknown[]): void;

	/**
	 * Log warnings (non-critical issues)
	 * Use for: Recoverable issues, fallbacks, missing optional config
	 */
	warn(message: string, ...args: unknown[]): void;

	/**
	 * Log errors (failures requiring attention)
	 * Use for: Failures, exceptions, data corruption
	 */
	error(message: string, error?: unknown): void;
}
