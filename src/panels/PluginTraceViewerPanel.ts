import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

// Placeholder - will be rewritten with component architecture
export class PluginTraceViewerPanel extends BasePanel {
    public static readonly viewType = 'pluginTraceViewer';

    public static createOrShow(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('PluginTraceViewerPanel - Coming soon with component architecture!');
    }

    public static createNew(extensionUri: vscode.Uri) {
        // Placeholder implementation
        vscode.window.showInformationMessage('PluginTraceViewerPanel (New) - Coming soon with component architecture!');
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: PluginTraceViewerPanel.viewType,
            title: 'Plugin Trace Viewer'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}