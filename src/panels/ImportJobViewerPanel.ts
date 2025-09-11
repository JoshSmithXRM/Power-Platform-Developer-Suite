import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

import { BasePanel } from './base/BasePanel';

// Placeholder - will be rewritten with component architecture
export class ImportJobViewerPanel extends BasePanel {
    public static readonly viewType = 'importJobViewer';

    public static createOrShow(extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('ImportJobViewerPanel - Coming soon with component architecture!');
    }

    public static createNew(extensionUri: vscode.Uri): void {
        // Placeholder implementation
        vscode.window.showInformationMessage('ImportJobViewerPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}