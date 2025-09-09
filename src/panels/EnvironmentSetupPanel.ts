import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

// Placeholder - will be rewritten with component architecture
export class EnvironmentSetupPanel extends BasePanel {
    public static readonly viewType = 'environmentSetup';

    public static createOrShow(extensionUri: vscode.Uri, environment?: any) {
        // Placeholder implementation
        const message = environment ? 
            `EnvironmentSetupPanel (Edit ${environment.name}) - Coming soon with component architecture!` :
            'EnvironmentSetupPanel - Coming soon with component architecture!';
        vscode.window.showInformationMessage(message);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentSetupPanel.viewType,
            title: 'Environment Setup'
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        // Placeholder
    }

    protected getHtmlContent(): string {
        return '<html><body>Placeholder - will be rewritten</body></html>';
    }
}