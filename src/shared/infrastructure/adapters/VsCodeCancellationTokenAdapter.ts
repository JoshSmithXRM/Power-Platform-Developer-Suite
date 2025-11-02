import * as vscode from 'vscode';

import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';

/**
 * Adapter that wraps VS Code's CancellationToken to implement domain's ICancellationToken interface.
 * Bridges the gap between VS Code infrastructure and domain layer without coupling domain to VS Code.
 */
export class VsCodeCancellationTokenAdapter implements ICancellationToken {
	constructor(private readonly vsCodeToken: vscode.CancellationToken) {}

	get isCancellationRequested(): boolean {
		return this.vsCodeToken.isCancellationRequested;
	}

	onCancellationRequested(listener: () => void): vscode.Disposable {
		return this.vsCodeToken.onCancellationRequested(listener);
	}
}
