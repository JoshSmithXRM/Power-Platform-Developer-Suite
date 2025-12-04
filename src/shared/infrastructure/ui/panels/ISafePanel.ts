import type * as vscode from 'vscode';

/**
 * Interface for safe panel messaging and HTML rendering.
 * Used by behaviors and coordinators to post messages without risk of
 * "Webview is disposed" errors.
 *
 * Implementations automatically track disposal state and silently ignore
 * messages sent after disposal.
 */
export interface ISafePanel {
	/**
	 * Whether the panel has been disposed.
	 * Once true, all postMessage calls will return false immediately.
	 */
	readonly disposed: boolean;

	/**
	 * AbortSignal that is aborted when the panel is disposed.
	 * Use this to cancel in-flight operations when the panel closes.
	 *
	 * @example
	 * ```typescript
	 * const token = new AbortSignalCancellationTokenAdapter(panel.abortSignal);
	 * await useCase.execute(envId, data, token);
	 * ```
	 */
	readonly abortSignal: AbortSignal;

	/**
	 * The webview's HTML content.
	 * Used by HtmlScaffoldingBehavior to set the webview content.
	 */
	html: string;

	/**
	 * Content security policy source for use in CSP headers.
	 * Use this to construct CSP meta tags in HTML scaffolding.
	 */
	readonly cspSource: string;

	/**
	 * The underlying webview for read-only operations.
	 * Use for asWebviewUri() and other webview utilities.
	 * Do NOT use webview.postMessage() - use panel.postMessage() instead.
	 */
	readonly webview: vscode.Webview;

	/**
	 * Safely posts a message to the webview.
	 * Returns false if the panel is disposed or if posting fails.
	 * Never throws - safe to call without try/catch.
	 *
	 * @param message - The message to send to the webview
	 * @returns Promise resolving to true if sent successfully, false otherwise
	 */
	postMessage(message: unknown): Promise<boolean>;

	/**
	 * Registers a listener for messages from the webview.
	 * @param listener - Callback invoked when webview sends a message
	 * @returns Disposable to unregister the listener
	 */
	onDidReceiveMessage(listener: (message: unknown) => void): vscode.Disposable;
}
