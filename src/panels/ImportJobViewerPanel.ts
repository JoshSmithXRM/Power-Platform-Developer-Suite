import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { ImportJob } from '../services/ImportJobService';
import { StatusBadgeComponent } from '../components/badges/StatusBadge/StatusBadgeComponent';
import { IMPORT_JOB_CONTEXT_MENU_ITEMS } from '../config/TableActions';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

// UI-specific type for table display
interface ImportJobTableRow {
    id: string;
    solutionname: string;
    progress: string;
    startedon: string;
    completedon: string;
    status: string;
    importcontext: string;
    operationcontext: string;
}

/**
 * Instance state for ImportJobViewerPanel
 * Tracks which environment this specific panel instance is viewing
 */
interface ImportJobInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

/**
 * Persistent preferences for viewing Import Jobs in a specific environment
 * These preferences follow the environment, not the panel instance
 */
interface ImportJobPreferences {
    // Future: Add sort preferences, filter preferences, auto-refresh settings, etc.
    // For now, use Record to allow any preferences (satisfies linter)
    [key: string]: unknown;
}

export class ImportJobViewerPanel extends BasePanel<ImportJobInstanceState, ImportJobPreferences> {
    public static readonly viewType = 'importJobViewer';
    private static currentPanel: ImportJobViewerPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: ImportJobViewerPanel.viewType,
                title: 'Import Job Viewer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new ImportJobViewerPanel(panel, uri),
            () => ImportJobViewerPanel.currentPanel,
            (panel) => { ImportJobViewerPanel.currentPanel = panel; },
            false
        );
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: ImportJobViewerPanel.viewType,
                title: 'Import Job Viewer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new ImportJobViewerPanel(panel, uri),
            () => ImportJobViewerPanel.currentPanel,
            (panel) => { ImportJobViewerPanel.currentPanel = panel; },
            true
        );
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer'
        });

        this.panel.onDidDispose(() => {
            ImportJobViewerPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');

        // Create per-panel ComponentFactory instance
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges for component communication
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.actionBarComponent,
            this.dataTableComponent
        ]);

        // Initialize the panel
        this.initialize();

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');
        try {
            // Environment Selector Component
            this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
                id: 'importJobs-envSelector',
                label: 'Environment',
                placeholder: 'Choose an environment to view import jobs...',
                environments: [],
                showRefreshButton: true,
                className: 'import-jobs-env-selector',
                onChange: async (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    // Use BasePanel's processEnvironmentSelection which manages state automatically
                    await this.processEnvironmentSelection(environmentId);
                }
            });

            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'importJobs-actions',
                actions: [
                    {
                        id: 'openSolutionHistory',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: true
                    },
                    this.getStandardRefreshAction()
                ],
                layout: 'horizontal',
                className: 'import-jobs-actions'
            });

            // Data Table Component
            this.dataTableComponent = this.componentFactory.createDataTable({
                id: 'importJobs-table',
                columns: [
                    {
                        id: 'solutionname',
                        label: 'Solution Name',
                        field: 'solutionname',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'progress',
                        label: 'Progress',
                        field: 'progress',
                        sortable: true,
                        filterable: false,
                        width: '100px',
                        align: 'center'
                    },
                    {
                        id: 'startedon',
                        label: 'Started',
                        field: 'startedon',
                        type: 'date',
                        sortable: true,
                        filterable: false,
                        width: '180px'
                    },
                    {
                        id: 'completedon',
                        label: 'Completed',
                        field: 'completedon',
                        type: 'date',
                        sortable: true,
                        filterable: false,
                        width: '180px'
                    },
                    {
                        id: 'status',
                        label: 'Status',
                        field: 'status',
                        type: 'html',
                        sortable: true,
                        filterable: false,
                        width: '140px',
                        align: 'center'
                    },
                    {
                        id: 'importcontext',
                        label: 'Import Context',
                        field: 'importcontext',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    },
                    {
                        id: 'operationcontext',
                        label: 'Operation Context',
                        field: 'operationcontext',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    }
                ],
                data: [],
                sortable: true,
                defaultSort: [{ column: 'startedon', direction: 'desc' }],
                searchable: true,
                showFooter: true,
                contextMenu: true,
                contextMenuItems: IMPORT_JOB_CONTEXT_MENU_ITEMS,
                className: 'import-jobs-table'
            });

            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Import Job Viewer panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            // Ignore empty/malformed messages
            if (!message || !message.command) {
                this.componentLogger.trace('Received message without command, ignoring', { message });
                return;
            }

            switch (message.command) {
                // 'environment-changed' is handled by BasePanel.handleCommonMessages()

                case 'load-import-jobs':
                    await this.handleLoadImportJobs(message.data?.environmentId);
                    break;

                case 'view-import-job-xml':
                    await this.handleViewImportJobXml(message.data?.environmentId, message.data?.importJobId);
                    break;

                case 'open-solution-history':
                    await this.handleOpenSolutionHistory(message.data?.environmentId);
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    break;

                case 'component-event':
                    this.componentLogger.debug('Component event received', { data: message.data });
                    await this.handleComponentEvent(message);
                    break;

                case 'table-search':
                    if (message.tableId && this.dataTableComponent) {
                        this.dataTableComponent.search(message.searchQuery || '');
                    }
                    break;

                case 'search':
                    // Handle SearchInput component messages
                    if (message.data?.componentId === 'importJobs-table-search' && this.dataTableComponent) {
                        this.dataTableComponent.search(message.data.query || '');
                    }
                    break;

                default:
                    this.componentLogger.warn('Unknown message command', { command: message.command });
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
            this.postMessage({
                command: 'error',
                action: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, eventType, data } = message.data || {};

            // Log based on event significance
            if (eventType === 'actionClicked') {
                this.componentLogger.info(`Action clicked: ${data?.actionId}`, { componentId });
            } else if (eventType === 'contextMenuItemClicked') {
                this.componentLogger.info(`Context menu item clicked: ${data?.itemId}`, { componentId });
            } else {
                this.componentLogger.debug('Component event received', { componentId, eventType });
            }

            // Handle action bar events
            if (componentId === 'importJobs-actions' && eventType === 'actionClicked') {
                const { actionId } = data;

                // Try standard actions first
                const handled = await this.handleStandardActions(actionId);
                if (handled) {
                    return;
                }

                // Handle panel-specific actions
                switch (actionId) {
                    case 'openSolutionHistory': {
                        const envId = this.environmentSelectorComponent?.getSelectedEnvironment()?.id;
                        if (envId) {
                            await this.handleOpenSolutionHistory(envId);
                        } else {
                            vscode.window.showWarningMessage('Please select an environment first');
                        }
                        break;
                    }
                    default:
                        this.componentLogger.warn('Unknown action ID', { actionId });
                }
                return;
            }

            // Handle data table context menu events
            if (componentId === 'importJobs-table' && eventType === 'contextMenuItemClicked') {
                const { itemId, rowData } = data;

                switch (itemId) {
                    case 'viewXml':
                        await this.handleViewImportJobXml(undefined, rowData.id);
                        break;
                    default:
                        this.componentLogger.warn('Unknown context menu item ID', { itemId });
                }
                return;
            }

            // Other component events
            this.componentLogger.trace('Component event not handled', { componentId, eventType });

        } catch (error) {
            this.componentLogger.error('Error handling component event', error as Error, {
                componentId: message.componentId,
                eventType: message.eventType
            });
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Import Job Viewer', 'Failed to initialize components');
            }

            this.componentLogger.trace('Using PanelComposer.compose()');

            // Use PanelComposer for composition
            return PanelComposer.compose([
                this.environmentSelectorComponent,
                this.actionBarComponent,
                this.dataTableComponent
            ], this.getCommonWebviewResources(), 'Import Job Viewer');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Import Job Viewer', 'Failed to generate panel content: ' + error);
        }
    }

    /**
     * Hook called when environment changes (with switching side effects)
     * State is automatically managed by BasePanel
     */
    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment changed', { environmentId });

            // Enable "Open in Maker" button
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('openSolutionHistory', false);
            }

            // Load data
            await this.loadEnvironmentData(environmentId);

        } catch (error) {
            this.componentLogger.error('Error handling environment change', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment data');
        }
    }

    /**
     * Load data for an environment (PURE data loading, no switching side effects)
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        this.componentLogger.info('Loading environment data', { environmentId });
        await this.handleLoadImportJobs(environmentId);
    }

    private async handleLoadImportJobs(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this.componentLogger.info('Loading import jobs', { environmentId });

            // Show loading state
            if (this.dataTableComponent) {
                this.dataTableComponent.setData([]);
                this.dataTableComponent.setLoading(true, 'Loading import jobs...');
            }

            // Fetch import jobs data
            const importJobService = ServiceFactory.getImportJobService();
            const importJobs = await importJobService.getImportJobs(environmentId);

            // Transform data for table display
            const tableData = this.transformImportJobsData(importJobs);

            // Update the data table component directly
            if (this.dataTableComponent) {
                this.componentLogger.info('Updating DataTableComponent with import jobs data', {
                    rowCount: tableData.length
                });

                this.dataTableComponent.setLoading(false);
                this.dataTableComponent.setData(tableData);
            }

            this.componentLogger.info('Import jobs loaded successfully', {
                environmentId,
                importJobsCount: tableData.length
            });
        } catch (error) {
            this.componentLogger.error('Error loading import jobs', error as Error, { environmentId });

            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }

            this.postMessage({
                action: 'error',
                message: `Failed to load import jobs: ${(error as Error).message}`
            });
        }
    }

    private transformImportJobsData(importJobs: ImportJob[]): ImportJobTableRow[] {
        return importJobs.map((job: ImportJob): ImportJobTableRow => {
            const status = this.calculateJobStatus(job);

            // Format progress: no decimals if whole number, otherwise max 4 decimals
            const progressValue = job.progress !== undefined && job.progress !== null
                ? Number(job.progress.toFixed(4)) // Round to 4 decimals and remove trailing zeros
                : null;

            return {
                id: job.importjobid,
                solutionname: job.solutionname || 'N/A',
                progress: progressValue !== null ? `${progressValue}%` : 'N/A',
                startedon: job.startedon ? new Date(job.startedon).toLocaleString() : 'N/A',
                completedon: job.completedon ? new Date(job.completedon).toLocaleString() : 'N/A',
                status: StatusBadgeComponent.generateBadgeHTML(status.label, status.variant),
                importcontext: job.importcontext || 'N/A',
                operationcontext: job.operationcontext || 'N/A'
            };
        });
    }

    private calculateJobStatus(job: ImportJob): { label: string, variant: 'completed' | 'failed' | 'in-progress' | 'unknown' } {
        // If it has a completed date, check progress
        if (job.completedon) {
            // If completed but less than 100% progress, it failed
            if (job.progress !== undefined && job.progress < 100) {
                return { label: 'Failed', variant: 'failed' };
            }
            return { label: 'Completed', variant: 'completed' };
        }

        // If started but no completed date
        if (job.startedon) {
            // If no progress or 0 progress and no completed date, it failed
            if (job.progress === undefined || job.progress === null || job.progress === 0) {
                return { label: 'Failed', variant: 'failed' };
            }
            return { label: 'In Progress', variant: 'in-progress' };
        }

        return { label: 'Unknown', variant: 'unknown' };
    }

    private async handleViewImportJobXml(environmentId: string | undefined, importJobId: string): Promise<void> {
        try {
            // Get current environment if not provided
            if (!environmentId) {
                const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
                environmentId = selectedEnvironment?.id;
            }

            if (!environmentId || !importJobId) {
                vscode.window.showErrorMessage('Environment and Import Job ID are required');
                return;
            }

            this.componentLogger.info('Fetching import job XML', { environmentId, importJobId });

            // Show progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Loading Import Job XML',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Fetching XML data...' });

                const importJobService = ServiceFactory.getImportJobService();
                const xmlData = await importJobService.getImportJobXml(environmentId!, importJobId);

                progress.report({ message: 'Opening in editor...' });

                // Open XML in editor
                const document = await vscode.workspace.openTextDocument({
                    content: xmlData,
                    language: 'xml'
                });

                await vscode.window.showTextDocument(document);
            });

        } catch (error) {
            this.componentLogger.error('Error viewing import job XML', error as Error, { environmentId, importJobId });
            vscode.window.showErrorMessage(`Failed to view import job XML: ${(error as Error).message}`);
        }
    }

    private async handleOpenSolutionHistory(environmentId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                vscode.window.showErrorMessage('Environment not found');
                return;
            }

            const urlBuilderService = ServiceFactory.getUrlBuilderService();
            const historyUrl = urlBuilderService.buildSolutionHistoryUrl(environment);

            this.componentLogger.info('Opening Solution History URL', { url: historyUrl });

            // Open in external browser
            vscode.env.openExternal(vscode.Uri.parse(historyUrl));
            vscode.window.showInformationMessage('Opening Solution History in Maker...');

        } catch (error) {
            this.componentLogger.error('Error opening solution history', error as Error);
            vscode.window.showErrorMessage(`Failed to open Solution History: ${(error as Error).message}`);
        }
    }

    public dispose(): void {
        ImportJobViewerPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();

        super.dispose();
    }
}
