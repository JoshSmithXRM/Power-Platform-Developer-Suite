import * as vscode from 'vscode';

import { AuthenticationService } from '../../services/AuthenticationService';
import { StateService, PanelState } from '../../services/StateService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';
import { ServiceFactory } from '../../services/ServiceFactory';
import { Environment } from '../../components/base/ComponentInterface';
import { EnvironmentConnection } from '../../models/PowerPlatformSettings';
import { EnvironmentSelectorComponent } from '../../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ComponentUpdateEvent, ComponentStateChangeEvent, ComponentWithEvents } from '../../types/ComponentEventTypes';

/**
 * Base class for all webview panels providing common functionality
 */
export abstract class BasePanel implements IPanelBase {
    protected readonly _panel: vscode.WebviewPanel;
    protected readonly _extensionUri: vscode.Uri;
    protected readonly _authService: AuthenticationService;
    protected readonly _stateService: StateService;
    protected _disposables: vscode.Disposable[] = [];
    protected currentState: PanelState = {};
    protected readonly _panelId: string;
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

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
    protected static _activePanels: Map<string, BasePanel[]> = new Map();

    constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        authService: AuthenticationService,
        stateService: StateService,
        config: PanelConfig
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._authService = authService;
        this._stateService = stateService;
        this.viewType = config.viewType;
        this._panelId = this.generatePanelId();

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
        // Restore state first
        await this.restoreState();

        // Then initialize UI
        this.updateWebview();

        // Load environments if panel has an environment selector
        await this.loadEnvironments();

        this.componentLogger.info('Panel initialization completed', { viewType: this.viewType });
    }

    /**
     * Restore panel state from storage
     */
    protected async restoreState(): Promise<void> {
        try {
            const savedState = await this._stateService.getPanelState(this.viewType);
            if (savedState) {
                this.currentState = savedState;
                await this.applyRestoredState(savedState);
            }
        } catch (error) {
            this.componentLogger.error('Error restoring panel state', error as Error, { viewType: this.viewType });
        }
    }

    /**
     * Apply restored state - override in child classes
     */
    protected async applyRestoredState(state: PanelState): Promise<void> {
        // Base implementation - child classes should override
        if (state.selectedEnvironmentId) {
            // Set environment if available
        }
    }

    /**
     * Save current panel state
     */
    protected async saveState(): Promise<void> {
        try {
            await this._stateService.savePanelState(this.viewType, this.currentState);
        } catch (error) {
            this.componentLogger.error('Error saving panel state', error as Error, { viewType: this.viewType });
        }
    }

    /**
     * Update state and save
     */
    protected async updateState(partialState: Partial<PanelState>): Promise<void> {
        this.currentState = { ...this.currentState, ...partialState };
        await this.saveState();
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
        BasePanel._activePanels.get(this.viewType)?.push(this);
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
    protected static focusExisting(viewType: string): BasePanel | null {
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
    protected static getActivePanels(viewType: string): BasePanel[] {
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
    protected static handlePanelCreation<T extends BasePanel>(
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

            // Try to restore previously selected environment from cached state
            let selectedEnvironmentId: string | undefined;

            if (viewType) {
                const cachedState = await this._stateService.getPanelState(viewType);
                selectedEnvironmentId = cachedState?.selectedEnvironmentId;

                if (selectedEnvironmentId) {
                    // Verify the cached environment still exists
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
            }

            // Fall back to auto-selecting first environment if no cached state
            if (!selectedEnvironmentId && autoSelect && environments.length > 0) {
                selectedEnvironmentId = environments[0].id;
                logger.info('Auto-selected first environment', {
                    environmentId: selectedEnvironmentId,
                    name: environments[0].displayName
                });
            }

            // Set the selected environment
            if (selectedEnvironmentId) {
                environmentSelectorComponent.setSelectedEnvironment(selectedEnvironmentId);
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
                                  (componentData && typeof componentData === 'object') ? Object.keys(componentData).length : 0;

                this.componentLogger.debug('Event bridge forwarding component update to webview', {
                    componentId: event.componentId,
                    componentType: componentType,
                    dataLength: dataLength
                });

                // For components that need HTML regeneration (like SolutionSelector)
                let messageData = componentData;
                if (componentType === 'SolutionSelector' && componentData && typeof componentData === 'object' && 'solutions' in componentData) {
                    const componentHtml = component.generateHTML();
                    messageData = {
                        ...componentData,
                        html: componentHtml,
                        requiresHtmlUpdate: true
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
}
