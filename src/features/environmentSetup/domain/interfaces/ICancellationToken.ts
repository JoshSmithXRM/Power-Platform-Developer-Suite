/**
 * Domain abstraction for cancellation tokens
 * Allows operations to be cancelled without coupling to specific infrastructure (VS Code, etc.)
 */
export interface ICancellationToken {
	/**
	 * Indicates whether cancellation has been requested
	 */
	readonly isCancellationRequested: boolean;

	/**
	 * Register a callback to be invoked when cancellation is requested
	 * @param listener Function to call when cancellation is requested
	 * @returns Disposable to unregister the listener
	 */
	onCancellationRequested(listener: () => void): IDisposable;
}

/**
 * Domain abstraction for disposable resources
 */
export interface IDisposable {
	/**
	 * Dispose of the resource and clean up
	 */
	dispose(): void;
}
