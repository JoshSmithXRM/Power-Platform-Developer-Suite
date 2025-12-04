import type { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';

/**
 * Combines multiple cancellation tokens into one.
 * Returns cancelled if ANY of the underlying tokens is cancelled.
 *
 * Use cases:
 * - Combining panel-level cancellation (when panel closes) with
 *   operation-level cancellation (when user changes solution/environment)
 *
 * @example
 * ```typescript
 * const panelToken = new AbortSignalCancellationTokenAdapter(panel.abortSignal);
 * const operationToken = new VsCodeCancellationTokenAdapter(vscodeToken);
 * const composite = new CompositeCancellationToken(panelToken, operationToken);
 *
 * // Now composite.isCancellationRequested is true if EITHER token is cancelled
 * await useCase.execute(envId, data, composite);
 * ```
 */
export class CompositeCancellationToken implements ICancellationToken {
	private readonly tokens: ICancellationToken[];

	constructor(...tokens: ICancellationToken[]) {
		this.tokens = tokens;
	}

	/**
	 * Returns true if ANY of the underlying tokens has been cancelled.
	 */
	get isCancellationRequested(): boolean {
		return this.tokens.some(token => token.isCancellationRequested);
	}

	/**
	 * Registers a listener that fires when ANY token is cancelled.
	 * Returns a composite disposable that unregisters from all tokens.
	 */
	onCancellationRequested(listener: () => void): IDisposable {
		const disposables = this.tokens.map(token =>
			token.onCancellationRequested(listener)
		);

		return {
			dispose: () => {
				disposables.forEach(d => d.dispose());
			}
		};
	}
}
