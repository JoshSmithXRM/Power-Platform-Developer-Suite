import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

interface DataExplorerInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DataExplorerPreferences {
    // No preferences defined yet for this panel
}

// Placeholder - will be rewritten with component architecture
export class DataExplorerPanel extends BasePanel<DataExplorerInstanceState, DataExplorerPreferences> {
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
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
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

    /**
     * Apply preferences to restore panel state (Template Method Pattern)
     * Called automatically by BasePanel after environment load/switch
     */
    protected async applyPreferences(prefs: DataExplorerPreferences | null): Promise<void> {
        // No preferences to restore for this placeholder panel
        this.componentLogger.debug('applyPreferences called (placeholder panel)', { hasPrefs: !!prefs });
    }

    /**
     * Load data for an environment (stub implementation for placeholder panel)
     */
    protected async loadEnvironmentData(_environmentId: string): Promise<void> {
        // Placeholder - no environment data loading yet
        this.componentLogger.debug('loadEnvironmentData called on placeholder panel');
    }
}