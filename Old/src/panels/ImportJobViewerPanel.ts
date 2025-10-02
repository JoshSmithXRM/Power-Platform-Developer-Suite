import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { ComponentFactory, TableConfig } from '../components/ComponentFactory';
import { WebviewMessage } from '../types';

export class ImportJobViewerPanel extends BasePanel {
    public static readonly viewType = 'importJobViewer';

    private _selectedEnvironmentId: string | undefined;
    private _cachedImportJobs: any[] | null = null;

    public static createOrShow(extensionUri: vscode.Uri) {
        const existing = BasePanel.focusExisting(ImportJobViewerPanel.viewType);
        if (existing) return;
        ImportJobViewerPanel.createNew(extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const panel = BasePanel.createWebviewPanel({
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });

        new ImportJobViewerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer'
        });

        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadImportJobs':
                await this.handleLoadImportJobs(message.environmentId);
                break;

            case 'openSolutionHistory':
                await this.handleOpenSolutionHistory(message.environmentId);
                break;

            case 'viewImportJobXml':
                await this.handleviewImportJobXml(message.importJobId);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async loadImportJobs() {
        console.log('loadImportJobs called, selectedEnvironmentId:', this._selectedEnvironmentId);

        try {
            const environments = await this._authService.getEnvironments();
            console.log('Environments loaded:', environments.length);

            if (environments.length === 0) {
                this.postMessage({
                    action: 'error',
                    message: 'No environments configured. Please add an environment first.'
                });
                return;
            }

            let environment = environments[0];
            if (this._selectedEnvironmentId) {
                const foundEnv = environments.find(env => env.id === this._selectedEnvironmentId);
                if (foundEnv) {
                    environment = foundEnv;
                    console.log('Using selected environment:', environment.name);
                } else {
                    console.error('Selected environment not found:', this._selectedEnvironmentId);
                    this.postMessage({
                        action: 'error',
                        message: 'Selected environment not found.'
                    });
                    return;
                }
            } else {
                console.log('Using first environment:', environment.name);
            }

            const token = await this._authService.getAccessToken(environment.id);
            const importJobsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/importjobs?$select=importjobid,solutionname,progress,startedon,completedon,modifiedon,importcontext,operationcontext`;

            console.log('Fetching import jobs from:', importJobsUrl);

            const response = await fetch(importJobsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;
            const importJobs = data.value;

            this._cachedImportJobs = importJobs;
            this.postMessage({
                action: 'importJobsLoaded',
                data: importJobs
            });

        } catch (error: any) {
            console.error('Error loading import jobs:', error);
            this.postMessage({
                action: 'error',
                message: error.message
            });
        }
    }

    private async openImportJobXmlInEditor(importJobId: string) {
        console.log('openImportJobXmlInEditor called with importJobId:', importJobId);

        try {
            const environments = await this._authService.getEnvironments();
            const currentEnv = environments.find(env => env.id === this._selectedEnvironmentId);

            if (!currentEnv) {
                console.error('Could not find current environment, selectedEnvironmentId:', this._selectedEnvironmentId);
                vscode.window.showErrorMessage('Could not find current environment.');
                return;
            }

            console.log('Using environment:', currentEnv.name);

            const token = await this._authService.getAccessToken(currentEnv.id);
            const importJobUrl = `${currentEnv.settings.dataverseUrl}/api/data/v9.2/importjobs(${importJobId})?$select=data`;

            console.log('Fetching XML from:', importJobUrl);

            const response = await fetch(importJobUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;
            const xmlData = data.data || 'No XML data available';

            const document = await vscode.workspace.openTextDocument({
                content: this.formatXml(xmlData),
                language: 'xml'
            });

            await vscode.window.showTextDocument(document);

        } catch (error: any) {
            console.error('Error opening import job XML in editor:', error);
            vscode.window.showErrorMessage(`Failed to open XML in editor: ${error.message}`);
        }
    }

    private formatXml(xml: string): string {
        try {
            let formatted = xml;
            let indent = 0;
            const tab = '  ';

            formatted = formatted.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
            const lines = formatted.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.length === 0) continue;

                if (line.match(/.+<\/\w[^>]*>$/)) {
                    lines[i] = tab.repeat(indent) + line;
                } else if (line.match(/^<\/\w/)) {
                    if (indent > 0) indent--;
                    lines[i] = tab.repeat(indent) + line;
                } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
                    lines[i] = tab.repeat(indent) + line;
                    indent++;
                } else {
                    lines[i] = tab.repeat(indent) + line;
                }
            }

            return lines.join('\n');
        } catch (error) {
            return xml;
        }
    }

    private async openSolutionHistory(environmentId: string) {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment || !environment.environmentId) {
                vscode.window.showErrorMessage(
                    'Environment ID is not configured for this environment. Please edit the environment and add the Environment ID to view Solution History.'
                );
                return;
            }

            const historyUrl = `https://make.powerapps.com/environments/${environment.environmentId}/solutionsHistory`;
            vscode.env.openExternal(vscode.Uri.parse(historyUrl));
            vscode.window.showInformationMessage(`Opening Solution History in Maker...`);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open Solution History: ${error.message}`);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            // Get previously selected environment from state
            const cachedState = await this._stateService.getPanelState(ImportJobViewerPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load environments';
            this._panel.webview.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleLoadImportJobs(environmentId: string): Promise<void> {
        console.log('handleLoadImportJobs called with environmentId:', environmentId);

        if (!environmentId) {
            this._panel.webview.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        // Update the selected environment
        this._selectedEnvironmentId = environmentId;
        console.log('Selected environment ID set to:', this._selectedEnvironmentId);

        // Load import jobs using existing method
        await this.loadImportJobs();
    }

    private async handleOpenSolutionHistory(environmentId: string): Promise<void> {
        await this.openSolutionHistory(environmentId);
    }

    private async handleviewImportJobXml(importJobId: string): Promise<void> {
        console.log('handleviewImportJobXml called with importJobId:', importJobId);
        await this.openImportJobXmlInEditor(importJobId);
    }

    protected getHtmlContent(): string {
        // Get common webview resources
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'environment-selector-utils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Import Job Viewer</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>
                .solution-history-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-right: 8px;
                }
                .solution-history-btn:hover:not(:disabled) {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                .solution-history-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Status badge styles */
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-badge::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                }
                .status-completed {
                    background: rgba(0, 128, 0, 0.1);
                    color: #00b300;
                }
                .status-completed::before {
                    background: #00b300;
                }
                .status-failed {
                    background: rgba(255, 0, 0, 0.1);
                    color: #e74c3c;
                }
                .status-failed::before {
                    background: #e74c3c;
                }
                .status-in-progress {
                    background: rgba(255, 165, 0, 0.1);
                    color: #ff8c00;
                }
                .status-in-progress::before {
                    background: #ff8c00;
                }
                .status-unknown {
                    background: rgba(128, 128, 128, 0.1);
                    color: #808080;
                }
                .status-unknown::before {
                    background: #808080;
                }
            </style>
        </head>
        <body>
            <!-- Environment Selector -->
            <div class="environment-selector">
                <span class="environment-label">Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>
            
            <div class="header">
                <h1 class="title">Import Job Viewer</h1>
                <div class="header-actions">
                    <button class="solution-history-btn" onclick="openSolutionHistory()" id="solutionHistoryBtn" disabled>
                        Open in Maker
                    </button>
                    <button class="btn" onclick="refreshImportJobs()">
                        Refresh
                    </button>
                </div>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load import jobs...</p>
                </div>
            </div>

            <!-- Hidden template for import jobs table -->
            <script type="text/template" id="importJobsTableTemplate">
                ${ComponentFactory.createDataTable({
            id: 'importJobsTable',
            columns: this.getTableConfig().columns,
            defaultSort: { column: 'startedon', direction: 'desc' },
            stickyHeader: true,
            stickyFirstColumn: false,
            filterable: true,
            showFooter: true,
            rowActions: [
                { id: 'viewImportJobXml', action: 'viewImportJobXml', label: 'XML', icon: '📄' }
            ],
            contextMenu: [
                { id: 'viewImportJobXml', action: 'viewImportJobXml', label: 'View Import Job XML' }
            ]
        })}
            </script>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                let currentEnvironmentId = '';
            </script>
            <script src="${this.getImportJobViewerScript()}"></script>
        </body>
        </html>`;
    }

    private getTableConfig(): TableConfig {
        return {
            id: 'importJobsTable',
            columns: [
                { key: 'solutionname', label: 'Solution Name', sortable: true, width: '200px' },
                { key: 'progress', label: 'Progress', sortable: true, width: '100px' },
                { key: 'startedon', label: 'Started', sortable: true, width: '150px' },
                { key: 'completedon', label: 'Completed', sortable: true, width: '150px' },
                { key: 'status', label: 'Status', sortable: true, width: '120px' },
                { key: 'importcontext', label: 'Import Context', sortable: true, width: '150px' },
                { key: 'operationcontext', label: 'Operation Context', sortable: true, width: '150px' }
            ],
            stickyHeader: true,
            stickyFirstColumn: true
        };
    }

    private getImportJobViewerScript(): vscode.Uri {
        return this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'import-job-viewer.js')
        );
    }
}
