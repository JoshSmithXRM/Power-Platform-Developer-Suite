import * as vscode from 'vscode';

import { AuthenticationService } from '../../services/AuthenticationService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';
import { ServiceFactory } from '../../services/ServiceFactory';
import { Environment } from '../../components/base/ComponentInterface';
import { EnvironmentConnection } from '../../models/PowerPlatformSettings';
import { EnvironmentSelectorComponent } from '../../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ComponentUpdateEvent, ComponentStateChangeEvent, ComponentWithEvents, ITargetedUpdateRenderer } from '../../types/ComponentEventTypes';
import { IPanelStateManager, PanelStateManager } from '../../services/state';

/**
 * Default instance state shape - just tracks selected environment
 */
export interface DefaultInstanceState {
    selectedEnvironmentId: string;
}

/**
 * Base class for all webview panels providing common functionality
 *
 * Generic Parameters:
 * - TInstance: Shape of volatile instance state (cleared when panel closes)
 * - TPreferences: Shape of persistent preferences per environment
 *
 * Example:
 * ```typescript
 * interface MyInstanceState { selectedEnvironmentId: string; }
 * interface MyPreferences { filters?: {...}; sortOrder?: string; }
 * class MyPanel extends BasePanel<MyInstanceState, MyPreferences> { }
 * ```
 */
export abstract class BasePanel<
    TInstance extends DefaultInstanceState = DefaultInstanceState,
    TPreferences = Record<string, never>
> implements IPanelBase {
    protected readonly _panel: vscode.WebviewPanel;
    protected readonly _extensionUri: vscode.Uri;
    protected readonly _authService: AuthenticationService;
    protected _disposables: vscode.Disposable[] = [];
    protected readonly _panelId: string;
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

    // New type-safe state manager
    protected readonly stateManager: IPanelStateManager<TInstance, TPreferences>;

    /**
     * Current environment ID being viewed by this panel instance.
     * This is the SINGLE cache for synchronous access across all panels.
     *
     * ARCHITECTURAL RULES:
     * - NEVER duplicate this field in child panels
     * - ONLY updated via processEnvironmentSelection() to stay in sync with state manager
     * - Child panels inherit this and use it directly
     *
     * This prevents the "duplicate state" bug where panels cache their own selectedEnvironmentId.
     */
    protected currentEnvironmentId?: string;

    // Common component reference - child panels can set this if they use EnvironmentSelector
    protected environmentSelectorComponent?: EnvironmentSelectorComponent;
    
    protected get componentLogger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            // Use the actual panel class name for component-specific logging
            const componentName = this.constructor.name;
            this._logger = ServiceFactory.getLoggerService().createComponentLogger(componentName);
        }
        return this._logger;
    }

    public readonly viewType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected static _activePanels: Map<string, BasePanel<any, any>[]> = new Map();

    constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        authService: AuthenticationService,
        config: PanelConfig
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this.viewType = config.viewType;
        this._panelId = this.generatePanelId();

        // Initialize new state manager
        this.stateManager = new PanelStateManager<TInstance, TPreferences>(
            this._panelId,
            config.viewType,
            ServiceFactory.getInstanceStateRepository(),
            ServiceFactory.getPreferencesRepository()
        );

        this._panel.title = config.title;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Register this panel in the active panels map
        this.registerPanel();

        // Set up message handling
        this._panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(message);
            },
            null,
            this._disposables
        );

        this.componentLogger.debug('Panel constructor completed', {
            viewType: config.viewType,
            title: config.title,
            panelId: this._panelId
        });
        // Don't auto-initialize - let child classes control when to initialize
    }

    /**
     * Initialize the panel - called after construction
     */
    protected async initialize(): Promise<void> {
        this.componentLogger.debug('Panel initialization starting', { viewType: this.viewType });

        // Initialize UI
        this.updateWebview();

        // Load environments if panel has an environment selector
        await this.loadEnvironments();

        this.componentLogger.info('Panel initialization completed', { viewType: this.viewType });
    }

    /**
     * Handle messages from the webview
     */
    protected abstract handleMessage(message: WebviewMessage): Promise<void>;

    /**
     * Get the HTML content for the webview
     */
    protected abstract getHtmlContent(): string;

    /**
     * Update the webview content
     */
    protected updateWebview(): void {
        this.componentLogger.trace('Updating webview content', { viewType: this.viewType });
        const html = this.getHtmlContent();
        this.componentLogger.trace('Generated HTML content', { 
            viewType: this.viewType, 
            htmlLength: html.length 
        });
        this._panel.webview.html = html;
        this.componentLogger.trace('Webview HTML content updated', { viewType: this.viewType });
    }

    /**
     * Send a message to the webview
     */
    protected postMessage(message: WebviewMessage): void {
        if (this._panel.webview) {
            try {
                this._panel.webview.postMessage(message);
            } catch (error) {
                // Webview is disposed, ignore the error
                this.componentLogger.warn('Attempted to post message to disposed webview', { 
                    viewType: this.viewType,
                    error: (error as Error).message 
                });
            }
        }
    }

    /**
     * Load environments and send to webview
     */
    protected async loadAndSendEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            this.postMessage({
                action: 'environmentsLoaded',
                data: environments
            });
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.componentLogger.error('Error loading environments', err);
            this.postMessage({
                action: 'error',
                message: `Failed to load environments: ${err.message}`
            });
        }
    }

    /**
     * Get common webview resources (CSS and JS files)
     */
    protected getCommonWebviewResources(): { 
        panelStylesSheet: vscode.Uri;
        panelUtilsScript: vscode.Uri;
    } {
        return {
            panelStylesSheet: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'panel-base.css')
            ),
            panelUtilsScript: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'panel-utils.js')
            )
        };
    }

    /**
     * Get the webview panel (for advanced operations)
     */
    public get panel(): vscode.WebviewPanel {
        return this._panel;
    }

    /**
     * Generate a unique panel ID for this instance
     */
    protected generatePanelId(): string {
        return `${this.viewType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Register this panel instance
     */
    protected registerPanel(): void {
        if (!BasePanel._activePanels.has(this.viewType)) {
            BasePanel._activePanels.set(this.viewType, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        BasePanel._activePanels.get(this.viewType)?.push(this as BasePanel<any, any>);
    }

    /**
     * Get panel ID for this instance
     */
    public get panelId(): string {
        return this._panelId;
    }

    /**
     * Dispose of the panel and clean up resources
     */
    public dispose(): void {
        // Save final state and clean up state manager
        this.stateManager.dispose().catch(err => {
            this.componentLogger.error('Error disposing state manager', err as Error);
        });

        // Remove from active panels map
        this.unregisterPanel();

        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    /**
     * Unregister this panel instance
     */
    protected unregisterPanel(): void {
        const panels = BasePanel._activePanels.get(this.viewType);
        if (panels) {
            const index = panels.indexOf(this);
            if (index !== -1) {
                panels.splice(index, 1);
            }
            if (panels.length === 0) {
                BasePanel._activePanels.delete(this.viewType);
            }
        }
    }

    /**
     * Focus an existing panel or return null if none exists
     * For multi-instance panels, focuses the first one found
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected static focusExisting(viewType: string): BasePanel<any, any> | null {
        const existingPanels = BasePanel._activePanels.get(viewType);
        if (existingPanels && existingPanels.length > 0) {
            const panel = existingPanels[0];
            panel._panel.reveal();
            return panel;
        }
        return null;
    }

    /**
     * Get all active panels of a specific type
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected static getActivePanels(viewType: string): BasePanel<any, any>[] {
        return BasePanel._activePanels.get(viewType) || [];
    }

    /**
     * Get count of active panels of a specific type
     */
    protected static getActivePanelCount(viewType: string): number {
        const panels = BasePanel._activePanels.get(viewType);
        return panels ? panels.length : 0;
    }

    /**
     * Static helper to create webview panel with common settings
     */
    protected static createWebviewPanel(
        config: PanelConfig,
        column?: vscode.ViewColumn
    ): vscode.WebviewPanel {
        return vscode.window.createWebviewPanel(
            config.viewType,
            config.title,
            column || vscode.ViewColumn.One,
            {
                enableScripts: config.enableScripts ?? true,
                retainContextWhenHidden: config.retainContextWhenHidden ?? true,
                enableFindWidget: config.enableFindWidget ?? true,
                localResourceRoots: config.localResourceRoots
            }
        );
    }

    /**
     * Helper to handle createOrShow and createNew patterns with singleton management
     * Eliminates code duplication across all panel classes
     *
     * @param config Panel configuration (viewType, title, localResourceRoots)
     * @param extensionUri Extension URI for resource loading
     * @param createPanelInstance Factory function to create panel instance
     * @param getCurrentPanel Callback to get current singleton instance
     * @param setCurrentPanel Callback to set current singleton instance
     * @param forceNew If true, always create new panel; if false, reveal existing or create new
     *
     * @example
     * // In MetadataBrowserPanel
     * public static createOrShow(extensionUri: vscode.Uri): void {
     *     BasePanel.handlePanelCreation(
     *         {
     *             viewType: MetadataBrowserPanel.viewType,
     *             title: 'Metadata Browser',
     *             localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
     *         },
     *         extensionUri,
     *         (panel, uri) => new MetadataBrowserPanel(panel, uri),
     *         () => MetadataBrowserPanel.currentPanel,
     *         (panel) => { MetadataBrowserPanel.currentPanel = panel; },
     *         false // createOrShow behavior
     *     );
     * }
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected static handlePanelCreation<T extends BasePanel<any, any>>(
        config: {
            viewType: string;
            title: string;
            localResourceRoots: vscode.Uri[];
        },
        extensionUri: vscode.Uri,
        createPanelInstance: (panel: vscode.WebviewPanel, uri: vscode.Uri) => T,
        getCurrentPanel: () => T | undefined,
        setCurrentPanel: (panel: T) => void,
        forceNew: boolean = false
    ): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // If not forcing new and a panel exists, reveal it
        if (!forceNew && getCurrentPanel()) {
            getCurrentPanel()!.panel.reveal(column);
            return;
        }

        // Create new panel
        const panel = BasePanel.createWebviewPanel({
            viewType: config.viewType,
            title: config.title,
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: config.localResourceRoots
        }, column);

        // Create new instance using factory function and store it
        setCurrentPanel(createPanelInstance(panel, extensionUri));
    }

    /**
     * Load environments if panel has an environment selector component
     * Called automatically from initialize() - can also be called manually for refresh
     */
    protected async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(
                this.environmentSelectorComponent,
                this.componentLogger,
                this.viewType
            );
        }
    }

    /**
     * Process environment selection change (new state manager approach)
     * Automatically saves/loads state and calls onEnvironmentChanged hook
     *
     * Use this in your panel's environment selector onChange callback:
     * ```typescript
     * this.environmentSelector = ComponentFactory.createEnvironmentSelector({
     *     onChange: (envId) => this.processEnvironmentSelection(envId)
     * });
     * ```
     */
    protected async processEnvironmentSelection(environmentId: string): Promise<void> {
        try {
            // Switch environment using state manager (auto-saves old prefs, loads new prefs)
            await this.stateManager.switchEnvironment(environmentId);

            // Update the current environment cache (SINGLE source of sync access)
            // This MUST happen after state manager update to stay in sync
            this.currentEnvironmentId = environmentId;

            // CRITICAL: Update the component's internal state to stay in sync
            // Without this, component's selectedEnvironmentId stays stale
            if (this.environmentSelectorComponent) {
                this.environmentSelectorComponent.setSelectedEnvironment(environmentId);
            }

            // Call child panel's hook to load data
            await this.onEnvironmentChanged(environmentId);
        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, {
                environmentId
            });
            vscode.window.showErrorMessage(`Failed to switch environment: ${(error as Error).message}`);
        }
    }

    /**
     * Hook for child panels to respond to environment SWITCHES (not refreshes)
     *
     * This method handles environment switching side effects, then loads data.
     * Override this in child classes if you need custom switching logic
     * (e.g., warnings before leaving, cleanup of previous environment state).
     *
     * ARCHITECTURAL RULE:
     * This method should:
     * 1. Handle switching logic (warnings, cleanup, state changes)
     * 2. Call loadEnvironmentData() to load data for the new environment
     *
     * Example:
     * ```typescript
     * protected async onEnvironmentChanged(environmentId: string): Promise<void> {
     *     // Switching logic
     *     if (this.needsCleanup()) {
     *         await this.cleanup();
     *     }
     *
     *     // Update state
     *     this.currentEnvironmentId = environmentId;
     *
     *     // Load data
     *     await this.loadEnvironmentData(environmentId);
     * }
     * ```
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        // Default implementation - just load data
        // Child panels can override to add switching logic before calling super
        this.componentLogger.debug('Environment changed', { environmentId });
        await this.loadEnvironmentData(environmentId);
    }

    /**
     * Standardized environment loading with optional auto-selection
     * Common pattern used by multiple panels
     */
    protected async loadEnvironmentsWithAutoSelect(
        environmentSelectorComponent: EnvironmentSelectorComponent,
        logger: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>,
        viewType?: string,
        autoSelect: boolean = true
    ): Promise<void> {
        logger.debug('Loading environments');
        try {
            const environmentConnections = await this._authService.getEnvironments();
            logger.info('Environments loaded', { count: environmentConnections.length });

            // Convert EnvironmentConnection[] to Environment[]
            const environments = this.convertEnvironmentConnections(environmentConnections);

            // Update the environment selector component with loaded environments
            environmentSelectorComponent.setEnvironments(environments);

            // Only perform selection logic if autoSelect is enabled
            // When autoSelect=false (e.g., during refresh), we only update the list, not the selection
            if (autoSelect) {
                // Restore previously selected environment from instance state
                let selectedEnvironmentId: string | undefined;

                const instanceState = await this.stateManager.getInstanceState();
                if (instanceState?.selectedEnvironmentId) {
                    selectedEnvironmentId = instanceState.selectedEnvironmentId;
                    logger.debug('Restored environment from instance state', {
                        environmentId: selectedEnvironmentId
                    });
                }

                // Verify the cached environment still exists
                if (selectedEnvironmentId) {
                    const environmentExists = environments.some(env => env.id === selectedEnvironmentId);
                    if (environmentExists) {
                        logger.info('Restored environment from cached state', {
                            environmentId: selectedEnvironmentId
                        });
                    } else {
                        logger.warn('Cached environment no longer exists', {
                            environmentId: selectedEnvironmentId
                        });
                        selectedEnvironmentId = undefined;
                    }
                }

                // Fall back to auto-selecting first environment if no cached state
                if (!selectedEnvironmentId && environments.length > 0) {
                    selectedEnvironmentId = environments[0].id;
                    logger.info('Auto-selected first environment', {
                        environmentId: selectedEnvironmentId,
                        name: environments[0].displayName
                    });
                }

                // Set the selected environment
                if (selectedEnvironmentId) {
                    logger.info('Calling setSelectedEnvironment', {
                        selectedEnvironmentId,
                        componentId: environmentSelectorComponent.getId()
                    });
                    environmentSelectorComponent.setSelectedEnvironment(selectedEnvironmentId);
                    logger.info('setSelectedEnvironment call completed');
                } else {
                    logger.info('No environment to select', {
                        selectedEnvironmentId,
                        environmentCount: environments.length
                    });
                }
            } else {
                logger.debug('Skipping selection logic (autoSelect=false)');
            }

            // Component will handle its own update through event bridges

        } catch (error) {
            logger.error('Failed to load environments', error as Error);
            vscode.window.showErrorMessage('Failed to load environments: ' + (error as Error).message);
        }
    }

    /**
     * Convert EnvironmentConnection[] to Environment[]
     * Common conversion used by multiple panels
     */
    protected convertEnvironmentConnections(connections: EnvironmentConnection[]): Environment[] {
        return connections.map(conn => ({
            id: conn.id,
            name: conn.name,
            displayName: conn.name,
            environmentId: conn.environmentId,
            settings: {
                ...conn.settings,
                dataverseUrl: conn.settings?.dataverseUrl || '',
                authenticationMethod: conn.settings?.authenticationMethod || 'interactive'
            }
        }));
    }

    /**
     * Standard error HTML template
     * Common error display used by all panels
     */
    protected getErrorHtml(title: string, message: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - Error</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-errorForeground);
                        background: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                    .error-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="error-icon">⚠️</div>
                <h2>${title} Error</h2>
                <p>${message}</p>
            </body>
            </html>
        `;
    }

    /**
     * Setup event bridges for component communication
     * Automatically forwards component events to webview
     * Common pattern used by all panels
     */
    protected setupComponentEventBridges(components: (ComponentWithEvents | undefined)[]): void {
        this.componentLogger.debug('Setting up component event bridges');

        const validComponents = components.filter((c): c is ComponentWithEvents => c !== undefined);

        validComponents.forEach(component => {
            // Set up update event bridge
            component.on('update', (event: ComponentUpdateEvent) => {
                this.componentLogger.trace('Component update event received', {
                    componentId: event.componentId
                });

                // Get component data for update
                const componentData = component.getData();
                const componentType = component.getType();

                const dataLength = Array.isArray(componentData) ? componentData.length :
                                  (componentData && typeof componentData === 'object' && 'solutions' in componentData && Array.isArray((componentData as { solutions: unknown[] }).solutions)) ? (componentData as { solutions: unknown[] }).solutions.length :
                                  (componentData && typeof componentData === 'object' && 'nodes' in componentData && Array.isArray((componentData as { nodes: unknown[] }).nodes)) ? (componentData as { nodes: unknown[] }).nodes.length :
                                  (componentData && typeof componentData === 'object') ? Object.keys(componentData).length : 0;

                this.componentLogger.info('Event bridge forwarding component update to webview', {
                    componentId: event.componentId,
                    componentType: componentType,
                    dataLength: dataLength
                });

                // For components with child components, use targeted updates to avoid destroying children
                // Components implement ITargetedUpdateRenderer to provide pre-rendered HTML
                let messageData = componentData;
                if ('renderTargetedUpdate' in component && componentData && typeof componentData === 'object') {
                    const renderer = component as unknown as ITargetedUpdateRenderer;
                    const targetedHtml = renderer.renderTargetedUpdate(componentData as object);
                    messageData = {
                        ...(componentData as Record<string, unknown>),
                        targetedHtml: targetedHtml
                    };
                }

                this.postMessage({
                    action: 'componentUpdate',
                    componentId: event.componentId,
                    componentType: componentType,
                    data: messageData
                });

                this.componentLogger.trace('Event bridge message posted to webview');
            });

            // Set up state change event bridge
            component.on('stateChange', (event: ComponentStateChangeEvent) => {
                this.componentLogger.trace('Component state change event received', {
                    componentId: event.componentId
                });
                this.postMessage({
                    action: 'componentStateChange',
                    componentId: event.componentId,
                    state: event.state
                });
            });
        });

        this.componentLogger.info('Component event bridges set up', {
            bridgeCount: validComponents.length
        });
    }

    /**
     * Get standardized refresh button action configuration
     * All panels should use this for consistent refresh button styling
     * Matches Solution Explorer pattern: icon='refresh', variant='secondary'
     */
    protected getStandardRefreshAction(): {
        id: string;
        label: string;
        icon: string;
        variant: 'secondary';
        disabled: boolean;
    } {
        return {
            id: 'refresh',
            label: 'Refresh',
            icon: 'refresh',
            variant: 'secondary' as const,
            disabled: false
        };
    }

    /**
     * Handle standard action bar actions (refresh, etc.)
     * Returns true if action was handled, false otherwise
     * Call this from child class handleMessage() when receiving 'action-clicked'
     *
     * @example
     * case 'action-clicked':
     *     const handled = await this.handleStandardActions(message.data?.buttonId);
     *     if (!handled) {
     *         // Handle panel-specific actions
     *     }
     *     break;
     */
    protected async handleStandardActions(buttonId: string): Promise<boolean> {
        switch (buttonId) {
            case 'refresh':
                await this.handleRefresh();
                return true;
            default:
                return false;
        }
    }

    /**
     * Handle refresh action
     * Standard implementation:
     * 1. Refreshes environment list (picks up newly added environments)
     * 2. Reloads current environment's data by calling loadEnvironmentData()
     *
     * This ensures data/metadata is refreshed WITHOUT triggering environment
     * switching side effects (warnings, cleanup, state changes).
     *
     * Child panels can override if they need custom refresh logic, but should
     * generally rely on this standard implementation.
     */
    protected async handleRefresh(): Promise<void> {
        if (!this.currentEnvironmentId) {
            this.componentLogger.warn('Cannot refresh - no environment selected');
            vscode.window.showWarningMessage('Please select an environment first');
            return;
        }

        this.componentLogger.info('Refreshing current environment', {
            environmentId: this.currentEnvironmentId
        });

        // Refresh environment list without auto-selecting (picks up newly added environments)
        // autoSelect=false prevents changing the current selection
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(
                this.environmentSelectorComponent,
                this.componentLogger,
                this.viewType,
                false // Don't auto-select - keep current environment
            );
        }

        // Reload current environment's data WITHOUT switching side effects
        // This calls loadEnvironmentData() directly, not onEnvironmentChanged()
        await this.loadEnvironmentData(this.currentEnvironmentId);
    }

    /**
     * Load data for an environment (PURE data loading, no switching logic)
     *
     * ARCHITECTURAL RULE:
     * This method should ONLY load data. It should NOT:
     * - Show warning dialogs about leaving environments
     * - Stop timers/intervals
     * - Close panels/UI elements
     * - Update currentEnvironmentId (already set by caller)
     *
     * This separation ensures:
     * - Refresh can reload data without switching side effects
     * - Environment switches can combine switching logic + data loading
     * - Single Responsibility Principle is maintained
     *
     * Child panels MUST implement this to load their environment-specific data.
     */
    protected abstract loadEnvironmentData(environmentId: string): Promise<void>;
}
