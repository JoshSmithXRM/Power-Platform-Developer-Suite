import * as vscode from 'vscode';

import { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';

/**
 * Adapter that bridges VS Code's CancellationToken to the domain ICancellationToken interface
 * Maintains dependency inversion by allowing domain layer to remain framework-agnostic
 */
export class VsCodeCancellationTokenAdapter implements ICancellationToken {
	constructor(private readonly vsCodeToken: vscode.CancellationToken) {}

	public get isCancellationRequested(): boolean {
		return this.vsCodeToken.isCancellationRequested;
	}

	public onCancellationRequested(listener: () => void): IDisposable {
		return this.vsCodeToken.onCancellationRequested(listener);
	}
}
