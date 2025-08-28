import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';
import { RelationshipResult } from '../services/ConnectionReferencesService';

export class ConnectionReferencesPanel extends BasePanel {
    public static readonly viewType = 'connectionReferences';

    private _selectedEnvironmentId: string | undefined;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(ConnectionReferencesPanel.viewType);
        if (existing) return;
        ConnectionReferencesPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: ConnectionReferencesPanel.viewType,
            title: 'Connection References Manager',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new ConnectionReferencesPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: ConnectionReferencesPanel.viewType,
            title: 'Connection References Manager'
        });

        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.action) {
                case 'loadEnvironments':
                    await this.handleLoadEnvironments();
                    break;
                case 'loadSolutions':
                    await this.handleLoadSolutions(message.environmentId);
                    break;
                case 'loadConnectionReferences':
                    await this.handleLoadConnectionReferences(message.environmentId, message.solutionId);
                    break;
                case 'syncDeploymentSettings':
                    await this.handleSyncDeploymentSettings(message.relationships, message.solutionUniqueName);
                    break;
                case 'openInMaker':
                    await this.handleOpenInMaker(message.environmentId, message.solutionId, message.entityType);
                    break;
                default:
                    console.warn('Unhandled message action:', message.action);
            }
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || String(err) });
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const cachedState = await this._stateService.getPanelState(ConnectionReferencesPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || (cachedState as any)?.selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({ action: 'environmentsLoaded', data: environments, selectedEnvironmentId });
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || 'Failed to load environments' });
        }
    }

    private async handleLoadSolutions(environmentId: string): Promise<void> {
        if (!environmentId) {
            this._panel.webview.postMessage({ action: 'error', message: 'Environment id required' });
            return;
        }

        try {
            const solutionService = ServiceFactory.getSolutionService();
            const solutions = await solutionService.getSolutions(environmentId);

            this._panel.webview.postMessage({ 
                action: 'solutionsLoaded', 
                data: solutions,
                selectedSolutionId: solutions.find(s => s.uniqueName === 'Default')?.solutionId
            });
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || 'Failed to load solutions' });
        }
    }

    private async handleLoadConnectionReferences(environmentId: string, solutionId?: string): Promise<void> {
        if (!environmentId) {
            this._panel.webview.postMessage({ action: 'error', message: 'Environment id required' });
            return;
        }

        this._selectedEnvironmentId = environmentId;
        const crService = ServiceFactory.getConnectionReferencesService();
        const rels: RelationshipResult = await crService.aggregateRelationships(environmentId, solutionId);
        console.debug('ConnectionReferencesPanel: loaded relationships', {
            flows: rels?.flows?.length || 0,
            connectionReferences: rels?.connectionReferences?.length || 0,
            solutionId: solutionId || 'all'
        });

        this._panel.webview.postMessage({ action: 'connectionReferencesLoaded', data: rels });
    }

    private async handleSyncDeploymentSettings(relationships: RelationshipResult, solutionUniqueName?: string): Promise<void> {
        try {
            const deploymentSettingsService = ServiceFactory.getDeploymentSettingsService();
            
            // Prompt user to select or create deployment settings file
            const filePath = await deploymentSettingsService.selectDeploymentSettingsFile(solutionUniqueName);
            if (!filePath) {
                return; // User cancelled
            }

            const isNewFile = !require('fs').existsSync(filePath);
            
            // Sync connection references with the file
            const result = await deploymentSettingsService.syncConnectionReferences(filePath, relationships, isNewFile);
            
            // Send success message back to UI
            this._panel.webview.postMessage({ 
                action: 'deploymentSettingsSynced', 
                data: {
                    filePath: result.filePath,
                    added: result.added,
                    removed: result.removed,
                    updated: result.updated,
                    isNewFile
                }
            });
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || 'Failed to sync deployment settings' });
        }
    }

    private async handleOpenInMaker(environmentId: string, solutionId: string, entityType: string): Promise<void> {
        if (!environmentId || !solutionId) {
            this._panel.webview.postMessage({ action: 'error', message: 'Environment and solution are required' });
            return;
        }

        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);
            
            if (!environment) {
                this._panel.webview.postMessage({ action: 'error', message: 'Environment not found' });
                return;
            }

            // Use the actual environment GUID from the environment connection
            const envGuid = environment.environmentId || environmentId;
            const makerUrl = `https://make.powerapps.com/environments/${envGuid}/solutions/${solutionId}/objects/${entityType}`;
            
            console.log('Opening Maker URL:', makerUrl);
            
            // Open in external browser
            vscode.env.openExternal(vscode.Uri.parse(makerUrl));
            
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || 'Failed to open in Maker' });
        }
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();
        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js'));
        const solutionSelectorUtilsScript = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'solution-selector-utils.js'));

        // Use the standard ComponentFactory environment selector and external client script to mirror other panels
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Connection References Manager</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
        </head>
        <body>
            ${/* Environment selector component for consistency with other panels */ ''}
            ${/* Use ComponentFactory via template substitution in the panel HTML (client-side ComponentFactory usage happens during build) */ ''}
            ${/* Instead of inlining, use a simple selector HTML to avoid templating collisions, matching ComponentFactory output shape */ ''}
            <div class="environment-selector">
                <span class="environment-label">Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>

            ${ComponentFactory.createSolutionSelector({
                id: 'solutionSelect',
                label: 'Solution:',
                placeholder: 'Loading solutions...'
            })}

            <div class="header">
                <h1 class="title">Connection References Manager</h1>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="syncDeploymentBtn" disabled>Sync Deployment Settings</button>
                    <button class="btn btn-primary" onclick="openInMaker()">Open in Maker</button>
                    <button class="btn" onclick="refreshData()">Refresh</button>
                </div>
            </div>

            <div id="content">
                <div class="loading"><p>Select an environment to manage connection references...</p></div>
            </div>

            <!-- Pre-generated table template (hidden initially) -->
            <div id="connectionReferencesTableTemplate" style="display: none;">
                ${ComponentFactory.createDataTable({
                    id: 'connectionReferencesTable',
                    columns: [
                        { key: 'flowName', label: 'Flow Name', sortable: true },
                        { key: 'connectionReference', label: 'Connection Reference', sortable: true },
                        { key: 'provider', label: 'Provider', sortable: true },
                        { key: 'connection', label: 'Connection', sortable: true },
                        { key: 'ismanaged', label: 'Managed', sortable: true },
                        { key: 'modifiedOn', label: 'Modified On', sortable: true },
                        { key: 'modifiedBy', label: 'Modified By', sortable: true }
                    ],
                    defaultSort: { column: 'flowName', direction: 'asc' },
                    filterable: true,
                    stickyFirstColumn: false,
                    showFooter: true
                })}
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${solutionSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script src="${this.getClientScript()}" ></script>
        </body>
        </html>`;
    }

    private getClientScript(): vscode.Uri {
        return this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'connection-references.js')
        );
    }
}
