import * as vscode from 'vscode';
import { AuthenticationService } from '../../services/AuthenticationService';
import { StateService, PanelState } from '../../services/StateService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';
import { ServiceFactory } from '../../services/ServiceFactory';

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
    
    protected get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('BasePanel');
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

        this.logger.debug('Panel constructor completed', { 
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
        this.logger.debug('Panel initialization starting', { viewType: this.viewType });
        // Restore state first
        await this.restoreState();
        
        // Then initialize UI
        this.updateWebview();
        this.logger.info('Panel initialization completed', { viewType: this.viewType });
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
            this.logger.error('Error restoring panel state', error as Error, { viewType: this.viewType });
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
            this.logger.error('Error saving panel state', error as Error, { viewType: this.viewType });
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
        this.logger.trace('Updating webview content', { viewType: this.viewType });
        const html = this.getHtmlContent();
        this.logger.trace('Generated HTML content', { 
            viewType: this.viewType, 
            htmlLength: html.length 
        });
        this._panel.webview.html = html;
        this.logger.trace('Webview HTML content updated', { viewType: this.viewType });
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
                this.logger.warn('Attempted to post message to disposed webview', { 
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
            console.error('Error loading environments:', error);
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
        tableUtilsScript: vscode.Uri; 
        tableStylesSheet: vscode.Uri; 
        panelStylesSheet: vscode.Uri;
        panelUtilsScript: vscode.Uri;
    } {
        return {
            tableUtilsScript: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'table-utils.js')
            ),
            tableStylesSheet: this._panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'table.css')
            ),
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
}
