import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { AuthenticationService } from '../services/AuthenticationService';
import { ComponentFactory } from '../components/ComponentFactory';
import { WebviewMessage, EnvironmentConnection } from '../types';
import { ServiceFactory } from '../services/ServiceFactory';
import { Solution, SolutionService } from '../services/SolutionService';
import { UrlBuilderService } from '../services/UrlBuilderService';

export class SolutionExplorerPanel extends BasePanel {
    public static readonly viewType = 'solutionExplorer';

    private _selectedEnvironmentId: string | undefined;
    private _solutionService: SolutionService;
    private _urlBuilderService: typeof UrlBuilderService;

    public static createOrShow(extensionUri: vscode.Uri) {
        // Try to focus existing panel first
        const existing = BasePanel.focusExisting(SolutionExplorerPanel.viewType);
        if (existing) {
            return;
        }

        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new SolutionExplorerPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = BasePanel.createWebviewPanel({
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        }, column);

        new SolutionExplorerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer'
        });

        this._solutionService = ServiceFactory.getSolutionService();
        this._urlBuilderService = ServiceFactory.getUrlBuilderService();

        // Initialize after construction
        this.initialize();
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.action) {
            case 'loadEnvironments':
                await this.handleLoadEnvironments();
                break;

            case 'loadSolutions':
                await this.handleLoadSolutions(message.environmentId, message.forceRefresh);
                break;

            case 'openSolutionInMaker':
                await this.handleOpenSolutionInMaker(message.environmentId, message.solutionId);
                break;

            case 'openSolutionInClassic':
                await this.handleOpenSolutionInClassic(message.environmentId, message.solutionId);
                break;

            case 'exportSolution':
                await this.handleExportSolution(message.environmentId, message.solutionId);
                break;

            case 'viewSolutionDetails':
                await this.handleViewSolutionDetails(message.environmentId, message.solutionId);
                break;

            case 'manageSolutionSecurity':
                await this.handleManageSolutionSecurity(message.environmentId, message.solutionId);
                break;

            case 'bulkExportSolutions':
                await this.handleBulkExportSolutions(message.environmentId, message.solutionIds);
                break;

            case 'bulkUpdateSolutions':
                await this.handleBulkUpdateSolutions(message.environmentId, message.solutionIds);
                break;

            default:
                console.log('Unknown action:', message.action);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            // Get previously selected environment from state
            const cachedState = await this._stateService.getPanelState(SolutionExplorerPanel.viewType);
            const selectedEnvironmentId = this._selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            this._panel.webview.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });
        } catch (error: any) {
            console.error('Error loading environments:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: `Failed to load environments: ${error.message}`
            });
        }
    }

    private async handleLoadSolutions(environmentId: string, forceRefresh: boolean = false): Promise<void> {
        if (!environmentId) return;

        try {
            this._selectedEnvironmentId = environmentId;

            // Use cached data if available and not forcing refresh
            if (!forceRefresh) {
                const cachedState = await this._stateService.getPanelState(SolutionExplorerPanel.viewType);
                if (cachedState?.selectedEnvironmentId === environmentId && cachedState.lastUpdated) {
                    const cacheAge = Date.now() - new Date(cachedState.lastUpdated).getTime();
                    const maxCacheAge = 5 * 60 * 1000; // 5 minutes

                    if (cacheAge < maxCacheAge) {
                        // Use cached data
                        this._panel.webview.postMessage({
                            action: 'solutionsLoaded',
                            data: cachedState.viewConfig?.solutions || []
                        });
                        return;
                    }
                }
            }

            // Load solutions using the service
            const solutions = await this._solutionService.getSolutions(environmentId);

            // Cache the results
            await this._stateService.savePanelState(SolutionExplorerPanel.viewType, {
                selectedEnvironmentId: environmentId,
                viewConfig: { solutions }
            });

            this._panel.webview.postMessage({
                action: 'solutionsLoaded',
                data: solutions
            });

        } catch (error: any) {
            console.error('Error loading solutions:', error);
            this._panel.webview.postMessage({
                action: 'error',
                message: `Failed to load solutions: ${error.message}`
            });
        }
    }

    private async handleOpenSolutionInMaker(environmentId: string, solutionId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                throw new Error('Environment not found');
            }

            const makerUrl = this._urlBuilderService.buildMakerSolutionUrl(environment, solutionId);
            await vscode.env.openExternal(vscode.Uri.parse(makerUrl));
        } catch (error: any) {
            console.error('Error opening solution in Maker:', error);
            vscode.window.showErrorMessage(`Failed to open solution in Maker: ${error.message}`);
        }
    }

    private async handleOpenSolutionInClassic(environmentId: string, solutionId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                throw new Error('Environment not found');
            }

            const classicUrl = this._urlBuilderService.buildClassicSolutionUrl(environment, solutionId);
            await vscode.env.openExternal(vscode.Uri.parse(classicUrl));
        } catch (error: any) {
            console.error('Error opening solution in Classic:', error);
            vscode.window.showErrorMessage(`Failed to open solution in Classic: ${error.message}`);
        }
    }

    private async handleExportSolution(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution export functionality coming soon!');
        } catch (error: any) {
            console.error('Error exporting solution:', error);
            vscode.window.showErrorMessage(`Failed to export solution: ${error.message}`);
        }
    }

    private async handleViewSolutionDetails(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution details view coming soon!');
        } catch (error: any) {
            console.error('Error viewing solution details:', error);
            vscode.window.showErrorMessage(`Failed to view solution details: ${error.message}`);
        }
    }

    private async handleManageSolutionSecurity(environmentId: string, solutionId: string): Promise<void> {
        try {
            vscode.window.showInformationMessage('Solution security management coming soon!');
        } catch (error: any) {
            console.error('Error managing solution security:', error);
            vscode.window.showErrorMessage(`Failed to manage solution security: ${error.message}`);
        }
    }

    private async handleBulkExportSolutions(environmentId: string, solutionIds: string[]): Promise<void> {
        try {
            vscode.window.showInformationMessage(`Bulk export of ${solutionIds.length} solutions coming soon!`);
        } catch (error: any) {
            console.error('Error bulk exporting solutions:', error);
            vscode.window.showErrorMessage(`Failed to bulk export solutions: ${error.message}`);
        }
    }

    private async handleBulkUpdateSolutions(environmentId: string, solutionIds: string[]): Promise<void> {
        try {
            vscode.window.showInformationMessage(`Bulk update of ${solutionIds.length} solutions coming soon!`);
        } catch (error: any) {
            console.error('Error bulk updating solutions:', error);
            vscode.window.showErrorMessage(`Failed to bulk update solutions: ${error.message}`);
        }
    }

    protected getHtmlContent(): string {
        // Get common webview resources
        const { tableUtilsScript, tableStylesSheet, panelStylesSheet, panelUtilsScript } = this.getCommonWebviewResources();

        const envSelectorUtilsScript = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'components', 'EnvironmentSelectorUtils.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Solution Explorer</title>
            <link rel="stylesheet" href="${panelStylesSheet}">
            <link rel="stylesheet" href="${tableStylesSheet}">
            <style>
                /* Solution-specific styles */
                .solution-name-link {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .solution-name-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector({
            id: 'environmentSelect',
            label: 'Environment:',
            placeholder: 'Loading environments...'
        })}

            <div class="header">
                <h1 class="title">Solution Explorer</h1>
                <button class="btn" onclick="refreshSolutions()">Refresh</button>
            </div>
            
            <div id="content">
                <div class="loading">
                    <p>Select an environment to load solutions...</p>
                </div>
            </div>

            <!-- Pre-generated table template (hidden initially) -->
            <div id="solutionsTableTemplate" style="display: none;">
                ${ComponentFactory.createDataTable({
            id: 'solutionsTable',
            columns: [
                { key: 'friendlyName', label: 'Solution Name', sortable: true },
                { key: 'uniqueName', label: 'Unique Name', sortable: true },
                { key: 'version', label: 'Version', sortable: true },
                { key: 'type', label: 'Type', sortable: true },
                { key: 'publisherName', label: 'Publisher', sortable: true },
                { key: 'installedDate', label: 'Installed', sortable: true }
            ],
            defaultSort: { column: 'friendlyName', direction: 'asc' },
            filterable: true,
            stickyFirstColumn: false,
            rowActions: [
                { id: 'openMaker', action: 'openInMaker', label: 'Maker', icon: '🎨' },
                { id: 'openClassic', action: 'openInClassic', label: 'Classic', icon: '📋' }
            ],
            contextMenu: [
                { id: 'openMaker', action: 'openInMaker', label: 'Open in Maker' },
                { id: 'openClassic', action: 'openInClassic', label: 'Open in Classic' }
            ]
        })}
            </div>

            <script src="${envSelectorUtilsScript}"></script>
            <script src="${panelUtilsScript}"></script>
            <script src="${tableUtilsScript}"></script>
            <script src="${this.getSolutionExplorerScript()}"></script>
        </body>
        </html>`;
    }

    private getSolutionExplorerScript(): vscode.Uri {
        return this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'scripts', 'SolutionExplorer.js')
        );
    }
}
