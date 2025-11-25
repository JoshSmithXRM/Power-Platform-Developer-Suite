import * as vscode from 'vscode';

import { ILogger } from '../../../../infrastructure/logging/ILogger';
import {
	isWebviewMessage,
	isWebviewLogMessage,
	type WebviewLogMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';

import { IMessageRoutingBehavior, type MessageHandler } from './IMessageRoutingBehavior';

/**
 * Implementation: Message Routing
 * Routes webview messages to appropriate command handlers.
 */
export class MessageRoutingBehavior implements IMessageRoutingBehavior {
	private disposables: vscode.Disposable[] = [];
	private commandHandlers: Map<string, MessageHandler> = new Map();

	constructor(
		private readonly webview: vscode.Webview,
		private readonly logger: ILogger
	) {}

	/**
	 * Registers a handler function for a specific webview command.
	 *
	 * Handlers are invoked when the webview sends a message with a matching command.
	 * Multiple handlers can be registered for different commands.
	 */
	public registerHandler(command: string, handler: MessageHandler): void {
		this.commandHandlers.set(command, handler);
	}

	/**
	 * Initializes the message routing behavior.
	 *
	 * Sets up the webview message listener that routes incoming messages to
	 * registered handlers based on the command name.
	 */
	public initialize(): void {
		this.webview.onDidReceiveMessage(
			async (message) => await this.handleMessage(message),
			null,
			this.disposables
		);
	}

	/**
	 * Disposes the behavior and cleans up event subscriptions.
	 */
	public dispose(): void {
		while (this.disposables.length) {
			this.disposables.pop()?.dispose();
		}
	}

	private async handleMessage(message: unknown): Promise<void> {
		if (!isWebviewMessage(message)) {
			this.logger.warn('Received invalid message from webview', message);
			return;
		}

		try {
			// Handle webview log messages
			if (isWebviewLogMessage(message)) {
				this.handleWebviewLog(message);
				return;
			}

			this.logger.debug('Handling webview command', { command: message.command });

			// Route to registered handler
			const handler = this.commandHandlers.get(message.command);
			if (handler) {
				await handler(message);
			} else {
				this.logger.warn('No handler registered for command', { command: message.command });
			}
		} catch (error) {
			this.logger.error('Error handling webview command', error);
		}
	}

	/**
	 * Forwards webview logs to extension logger.
	 */
	private handleWebviewLog(message: WebviewLogMessage): void {
		const logMessage = `[Webview] ${message.message}`;

		switch (message.level) {
			case 'debug':
				this.logger.debug(logMessage);
				break;
			case 'info':
				this.logger.info(logMessage);
				break;
			case 'warn':
				this.logger.warn(logMessage);
				break;
			case 'error':
				this.logger.error(logMessage);
				break;
		}
	}
}
