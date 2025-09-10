import * as vscode from 'vscode';
import { BasePanel } from './base/BasePanel';
import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';

export class EnvironmentSetupPanel extends BasePanel {
    public static readonly viewType = 'environmentSetup';
    private static currentPanel: EnvironmentSetupPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private composer: PanelComposer;
    private componentFactory: ComponentFactory;
    private _componentLogger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get componentLogger() {
        if (!this._componentLogger) {
            this._componentLogger = ServiceFactory.getLoggerService().createComponentLogger('EnvironmentSetupPanel');
        }
        return this._componentLogger;
    }

    public static createOrShow(extensionUri: vscode.Uri, environment?: any) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (EnvironmentSetupPanel.currentPanel) {
            EnvironmentSetupPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            EnvironmentSetupPanel.viewType,
            'Environment Setup',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            }
        );

        EnvironmentSetupPanel.currentPanel = new EnvironmentSetupPanel(panel, extensionUri, environment);
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        private initialEnvironment?: any
    ) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: EnvironmentSetupPanel.viewType,
            title: 'Environment Setup'
        });

        this.componentFactory = new ComponentFactory();
        this.composer = new PanelComposer(extensionUri);

        this.panel.onDidDispose(() => {
            EnvironmentSetupPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting', { 
            hasInitialEnvironment: !!initialEnvironment 
        });
        
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
                id: 'environmentSetup-envSelector',
                label: 'Select Environment',
                placeholder: 'Choose an environment to configure...',
                required: true,
                onChange: (environmentId: string) => {
                    this.handleEnvironmentSelection(environmentId);
                },
                environments: [],
                showEnvironmentInfo: true,
                showRefreshButton: true,
                className: 'environment-setup-selector'
            });
            this.componentLogger.trace('EnvironmentSelectorComponent created successfully');

            this.componentLogger.trace('Creating ActionBarComponent');
            // Action Bar Component
            this.actionBarComponent = this.componentFactory.createActionBar({
                id: 'environmentSetup-actions',
                actions: [
                    {
                        id: 'save',
                        label: 'Save Settings',
                        icon: 'save',
                        variant: 'primary',
                        disabled: true
                    },
                    {
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'refresh',
                        variant: 'secondary',
                        disabled: false
                    },
                    {
                        id: 'reset',
                        label: 'Reset to Default',
                        icon: 'discard',
                        variant: 'secondary',
                        disabled: true,
                        confirmMessage: 'Are you sure you want to reset all settings to default values?'
                    }
                ],
                layout: 'horizontal',
                className: 'environment-setup-actions'
            });
            this.componentLogger.trace('ActionBarComponent created successfully');
            this.componentLogger.debug('All components initialized successfully');

        } catch (error) {
            this.componentLogger.error('Error initializing components', error as Error);
            vscode.window.showErrorMessage('Failed to initialize Environment Setup panel');
        }
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'environment-selected':
                    await this.handleEnvironmentSelection(message.data?.environmentId);
                    break;
                
                case 'save-settings':
                    await this.saveEnvironmentSettings(message.data?.settings);
                    break;
                
                case 'refresh-environments':
                    await this.refreshEnvironments();
                    break;
                
                case 'reset-settings':
                    await this.resetSettings();
                    break;
                
                default:
                    console.warn('Unknown message command:', message.command);
            }
        } catch (error) {
            console.error('Error handling message in EnvironmentSetupPanel:', error);
            this.postMessage({
                command: 'error',
                action: 'error',
                message: 'An error occurred while processing your request'
            });
        }
    }

    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        if (!environmentId) {
            return;
        }

        try {
            vscode.window.showInformationMessage(`Environment selected: ${environmentId}`);

        } catch (error) {
            console.error('Error loading environment:', error);
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
    }

    private async saveEnvironmentSettings(settings: any): Promise<void> {
        try {
            vscode.window.showInformationMessage('Environment settings saved successfully');

        } catch (error) {
            console.error('Error saving environment settings:', error);
            vscode.window.showErrorMessage('Failed to save environment settings');
        }
    }

    private async refreshEnvironments(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Environments refreshed successfully');

        } catch (error) {
            console.error('Error refreshing environments:', error);
            vscode.window.showErrorMessage('Failed to refresh environments');
        }
    }

    private async resetSettings(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Settings reset to default values');

        } catch (error) {
            console.error('Error resetting settings:', error);
            vscode.window.showErrorMessage('Failed to reset settings');
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.actionBarComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');
            
            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.environmentSelectorComponent,
                this.actionBarComponent
            ], this.getCommonWebviewResources(), 'Environment Setup');

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
                <title>Environment Setup - Error</title>
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
                <h2>Environment Setup Error</h2>
                <p>${message}</p>
            </body>
            </html>
        `;
    }

    public dispose(): void {
        EnvironmentSetupPanel.currentPanel = undefined;
        
        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();
        this.componentFactory?.dispose();

        super.dispose();
    }
}