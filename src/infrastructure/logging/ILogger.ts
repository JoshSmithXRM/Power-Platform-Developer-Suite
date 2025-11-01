/**
 * Logger interface for cross-cutting logging concerns
 * Abstraction over VS Code OutputChannel and other logging mechanisms
 */
export interface ILogger {
	/**
	 * Log debug information (verbose, development details)
	 */
	debug(message: string, ...args: unknown[]): void;

	/**
	 * Log informational messages (normal operations)
	 */
	info(message: string, ...args: unknown[]): void;

	/**
	 * Log warnings (non-critical issues)
	 */
	warn(message: string, ...args: unknown[]): void;

	/**
	 * Log errors (failures requiring attention)
	 */
	error(message: string, error?: unknown): void;
}
