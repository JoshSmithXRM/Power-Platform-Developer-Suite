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

export class EnvironmentVariablesPanel extends BasePanel {
    public static readonly viewType = 'environmentVariables';
    private static currentPanel: EnvironmentVariablesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private solutionSelectorComponent?: SolutionSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private composer: PanelComposer;
    private componentFactory: ComponentFactory;
    private _componentLogger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get componentLogger() {
        if (!this._componentLogger) {
            this._componentLogger = ServiceFactory.getLoggerService().createComponentLogger('EnvironmentVariablesPanel');
        }
        return this._componentLogger;
    }

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
                className: 'environment-variables-env-selector'
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
                    vscode.window.showInformationMessage(`Environment selected: ${message.data?.environmentId}`);
                    break;
                
                case 'solution-selected':
                    vscode.window.showInformationMessage(`Solution selected: ${message.data?.solutionId}`);
                    break;
                
                case 'refresh-data':
                    vscode.window.showInformationMessage('Environment Variables refreshed');
                    break;
                
                default:
                    console.warn('Unknown message command:', message.command);
            }
        } catch (error) {
            console.error('Error handling message in EnvironmentVariablesPanel:', error);
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