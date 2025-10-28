import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

import { BasePanel } from './base/BasePanel';

// Placeholder - will be rewritten with component architecture
export class DataExplorerPanel extends BasePanel {
    public static readonly viewType = 'dataExplorer';
    private static currentPanel: DataExplorerPanel | undefined;

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: DataExplorerPanel.viewType,
                title: 'Data Explorer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new DataExplorerPanel(panel, uri),
            () => DataExplorerPanel.currentPanel,
            (panel) => { DataExplorerPanel.currentPanel = panel; },
            false
        );
        // Show placeholder message after panel is created
        vscode.window.showInformationMessage('Data Explorer - Coming soon with component architecture!');
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: DataExplorerPanel.viewType,
                title: 'Data Explorer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new DataExplorerPanel(panel, uri),
            () => DataExplorerPanel.currentPanel,
            (panel) => { DataExplorerPanel.currentPanel = panel; },
            true
        );
        // Show placeholder message after panel is created
        vscode.window.showInformationMessage('Data Explorer (New) - Coming soon with component architecture!');
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: DataExplorerPanel.viewType,
            title: 'Data Explorer'
        });

        this.panel.onDidDispose(() => {
            DataExplorerPanel.currentPanel = undefined;
        });
    }

    protected async handleMessage(_message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}