import * as vscode from 'vscode';

import type { EnvironmentOption } from '../DataTablePanel';

/**
 * Environment information interface for panel creation.
 */
export interface EnvironmentInfo {
	id: string;
	name: string;
	powerPlatformEnvironmentId: string | undefined;
	/** Dataverse organization URL (e.g., https://org.crm.dynamics.com) */
	dataverseUrl?: string;
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
 * Abstract base class for environment-scoped panels that display data for a single environment.
 * Provides singleton pattern management with one panel instance per environment.
 *
 * **Purpose:**
 * This base class is designed for data viewing panels where each panel instance is tightly
 * coupled to a specific environment. When the user switches environments within a panel,
 * the panel re-registers itself under the new environment ID, maintaining the single-instance
 * invariant.
 *
 * **Singleton Pattern (One Instance Per Environment):**
 * - Each concrete panel class maintains `private static panels = new Map<environmentId, PanelInstance>()`
 * - Calling `createOrShow(envId)` either reveals existing panel for that environment or creates new one
 * - When user changes environment in panel, call `reregisterPanel()` to update the map
 * - On disposal, panel is automatically removed from the map
 * - This prevents duplicate panels for the same environment
 *
 * **Disposal Lifecycle:**
 * 1. User closes panel OR VS Code disposes panel
 * 2. `panel.onDidDispose()` fires automatically
 * 3. Panel is removed from `panels` map
 * 4. Optional `onDispose` callback executes (for cleanup like unregistering edit sessions)
 * 5. Panel instance becomes eligible for garbage collection
 *
 * Subclasses do NOT need to implement custom disposal logic unless they have:
 * - Active timers/intervals to clear
 * - Edit session registrations to release
 * - External resource cleanup (rare)
 *
 * **When to Use This Base Class:**
 * ✅ Use for data viewing panels that display environment-specific data
 * ✅ Use when you want single-instance-per-environment behavior
 * ✅ Use when environment switching should re-register the panel
 *
 * **When NOT to Use This Base Class:**
 * ❌ Panels that view ALL environments at once (e.g., PersistenceInspector inspects all storage)
 * ❌ Panels that allow multiple concurrent instances per environment (e.g., EnvironmentSetup allows editing multiple environments)
 * ❌ Panels that are completely environment-independent
 *
 * **Usage Example:**
 * ```typescript
 * export class MyPanel extends EnvironmentScopedPanel<MyPanel> {
 *   private static panels = new Map<string, MyPanel>();
 *   public static readonly viewType = 'myExtension.myPanel';
 *
 *   public static async createOrShow(
 *     extensionUri: vscode.Uri,
 *     ...useCases,
 *     initialEnvironmentId?: string
 *   ): Promise<MyPanel> {
 *     return EnvironmentScopedPanel.createOrShowPanel({
 *       viewType: MyPanel.viewType,
 *       titlePrefix: 'My Panel',
 *       extensionUri,
 *       getEnvironments: () => loadEnvironmentsUseCase.execute(),
 *       getEnvironmentById: (id) => loadEnvironmentByIdUseCase.execute(id),
 *       initialEnvironmentId,
 *       panelFactory: (panel, envId) => new MyPanel(panel, extensionUri, ...useCases, envId),
 *       webviewOptions: { enableScripts: true, retainContextWhenHidden: true },
 *       onDispose: (panel) => panel.cleanup() // Optional cleanup callback
 *     }, MyPanel.panels);
 *   }
 *
 *   private constructor(
 *     private readonly panel: vscode.WebviewPanel,
 *     private readonly extensionUri: vscode.Uri,
 *     ...useCases,
 *     private currentEnvironmentId: string
 *   ) {
 *     super();
 *     panel.onDidDispose(() => this.dispose()); // Optional if additional cleanup needed
 *   }
 *
 *   protected reveal(column: vscode.ViewColumn): void {
 *     this.panel.reveal(column);
 *   }
 *
 *   private handleEnvironmentChange(newEnvId: string): void {
 *     const oldEnvId = this.currentEnvironmentId;
 *     this.currentEnvironmentId = newEnvId;
 *     this.reregisterPanel(MyPanel.panels, oldEnvId, newEnvId);
 *     // Refresh panel with new environment data...
 *   }
 *
 *   private dispose(): void {
 *     // Optional: only if you have timers, intervals, or other resources to clean up
 *   }
 * }
 * ```
 */
export abstract class EnvironmentScopedPanel<TPanel extends EnvironmentScopedPanel<TPanel>> {
	/**
	 * Creates or shows a panel for the specified environment.
	 *
	 * Behavior depends on how environment is specified:
	 * - **Explicit environment (via Pick Environment)**: Always creates a new panel.
	 *   User made a deliberate choice, so they likely want a new panel even if one exists.
	 * - **No environment specified (click tool)**: Reveals existing panel for default
	 *   environment if one exists, otherwise creates new panel.
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
		const explicitEnvironmentRequested = config.initialEnvironmentId !== undefined;

		// Determine which environment to use
		const targetEnvironmentId = await this.resolveTargetEnvironment(
			config.initialEnvironmentId,
			config.getEnvironments
		);

		if (!targetEnvironmentId) {
			throw new Error('No environments available');
		}

		// Only reveal existing panel if user didn't explicitly request an environment
		// When user picks environment explicitly, they want a new panel
		const existingPanel = panelsMap.get(targetEnvironmentId);
		if (!explicitEnvironmentRequested && existingPanel) {
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

		// Only register in map if no existing panel for this environment
		// When user explicitly requests a duplicate, the new panel is "unmanaged"
		// but still functional - this allows multiple panels per environment
		const shouldRegister = !existingPanel;
		if (shouldRegister) {
			panelsMap.set(targetEnvironmentId, newPanel);
		}

		// Register disposal handler
		const onDisposeCallback = config.onDispose ? (): void => {
			if (config.onDispose) {
				config.onDispose(newPanel);
			}
		} : undefined;
		this.registerDisposal(panel, targetEnvironmentId, panelsMap, onDisposeCallback, shouldRegister);

		return newPanel;
	}

	/**
	 * Resolves the target environment ID.
	 * Uses initialEnvironmentId if provided, otherwise falls back to:
	 * 1. The default environment (marked by user)
	 * 2. First available environment (if no default set)
	 */
	private static async resolveTargetEnvironment(
		initialEnvironmentId: string | undefined,
		getEnvironments: () => Promise<EnvironmentOption[]>
	): Promise<string | undefined> {
		if (initialEnvironmentId) {
			return initialEnvironmentId;
		}

		const environments = await getEnvironments();
		const defaultEnv = environments.find(env => env.isDefault);
		return defaultEnv?.id ?? environments[0]?.id;
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
	 * Removes panel from map when disposed (if it was registered).
	 */
	private static registerDisposal<TPanel>(
		panel: vscode.WebviewPanel,
		environmentId: string,
		panelsMap: Map<string, TPanel>,
		onDispose?: () => void,
		wasRegistered: boolean = true
	): void {
		const envId = environmentId; // Capture for closure
		panel.onDidDispose(() => {
			// Only remove from map if this panel was registered
			if (wasRegistered) {
				panelsMap.delete(envId);
			}
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
