import * as fs from 'fs';

import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { SolutionSelectorComponent } from '../components/selectors/SolutionSelector/SolutionSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { Solution } from '../components/base/ComponentInterface';
import { RelationshipResult, FlowConnectionRelationship } from '../services/ConnectionReferencesService';

import { BasePanel } from './base/BasePanel';

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

export class ConnectionReferencesPanel extends BasePanel {
    public static readonly viewType = 'connectionReferences';
    private static currentPanel: ConnectionReferencesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private currentRelationshipData?: RelationshipResult; // Store original service data for deployment settings
    private currentSolutionId?: string; // Track current solution for "Open in Maker"
    private componentFactory: ComponentFactory; // Per-panel instance to avoid component ID collisions

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (ConnectionReferencesPanel.currentPanel) {
            ConnectionReferencesPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = BasePanel.createWebviewPanel({
            viewType: ConnectionReferencesPanel.viewType,
            title: 'Connection References',
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        ConnectionReferencesPanel.currentPanel = new ConnectionReferencesPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri): void {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
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

        // Load environments after initialization
        this.loadEnvironments();

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
                onChange: (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    this.handleEnvironmentSelection(environmentId);
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
                    {
                        id: 'refreshBtn',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'secondary',
                        disabled: false
                    },
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

                case 'environment-changed':
                    // Only sync component state - onChange callback will handle data loading
                    if (this.environmentSelectorComponent && message.data?.environmentId) {
                        this.environmentSelectorComponent.setSelectedEnvironment(message.data.environmentId);
                    }
                    break;

                case 'refresh-data':
                    await this.refreshConnectionReferences();
                    break;

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

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            // ComponentUtils.sendMessage puts everything in message.data
            const { componentId, eventType, data } = message.data || {};

            // Log based on event significance
            if (eventType === 'selectionChanged') {
                // Business event - INFO level
                const solutionName = data?.selectedSolutions?.[0]?.displayName;
                const solutionId = data?.selectedSolutions?.[0]?.id;
                if (solutionName) {
                    this.componentLogger.info(`Solution selected: ${solutionName}`, { solutionId });
                } else {
                    this.componentLogger.info('Solution selection cleared');
                }
            } else if (eventType === 'search') {
                // User input - DEBUG level
                this.componentLogger.debug(`Search query: "${data?.query || ''}"`, { componentId });
            } else if (eventType === 'actionClicked') {
                // User action - INFO level
                this.componentLogger.info(`Action clicked: ${data?.actionId}`, { componentId });
            } else {
                // UI lifecycle events - TRACE level
                this.componentLogger.trace(`Component event: ${componentId}/${eventType}`);
            }

            // Handle solution selector events
            if (componentId === 'connectionRefs-solutionSelector' && eventType === 'selectionChanged') {
                const { selectedSolutions } = data;

                // Note: Don't call setSelectedSolutions() here as it would trigger the callback
                // and cause duplicate data loading. The webview already has the correct selection.
                // We just store the solution ID for "Open in Maker" and handle selection once.

                if (selectedSolutions && selectedSolutions.length > 0) {
                    const selectedSolution = selectedSolutions[0];
                    this.currentSolutionId = selectedSolution.id; // Store for "Open in Maker"
                    await this.handleSolutionSelection(selectedSolution.id);
                } else {
                    this.currentSolutionId = undefined;
                    await this.handleSolutionSelection('');
                }
                return;
            }

            // Handle action bar events
            if (componentId === 'connectionRefs-actions' && eventType === 'actionClicked') {
                const { actionId } = data;

                switch (actionId) {
                    case 'refreshBtn':
                        await this.refreshConnectionReferences();
                        break;
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
                return;
            }

            // Handle other component events as needed
            this.componentLogger.trace('Component event not handled', { componentId, eventType });

        } catch (error) {
            this.componentLogger.error('Error handling component event', error as Error, {
                componentId: message.componentId,
                eventType: message.eventType
            });
        }
    }

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment selected', { environmentId });

            // Load solutions for this environment
            this.componentLogger.debug('About to call handleLoadSolutions', { environmentId });
            await this.handleLoadSolutions(environmentId);
            this.componentLogger.debug('handleLoadSolutions completed', { environmentId });

        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
    }

    private async handleSolutionSelection(solutionId: string): Promise<void> {
        if (!solutionId) {
            this.componentLogger.debug('Solution selection cleared');
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
                action: 'deploymentSettingsSynced',
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

    private async refreshConnectionReferences(): Promise<void> {
        try {
            this.componentLogger.debug('Refreshing connection references and environments');

            // First refresh the environment list
            await this.loadEnvironments();

            // Get current selections
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();

            if (selectedEnvironment) {
                // Clear table and show loading state for visual feedback
                if (this.dataTableComponent) {
                    this.dataTableComponent.setData([]);
                    this.dataTableComponent.setLoading(true, 'Refreshing connection references...');
                }

                // Disable sync button while refreshing
                if (this.actionBarComponent) {
                    this.actionBarComponent.setActionDisabled('syncDeploymentBtn', true);
                }

                await this.handleLoadConnectionReferences(selectedEnvironment.id, selectedSolution?.id);
                vscode.window.showInformationMessage('Connection References refreshed');
            } else {
                vscode.window.showWarningMessage('Please select an environment first');
            }
        } catch (error) {
            this.componentLogger.error('Error refreshing connection references', error as Error);
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }
            vscode.window.showErrorMessage('Failed to refresh connection references');
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

    private async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent, this.componentLogger, ConnectionReferencesPanel.viewType);
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