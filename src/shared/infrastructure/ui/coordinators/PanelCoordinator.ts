import type * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelBehavior } from '../behaviors/IPanelBehavior';
import type { WebviewMessage } from '../types/WebviewMessage';
import { isWebviewMessage } from '../types/WebviewMessage';

import type { IPanelCoordinator, PanelCoordinatorConfig } from './IPanelCoordinator';

/**
 * Configuration options for command handlers.
 */
export interface CommandHandlerOptions {
	/** Whether to disable button and show loading state during execution. Defaults to true. */
	readonly disableOnExecute?: boolean;
}

/**
 * Universal panel coordinator that orchestrates panel lifecycle and behaviors.
 *
 * Replaces DataTablePanelCoordinator with more flexible, composable architecture:
 * - Sections define UI (not fixed template)
 * - Behaviors are optional (not registry)
 * - Command registry provides type safety
 *
 * @template TCommands - Union type of valid command strings for compile-time validation
 *
 * @example
 * ```typescript
 * type SolutionPanelCommands = 'refresh' | 'export';
 *
 * const coordinator = new PanelCoordinator<SolutionPanelCommands>({
 *   panel,
 *   extensionUri,
 *   behaviors: [
 *     new EnvironmentBehavior(environmentService),
 *     new DataBehavior(dataLoader),
 *     new SectionCompositionBehavior(sections, PanelLayout.SingleColumn),
 *     new MessageRoutingBehavior()
 *   ],
 *   logger
 * });
 *
 * await coordinator.initialize();
 *
 * coordinator.registerHandler('refresh', async () => {
 *   await dataLoader.load();
 * });
 * ```
 */
export class PanelCoordinator<TCommands extends string = string>
	implements IPanelCoordinator<TCommands>
{
	private readonly panel: vscode.WebviewPanel;
	private readonly extensionUri: vscode.Uri;
	private readonly behaviors: ReadonlyArray<IPanelBehavior>;
	private readonly logger: ILogger;
	private readonly messageHandlers = new Map<
		TCommands,
		{
			handler: (payload?: unknown) => Promise<void>;
			options: CommandHandlerOptions;
		}
	>();
	private disposables: vscode.Disposable[] = [];

	constructor(config: PanelCoordinatorConfig<TCommands>) {
		this.panel = config.panel;
		this.extensionUri = config.extensionUri;
		this.behaviors = config.behaviors;
		this.logger = config.logger;

		const logger: ILogger = this.logger;  // Capture for use in callbacks

		// Register panel disposal
		this.disposables.push(
			this.panel.onDidDispose(() => this.dispose())
		);

		// Register webview message handler
		this.disposables.push(
			this.panel.webview.onDidReceiveMessage(
				async (message: unknown) => {
					if (isWebviewMessage(message)) {
						await this.handleMessage(message);
					} else {
						logger.warn(
							'Invalid message received from webview',
							{ message }
						);
					}
				}
			)
		);

		logger.debug('PanelCoordinator created', {
			viewType: this.panel.viewType,
			behaviorCount: this.behaviors.length,
		});
	}

	/**
	 * Initializes the panel.
	 * Initializes all behaviors in sequence.
	 */
	public async initialize(): Promise<void> {
		this.logger.debug('Initializing PanelCoordinator', {
			viewType: this.panel.viewType,
		});

		try {
			// Initialize behaviors in sequence
			for (const behavior of this.behaviors) {
				if (behavior.initialize) {
					await behavior.initialize();
				}
			}

			this.logger.debug('PanelCoordinator initialized successfully', {
				viewType: this.panel.viewType,
			});
		} catch (error: unknown) {
			this.logger.error(
				'Failed to initialize PanelCoordinator',
				error
			);
			throw error;
		}
	}

	/**
	 * Reveals the panel if hidden.
	 */
	public reveal(): void {
		this.panel.reveal();
		this.logger.debug('Panel revealed', {
			viewType: this.panel.viewType,
		});
	}

	/**
	 * Registers a message handler for a specific command.
	 * Automatically manages button loading state during execution.
	 * Command is type-checked at compile time.
	 *
	 * @param command - Command name (must be one of TCommands)
	 * @param handler - Handler function
	 * @param options - Configuration options (disableOnExecute defaults to true)
	 */
	public registerHandler<T extends TCommands>(
		command: T,
		handler: (payload?: unknown) => Promise<void>,
		options: CommandHandlerOptions = { disableOnExecute: true }
	): void {
		if (this.messageHandlers.has(command)) {
			this.logger.warn('Overwriting existing handler for command', {
				command,
			});
		}

		this.messageHandlers.set(command, { handler, options });
		this.logger.debug('Registered message handler', { command, options });
	}

	/**
	 * Handles a message from the webview.
	 * Routes to registered handler and manages loading state automatically.
	 */
	public async handleMessage(message: WebviewMessage): Promise<void> {
		const { command, data } = message;

		const handlerConfig = this.messageHandlers.get(command as TCommands);
		if (handlerConfig === undefined) {
			this.logger.warn('No handler registered for command', {
				command,
			});
			return;
		}

		const { handler, options } = handlerConfig;
		this.logger.debug('Handling message', { command, data });

		try {
			if (options.disableOnExecute) {
				this.setButtonLoading(command, true);
			}

			await handler(data);
		} catch (error: unknown) {
			this.logger.error(`Error handling message '${command}'`, error);
			// Don't rethrow - log and continue
		} finally {
			// Restore button state
			if (options.disableOnExecute) {
				this.setButtonLoading(command, false);
			}
		}
	}

	/**
	 * Sets button loading state via webview message.
	 * Sends message to client-side to disable/enable button by ID.
	 *
	 * @param buttonId - Button element ID (same as command name)
	 * @param isLoading - True to disable and show spinner, false to enable
	 */
	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading,
		});
	}

	/**
	 * Disposes panel resources.
	 * Cleans up behaviors and event listeners.
	 */
	public dispose(): void {
		this.logger.debug('Disposing PanelCoordinator', {
			viewType: this.panel.viewType,
		});

		// Dispose behaviors (if they have dispose method)
		for (const behavior of this.behaviors) {
			try {
				if (behavior.dispose) {
					behavior.dispose();
				}
			} catch (error: unknown) {
				this.logger.error('Error disposing behavior', error);
			}
		}

		// Dispose event listeners
		for (const disposable of this.disposables) {
			try {
				disposable.dispose();
			} catch (error: unknown) {
				this.logger.error('Error disposing resource', error);
			}
		}

		this.disposables = [];
		this.messageHandlers.clear();

		this.logger.debug('PanelCoordinator disposed', {
			viewType: this.panel.viewType,
		});
	}
}
