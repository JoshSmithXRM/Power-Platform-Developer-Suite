import * as fs from 'fs';

import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { SolutionSelectorComponent } from '../components/selectors/SolutionSelector/SolutionSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { Solution } from '../components/base/ComponentInterface';
import { RelationshipResult, FlowConnectionRelationship } from '../services/ConnectionReferencesService';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

interface ConnectionReferencesInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ConnectionReferencesPreferences {
    // No preferences defined yet for this panel
}

// UI-specific types for table display
interface ConnectionReferencesTableRow {
    id: string;
    flowName: string;
    connectionReference: string;
    connectorType: string;
    connectionName: string;
    isManaged: string;
    modifiedOn: string;
    modifiedBy: string;
}

interface ConnectionReferencesSyncMetadata {
    uniqueSolutionIds: string[];
    relationshipTypes: string[];
}

export class ConnectionReferencesPanel extends BasePanel<ConnectionReferencesInstanceState, ConnectionReferencesPreferences> {
    public static readonly viewType = 'connectionReferences';
    private static currentPanel: ConnectionReferencesPanel | undefined;

    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private currentRelationshipData?: RelationshipResult; // Store original service data for deployment settings
    private currentSolutionId?: string; // Track current solution for "Open in Maker"
    private componentFactory: ComponentFactory; // Per-panel instance to avoid component ID collisions

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: ConnectionReferencesPanel.viewType,
                title: 'Connection References',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new ConnectionReferencesPanel(panel, uri),
            () => ConnectionReferencesPanel.currentPanel,
            (panel) => { ConnectionReferencesPanel.currentPanel = panel; },
            false
        );
    }

    public static createNew(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: ConnectionReferencesPanel.viewType,
                title: 'Connection References',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new ConnectionReferencesPanel(panel, uri),
            () => ConnectionReferencesPanel.currentPanel,
            (panel) => { ConnectionReferencesPanel.currentPanel = panel; },
            true
        );
    }

    protected constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: ConnectionReferencesPanel.viewType,
            title: 'Connection References'
        });

        this.panel.onDidDispose(() => {
            ConnectionReferencesPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');

        // Create per-panel ComponentFactory instance to avoid ID collisions
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges for component communication using BasePanel method
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.solutionSelectorComponent,
            this.actionBarComponent,
            this.dataTableComponent
        ]);

        // Initialize the panel (this calls updateWebview which calls getHtmlContent)
        this.initialize();

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');
        try {
            this.componentLogger.trace('Creating EnvironmentSelectorComponent');
            // Environment Selector Component
            this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
                id: 'connectionRefs-envSelector',
                label: 'Environment',
                placeholder: 'Choose an environment to view connection references...',
                environments: [],
                showRefreshButton: true,
                className: 'connection-references-env-selector',
                onChange: async (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    await this.processEnvironmentSelection(environmentId);
                }
            });
            this.componentLogger.trace('EnvironmentSelectorComponent created successfully');

            this.componentLogger.trace('Creating SolutionSelectorComponent');
            // Solution Selector Component
            this.solutionSelectorComponent = this.componentFactory.createSolutionSelector({
                id: 'connectionRefs-solutionSelector',
                label: 'Solution',
                placeholder: 'All Solutions',
                required: false,
                allowMultiSelect: false,
                solutions: [],
                showSystem: true,
                showManaged: true,
                showUnmanaged: true,
                className: 'connection-references-solution-selector',
                onSelectionChange: (selectedSolutions: Solution[]) => {
                    const solutionId = selectedSolutions.length > 0 ? selectedSolutions[0].id : '';
                    this.componentLogger.debug('Solution onSelectionChange triggered', { solutionId, selectedSolutions });
                    this.currentSolutionId = solutionId || undefined; // Store for "Open in Maker"
                    this.handleSolutionSelection(solutionId);
                }
            });
            this.componentLogger.trace('SolutionSelectorComponent created successfully');

            this.componentLogger.trace('Creating ActionBarComponent');
            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'connectionRefs-actions',
                actions: [
                    {
                        id: 'openInMakerBtn',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: false
                    },
                    this.getStandardRefreshAction(),
                    {
                        id: 'syncDeploymentBtn',
                        label: 'Sync Deployment Settings',
                        icon: 'sync',
                        variant: 'primary',
                        disabled: true
                    }
                ],
                layout: 'horizontal',
                className: 'connection-references-actions'
            });
            this.componentLogger.trace('ActionBarComponent created successfully');

            this.componentLogger.trace('Creating DataTableComponent');
            // Data Table Component
            this.dataTableComponent = this.componentFactory.createDataTable({
                id: 'connectionRefs-table',
                columns: [
                    {
                        id: 'flowName',
                        label: 'Flow Name',
                        field: 'flowName',
                        sortable: true,
                        filterable: true
                    },
                    {
                        id: 'connectionReference',
                        label: 'Connection Reference',
                        field: 'connectionReference',
                        sortable: true,
                        filterable: true
                    },
                    {
                        id: 'connectorType',
                        label: 'Connector Type',
                        field: 'connectorType',
                        sortable: true,
                        filterable: true
                    },
                    {
                        id: 'connectionName',
                        label: 'Connection',
                        field: 'connectionName',
                        sortable: true,
                        filterable: true
                    },
                    {
                        id: 'isManaged',
                        label: 'Managed',
                        field: 'isManaged',
                        sortable: true,
                        filterable: true,
                        width: '100px',
                        align: 'center'
                    },
                    {
                        id: 'modifiedOn',
                        label: 'Modified On',
                        field: 'modifiedOn',
                        sortable: true,
                        filterable: true,
                        width: '180px'
                    },
                    {
                        id: 'modifiedBy',
                        label: 'Modified By',
                        field: 'modifiedBy',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    }
                ],
                data: [],
                sortable: true,
                defaultSort: [{ column: 'connectionReference', direction: 'asc' }],
                searchable: true,
                showFooter: true,
                className: 'connection-references-table'
            });
            this.componentLogger.trace('DataTableComponent created successfully');
            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Connection References panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            // Validate message structure
            if (!message || typeof message !== 'object') {
                this.componentLogger.warn('Received malformed message - not an object', { message });
                return;
            }

            const { command } = message;

            this.componentLogger.debug('Message received', {
                command,
                componentId: message.data?.componentId,
                eventType: message.data?.eventType
            });

            // Handle empty or undefined command
            if (!command) {
                this.componentLogger.trace('Received message with no command property', {
                    message,
                    keys: Object.keys(message || {}),
                    hasData: !!message.data,
                    hasAction: !!message.action
                });
                return;
            }

            switch (command) {
                case 'component-event':
                    await this.handleComponentEvent(message);
                    break;

                case 'table-search':
                    if (message.tableId && this.dataTableComponent) {
                        this.dataTableComponent.search(message.searchQuery || '');
                    }
                    break;

                // 'environment-changed' is handled by BasePanel.handleCommonMessages()

                case 'sync-deployment-settings':
                    await this.handleSyncDeploymentSettings(message.data?.relationships, message.data?.solutionUniqueName);
                    break;

                case 'open-in-maker':
                    await this.handleOpenInMaker(message.data?.environmentId, message.data?.solutionId, message.data?.entityType);
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    break;

                default:
                    this.componentLogger.warn('Unknown message command', { command: message.command });
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
            this.postMessage({
                action: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    /**
     * Handle non-action component events (optional hook from BasePanel)
     * Used for handling solution selector selection changes
     */
    protected async handleOtherComponentEvent(componentId: string, eventType: string, data?: unknown): Promise<void> {
        // Validate data parameter
        if (!data || typeof data !== 'object') {
            this.componentLogger.warn('Invalid component event data', { componentId, eventType });
            return;
        }

        // Handle search events
        if (eventType === 'search') {
            const { query } = data as { query?: string };
            this.componentLogger.debug(`Search query: "${query || ''}"`, { componentId });
            return;
        }

        // Handle solution selector events using BasePanel abstraction
        if (componentId === 'connectionRefs-solutionSelector') {
            const handled = await this.handleStandardSolutionSelectorEvents(eventType, data);
            if (handled) {
                return;
            }
        }

        // Handle other component events as needed
        this.componentLogger.trace('Component event not handled', { componentId, eventType });
    }

    /**
     * Handle panel-specific action bar actions (optional hook from BasePanel)
     */
    protected async handlePanelAction(_componentId: string, actionId: string): Promise<void> {
        switch (actionId) {
            case 'syncDeploymentBtn': {
                // Use original service data for deployment settings sync
                if (!this.currentRelationshipData) {
                    this.postMessage({ action: 'error', message: 'No relationship data available for sync' });
                    break;
                }
                const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();

                await this.handleSyncDeploymentSettings(
                    this.currentRelationshipData,
                    selectedSolution?.uniqueName
                );
                break;
            }
            case 'openInMakerBtn': {
                const envId = this.environmentSelectorComponent?.getSelectedEnvironment()?.id;
                const solId = this.currentSolutionId; // Use tracked solution ID

                if (envId && solId) {
                    await this.handleOpenInMaker(envId, solId, 'connectionreferences');
                } else {
                    vscode.window.showWarningMessage('Please select an environment and solution first');
                }
                break;
            }
            default:
                this.componentLogger.warn('Unknown action ID', { actionId });
        }
    }

    protected async onEnvironmentChanged(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment change cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment changed', { environmentId });

            // Load data
            await this.loadEnvironmentData(environmentId);

        } catch (error) {
            this.componentLogger.error('Error handling environment change', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
    }

    /**
     * Apply preferences to restore panel state (Template Method Pattern)
     * Called automatically by BasePanel after environment load/switch
     */
    protected async applyPreferences(prefs: ConnectionReferencesPreferences | null): Promise<void> {
        // No preferences to restore for this panel yet
        // Future: Could restore filter states, sort order, collapsed sections, etc.
        this.componentLogger.debug('applyPreferences called (no preferences defined yet)', { hasPrefs: !!prefs });
    }

    /**
     * Load data for an environment (PURE data loading, no switching side effects)
     */
    protected async loadEnvironmentData(environmentId: string): Promise<void> {
        this.componentLogger.info('Loading environment data', { environmentId });
        await this.handleLoadSolutions(environmentId);
    }

    /**
     * Handle solution selection (override BasePanel hook)
     * Loads connection references for the selected solution
     */
    protected async handleSolutionSelection(solutionId: string): Promise<void> {
        // Store for "Open in Maker" action
        this.currentSolutionId = solutionId || undefined;

        if (!solutionId) {
            return;
        }

        try {
            // Clear table and show loading state immediately for visual feedback
            if (this.dataTableComponent) {
                this.dataTableComponent.setData([]);
                this.dataTableComponent.setLoading(true, 'Loading connection references...');
            }

            // Disable sync button while loading
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('syncDeploymentBtn', true);
            }

            // Get current environment ID
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (selectedEnvironment) {
                await this.handleLoadConnectionReferences(selectedEnvironment.id, solutionId);
            }

        } catch (error) {
            this.componentLogger.error('Error handling solution selection', error as Error, { solutionId });
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }
            vscode.window.showErrorMessage('Failed to load solution configuration');
        }
    }

    private async handleLoadSolutions(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({ action: 'error', message: 'Environment id required' });
            return;
        }

        try {
            const solutionService = ServiceFactory.getSolutionService();
            const solutions = await solutionService.getSolutions(environmentId);

            // Update solution selector component if available
            if (this.solutionSelectorComponent) {
                this.componentLogger.debug('Setting solutions directly from service (no transformation needed)', {
                    solutionsCount: solutions.length,
                    sampleSolution: solutions[0]
                });

                // Use solutions directly from service - no transformation needed
                this.solutionSelectorComponent.setSolutions(solutions);

                this.componentLogger.debug('setSolutions() completed - checking component state', {
                    componentSolutions: this.solutionSelectorComponent.getSolutions().length,
                    componentFiltered: this.solutionSelectorComponent.getFilteredSolutions().length
                });

                // Auto-select Default solution if available  
                const defaultSolution = solutions.find(s => s.uniqueName === 'Default');
                if (defaultSolution) {
                    this.solutionSelectorComponent.setSelectedSolutions([defaultSolution]);
                    // Note: setSelectedSolutions will automatically trigger onSelectionChange handler
                    // which calls handleSolutionSelection -> handleLoadConnectionReferences
                    // So we don't need to manually call it here to avoid duplicate execution
                }

                // Note: setSolutions() already calls notifyStateChange() to update component in webview
                // No need to call updateWebview() which would reload the entire HTML
            }

        } catch (error) {
            this.componentLogger.error('Error loading solutions', error as Error, { environmentId });
            this.postMessage({ action: 'error', message: (error as Error).message || 'Failed to load solutions' });
        }
    }

    private async handleLoadConnectionReferences(environmentId: string, solutionId?: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({ action: 'error', message: 'Environment id required' });
            return;
        }

        try {
            this.componentLogger.info('Loading connection references', { environmentId, solutionId });

            const crService = ServiceFactory.getConnectionReferencesService();
            const relationships = await crService.aggregateRelationships(environmentId, solutionId);

            // Store original service data for deployment settings
            this.currentRelationshipData = relationships;

            this.componentLogger.debug('Connection references loaded', {
                flows: relationships?.flows?.length || 0,
                connectionReferences: relationships?.connectionReferences?.length || 0,
                relationships: relationships?.relationships?.length || 0,
                solutionId: solutionId || 'all'
            });

            // Transform data for table display
            const tableData = this.transformConnectionReferencesData(relationships);

            // Update the data table component directly
            if (this.dataTableComponent) {
                this.componentLogger.info('Updating DataTableComponent with API data', {
                    transformedRelationships: tableData.relationships?.length || 0
                });

                this.componentLogger.debug('Sample connection reference data', {
                    sampleData: tableData.relationships?.slice(0, 2) || []
                });

                this.componentLogger.trace('About to call setData() which should trigger update event');
                this.componentLogger.debug('DEBUG: Data being passed to setData()', {
                    requestedSolutionId: solutionId,
                    dataType: typeof tableData.relationships,
                    isArray: Array.isArray(tableData.relationships),
                    length: tableData.relationships?.length,
                    hasIdProperty: tableData.relationships?.[0]?.id !== undefined,
                    sampleRow: tableData.relationships?.[0],
                    uniqueSolutionIds: [...new Set(relationships.relationships?.map(r => r.solutionId).filter(Boolean))],
                    relationshipTypes: [...new Set(relationships.relationships?.map(r => r.relationshipType))]
                });
                // Clear loading state BEFORE setting data to ensure proper state in update event
                this.dataTableComponent.setLoading(false);
                this.dataTableComponent.setData(tableData.relationships || []);
                this.componentLogger.trace('setData() call completed - event bridge should have forwarded to webview');
                // Note: setData() already calls notifyUpdate() to update the table in webview
                // No need to call updateWebview() which would reload the entire HTML
            }

            // Enable sync deployment settings button if we have data
            if (this.actionBarComponent && tableData.relationships && tableData.relationships.length > 0) {
                this.componentLogger.info('Enabling sync deployment settings button', {
                    hasActionBar: !!this.actionBarComponent,
                    dataCount: tableData.relationships.length
                });
                const result = this.actionBarComponent.setActionDisabled('syncDeploymentBtn', false);
                this.componentLogger.info('Sync button enable result', { success: result });
            } else {
                this.componentLogger.warn('Not enabling sync button', {
                    hasActionBar: !!this.actionBarComponent,
                    dataCount: tableData.relationships?.length || 0
                });
            }


            this.componentLogger.info('Connection references loaded successfully', {
                environmentId,
                solutionId: solutionId || 'all',
                relationshipsCount: tableData.relationships?.length || 0
            });

        } catch (error) {
            this.componentLogger.error('Error loading connection references', error as Error, { environmentId, solutionId });

            // Clear loading state on error to prevent stuck spinner
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }

            this.postMessage({
                action: 'error',
                message: `Failed to load connection references: ${(error as Error).message}`
            });
        }
    }

    private transformConnectionReferencesData(
        data: RelationshipResult
    ): { relationships: ConnectionReferencesTableRow[]; metadata?: ConnectionReferencesSyncMetadata } {
        if (!data || !data.relationships) {
            this.componentLogger.debug('No relationships data to transform', { data });
            return { relationships: [] };
        }

        const relationshipItems = data.relationships;
        this.componentLogger.debug('Transforming relationships for table display', {
            relationshipCount: relationshipItems.length
        });

        const transformedRelationships: ConnectionReferencesTableRow[] = relationshipItems.map((rel: FlowConnectionRelationship) => ({
            id: rel.id, // Already has unique ID from service
            flowName: rel.flowName || 'No Flow Associated',
            connectionReference: rel.connectionReferenceLogicalName || 'No Connection Reference',
            connectorType: rel.connectorType || 'Unknown Connector',
            connectionName: rel.connectionName || 'No Connection',
            isManaged: (rel.flowIsManaged || rel.crIsManaged) ? 'Yes' : 'No',
            modifiedOn: rel.flowModifiedOn || rel.crModifiedOn || '',
            modifiedBy: rel.flowModifiedBy || rel.crModifiedBy || 'Unknown'
        }));

        this.componentLogger.debug('Data transformation completed', {
            originalCount: relationshipItems.length,
            transformedCount: transformedRelationships.length,
            sampleData: transformedRelationships.slice(0, 2)
        });

        return { relationships: transformedRelationships };
    }

    private formatDate(dateString: string): string {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    }

    private async handleSyncDeploymentSettings(
        relationshipData: RelationshipResult,
        solutionUniqueName?: string
    ): Promise<void> {
        try {
            const deploymentSettingsService = ServiceFactory.getDeploymentSettingsService();

            // Prompt user to select or create deployment settings file
            const filePath = await deploymentSettingsService.selectDeploymentSettingsFile(solutionUniqueName);
            if (!filePath) {
                return; // User cancelled
            }

            const isNewFile = !fs.existsSync(filePath);

            // Sync connection references with the file
            const result = await deploymentSettingsService.syncConnectionReferences(filePath, relationshipData, isNewFile);

            // Send success message back to UI
            this.postMessage({
                action: 'deployment-settings-synced',
                data: {
                    filePath: result.filePath,
                    added: result.added,
                    removed: result.removed,
                    updated: result.updated,
                    isNewFile
                }
            });
        } catch (error) {
            this.componentLogger.error('Error syncing deployment settings', error as Error);
            this.postMessage({ action: 'error', message: (error as Error).message || 'Failed to sync deployment settings' });
        }
    }

    private async handleOpenInMaker(environmentId: string, solutionId: string, entityType: string): Promise<void> {
        if (!environmentId || !solutionId) {
            this.postMessage({ action: 'error', message: 'Environment and solution are required' });
            return;
        }

        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === environmentId);

            if (!environment) {
                this.postMessage({ action: 'error', message: 'Environment not found' });
                return;
            }

            // Use the actual environment GUID from the environment connection
            const envGuid = environment.environmentId || environmentId;
            const makerUrl = `https://make.powerapps.com/environments/${envGuid}/solutions/${solutionId}/objects/${entityType}`;

            this.componentLogger.info('Opening Maker URL', { url: makerUrl });

            // Open in external browser
            vscode.env.openExternal(vscode.Uri.parse(makerUrl));

        } catch (error) {
            this.componentLogger.error('Error opening in Maker', error as Error);
            this.postMessage({ action: 'error', message: (error as Error).message || 'Failed to open in Maker' });
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.solutionSelectorComponent ||
                !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Connection References', 'Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');

            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.actionBarComponent,
                this.solutionSelectorComponent,
                this.environmentSelectorComponent,
                this.dataTableComponent
            ], this.getCommonWebviewResources(), 'Connection References');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Connection References', 'Failed to generate panel content: ' + error);
        }
    }

    public dispose(): void {
        ConnectionReferencesPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.solutionSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();

        super.dispose();
    }
}