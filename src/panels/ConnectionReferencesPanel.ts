import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { SolutionSelectorComponent } from '../components/selectors/SolutionSelector/SolutionSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { Environment } from '../components/base/ComponentInterface';
import { EnvironmentConnection } from '../models/PowerPlatformSettings';

export class ConnectionReferencesPanel extends BasePanel {
    public static readonly viewType = 'connectionReferences';
    private static currentPanel: ConnectionReferencesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private composer: PanelComposer;
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (ConnectionReferencesPanel.currentPanel) {
            ConnectionReferencesPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ConnectionReferencesPanel.viewType,
            'Connection References',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            }
        );

        ConnectionReferencesPanel.currentPanel = new ConnectionReferencesPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: ConnectionReferencesPanel.viewType,
            title: 'Connection References'
        });

        this.componentFactory = new ComponentFactory();
        this.composer = new PanelComposer(extensionUri);

        this.panel.onDidDispose(() => {
            ConnectionReferencesPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');

        this.initializeComponents();
        
        // Set up event bridges for component communication
        this.setupComponentEventBridges();

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
                label: 'Select Environment',
                placeholder: 'Choose an environment to view connection references...',
                required: true,
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
                label: 'Filter by Solution (Optional)',
                placeholder: 'All Solutions',
                required: false,
                allowMultiSelect: false,
                solutions: [],
                className: 'connection-references-solution-selector',
                onSelectionChange: (selectedSolutions: any[]) => {
                    const solutionId = selectedSolutions.length > 0 ? selectedSolutions[0].id : '';
                    this.componentLogger.debug('Solution onSelectionChange triggered', { solutionId, selectedSolutions });
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
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'primary',
                        disabled: false
                    },
                    {
                        id: 'create',
                        label: 'Create New Reference',
                        icon: 'add',
                        variant: 'secondary',
                        disabled: true
                    },
                    {
                        id: 'export',
                        label: 'Export References',
                        icon: 'export',
                        variant: 'secondary',
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
                        filterable: true,
                        width: '250px'
                    },
                    {
                        id: 'connectionReference',
                        label: 'Connection Reference',
                        field: 'connectionReference',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'connectorType',
                        label: 'Connector Type',
                        field: 'connectorType',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    },
                    {
                        id: 'connectionName',
                        label: 'Connection',
                        field: 'connectionName',
                        sortable: true,
                        filterable: true,
                        width: '150px'
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
                filterable: true,
                className: 'connection-references-table'
            });
            this.componentLogger.trace('DataTableComponent created successfully');
            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Connection References panel');
        }
    }

    /**
     * Get component type from component instance
     */
    private getComponentType(component: any): string {
        if (!component) {
            console.log('DEBUG: getComponentType called with null/undefined component');
            return 'Unknown';
        }
        
        const constructor = component.constructor;
        const className = constructor.name;
        
        console.log('DEBUG: getComponentType - className:', className, 'component:', component);
        
        // Map class names to component types
        const typeMapping: { [key: string]: string } = {
            'DataTableComponent': 'DataTable',
            'EnvironmentSelectorComponent': 'EnvironmentSelector', 
            'SolutionSelectorComponent': 'SolutionSelector',
            'ActionBarComponent': 'ActionBar',
            'SearchFormComponent': 'SearchForm',
            'FilterFormComponent': 'FilterForm'
        };
        
        const mappedType = typeMapping[className] || className || 'Unknown';
        console.log('DEBUG: getComponentType result:', mappedType);
        
        return mappedType;
    }

    /**
     * Set up event bridges to forward component events to webview
     */
    private setupComponentEventBridges(): void {
        this.componentLogger.debug('Setting up component event bridges');
        
        const components = [
            this.environmentSelectorComponent,
            this.solutionSelectorComponent,
            this.actionBarComponent,
            this.dataTableComponent
        ].filter(Boolean); // Filter out any undefined components
        
        components.forEach(component => {
            if (component) {
                // Set up update event bridge
                component.on('update', (event) => {
                    this.componentLogger.trace('Component update event received', { 
                        componentId: event.componentId 
                    });
                    
                    // Get component data for update
                    const componentData = (component as any).getData?.() || null;
                    const componentType = this.getComponentType(component);
                    
                    this.componentLogger.debug('Event bridge forwarding component update to webview', {
                        componentId: event.componentId,
                        componentType: componentType,
                        dataLength: componentData?.length || 0
                    });
                    
                    console.log('DEBUG: Event bridge received update event, forwarding to webview:', {
                        componentId: event.componentId,
                        componentType: componentType,
                        dataLength: componentData?.length || 0
                    });
                    
                    this.postMessage({
                        action: 'componentUpdate',
                        componentId: event.componentId,
                        componentType: componentType,
                        data: componentData
                    });
                    
                    this.componentLogger.trace('Event bridge message posted to webview');
                    console.log('DEBUG: Message posted to webview successfully');
                });
                
                // Set up state change event bridge
                component.on('stateChange', (event) => {
                    this.componentLogger.trace('Component state change event received', { 
                        componentId: event.componentId 
                    });
                    this.postMessage({
                        action: 'componentStateChange',
                        componentId: event.componentId,
                        state: event.state
                    });
                });
            }
        });
        
        this.componentLogger.info('Component event bridges set up', { 
            bridgeCount: components.length 
        });
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'environmentChanged':
                case 'environment-selected':
                    await this.handleEnvironmentSelection(message.data?.environmentId);
                    break;

                case 'solution-selected':
                    await this.handleSolutionSelection(message.data?.solutionId);
                    break;

                case 'loadSolutions':
                    await this.handleLoadSolutions(message.data?.environmentId);
                    break;

                case 'loadConnectionReferences':
                    await this.handleLoadConnectionReferences(message.data?.environmentId, message.data?.solutionId);
                    break;

                case 'syncDeploymentSettings':
                    await this.handleSyncDeploymentSettings(message.data?.relationships, message.data?.solutionUniqueName);
                    break;

                case 'openInMaker':
                    await this.handleOpenInMaker(message.data?.environmentId, message.data?.solutionId, message.data?.entityType);
                    break;

                case 'refresh-data':
                    await this.refreshConnectionReferences();
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    // Panel is ready, no action needed
                    break;

                case 'component-event':
                    this.componentLogger.debug('Component event received', { data: message.data });
                    // Handle component-specific events if needed
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
            this.componentLogger.info('Solution selected', { solutionId });

            // Get current environment ID
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (selectedEnvironment) {
                await this.handleLoadConnectionReferences(selectedEnvironment.id, solutionId);
            }

        } catch (error) {
            this.componentLogger.error('Error handling solution selection', error as Error, { solutionId });
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
                // Transform solutions to match component interface
                const transformedSolutions = solutions.map((sol: any) => ({
                    id: sol.solutionId,
                    uniqueName: sol.uniqueName,
                    displayName: sol.friendlyName || sol.displayName,
                    friendlyName: sol.friendlyName,
                    publisherName: sol.publisherDisplayName || '',
                    publisherId: sol.publisherId || '',
                    isManaged: sol.isManaged || false,
                    isVisible: true,
                    version: sol.version || '',
                    description: sol.description || '',
                    components: {
                        entities: 0,
                        workflows: 0,
                        webResources: 0,
                        plugins: 0,
                        customControls: 0,
                        total: 0
                    }
                }));

                this.solutionSelectorComponent.setSolutions(transformedSolutions);

                // Auto-select Default solution if available
                const defaultSolution = transformedSolutions.find(s => s.uniqueName === 'Default');
                if (defaultSolution) {
                    this.solutionSelectorComponent.setSelectedSolutions([defaultSolution]);
                    // Note: setSelectedSolutions will automatically trigger onSelectionChange handler
                    // which calls handleSolutionSelection -> handleLoadConnectionReferences
                    // So we don't need to manually call it here to avoid duplicate execution
                }

                // Note: setSolutions() already calls notifyStateChange() to update component in webview
                // No need to call updateWebview() which would reload the entire HTML
            }

            this.postMessage({
                action: 'solutionsLoaded',
                data: solutions,
                selectedSolutionId: solutions.find(s => s.uniqueName === 'Default')?.solutionId
            });
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
                console.log('DEBUG: About to call setData with data:', tableData.relationships?.length || 0);
                this.dataTableComponent.setData(tableData.relationships || []);
                this.componentLogger.trace('setData() call completed - event bridge should have forwarded to webview');
                console.log('DEBUG: setData() completed, event should have been emitted');
                // Note: setData() already calls notifyUpdate() to update the table in webview
                // No need to call updateWebview() which would reload the entire HTML
            }

            this.postMessage({
                action: 'connectionReferencesLoaded',
                data: tableData
            });

            this.componentLogger.info('Connection references loaded successfully', {
                environmentId,
                solutionId: solutionId || 'all',
                relationshipsCount: tableData.relationships?.length || 0
            });

        } catch (error) {
            this.componentLogger.error('Error loading connection references', error as Error, { environmentId, solutionId });
            this.postMessage({
                action: 'error',
                message: `Failed to load connection references: ${(error as Error).message}`
            });
        }
    }

    private transformConnectionReferencesData(relationships: any): any {
        if (!relationships || !relationships.relationships) {
            this.componentLogger.debug('No relationships data to transform', { relationships });
            return { relationships: [] };
        }

        const relationshipItems = relationships.relationships || [];
        this.componentLogger.debug('Transforming relationships for table display', {
            relationshipCount: relationshipItems.length
        });

        const transformedRelationships = relationshipItems.map((rel: any) => ({
            id: rel.id, // Already has unique ID from service
            flowName: rel.flowName || 'No Flow Associated',
            connectionReference: rel.connectionReferenceLogicalName || 'No Connection Reference',
            connectorType: rel.connectorType || 'Unknown Connector',
            relationshipType: rel.relationshipType || 'unknown',
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

    private async handleSyncDeploymentSettings(relationships: any, solutionUniqueName?: string): Promise<void> {
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
            this.componentLogger.debug('Refreshing connection references');

            // Get current selections
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();

            if (selectedEnvironment) {
                await this.handleLoadConnectionReferences(selectedEnvironment.id, selectedSolution?.id);
                vscode.window.showInformationMessage('Connection References refreshed');
            } else {
                vscode.window.showWarningMessage('Please select an environment first');
            }
        } catch (error) {
            this.componentLogger.error('Error refreshing connection references', error as Error);
            vscode.window.showErrorMessage('Failed to refresh connection references');
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.solutionSelectorComponent ||
                !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');

            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.environmentSelectorComponent,
                this.solutionSelectorComponent,
                this.actionBarComponent,
                this.dataTableComponent
            ], this.getCommonWebviewResources(), 'Connection References');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Failed to generate panel content: ' + error);
        }
    }

    private getErrorHtml(message: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Connection References - Error</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-errorForeground);
                        background: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                    .error-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="error-icon">⚠️</div>
                <h2>Connection References Error</h2>
                <p>${message}</p>
            </body>
            </html>
        `;
    }

    private async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent, this.componentLogger);
        }
    }

    public dispose(): void {
        ConnectionReferencesPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.solutionSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();
        this.componentFactory?.dispose();

        super.dispose();
    }
}