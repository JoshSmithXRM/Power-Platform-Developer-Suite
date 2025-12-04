import type { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';

/**
 * Adapts a browser AbortSignal to the domain ICancellationToken interface.
 *
 * This allows SafeWebviewPanel's abortSignal to be used with use cases and
 * repositories that accept ICancellationToken for cooperative cancellation.
 *
 * When the panel is disposed, its abortSignal is aborted, which causes this
 * adapter to report `isCancellationRequested = true`. This stops:
 * - New API requests from being made
 * - Retry loops from continuing
 * - Background loading from proceeding
 *
 * @example
 * ```typescript
 * // In panel constructor
 * private readonly cancellationToken: ICancellationToken;
 *
 * constructor(private readonly panel: SafeWebviewPanel, ...) {
 *     this.cancellationToken = new AbortSignalCancellationTokenAdapter(panel.abortSignal);
 * }
 *
 * // In async operations
 * await this.listWebResourcesUseCase.execute(envId, solutionId, this.cancellationToken);
 * ```
 */
export class AbortSignalCancellationTokenAdapter implements ICancellationToken {
	/**
	 * Creates an adapter from an AbortSignal.
	 *
	 * @param signal - The AbortSignal to adapt (typically from SafeWebviewPanel.abortSignal)
	 */
	constructor(private readonly signal: AbortSignal) {}

	/**
	 * Whether cancellation has been requested (signal has been aborted).
	 */
	public get isCancellationRequested(): boolean {
		return this.signal.aborted;
	}

	/**
	 * Registers a callback to be invoked when cancellation is requested.
	 *
	 * @param listener - Function to call when signal is aborted
	 * @returns Disposable to unregister the listener
	 */
	public onCancellationRequested(listener: () => void): IDisposable {
		// Handle case where signal is already aborted
		if (this.signal.aborted) {
			// Call listener synchronously since already aborted
			listener();
			return { dispose: (): void => { /* no-op */ } };
		}

		const wrappedListener = (): void => listener();
		this.signal.addEventListener('abort', wrappedListener);

		return {
			dispose: (): void => {
				this.signal.removeEventListener('abort', wrappedListener);
			}
		};
	}
}
