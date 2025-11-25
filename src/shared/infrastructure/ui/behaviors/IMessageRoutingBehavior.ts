import { type WebviewMessage } from '../../../../infrastructure/ui/utils/TypeGuards';

export type MessageHandler = (message: WebviewMessage) => Promise<void>;

/**
 * Behavior: Message Routing
 * Responsibility: Webview message handling, command dispatching
 */
export interface IMessageRoutingBehavior {
	/**
	 * Registers a command handler for a specific command.
	 */
	registerHandler(command: string, handler: MessageHandler): void;

	/**
	 * Initializes message routing behavior.
	 * Sets up webview message listeners.
	 */
	initialize(): void;

	/**
	 * Disposes resources used by this behavior.
	 */
	dispose(): void;
}
