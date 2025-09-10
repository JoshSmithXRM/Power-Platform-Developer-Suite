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

export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';
    private static currentPanel: EnvironmentVariablesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private composer: PanelComposer;
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (EnvironmentVariablesPanel.currentPanel) {
            EnvironmentVariablesPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentVariablesPanel.viewType,
            'Environment Variables',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            }
        );

        EnvironmentVariablesPanel.currentPanel = new EnvironmentVariablesPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri) {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables'
        });

        this.componentFactory = new ComponentFactory();
        this.composer = new PanelComposer(extensionUri);

        this.panel.onDidDispose(() => {
            EnvironmentVariablesPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting');
        
        this.initializeComponents();
        
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
                id: 'envVars-envSelector',
                label: 'Select Environment',
                placeholder: 'Choose an environment to view variables...',
                required: true,
                environments: [],
                showRefreshButton: true,
                className: 'environment-variables-env-selector',
                onChange: (environmentId: string) => {
                    this.componentLogger.debug('Environment onChange triggered', { environmentId });
                    this.handleEnvironmentSelection(environmentId);
                }
            });
            this.componentLogger.trace('EnvironmentSelectorComponent created successfully');

            this.componentLogger.trace('Creating SolutionSelectorComponent');
            // Solution Selector Component
            this.solutionSelectorComponent = this.componentFactory.createSolutionSelector({
                id: 'envVars-solutionSelector',
                label: 'Filter by Solution (Optional)',
                placeholder: 'All Solutions',
                required: false,
                solutions: [],
                className: 'environment-variables-solution-selector'
            });
            this.componentLogger.trace('SolutionSelectorComponent created successfully');

            this.componentLogger.trace('Creating ActionBarComponent');
            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'envVars-actions',
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
                        label: 'Create Variable',
                        icon: 'add',
                        variant: 'secondary',
                        disabled: true
                    },
                    {
                        id: 'export',
                        label: 'Export Variables',
                        icon: 'export',
                        variant: 'secondary',
                        disabled: true
                    }
                ],
                layout: 'horizontal',
                className: 'environment-variables-actions'
            });
            this.componentLogger.trace('ActionBarComponent created successfully');

            this.componentLogger.trace('Creating DataTableComponent');
            // Data Table Component
            this.dataTableComponent = this.componentFactory.createDataTable({
                id: 'envVars-table',
                columns: [
                    {
                        id: 'displayName',
                        label: 'Display Name',
                        field: 'displayName',
                        sortable: true,
                        filterable: true,
                        width: '200px'
                    },
                    {
                        id: 'schemaName',
                        label: 'Schema Name',
                        field: 'schemaName',
                        sortable: true,
                        filterable: true,
                        width: '200px',
                        align: 'left'
                    },
                    {
                        id: 'type',
                        label: 'Type',
                        field: 'type',
                        sortable: true,
                        filterable: true,
                        width: '100px',
                        align: 'center'
                    },
                    {
                        id: 'currentValue',
                        label: 'Current Value',
                        field: 'currentValue',
                        sortable: false,
                        filterable: false,
                        width: '250px'
                    }
                ],
                data: [],
                sortable: true,
                filterable: true,
                className: 'environment-variables-table'
            });
            this.componentLogger.trace('DataTableComponent created successfully');
            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Environment Variables panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'environment-selected':
                case 'environmentChanged':
                    await this.handleEnvironmentSelection(message.data?.environmentId);
                    break;
                
                case 'solution-selected':
                    await this.handleSolutionSelection(message.data?.solutionId);
                    break;
                
                case 'loadSolutions':
                    await this.handleLoadSolutions(message.data?.environmentId);
                    break;

                case 'loadEnvironmentVariables':
                    await this.handleLoadEnvironmentVariables(message.data?.environmentId, message.data?.solutionId);
                    break;

                case 'syncDeploymentSettings':
                    await this.handleSyncDeploymentSettings(message.data?.environmentVariablesData, message.data?.solutionUniqueName);
                    break;

                case 'openInMaker':
                    await this.handleOpenInMaker(message.data?.environmentId, message.data?.solutionId, message.data?.entityType);
                    break;
                
                case 'refresh-data':
                    await this.refreshEnvironmentVariables();
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
            ], this.getCommonWebviewResources(), 'Environment Variables');

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
                <title>Environment Variables - Error</title>
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
                <h2>Environment Variables Error</h2>
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

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        if (!environmentId) {
            this.componentLogger.debug('Environment selection cleared');
            return;
        }

        try {
            this.componentLogger.info('Environment selected', { environmentId });
            
            // Load solutions for this environment
            await this.handleLoadSolutions(environmentId);
            
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
                await this.handleLoadEnvironmentVariables(selectedEnvironment.id, solutionId);
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
                    
                    // Trigger environment variables loading for the auto-selected solution
                    await this.handleLoadEnvironmentVariables(environmentId, defaultSolution.id);
                }
                
                this.updateWebview();
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

    private async handleLoadEnvironmentVariables(environmentId: string, solutionId?: string): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this.componentLogger.info('Loading environment variables', { environmentId, solutionId });

            // Save state
            await this._stateService.savePanelState(EnvironmentVariablesPanel.viewType, {
                selectedEnvironmentId: environmentId
            });

            // Fetch environment variables data with optional solution filtering
            const environmentVariablesService = ServiceFactory.getEnvironmentVariablesService();
            const environmentVariablesData = await environmentVariablesService.getEnvironmentVariables(environmentId, solutionId);

            // Transform data for table display
            const tableData = this.transformEnvironmentVariablesData(environmentVariablesData);

            this.postMessage({
                action: 'environmentVariablesLoaded',
                data: tableData
            });
        } catch (error) {
            this.componentLogger.error('Error loading environment variables', error as Error, { environmentId, solutionId });
            this.postMessage({
                action: 'error',
                message: `Failed to load environment variables: ${(error as Error).message}`
            });
        }
    }

    private transformEnvironmentVariablesData(data: any): any[] {
        const definitions = data.definitions || [];
        const values = data.values || [];

        // Create a map of environment variable values by definition ID
        const valuesMap = new Map();
        values.forEach((value: any) => {
            valuesMap.set(value.environmentvariabledefinitionid, value);
        });

        // Transform definitions to include values and formatting for table display
        return definitions.map((def: any) => {
            const value = valuesMap.get(def.environmentvariabledefinitionid);
            return {
                id: def.environmentvariabledefinitionid,
                displayName: def.displayname || '',
                schemaName: def.schemaname || '',
                type: this.getTypeDisplayName(def.type),
                defaultValue: def.defaultvalue || '<em>No default</em>',
                currentValue: value ? value.value : '<em>No value set</em>',
                isManaged: def.ismanaged ? 'Yes' : 'No',
                modifiedOn: this.formatDate(value ? value.modifiedon : def.modifiedon),
                modifiedBy: value ? value.modifiedby : def.modifiedby || ''
            };
        });
    }

    private getTypeDisplayName(type: number): string {
        switch (type) {
            case 100000000: return 'String';
            case 100000001: return 'Number';
            case 100000002: return 'Boolean';
            case 100000003: return 'JSON';
            case 100000004: return 'Data Source';
            default: return 'Unknown';
        }
    }

    private formatDate(dateString: string): string {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    }

    private async handleSyncDeploymentSettings(environmentVariablesData: any, solutionUniqueName?: string): Promise<void> {
        try {
            const deploymentSettingsService = ServiceFactory.getDeploymentSettingsService();
            
            // Prompt user to select or create deployment settings file
            const filePath = await deploymentSettingsService.selectDeploymentSettingsFile(solutionUniqueName);
            if (!filePath) {
                return; // User cancelled
            }

            const isNewFile = !require('fs').existsSync(filePath);
            
            // Sync environment variables with the file
            const result = await deploymentSettingsService.syncEnvironmentVariables(filePath, environmentVariablesData, isNewFile);
            
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

    private async refreshEnvironmentVariables(): Promise<void> {
        try {
            this.componentLogger.debug('Refreshing environment variables');
            
            // Get current selections
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();
            
            if (selectedEnvironment) {
                await this.handleLoadEnvironmentVariables(selectedEnvironment.id, selectedSolution?.id);
                vscode.window.showInformationMessage('Environment Variables refreshed');
            } else {
                vscode.window.showWarningMessage('Please select an environment first');
            }
        } catch (error) {
            this.componentLogger.error('Error refreshing environment variables', error as Error);
            vscode.window.showErrorMessage('Failed to refresh environment variables');
        }
    }

    public dispose(): void {
        EnvironmentVariablesPanel.currentPanel = undefined;
        
        this.environmentSelectorComponent?.dispose();
        this.solutionSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();
        this.componentFactory?.dispose();

        super.dispose();
    }
}