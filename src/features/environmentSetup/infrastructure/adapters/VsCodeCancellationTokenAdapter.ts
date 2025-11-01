import * as vscode from 'vscode';

import { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';

/**
 * Adapter that bridges VS Code's CancellationToken to the domain ICancellationToken interface
 * Maintains dependency inversion by allowing domain layer to remain framework-agnostic
 */
export class VsCodeCancellationTokenAdapter implements ICancellationToken {
	constructor(private readonly vsCodeToken: vscode.CancellationToken) {}

	/**
	 * Gets whether cancellation has been requested
	 * @returns True if cancellation was requested, false otherwise
	 */
	public get isCancellationRequested(): boolean {
		return this.vsCodeToken.isCancellationRequested;
	}

	/**
	 * Registers a listener to be called when cancellation is requested
	 * @param listener - Function to call when cancellation is requested
	 * @returns Disposable to unregister the listener
	 */
	public onCancellationRequested(listener: () => void): IDisposable {
		return this.vsCodeToken.onCancellationRequested(listener);
	}
}
