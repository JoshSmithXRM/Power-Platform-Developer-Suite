import * as vscode from 'vscode';
import { AuthenticationService } from '../../services/AuthenticationService';
import { PanelConfig, IPanelBase, WebviewMessage } from '../../types';

/**
 * Base class for all webview panels providing common functionality
 */
export abstract class BasePanel implements IPanelBase {
    protected readonly _panel: vscode.WebviewPanel;
    protected readonly _extensionUri: vscode.Uri;
    protected readonly _authService: AuthenticationService;
    protected _disposables: vscode.Disposable[] = [];

    public readonly viewType: string;

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

        this._panel.title = config.title;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Set up message handling
        this._panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(message);
            },
            null,
            this._disposables
        );

        this.initialize();
    }

    /**
     * Initialize the panel - called after construction
     */
    protected initialize(): void {
        this.updateWebview();
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
     * Get the webview panel (for advanced operations)
     */
    public get panel(): vscode.WebviewPanel {
        return this._panel;
    }

    /**
     * Dispose of the panel and clean up resources
     */
    public dispose(): void {
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
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
