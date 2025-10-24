import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { ImportJob } from '../services/ImportJobService';
import { StatusBadgeComponent } from '../components/badges/StatusBadge/StatusBadgeComponent';
import { IMPORT_JOB_CONTEXT_MENU_ITEMS } from '../config/TableActions';

import { BasePanel } from './base/BasePanel';

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

export class ImportJobViewerPanel extends BasePanel {
    public static readonly viewType = 'importJobViewer';
    private static currentPanel: ImportJobViewerPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (ImportJobViewerPanel.currentPanel) {
            ImportJobViewerPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = BasePanel.createWebviewPanel({
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        ImportJobViewerPanel.currentPanel = new ImportJobViewerPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri): void {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
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

        // Load environments after initialization
        this.loadEnvironments();

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');
        try {
            // Environment Selector Component
            this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
                id: 'importJobs-envSelector',
                label: 'Select Environment',
                placeholder: 'Choose an environment to view import jobs...',
                required: true,
                environments: [],
                showRefreshButton: true,
                className: 'import-jobs-env-selector',
                onChange: (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    this.handleEnvironmentSelection(environmentId);
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
                    {
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'secondary',
                        disabled: false
                    }
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
                        sortable: true,
                        filterable: false,
                        width: '180px'
                    },
                    {
                        id: 'completedon',
                        label: 'Completed',
                        field: 'completedon',
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
                case 'environment-selected':
                case 'environment-changed':
                    // Only sync component state - onChange callback will handle data loading
                    if (this.environmentSelectorComponent && message.data?.environmentId) {
                        this.environmentSelectorComponent.setSelectedEnvironment(message.data.environmentId);
                    }
                    break;

                case 'load-import-jobs':
                    await this.handleLoadImportJobs(message.data?.environmentId);
                    break;

                case 'view-import-job-xml':
                    await this.handleViewImportJobXml(message.data?.environmentId, message.data?.importJobId);
                    break;

                case 'open-solution-history':
                    await this.handleOpenSolutionHistory(message.data?.environmentId);
                    break;

                case 'refresh-data':
                    await this.refreshImportJobs();
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    break;

                case 'component-event':
                    this.componentLogger.debug('Component event received', { data: message.data });
                    await this.handleComponentEvent(message);
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

                switch (actionId) {
                    case 'refresh':
                        await this.refreshImportJobs();
                        break;
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

    private async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent, this.componentLogger);
        }
    }

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment selected', { environmentId });

            // Enable "Open in Maker" button
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('openSolutionHistory', false);
            }

            // Load import jobs for this environment
            await this.handleLoadImportJobs(environmentId);

        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
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

            // Save state
            await this._stateService.savePanelState(ImportJobViewerPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

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

    private async refreshImportJobs(): Promise<void> {
        try {
            this.componentLogger.debug('Refreshing import jobs');

            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();

            if (selectedEnvironment) {
                await this.handleLoadImportJobs(selectedEnvironment.id);
                vscode.window.showInformationMessage('Import Jobs refreshed');
            } else {
                vscode.window.showWarningMessage('Please select an environment first');
            }
        } catch (error) {
            this.componentLogger.error('Error refreshing import jobs', error as Error);
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }
            vscode.window.showErrorMessage('Failed to refresh import jobs');
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
