import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

import { BasePanel } from './base/BasePanel';

// Placeholder - will be rewritten with component architecture
export class DataExplorerPanel extends BasePanel {
    public static readonly viewType = 'dataExplorer';

    public static createOrShow(_extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('DataExplorerPanel - Coming soon with component architecture!');
    }

    public static createNew(_extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('DataExplorerPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: DataExplorerPanel.viewType,
            title: 'Data Explorer'
        });
    }

    protected async handleMessage(_message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}