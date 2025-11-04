import type * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelBehavior } from '../behaviors/IPanelBehavior';
import type { WebviewMessage } from '../types/WebviewMessage';

/**
 * Configuration for PanelCoordinator.
 * Generic type parameter provides compile-time command validation.
 *
 * @template _TCommands - Union type of valid command strings for this panel (unused in config, used in coordinator)
 *
 * @example
 * ```typescript
 * type SolutionPanelCommands = 'refresh' | 'export';
 *
 * const config: PanelCoordinatorConfig<SolutionPanelCommands> = {
 *   panel,
 *   extensionUri,
 *   behaviors: [
 *     new EnvironmentBehavior(environmentService),
 *     new DataBehavior(dataLoader),
 *     new SectionCompositionBehavior(sections, PanelLayout.SingleColumn)
 *   ],
 *   logger
 * };
 * ```
 */
export interface PanelCoordinatorConfig<_TCommands extends string = string> {
	/** VS Code webview panel instance */
	readonly panel: vscode.WebviewPanel;

	/** Extension URI for resolving webview resources */
	readonly extensionUri: vscode.Uri;

	/**
	 * Behaviors to apply to this panel.
	 * SectionCompositionBehavior contains sections + layout.
	 */
	readonly behaviors: ReadonlyArray<IPanelBehavior>;

	/** Logger for panel operations */
	readonly logger: ILogger;
}

/**
 * Interface for universal panel coordinator.
 * Orchestrates panel lifecycle, behaviors, and message handling.
 *
 * Generic type parameter provides compile-time validation for message commands.
 *
 * @template TCommands - Union type of valid command strings
 */
export interface IPanelCoordinator<TCommands extends string = string> {
	/**
	 * Initializes the panel.
	 * Called once after panel creation to set up HTML and behaviors.
	 */
	initialize(): Promise<void>;

	/**
	 * Reveals the panel if hidden.
	 * Preserves panel state (does not reinitialize).
	 */
	reveal(): void;

	/**
	 * Disposes panel resources.
	 * Cleans up behaviors and event listeners.
	 */
	dispose(): void;

	/**
	 * Registers a message handler for a specific command.
	 * Command must be one of TCommands (compile-time validated).
	 *
	 * @param command - Command name (must match button ID by convention)
	 * @param handler - Async function to handle the command
	 *
	 * @example
	 * ```typescript
	 * coordinator.registerHandler('refresh', async () => {
	 *   await dataBehavior.loadData();
	 * });
	 * ```
	 */
	registerHandler<T extends TCommands>(
		command: T,
		handler: (payload?: unknown) => Promise<void>
	): void;

	/**
	 * Handles a message from the webview.
	 * Routes to registered handler or logs warning.
	 *
	 * @param message - Message from webview (runtime validated)
	 */
	handleMessage(message: WebviewMessage): Promise<void>;
}
