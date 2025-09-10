import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';

export class ConnectionReferencesPanel extends BasePanel {
    public static readonly viewType = 'connectionReferences';
    private static currentPanel: ConnectionReferencesPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private dataTableComponent?: DataTableComponent;
    private composer: PanelComposer;
    private componentFactory: ComponentFactory;
    private _componentLogger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get componentLogger() {
        if (!this._componentLogger) {
            this._componentLogger = ServiceFactory.getLoggerService().createComponentLogger('ConnectionReferencesPanel');
        }
        return this._componentLogger;
    }

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
                label: 'Select Environment',
                placeholder: 'Choose an environment to view connection references...',
                required: true,
                environments: [],
                showRefreshButton: true,
                className: 'connection-references-env-selector'
            });
            this.componentLogger.trace('EnvironmentSelectorComponent created successfully');

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
                        id: 'displayName',
                        label: 'Display Name',
                        field: 'displayName',
                        sortable: true,
                        filterable: true,
                        width: '250px'
                    },
                    {
                        id: 'logicalName',
                        label: 'Logical Name',
                        field: 'logicalName',
                        sortable: true,
                        filterable: true,
                        width: '200px',
                        align: 'left'
                    },
                    {
                        id: 'connectionType',
                        label: 'Connection Type',
                        field: 'connectionType',
                        sortable: true,
                        filterable: true,
                        width: '150px'
                    },
                    {
                        id: 'status',
                        label: 'Status',
                        field: 'status',
                        sortable: true,
                        filterable: true,
                        width: '120px',
                        align: 'center'
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

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'environment-selected':
                    vscode.window.showInformationMessage(`Environment selected: ${message.data?.environmentId}`);
                    break;
                
                case 'refresh-data':
                    vscode.window.showInformationMessage('Connection References refreshed');
                    break;
                
                default:
                    console.warn('Unknown message command:', message.command);
            }
        } catch (error) {
            console.error('Error handling message in ConnectionReferencesPanel:', error);
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
            if (!this.environmentSelectorComponent || !this.actionBarComponent || !this.dataTableComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');
            
            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.environmentSelectorComponent,
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

    public dispose(): void {
        ConnectionReferencesPanel.currentPanel = undefined;
        
        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.dataTableComponent?.dispose();
        this.componentFactory?.dispose();

        super.dispose();
    }
}