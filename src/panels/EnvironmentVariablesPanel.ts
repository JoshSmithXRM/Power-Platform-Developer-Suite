import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

// Placeholder - will be rewritten with component architecture
export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';

    public static createOrShow(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('EnvironmentVariablesPanel - Coming soon with component architecture!');
    }

    public static createNew(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('EnvironmentVariablesPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}