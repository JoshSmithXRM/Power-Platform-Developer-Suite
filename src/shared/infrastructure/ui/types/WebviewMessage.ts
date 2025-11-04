/**
 * Message received from webview.
 * Provides runtime validation for untrusted input from webview context.
 */
export interface WebviewMessage {
	readonly command: string;
	readonly payload?: unknown;
}

/**
 * Type guard for WebviewMessage.
 * Provides runtime validation of messages from webview to prevent crashes from malformed data.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid WebviewMessage
 *
 * @example
 * ```typescript
 * webview.onDidReceiveMessage((message) => {
 *   if (isWebviewMessage(message)) {
 *     // message is WebviewMessage - safe to access command
 *     await handleMessage(message);
 *   } else {
 *     logger.warn('Invalid message received from webview', { message });
 *   }
 * });
 * ```
 */
export function isWebviewMessage(value: unknown): value is WebviewMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		'command' in value &&
		typeof (value as { command: unknown }).command === 'string'
	);
}
