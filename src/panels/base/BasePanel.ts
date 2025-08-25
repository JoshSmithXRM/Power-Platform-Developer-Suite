import * as vscode from 'vscode';
import { AuthenticationService } from '../../services/AuthenticationService';
import { StateService, PanelState } from '../../services/StateService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';

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

    public readonly viewType: string;
    protected static _activePanels: Map<string, BasePanel> = new Map();

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

        this._panel.title = config.title;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Register this panel in the active panels map
        BasePanel._activePanels.set(this.viewType, this);

        // Set up message handling
        this._panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(message);
            },
            null,
            this._disposables
        );

        // Don't auto-initialize - let child classes control when to initialize
    }

    /**
     * Initialize the panel - called after construction
     */
    protected async initialize(): Promise<void> {
        // Restore state first
        await this.restoreState();
        
        // Then initialize UI
        this.updateWebview();
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
            console.error(`Error restoring state for ${this.viewType}:`, error);
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
            console.error(`Error saving state for ${this.viewType}:`, error);
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
        this._panel.webview.html = this.getHtmlContent();
    }

    /**
     * Send a message to the webview
     */
    protected postMessage(message: WebviewMessage): void {
        this._panel.webview.postMessage(message);
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
     * Dispose of the panel and clean up resources
     */
    public dispose(): void {
        // Remove from active panels map
        BasePanel._activePanels.delete(this.viewType);
        
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    /**
     * Focus an existing panel or return null if none exists
     */
    protected static focusExisting(viewType: string): BasePanel | null {
        const existingPanel = BasePanel._activePanels.get(viewType);
        if (existingPanel) {
            existingPanel._panel.reveal();
            return existingPanel;
        }
        return null;
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
                enableFindWidget: config.enableFindWidget ?? true
            }
        );
    }
}
