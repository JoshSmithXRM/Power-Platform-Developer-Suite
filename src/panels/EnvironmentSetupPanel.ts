import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { WebviewMessage, EnvironmentConnection } from '../types';
import { AuthenticationMethod } from '../models/AuthenticationMethod';
import { ServiceFactory } from '../services/ServiceFactory';

export class EnvironmentSetupPanel extends BasePanel {
    public static currentPanel: EnvironmentSetupPanel | undefined;
    public static readonly viewType = 'environmentSetup';

    private readonly _editingEnvironment: EnvironmentConnection | undefined;

    public static createOrShow(extensionUri: vscode.Uri, editingEnvironment?: EnvironmentConnection) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (EnvironmentSetupPanel.currentPanel) {
            EnvironmentSetupPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentSetupPanel.viewType,
            editingEnvironment ? 'Edit Dynamics 365 Environment' : 'Add Dynamics 365 Environment',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src')
                ]
            }
        );

        EnvironmentSetupPanel.currentPanel = new EnvironmentSetupPanel(panel, extensionUri, editingEnvironment);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, editingEnvironment?: EnvironmentConnection) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentSetupPanel.viewType,
            title: editingEnvironment ? 'Edit Dynamics 365 Environment' : 'Add Dynamics 365 Environment'
        });

        this._editingEnvironment = editingEnvironment;

        // Initialize after construction
        this.initialize();

        // If editing, send the environment data to the webview after a short delay to ensure it's loaded
        if (this._editingEnvironment) {
            setTimeout(() => {
                this.postMessage({
                    action: 'populateForm',
                    environment: this._editingEnvironment
                });
            }, 100);
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'saveEnvironment':
                await this.handleSaveEnvironment(message.data);
                break;
            case 'testConnection':
                await this.handleTestConnection(message.data);
                break;
            case 'cancel':
                this.dispose();
                break;
        }
    }

    private async handleSaveEnvironment(data: any) {
        try {
            const environment: EnvironmentConnection = {
                id: this._editingEnvironment?.id || `env-${Date.now()}`, // Use existing ID or generate new one
                name: data.name,
                settings: {
                    tenantId: data.tenantId,
                    dataverseUrl: data.dataverseUrl,
                    authenticationMethod: data.authenticationMethod as AuthenticationMethod,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    username: data.username,
                    password: data.password,
                    publicClientId: data.publicClientId
                },
                isActive: this._editingEnvironment?.isActive || false,
                lastUsed: this._editingEnvironment?.lastUsed || new Date(),
                environmentId: data.environmentId || undefined
            };

            await this._authService.saveEnvironmentSettings(environment);

            // Refresh the environments tree view
            vscode.commands.executeCommand('dynamics-devtools.refreshEnvironments');

            // Send success response
            this.postMessage({
                action: 'saveEnvironmentResponse',
                success: true,
                data: { message: 'Environment saved successfully!' }
            });

            vscode.window.showInformationMessage(`Environment '${data.name}' added successfully!`);

            // Close the panel after successful save
            setTimeout(() => this.dispose(), 1500);

        } catch (error: any) {
            this.postMessage({
                action: 'saveEnvironmentResponse',
                success: false,
                error: error.message
            });
        }
    }

    private async handleTestConnection(data: any) {
        try {
            // Create a temporary environment for testing
            const tempEnvironment: EnvironmentConnection = {
                id: 'temp-test',
                name: 'Test',
                settings: {
                    tenantId: data.tenantId,
                    dataverseUrl: data.dataverseUrl,
                    authenticationMethod: data.authenticationMethod as AuthenticationMethod,
                    clientId: data.clientId,
                    clientSecret: data.clientSecret,
                    username: data.username,
                    password: data.password,
                    publicClientId: data.publicClientId
                },
                isActive: false
            };

            // Save temporarily to test
            await this._authService.saveEnvironmentSettings(tempEnvironment);

            // Try to get an access token (this will trigger authentication)
            const token = await this._authService.getAccessToken('temp-test');

            // Clean up temp environment
            await this._authService.removeEnvironment('temp-test');

            if (token) {
                this.postMessage({
                    action: 'testConnectionResponse',
                    success: true,
                    data: { message: 'Connection successful! Authentication completed.' }
                });
            }

        } catch (error: any) {
            // Clean up temp environment on error
            try {
                await this._authService.removeEnvironment('temp-test');
            } catch { }

            this.postMessage({
                action: 'testConnectionResponse',
                success: false,
                error: error.message
            });
        }
    }

    public dispose() {
        EnvironmentSetupPanel.currentPanel = undefined;
        super.dispose();
    }

    protected getHtmlContent(): string {
        const scriptUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-setup.js'));
        const validationUtilsUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'validation-utils.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Add Dynamics 365 Environment</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: var(--vscode-font-family);
                        background: var(--vscode-editor-background);
                    }
                </style>
            </head>
            <body>
                <environment-setup></environment-setup>
                <script src="${validationUtilsUri}"></script>
                <script type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
