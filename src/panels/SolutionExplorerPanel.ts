import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { Solution } from '../services/SolutionService';
import { SOLUTION_CONTEXT_MENU_ITEMS } from '../config/TableActions';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

/**
 * Instance state for SolutionExplorerPanel
 */
interface SolutionExplorerInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

/**
 * Persistent preferences for Solution Explorer
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SolutionExplorerPreferences {
    // Future: sort order, filter preferences, etc.
}

// UI-specific type for table display
interface SolutionTableRow {
    id: string;
    friendlyName: string;
    uniqueName: string;
    version: string;
    type: string;
    publisherName: string;
    installedDate: string;
}

export class SolutionExplorerPanel extends BasePanel<SolutionExplorerInstanceState, SolutionExplorerPreferences> {
    public static readonly viewType = 'solutionExplorer';
    private static currentPanel: SolutionExplorerPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: SolutionExplorerPanel.viewType,
                title: 'Solution Explorer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new SolutionExplorerPanel(panel, uri),
            () => SolutionExplorerPanel.currentPanel,
            (panel) => { SolutionExplorerPanel.currentPanel = panel; },
            false
        );
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: SolutionExplorerPanel.viewType,
                title: 'Solution Explorer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new SolutionExplorerPanel(panel, uri),
            () => SolutionExplorerPanel.currentPanel,
            (panel) => { SolutionExplorerPanel.currentPanel = panel; },
            true
        );
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: SolutionExplorerPanel.viewType,
            title: 'Solution Explorer'
        });

        this.panel.onDidDispose(() => {
            SolutionExplorerPanel.currentPanel = undefined;
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
                id: 'solutions-envSelector',
                label: 'Environment',
                placeholder: 'Choose an environment to browse solutions...',
                environments: [],
                showRefreshButton: true,
                className: 'solutions-env-selector',
                onChange: async (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    await this.processEnvironmentSelection(environmentId);
                }
            });

            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'solutions-actions',
                actions: [
                    {
                        id: 'openInMaker',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: true
                    },
                    this.getStandardRefreshAction()
                ],
                layout: 'horizontal',
                className: 'solutions-actions'
            });

            // Data Table Component
            this.dataTableComponent = this.componentFactory.createDataTable({
                id: 'solutions-table',
                columns: [
                    {
                        id: 'friendlyName',
                        label: 'Solution Name',
                        field: 'friendlyName',
                        sortable: true,
                        filterable: true,
                        width: '250px'
                    },
                    {
                        id: 'uniqueName',
                        label: 'Unique Name',
                        field: 'uniqueName',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'version',
                        label: 'Version',
                        field: 'version',
                        sortable: true,
                        filterable: false,
                        width: '120px',
                        align: 'center'
                    },
                    {
                        id: 'type',
                        label: 'Type',
                        field: 'type',
                        sortable: true,
                        filterable: true,
                        width: '120px',
                        align: 'center'
                    },
                    {
                        id: 'publisherName',
                        label: 'Publisher',
                        field: 'publisherName',
                        sortable: true,
                        filterable: true,
                        width: '180px'
                    },
                    {
                        id: 'installedDate',
                        label: 'Installed',
                        field: 'installedDate',
                        sortable: true,
                        filterable: false,
                        width: '180px'
                    }
                ],
                data: [],
                sortable: true,
                defaultSort: [{ column: 'friendlyName', direction: 'asc' }],
                searchable: true,
                showFooter: true,
                contextMenu: true,
                contextMenuItems: SOLUTION_CONTEXT_MENU_ITEMS,
                className: 'solutions-table'
            });

            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Solution Explorer panel');
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

                case 'load-solutions':
                    await this.handleLoadSolutions(message.data?.environmentId ?? '');
                    break;

                case 'open-solution-in-maker':
                    // Custom message type not in union - needs type assertion
                    await this.handleOpenSolutionInMaker(
                        (message as unknown as { data?: { environmentId?: string; solutionId?: string } }).data?.environmentId,
                        (message as unknown as { data?: { environmentId?: string; solutionId?: string } }).data?.solutionId ?? ''
                    );
                    break;

                case 'open-solution-in-classic':
                    // Custom message type not in union - needs type assertion
                    await this.handleOpenSolutionInClassic(
                        (message as unknown as { data?: { environmentId?: string; solutionId?: string } }).data?.environmentId,
                        (message as unknown as { data?: { environmentId?: string; solutionId?: string } }).data?.solutionId ?? ''
                    );
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
                    if (message.data?.componentId === 'solutions-table-search' && this.dataTableComponent) {
                        this.dataTableComponent.search((message.data.query as string | undefined) || '');
                    }
                    break;

                default:
                    this.componentLogger.warn('Unknown message command', { command: message.command });
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
            this.postMessage({
                command: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    /**
     * Handle non-action component events (optional hook from BasePanel)
     * Used for handling context menu clicks on solution table rows
     */
    protected async handleOtherComponentEvent(componentId: string, eventType: string, data?: unknown): Promise<void> {
        // Validate data parameter
        if (!data || typeof data !== 'object') {
            this.componentLogger.warn('Invalid component event data', { componentId, eventType });
            return;
        }

        // Handle data table context menu events
        if (componentId === 'solutions-table' && eventType === 'contextMenuItemClicked') {
            const { itemId, rowData } = data as { itemId?: string; rowData?: { id?: string } };
            this.componentLogger.info(`Context menu item clicked: ${itemId}`, { componentId });

            switch (itemId) {
                case 'openMaker':
                    if (rowData?.id) {
                        await this.handleOpenSolutionInMaker(undefined, rowData.id);
                    }
                    break;
                case 'openClassic':
                    if (rowData?.id) {
                        await this.handleOpenSolutionInClassic(undefined, rowData.id);
                    }
                    break;
                default:
                    this.componentLogger.warn('Unknown context menu item ID', { itemId });
            }
            return;
        }

        // Other component events
        this.componentLogger.trace('Component event not handled', { componentId, eventType });
    }

    /**
     * Handle panel-specific action bar actions (optional hook from BasePanel)
     */
    protected async handlePanelAction(_componentId: string, actionId: string): Promise<void> {
        switch (actionId) {
            case 'openInMaker': {
                const envId = this.environmentSelectorComponent?.getSelectedEnvironment()?.id;
                if (envId) {
                    await this.handleOpenSolutionsPageInMaker(envId);
                } else {
                    vscode.window.showWarningMessage('Please select an environment first');
                }
                break;
            }
            default:
                this.componentLogger.warn('Unknown action ID', { actionId });
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Solution Explorer', 'Failed to initialize components');
            }

            this.componentLogger.trace('Using PanelComposer.compose()');

            // Use PanelComposer for composition
            return PanelComposer.compose([
                this.environmentSelectorComponent,
                this.actionBarComponent,
                this.dataTableComponent
            ], this.getCommonWebviewResources(), 'Solution Explorer');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Solution Explorer', 'Failed to generate panel content: ' + error);
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
                this.actionBarComponent.setActionDisabled('openInMaker', false);
            }

            // Load data
            await this.loadEnvironmentData(environmentId);

        } catch (error) {
            this.componentLogger.error('Error handling environment change', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment data');
        }
    }

    /**
     * Apply preferences to restore panel state (Template Method Pattern)
     * Called automatically by BasePanel after environment load/switch
     */
    protected async applyPreferences(prefs: SolutionExplorerPreferences | null): Promise<void> {
        // No preferences to restore for this panel yet
        // Future: Could restore sort order, filter preferences, etc.
        this.componentLogger.debug('applyPreferences called (no preferences defined yet)', { hasPrefs: !!prefs });
    }

    /**
     * Load data for an environment (PURE data loading, no switching side effects)
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        this.componentLogger.info('Loading environment data', { environmentId });
        await this.handleLoadSolutions(environmentId);
    }

    private async handleLoadSolutions(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                command: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this.componentLogger.info('Loading solutions', { environmentId });

            // Show loading state
            if (this.dataTableComponent) {
                this.dataTableComponent.setData([]);
                this.dataTableComponent.setLoading(true, 'Loading solutions...');
            }

            // Fetch solutions data (always fresh, no caching per architecture)
            const solutionService = ServiceFactory.getSolutionService();
            const solutions = await solutionService.getSolutions(environmentId);

            // Transform data for table display
            const tableData = this.transformSolutionsData(solutions);

            // Update the data table component directly
            if (this.dataTableComponent) {
                this.componentLogger.info('Updating DataTableComponent with solutions data', {
                    rowCount: tableData.length
                });

                this.dataTableComponent.setLoading(false);
                this.dataTableComponent.setData(tableData);
            }

            this.componentLogger.info('Solutions loaded successfully', {
                environmentId,
                solutionsCount: tableData.length
            });
        } catch (error) {
            this.componentLogger.error('Error loading solutions', error as Error, { environmentId });

            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }

            this.postMessage({
                command: 'error',
                message: `Failed to load solutions: ${(error as Error).message}`
            });
        }
    }

    private transformSolutionsData(solutions: Solution[]): SolutionTableRow[] {
        return solutions.map((solution: Solution): SolutionTableRow => ({
            id: solution.id,
            friendlyName: solution.friendlyName || solution.displayName,
            uniqueName: solution.uniqueName,
            version: solution.version,
            type: solution.isManaged ? 'Managed' : 'Unmanaged',
            publisherName: solution.publisherName,
            installedDate: solution.installedOn ? new Date(solution.installedOn).toLocaleDateString() : 'N/A'
        }));
    }

    private async handleOpenSolutionInMaker(environmentId: string | undefined, solutionId: string): Promise<void> {
        try {
            // Get current environment if not provided
            if (!environmentId) {
                const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
                environmentId = selectedEnvironment?.id;
            }

            if (!environmentId || !solutionId) {
                vscode.window.showErrorMessage('Environment and Solution ID are required');
                return;
            }

            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                vscode.window.showErrorMessage('Environment not found');
                return;
            }

            const urlBuilderService = ServiceFactory.getUrlBuilderService();
            const makerUrl = urlBuilderService.buildMakerSolutionUrl(environment, solutionId);

            this.componentLogger.info('Opening solution in Maker', { url: makerUrl, solutionId });

            // Open in external browser
            await vscode.env.openExternal(vscode.Uri.parse(makerUrl));

        } catch (error) {
            this.componentLogger.error('Error opening solution in Maker', error as Error, { solutionId });
            vscode.window.showErrorMessage(`Failed to open solution in Maker: ${(error as Error).message}`);
        }
    }

    private async handleOpenSolutionInClassic(environmentId: string | undefined, solutionId: string): Promise<void> {
        try {
            // Get current environment if not provided
            if (!environmentId) {
                const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
                environmentId = selectedEnvironment?.id;
            }

            if (!environmentId || !solutionId) {
                vscode.window.showErrorMessage('Environment and Solution ID are required');
                return;
            }

            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                vscode.window.showErrorMessage('Environment not found');
                return;
            }

            const urlBuilderService = ServiceFactory.getUrlBuilderService();
            const classicUrl = urlBuilderService.buildClassicSolutionUrl(environment, solutionId);

            this.componentLogger.info('Opening solution in Classic', { url: classicUrl, solutionId });

            // Open in external browser
            await vscode.env.openExternal(vscode.Uri.parse(classicUrl));

        } catch (error) {
            this.componentLogger.error('Error opening solution in Classic', error as Error, { solutionId });
            vscode.window.showErrorMessage(`Failed to open solution in Classic: ${(error as Error).message}`);
        }
    }

    private async handleOpenSolutionsPageInMaker(environmentId: string): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                vscode.window.showErrorMessage('Environment not found');
                return;
            }

            if (!environment.environmentId) {
                vscode.window.showErrorMessage('Environment ID not found. Please configure the Environment ID in environment settings.');
                return;
            }

            // Build solutions page URL
            const solutionsPageUrl = `https://make.powerapps.com/environments/${environment.environmentId}/solutions`;

            this.componentLogger.info('Opening solutions page in Maker', { url: solutionsPageUrl });

            // Open in external browser
            await vscode.env.openExternal(vscode.Uri.parse(solutionsPageUrl));

        } catch (error) {
            this.componentLogger.error('Error opening solutions page in Maker', error as Error);
            vscode.window.showErrorMessage(`Failed to open solutions page in Maker: ${(error as Error).message}`);
        }
    }

    public dispose(): void {
        SolutionExplorerPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();

        super.dispose();
    }
}
