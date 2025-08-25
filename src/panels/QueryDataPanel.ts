import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { WebviewMessage, PanelConfig } from '../types';
import { EnvironmentManager } from './base/EnvironmentManager';

export class QueryDataPanel extends BasePanel {
    public static readonly viewType = 'queryData';
    private environmentManager: EnvironmentManager;

    public static createOrShow(extensionUri: vscode.Uri, authService: AuthenticationService) {
        // Try to focus existing panel first
        const existing = BasePanel.focusExisting(QueryDataPanel.viewType);
        if (existing) {
            return;
        }

        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: QueryDataPanel.viewType,
            title: 'Query Data',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new QueryDataPanel(panel, extensionUri, authService);
    }

    public static createNew(extensionUri: vscode.Uri, authService: AuthenticationService) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: QueryDataPanel.viewType,
            title: 'Query Data',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new QueryDataPanel(panel, extensionUri, authService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authService: AuthenticationService) {
        super(panel, extensionUri, authService, {
            viewType: QueryDataPanel.viewType,
            title: 'Query Data'
        });
        
        this.environmentManager = new EnvironmentManager(authService, (message) => this.postMessage(message));
        
        // Initialize after construction
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.environmentManager.loadEnvironments();
                break;
        }
    }

    protected getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Query Data</title>
            <style>
                ${this.environmentManager.getBasePanelCss()}
                
                /* Query Data Specific Styles */
                h1 {
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 20px;
                }
                
                .content {
                    padding: 20px 0;
                }
            </style>
        </head>
        <body>
            ${this.environmentManager.getEnvironmentSelectorHtml()}
            
            <div class="header">
                <h1 class="title">Query Data</h1>
            </div>
            
            <div class="content">
                <p>Run custom queries against your Dataverse environment.</p>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                ${EnvironmentManager.getEnvironmentSelectorJs()}
                
                // Override the loadDataForEnvironment function for QueryData specific functionality
                function loadDataForEnvironment() {
                    // TODO: Implement query data loading logic for selected environment
                    console.log('Loading query data for environment:', currentEnvironmentId);
                }
                
                function clearContentForNoEnvironment() {
                    // TODO: Clear query results when no environment is selected
                    console.log('Clearing content - no environment selected');
                }
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command || message.action) {
                        case 'environmentsLoaded':
                            populateEnvironments(message.data, message.selectedEnvironmentId);
                            break;
                        case 'error':
                            console.error('Error:', message.message);
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
}
