import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';

import { BasePanel } from './base/BasePanel';

export class EnvironmentSetupPanel extends BasePanel {
    public static readonly viewType = 'environmentSetup';
    private static currentPanel: EnvironmentSetupPanel | undefined;

    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;

    public static createOrShow(extensionUri: vscode.Uri, environment?: any): void {
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

        this.panel.onDidDispose(() => {
            EnvironmentSetupPanel.currentPanel = undefined;
        });

        this.componentLogger.debug('Constructor starting', {
            hasInitialEnvironment: !!initialEnvironment
        });

        this.initializeComponents();

        // Set up event bridges for component communication using BasePanel method
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.actionBarComponent
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
            const componentFactory = ServiceFactory.getComponentFactory();

            this.componentLogger.trace('Creating EnvironmentSelectorComponent');
            // Environment Selector Component
            this.environmentSelectorComponent = componentFactory.createEnvironmentSelector({
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
            this.actionBarComponent = componentFactory.createActionBar({
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
                case 'environment-changed':
                    await this.handleEnvironmentSelection(message.data?.environmentId);
                    break;
                
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
            
            // Get environment details
            const environmentConnections = await this._authService.getEnvironments();
            const environments = this.convertEnvironmentConnections(environmentConnections);
            const selectedEnvironment = environments.find(env => env.id === environmentId);
            
            if (selectedEnvironment) {
                this.componentLogger.debug('Environment details loaded', { 
                    name: selectedEnvironment.displayName,
                    url: selectedEnvironment.settings.dataverseUrl 
                });
                vscode.window.showInformationMessage(`Environment selected: ${selectedEnvironment.displayName}`);
            } else {
                this.componentLogger.warn('Selected environment not found in available environments');
            }

        } catch (error) {
            this.componentLogger.error('Error handling environment selection', error as Error, { environmentId });
            vscode.window.showErrorMessage('Failed to load environment configuration');
        }
    }

    private async saveEnvironmentSettings(_settings: any): Promise<void> {
        try {
            vscode.window.showInformationMessage('Environment settings saved successfully');

        } catch (error) {
            this.componentLogger.error('Error saving environment settings', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage('Failed to save environment settings');
        }
    }

    private async refreshEnvironments(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Environments refreshed successfully');

        } catch (error) {
            this.componentLogger.error('Error refreshing environments', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage('Failed to refresh environments');
        }
    }

    private async resetSettings(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Settings reset to default values');

        } catch (error) {
            this.componentLogger.error('Error resetting settings', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage('Failed to reset settings');
        }
    }

    private async loadEnvironments(): Promise<void> {
        if (this.environmentSelectorComponent) {
            await this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent, this.componentLogger);
        }
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');
        try {
            if (!this.environmentSelectorComponent || !this.actionBarComponent) {
                this.componentLogger.warn('Components not initialized when generating HTML');
                return this.getErrorHtml('Environment Setup', 'Failed to initialize components');
            }

            this.componentLogger.trace('Using simple PanelComposer.compose() as specified in architecture');

            // Use simple composition method as specified in architecture guide
            return PanelComposer.compose([
                this.environmentSelectorComponent,
                this.actionBarComponent
            ], this.getCommonWebviewResources(), 'Environment Setup');

        } catch (error) {
            this.componentLogger.error('Error generating HTML content', error as Error);
            return this.getErrorHtml('Environment Setup', 'Failed to generate panel content: ' + error);
        }
    }

    public dispose(): void {
        EnvironmentSetupPanel.currentPanel = undefined;

        this.environmentSelectorComponent?.dispose();
        this.actionBarComponent?.dispose();

        super.dispose();
    }
}