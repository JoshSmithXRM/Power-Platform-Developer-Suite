import * as vscode from 'vscode';

import { AuthenticationService } from '../../services/AuthenticationService';
import { StateService, PanelState } from '../../services/StateService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';
import { ServiceFactory } from '../../services/ServiceFactory';
import { Environment } from '../../components/base/ComponentInterface';
import { EnvironmentConnection } from '../../models/PowerPlatformSettings';
import { EnvironmentSelectorComponent } from '../../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';

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
    
    protected get componentLogger() {
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
        } catch (error: any) {
            this.componentLogger.error('Error loading environments', error instanceof Error ? error : new Error(String(error)));
            this.postMessage({
                action: 'error',
                message: `Failed to load environments: ${error.message}`
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
     * Standardized environment loading with optional auto-selection
     * Common pattern used by multiple panels
     */
    protected async loadEnvironmentsWithAutoSelect(
        environmentSelectorComponent: EnvironmentSelectorComponent,
        logger: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>,
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
            
            // Auto-select first environment if requested and available
            if (autoSelect && environments.length > 0) {
                environmentSelectorComponent.setSelectedEnvironment(environments[0].id);
                logger.info('Auto-selected first environment', { 
                    environmentId: environments[0].id,
                    name: environments[0].displayName 
                });
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
}
