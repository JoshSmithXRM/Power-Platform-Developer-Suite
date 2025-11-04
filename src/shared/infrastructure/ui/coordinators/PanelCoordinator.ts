import type * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelBehavior } from '../behaviors/IPanelBehavior';
import type { WebviewMessage } from '../types/WebviewMessage';
import { isWebviewMessage } from '../types/WebviewMessage';

import type { IPanelCoordinator, PanelCoordinatorConfig } from './IPanelCoordinator';

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
		(payload?: unknown) => Promise<void>
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
	 * Command is type-checked at compile time.
	 *
	 * @param command - Command name (must be one of TCommands)
	 * @param handler - Handler function
	 */
	public registerHandler<T extends TCommands>(
		command: T,
		handler: (payload?: unknown) => Promise<void>
	): void {
		if (this.messageHandlers.has(command)) {
			this.logger.warn('Overwriting existing handler for command', {
				command,
			});
		}

		this.messageHandlers.set(command, handler);
		this.logger.debug('Registered message handler', { command });
	}

	/**
	 * Handles a message from the webview.
	 * Routes to registered handler or logs warning.
	 */
	public async handleMessage(message: WebviewMessage): Promise<void> {
		const { command, payload } = message;

		const handler = this.messageHandlers.get(command as TCommands);
		if (handler === undefined) {
			this.logger.warn('No handler registered for command', {
				command,
			});
			return;
		}

		this.logger.debug('Handling message', { command });

		try {
			await handler(payload);
		} catch (error: unknown) {
			this.logger.error(`Error handling message '${command}'`, error);
			// Don't rethrow - log and continue
		}
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
