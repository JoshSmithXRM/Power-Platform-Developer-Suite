import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

// Placeholder - will be rewritten with component architecture
export class MetadataBrowserPanel extends BasePanel {
    public static readonly viewType = 'metadataBrowser';

    public static createOrShow(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('MetadataBrowserPanel - Coming soon with component architecture!');
    }

    public static createNew(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('MetadataBrowserPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: MetadataBrowserPanel.viewType,
            title: 'Metadata Browser'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}