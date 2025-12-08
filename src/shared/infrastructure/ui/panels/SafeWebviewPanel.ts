import * as vscode from 'vscode';

import type { ISafePanel } from './ISafePanel';

/**
 * Wrapper around vscode.WebviewPanel that provides safe messaging.
 *
 * Solves the "Webview is disposed" error that occurs when async operations
 * complete after the user closes a panel. This wrapper:
 *
 * 1. **Tracks disposal automatically** via onDidDispose
 * 2. **Provides safe postMessage** that checks disposal and catches errors
 * 3. **Provides abortSignal** for cancelling in-flight operations
 *
 * The type system prevents direct access to `webview.postMessage()`, forcing
 * all code to use the safe `postMessage()` method.
 *
 * @example
 * ```typescript
 * // In panel factory
 * const rawPanel = vscode.window.createWebviewPanel(...);
 * const safePanel = new SafeWebviewPanel(rawPanel);
 *
 * // Safe posting - never throws
 * await safePanel.postMessage({ command: 'update', data });
 *
 * // Cancel operations on dispose
 * const token = new AbortSignalCancellationTokenAdapter(safePanel.abortSignal);
 * await useCase.execute(envId, data, token);
 * ```
 */
export class SafeWebviewPanel implements ISafePanel {
	private _disposed = false;
	private readonly _abortController = new AbortController();

	/**
	 * Creates a SafeWebviewPanel wrapper.
	 * Automatically registers disposal tracking via onDidDispose.
	 *
	 * @param _panel - The underlying VS Code WebviewPanel to wrap
	 */
	constructor(private readonly _panel: vscode.WebviewPanel) {
		_panel.onDidDispose(() => {
			this._disposed = true;
			this._abortController.abort();
		});
	}

	/**
	 * Whether the panel has been disposed.
	 */
	public get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * AbortSignal that is aborted when the panel is disposed.
	 * Pass to use cases via AbortSignalCancellationTokenAdapter to cancel operations.
	 */
	public get abortSignal(): AbortSignal {
		return this._abortController.signal;
	}

	/**
	 * The webview's HTML content.
	 */
	public get html(): string {
		return this._panel.webview.html;
	}

	public set html(value: string) {
		this._panel.webview.html = value;
	}

	/**
	 * The panel's title.
	 */
	public get title(): string {
		return this._panel.title;
	}

	public set title(value: string) {
		this._panel.title = value;
	}

	/**
	 * Whether the panel is currently visible.
	 */
	public get visible(): boolean {
		return this._panel.visible;
	}

	/**
	 * Whether the panel is currently active (focused).
	 */
	public get active(): boolean {
		return this._panel.active;
	}

	/**
	 * The view column in which the panel is shown.
	 */
	public get viewColumn(): vscode.ViewColumn | undefined {
		return this._panel.viewColumn;
	}

	/**
	 * The panel options.
	 */
	public get options(): vscode.WebviewPanelOptions & vscode.WebviewOptions {
		return this._panel.options;
	}

	/**
	 * The view type identifier for this panel.
	 */
	public get viewType(): string {
		return this._panel.viewType;
	}

	/**
	 * Content security policy source for use in CSP headers.
	 */
	public get cspSource(): string {
		return this._panel.webview.cspSource;
	}

	/**
	 * The underlying webview for read-only operations.
	 * Use this for webview.asWebviewUri(), webview.options, etc.
	 * Do NOT use webview.postMessage() - use this.postMessage() instead.
	 */
	public get webview(): vscode.Webview {
		return this._panel.webview;
	}

	/**
	 * Safely posts a message to the webview.
	 *
	 * This method:
	 * 1. Checks if panel is disposed - returns false immediately
	 * 2. Attempts to post message
	 * 3. Catches any errors (e.g., disposal race) - returns false
	 *
	 * Never throws. Safe to call without try/catch.
	 *
	 * @param message - The message to send to the webview
	 * @returns Promise resolving to true if sent, false if disposed or failed
	 */
	public async postMessage(message: unknown): Promise<boolean> {
		if (this._disposed) {
			return false;
		}

		try {
			return await this._panel.webview.postMessage(message);
		} catch {
			// Panel was disposed between check and send, or other error
			return false;
		}
	}

	/**
	 * Registers a listener for messages from the webview.
	 *
	 * @param listener - Callback invoked when webview sends a message
	 * @returns Disposable to unregister the listener
	 */
	public onDidReceiveMessage(listener: (message: unknown) => void): vscode.Disposable {
		return this._panel.webview.onDidReceiveMessage(listener);
	}

	/**
	 * Registers a listener for panel disposal.
	 *
	 * @param listener - Callback invoked when panel is disposed
	 * @returns Disposable to unregister the listener
	 */
	public onDidDispose(listener: () => void): vscode.Disposable {
		return this._panel.onDidDispose(listener);
	}

	/**
	 * Registers a listener for visibility changes.
	 *
	 * @param listener - Callback invoked when visibility changes
	 * @returns Disposable to unregister the listener
	 */
	public onDidChangeViewState(
		listener: (e: vscode.WebviewPanelOnDidChangeViewStateEvent) => void
	): vscode.Disposable {
		return this._panel.onDidChangeViewState(listener);
	}

	/**
	 * Reveals the panel in the specified column.
	 *
	 * @param viewColumn - Optional column to reveal in
	 * @param preserveFocus - Whether to preserve focus on current editor
	 */
	public reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void {
		this._panel.reveal(viewColumn, preserveFocus);
	}

	/**
	 * Disposes the panel and aborts any pending operations.
	 */
	public dispose(): void {
		this._disposed = true;
		this._abortController.abort();
		this._panel.dispose();
	}
}
