import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

import { BasePanel } from './base/BasePanel';

// Placeholder - will be rewritten with component architecture
export class SolutionExplorerPanel extends BasePanel {
    public static readonly viewType = 'solutionExplorer';

    public static createOrShow(_extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('SolutionExplorerPanel - Coming soon with component architecture!');
    }

    public static createNew(_extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('SolutionExplorerPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer'
        });
    }

    protected async handleMessage(_message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}