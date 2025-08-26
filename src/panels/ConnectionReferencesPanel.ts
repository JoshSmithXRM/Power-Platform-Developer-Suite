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
                case 'loadConnectionReferences':
                    await this.handleLoadConnectionReferences(message.environmentId);
                    break;
                case 'exportDeploymentSkeleton':
                    await this.handleExportDeploymentSkeleton(message.relationships);
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

    private async handleLoadConnectionReferences(environmentId: string): Promise<void> {
        if (!environmentId) {
            this._panel.webview.postMessage({ action: 'error', message: 'Environment id required' });
            return;
        }

        this._selectedEnvironmentId = environmentId;
        const crService = ServiceFactory.getConnectionReferencesService();
        const rels: RelationshipResult = await crService.aggregateRelationships(environmentId);
        console.debug('ConnectionReferencesPanel: loaded relationships', {
            flows: rels?.flows?.length || 0,
            connectionReferences: rels?.connectionReferences?.length || 0
        });

        this._panel.webview.postMessage({ action: 'connectionReferencesLoaded', data: rels });
    }

    private async handleExportDeploymentSkeleton(relationships: RelationshipResult): Promise<void> {
        try {
            const ds = ServiceFactory.getDeploymentSettingsService();
            const skeleton = ds.createSkeletonFromRelationships(relationships);
            this._panel.webview.postMessage({ action: 'exportedSkeleton', data: skeleton });
        } catch (err: any) {
            this._panel.webview.postMessage({ action: 'error', message: err?.message || 'Failed to generate skeleton' });
        }
    }

    protected getHtmlContent(): string {
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();
        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js'));

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

            <div class="header">
                <h1 class="title">Connection References Manager</h1>
                <div class="header-actions">
                    <button class="btn" id="exportBtn">Export Skeleton</button>
                    <button class="btn btn-secondary" id="visualizeBtn" disabled>Visualize (coming soon)</button>
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
                        { key: 'crLogicalName', label: 'Connection Reference Logical Name', sortable: true },
                        { key: 'connectionName', label: 'Connection', sortable: true },
                        { key: 'provider', label: 'Provider', sortable: true },
                        { key: 'ismanaged', label: 'Managed', sortable: true },
                        { key: 'modifiedon', label: 'Modified On', sortable: true },
                        { key: 'modifiedby', label: 'Modified By', sortable: true }
                    ],
                    defaultSort: { column: 'flowName', direction: 'asc' },
                    filterable: true,
                    stickyFirstColumn: false,
                    showFooter: true
                })}
            </div>

            <script src="${envSelectorUtilsScript}"></script>
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
