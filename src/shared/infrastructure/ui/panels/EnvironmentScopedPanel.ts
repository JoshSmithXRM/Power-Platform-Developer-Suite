import * as vscode from 'vscode';

import type { EnvironmentOption } from '../DataTablePanel';

/**
 * Environment information interface for panel creation.
 */
export interface EnvironmentInfo {
	id: string;
	name: string;
	powerPlatformEnvironmentId: string | undefined;
}

/**
 * Factory function type for creating panel instances.
 * Concrete panels implement this to create their specific panel type.
 */
export type PanelFactory<TPanel> = (
	panel: vscode.WebviewPanel,
	environmentId: string
) => TPanel;

/**
 * Configuration for webview panel options.
 */
export interface WebviewPanelOptions {
	enableScripts?: boolean;
	localResourceRoots?: vscode.Uri[];
	retainContextWhenHidden?: boolean;
	enableFindWidget?: boolean;
}

/**
 * Configuration for creating an environment-scoped panel.
 */
export interface CreatePanelConfig<TPanel extends EnvironmentScopedPanel<TPanel>> {
	viewType: string;
	titlePrefix: string;
	extensionUri: vscode.Uri;
	getEnvironments: () => Promise<EnvironmentOption[]>;
	getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>;
	initialEnvironmentId: string | undefined;
	panelFactory: PanelFactory<TPanel>;
	webviewOptions?: WebviewPanelOptions | undefined;
	onDispose?: ((panel: TPanel) => void) | undefined;
}

/**
 * Abstract base class for environment-scoped panels.
 * Provides singleton pattern management with one panel instance per environment.
 *
 * **Pattern:**
 * - Each concrete panel class maintains a Map<environmentId, PanelInstance>
 * - Calling createOrShow with an environment ID either reveals existing panel or creates new one
 * - When environment changes, panel is re-registered in the Map
 * - On disposal, panel is removed from the Map
 *
 * **Usage:**
 * ```typescript
 * export class MyPanel extends EnvironmentScopedPanel<MyPanel> {
 *   private static panels = new Map<string, MyPanel>();
 *
 *   public static async createOrShow(...deps, initialEnvironmentId?: string): Promise<MyPanel> {
 *     return EnvironmentScopedPanel.createOrShowPanel({
 *       viewType: MyPanel.viewType,
 *       titlePrefix: 'My Panel',
 *       extensionUri,
 *       getEnvironments,
 *       getEnvironmentById,
 *       initialEnvironmentId,
 *       panelFactory: (panel, envId) => new MyPanel(panel, extensionUri, ...deps, envId),
 *       webviewOptions: { enableScripts: true, retainContextWhenHidden: true }
 *     }, MyPanel.panels);
 *   }
 * }
 * ```
 */
export abstract class EnvironmentScopedPanel<TPanel extends EnvironmentScopedPanel<TPanel>> {
	/**
	 * Creates or shows a panel for the specified environment.
	 * If a panel already exists for the target environment, it is revealed.
	 * Otherwise, a new panel is created and registered.
	 *
	 * @param config - Configuration for panel creation
	 * @param panelsMap - The static Map<string, TPanel> from the concrete panel class
	 * @returns The panel instance (existing or newly created)
	 */
	protected static async createOrShowPanel<TPanel extends EnvironmentScopedPanel<TPanel>>(
		config: CreatePanelConfig<TPanel>,
		panelsMap: Map<string, TPanel>
	): Promise<TPanel> {
		const column = vscode.ViewColumn.One;

		// Determine which environment to use
		const targetEnvironmentId = await this.resolveTargetEnvironment(
			config.initialEnvironmentId,
			config.getEnvironments
		);

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Check if panel already exists for this environment
		const existingPanel = panelsMap.get(targetEnvironmentId);
		if (existingPanel) {
			existingPanel.reveal(column);
			return existingPanel;
		}

		// Get environment name for title
		const environment = await config.getEnvironmentById(targetEnvironmentId);
		const environmentName = environment?.name || 'Unknown';

		// Create VS Code webview panel with standard options
		const webviewOptions = this.buildWebviewOptions(config.extensionUri, config.webviewOptions);
		const panel = vscode.window.createWebviewPanel(
			config.viewType,
			`${config.titlePrefix} - ${environmentName}`,
			column,
			webviewOptions
		);

		// Create concrete panel instance using factory
		const newPanel = config.panelFactory(panel, targetEnvironmentId);

		// Register panel in map
		panelsMap.set(targetEnvironmentId, newPanel);

		// Register disposal handler
		const onDisposeCallback = config.onDispose ? (): void => {
			if (config.onDispose) {
				config.onDispose(newPanel);
			}
		} : undefined;
		this.registerDisposal(panel, targetEnvironmentId, panelsMap, onDisposeCallback);

		return newPanel;
	}

	/**
	 * Resolves the target environment ID.
	 * Uses initialEnvironmentId if provided, otherwise falls back to first available environment.
	 */
	private static async resolveTargetEnvironment(
		initialEnvironmentId: string | undefined,
		getEnvironments: () => Promise<EnvironmentOption[]>
	): Promise<string | undefined> {
		if (initialEnvironmentId) {
			return initialEnvironmentId;
		}

		const environments = await getEnvironments();
		return environments[0]?.id;
	}

	/**
	 * Builds webview panel options with standard defaults.
	 */
	private static buildWebviewOptions(
		extensionUri: vscode.Uri,
		customOptions?: WebviewPanelOptions
	): vscode.WebviewPanelOptions & vscode.WebviewOptions {
		return {
			enableScripts: customOptions?.enableScripts ?? true,
			localResourceRoots: customOptions?.localResourceRoots ?? [extensionUri],
			retainContextWhenHidden: customOptions?.retainContextWhenHidden ?? true,
			enableFindWidget: customOptions?.enableFindWidget ?? false
		};
	}

	/**
	 * Registers disposal handler for the panel.
	 * Removes panel from map when disposed.
	 */
	private static registerDisposal<TPanel>(
		panel: vscode.WebviewPanel,
		environmentId: string,
		panelsMap: Map<string, TPanel>,
		onDispose?: () => void
	): void {
		const envId = environmentId; // Capture for closure
		panel.onDidDispose(() => {
			panelsMap.delete(envId);
			if (onDispose) {
				onDispose();
			}
		});
	}

	/**
	 * Reveals the panel in the specified column.
	 * @param column - The view column to reveal the panel in
	 */
	protected abstract reveal(column: vscode.ViewColumn): void;

	/**
	 * Re-registers the panel in the panels map when environment changes.
	 * Call this from handleEnvironmentChange after updating currentEnvironmentId.
	 *
	 * @param panelsMap - The static panels Map from the concrete class
	 * @param oldEnvironmentId - The previous environment ID
	 * @param newEnvironmentId - The new environment ID
	 */
	protected reregisterPanel(
		panelsMap: Map<string, TPanel>,
		oldEnvironmentId: string,
		newEnvironmentId: string
	): void {
		// Remove from old environment
		panelsMap.delete(oldEnvironmentId);

		// Add to new environment
		panelsMap.set(newEnvironmentId, this as unknown as TPanel);
	}
}
