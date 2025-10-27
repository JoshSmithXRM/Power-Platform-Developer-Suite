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
import {
    EnvironmentVariableData,
    EnvironmentVariableDefinition,
    EnvironmentVariableValue
} from '../services/EnvironmentVariablesService';

import { BasePanel } from './base/BasePanel';

// UI-specific type for table display
interface EnvironmentVariableTableRow {
    id: string;
    displayName: string;
    schemaName: string;
    type: string;
    defaultValue: string;
    currentValue: string;
    isManaged: string;
    modifiedOn: string;
    modifiedBy: string;
}

export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';
    private static currentPanel: EnvironmentVariablesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private currentEnvironmentVariablesData?: EnvironmentVariableData; // Store original service data for deployment settings
    private currentSolutionId?: string; // Track current solution for "Open in Maker"
    private componentFactory: ComponentFactory;

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (EnvironmentVariablesPanel.currentPanel) {
            EnvironmentVariablesPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = BasePanel.createWebviewPanel({
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables',
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        EnvironmentVariablesPanel.currentPanel = new EnvironmentVariablesPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri): void {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentVariablesPanel.viewType,
            title: 'Environment Variables'
        });

        this.panel.onDidDispose(() => {
            EnvironmentVariablesPanel.currentPanel = undefined;
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
                id: 'envVars-envSelector',
                label: 'Environment',
                placeholder: 'Choose an environment to view variables...',
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
            // Note: Callback handles programmatic selection, component-event handles user selection
            this.solutionSelectorComponent = this.componentFactory.createSolutionSelector({
                id: 'envVars-solutionSelector',
                label: 'Solution',
                placeholder: 'All Solutions',
                required: false,
                solutions: [],
                className: 'environment-variables-solution-selector',
                onSelectionChange: (selectedSolutions: Solution[]) => {
                    const solutionId = selectedSolutions.length > 0 ? selectedSolutions[0].id : '';
                    this.componentLogger.debug('Solution onSelectionChange callback triggered (programmatic)', { solutionId });
                    this.currentSolutionId = solutionId || undefined; // Store for "Open in Maker"
                    this.handleSolutionSelection(solutionId);
                }
            });
            this.componentLogger.trace('SolutionSelectorComponent created successfully');

            this.componentLogger.trace('Creating ActionBarComponent');
            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'envVars-actions',
                actions: [
                    {
                        id: 'openInMakerBtn',
                        label: 'Open in Maker',
                        variant: 'primary',
                        disabled: false
                    },
                    {
                        id: 'refresh',
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
                defaultSort: [{ column: 'displayName', direction: 'asc' }],
                searchable: true,
                showFooter: true,
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
            // Ignore empty/malformed messages (happens during webview initialization)
            if (!message || !message.command) {
                this.componentLogger.trace('Received message without command, ignoring', { message });
                return;
            }

            switch (message.command) {
                case 'environment-changed':
                    // Only sync component state - onChange callback will handle data loading
                    if (this.environmentSelectorComponent && message.data?.environmentId) {
                        this.environmentSelectorComponent.setSelectedEnvironment(message.data.environmentId);
                    }
                    break;

                case 'solution-selected':
                    await this.handleSolutionSelection(message.data?.solutionId);
                    break;

                case 'load-solutions':
                    await this.handleLoadSolutions(message.data?.environmentId);
                    break;

                case 'load-environment-variables':
                    await this.handleLoadEnvironmentVariables(message.data?.environmentId, message.data?.solutionId);
                    break;

                case 'sync-deployment-settings':
                    await this.handleSyncDeploymentSettings(message.data?.environmentVariablesData, message.data?.solutionUniqueName);
                    break;

                case 'open-in-maker':
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
            } else if (eventType === 'actionClicked') {
                // User action - INFO level
                this.componentLogger.info(`Action clicked: ${data?.actionId}`, { componentId });
            } else {
                // Other events - DEBUG level
                this.componentLogger.debug('Component event received', { componentId, eventType });
            }

            // Handle solution selector events
            if (componentId === 'envVars-solutionSelector' && eventType === 'selectionChanged') {
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
            if (componentId === 'envVars-actions' && eventType === 'actionClicked') {
                const { actionId } = data;

                switch (actionId) {
                    case 'refresh':
                        await this.refreshEnvironmentVariables();
                        break;
                    case 'syncDeploymentBtn': {
                        // Use original service data for deployment settings sync
                        if (!this.currentEnvironmentVariablesData) {
                            this.postMessage({ action: 'error', message: 'No environment variables data available for sync' });
                            break;
                        }
                        const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();

                        await this.handleSyncDeploymentSettings(
                            this.currentEnvironmentVariablesData,
                            selectedSolution?.uniqueName
                        );
                        break;
                    }
                    case 'openInMakerBtn': {
                        const envId = this.environmentSelectorComponent?.getSelectedEnvironment()?.id;
                        const solId = this.currentSolutionId; // Use tracked solution ID

                        if (envId && solId) {
                            await this.handleOpenInMaker(envId, solId, 'environment%20variables');
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

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.solutionSelectorComponent ||
                !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Environment Variables', 'Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');

            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.actionBarComponent,
                this.solutionSelectorComponent,
                this.environmentSelectorComponent,
                this.dataTableComponent
            ], this.getCommonWebviewResources(), 'Environment Variables');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Environment Variables', 'Failed to generate panel content: ' + error);
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

            // Clear table and show loading state immediately for visual feedback
            if (this.dataTableComponent) {
                this.dataTableComponent.setData([]);
                this.dataTableComponent.setLoading(true, 'Loading environment variables...');
            }

            // Disable sync button while loading
            if (this.actionBarComponent) {
                this.actionBarComponent.setActionDisabled('syncDeploymentBtn', true);
            }

            // Get current environment ID
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            if (selectedEnvironment) {
                await this.handleLoadEnvironmentVariables(selectedEnvironment.id, solutionId);
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
                // Use solutions directly from service - no transformation needed
                this.solutionSelectorComponent.setSolutions(solutions);

                // Auto-select Default solution if available
                const defaultSolution = solutions.find(s => s.uniqueName === 'Default');
                if (defaultSolution) {
                    this.solutionSelectorComponent.setSelectedSolutions([defaultSolution]);
                    // Note: setSelectedSolutions will automatically trigger onSelectionChange handler
                    // which calls handleSolutionSelection -> handleLoadEnvironmentVariables
                    // So we don't need to manually call it here to avoid duplicate execution
                }
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

            // Store original service data for deployment settings
            this.currentEnvironmentVariablesData = environmentVariablesData;

            // Transform data for table display
            const tableData = this.transformEnvironmentVariablesData(environmentVariablesData);

            // Update the data table component directly (matches ConnectionReferencesPanel pattern)
            if (this.dataTableComponent) {
                this.componentLogger.info('Updating DataTableComponent with environment variables data', {
                    rowCount: tableData.length
                });

                // Clear loading state BEFORE setting data to ensure proper state in update event
                this.dataTableComponent.setLoading(false);
                this.dataTableComponent.setData(tableData);
                // Note: setData() already calls notifyUpdate() to update the table in webview
            }

            // Enable sync deployment settings button if we have data
            if (this.actionBarComponent && tableData.length > 0) {
                this.componentLogger.info('Enabling sync deployment settings button', {
                    hasActionBar: !!this.actionBarComponent,
                    dataCount: tableData.length
                });
                const result = this.actionBarComponent.setActionDisabled('syncDeploymentBtn', false);
                this.componentLogger.info('Sync button enable result', { success: result });
            } else {
                this.componentLogger.warn('Not enabling sync button', {
                    hasActionBar: !!this.actionBarComponent,
                    dataCount: tableData.length
                });
            }

            this.componentLogger.info('Environment variables loaded successfully', {
                environmentId,
                solutionId: solutionId || 'all',
                variablesCount: tableData.length
            });
        } catch (error) {
            this.componentLogger.error('Error loading environment variables', error as Error, { environmentId, solutionId });

            // Clear loading state on error to prevent stuck spinner
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }

            this.postMessage({
                action: 'error',
                message: `Failed to load environment variables: ${(error as Error).message}`
            });
        }
    }

    private transformEnvironmentVariablesData(data: EnvironmentVariableData): EnvironmentVariableTableRow[] {
        const definitions = data.definitions || [];
        const values = data.values || [];

        // Create a map of environment variable values by definition ID
        const valuesMap = new Map<string, EnvironmentVariableValue>();
        values.forEach((value: EnvironmentVariableValue) => {
            valuesMap.set(value.environmentvariabledefinitionid, value);
        });

        // Transform definitions to include values and formatting for table display
        return definitions.map((def: EnvironmentVariableDefinition): EnvironmentVariableTableRow => {
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
                modifiedBy: (value ? value.modifiedby : def.modifiedby) || ''
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

    private async handleSyncDeploymentSettings(environmentVariablesData: EnvironmentVariableData, solutionUniqueName?: string): Promise<void> {
        try {
            const deploymentSettingsService = ServiceFactory.getDeploymentSettingsService();

            // Prompt user to select or create deployment settings file
            const filePath = await deploymentSettingsService.selectDeploymentSettingsFile(solutionUniqueName);
            if (!filePath) {
                return; // User cancelled
            }

            const isNewFile = !fs.existsSync(filePath);

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
            this.componentLogger.debug('Refreshing environment variables and environments');

            // First refresh the environment list
            await this.loadEnvironments();

            // Get current selections
            const selectedEnvironment = this.environmentSelectorComponent?.getSelectedEnvironment();
            const selectedSolution = this.solutionSelectorComponent?.getSelectedSolution();

            if (selectedEnvironment) {
                // Clear table and show loading state for visual feedback
                if (this.dataTableComponent) {
                    this.dataTableComponent.setData([]);
                    this.dataTableComponent.setLoading(true, 'Refreshing environment variables...');
                }

                // Disable sync button while refreshing
                if (this.actionBarComponent) {
                    this.actionBarComponent.setActionDisabled('syncDeploymentBtn', true);
                }

                await this.handleLoadEnvironmentVariables(selectedEnvironment.id, selectedSolution?.id);
                vscode.window.showInformationMessage('Environment Variables refreshed');
            } else {
                vscode.window.showWarningMessage('Please select an environment first');
            }
        } catch (error) {
            this.componentLogger.error('Error refreshing environment variables', error as Error);
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }
            vscode.window.showErrorMessage('Failed to refresh environment variables');
        }
    }

    public dispose(): void {
        EnvironmentVariablesPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.solutionSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();

        super.dispose();
    }
}