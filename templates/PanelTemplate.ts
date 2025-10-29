/**
 * TEMPLATE: Copy this file when creating a new panel
 *
 * Steps to create a new panel:
 * 1. Copy this file to src/panels/YourPanelName.ts
 * 2. Find/replace "Template" with your panel name
 * 3. Update component initialization in initializeComponents()
 * 4. Implement handlePanelMessage() for your panel-specific messages
 * 5. Implement handlePanelAction() for your panel-specific actions
 * 6. Copy templates/PanelTemplateBehavior.js to resources/webview/js/panels/
 * 7. Register panel command in package.json
 * 8. Register panel in extension.ts activation
 */

import * as vscode from 'vscode';

import { BasePanel } from './base/BasePanel';
import { ComponentFactory } from '../factories/ComponentFactory';
import { ServiceFactory } from '../services/ServiceFactory';
import { PanelComposer } from '../factories/PanelComposer';

// Import your service
// import { YourService } from '../services/YourService';

// Import components you'll use
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';

interface TemplatePanelState {
    selectedEnvironmentId?: string;
    // Add your state properties
}

export class TemplatePanel extends BasePanel<TemplatePanelState> {
    public static readonly viewType = 'power-platform-dev-suite.templatePanel';
    private static currentPanel: TemplatePanel | undefined;

    private componentFactory: ComponentFactory;

    // Components
    private actionBar!: ActionBarComponent;
    private environmentSelector!: EnvironmentSelectorComponent;
    private dataTable!: DataTableComponent;

    // Services
    // private yourService: YourService;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, TemplatePanel.viewType, 'Template Panel');

        // Initialize services
        // this.yourService = ServiceFactory.getYourService();

        // Initialize component factory
        this.componentFactory = new ComponentFactory();

        // Create component instances
        this.initializeComponents();

        // Set up event bridges for components that have TypeScript APIs
        this.setupComponentEventBridges([
            this.actionBar,
            this.environmentSelector,
            this.dataTable
        ]);

        // Initialize panel (renders initial HTML)
        this.initialize();
    }

    /**
     * Factory methods for singleton pattern
     */
    public static createOrShow(extensionUri: vscode.Uri): void {
        TemplatePanel.currentPanel = BasePanel.handlePanelCreation(
            TemplatePanel.currentPanel,
            TemplatePanel.viewType,
            'Template Panel',
            extensionUri,
            (panel, uri) => new TemplatePanel(panel, uri)
        ) as TemplatePanel | undefined;
    }

    public static createNew(extensionUri: vscode.Uri): void {
        const panel = vscode.window.createWebviewPanel(
            TemplatePanel.viewType,
            'Template Panel',
            vscode.ViewColumn.One,
            BasePanel.getWebviewOptions(extensionUri)
        );
        new TemplatePanel(panel, extensionUri);
    }

    /**
     * Initialize all components
     */
    private initializeComponents(): void {
        try {
            // Action Bar
            this.actionBar = this.componentFactory.createActionBar({
                id: 'template-actionBar',
                actions: [
                    { id: 'refresh', label: 'Refresh', icon: 'refresh' },
                    // Add your actions
                ]
            });

            // Environment Selector
            // ⚠️ CRITICAL: onChange callback is MANDATORY
            // Without it, panel won't load data on initial open
            this.environmentSelector = this.componentFactory.createEnvironmentSelector({
                id: 'template-envSelector',
                label: 'Environment',
                onChange: (environmentId: string) => {
                    this.handleEnvironmentSelection(environmentId);
                }
            });

            // Data Table
            this.dataTable = this.componentFactory.createDataTable({
                id: 'template-dataTable',
                columns: [
                    { id: 'name', label: 'Name', sortable: true },
                    { id: 'type', label: 'Type', sortable: true },
                    // Add your columns
                ],
                data: []
            });

        } catch (error) {
            this.componentLogger.error('Failed to initialize components', error);
            throw error;
        }
    }

    /**
     * Generate HTML content for the panel
     */
    protected getHtmlContent(): string {
        // Standard layout using PanelComposer
        return PanelComposer.compose(
            [
                this.actionBar,
                this.environmentSelector,
                this.dataTable
            ],
            this.getCommonWebviewResources()
        );

        // For custom layouts, use:
        // return PanelComposer.composeWithCustomHTML(customHTML, components, cssFiles, [], resources, 'Title');
    }

    /**
     * Get webview behavior script path
     */
    protected getBehaviorScript(): string {
        return 'panels/TemplatePanelBehavior.js';
    }

    /**
     * Get panel-specific state to save
     */
    protected getPanelState(): TemplatePanelState {
        return {
            selectedEnvironmentId: this.environmentSelector.getSelectedEnvironment()
            // Add your state
        };
    }

    /**
     * Restore panel-specific state
     */
    protected restorePanelState(state: TemplatePanelState): void {
        if (state.selectedEnvironmentId) {
            this.environmentSelector.setSelectedEnvironment(state.selectedEnvironmentId);
        }
        // Restore your state
    }

    /**
     * Handle panel-specific messages (override from BasePanel)
     */
    protected async handlePanelMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'your-custom-message':
                await this.handleYourCustomMessage(message.data);
                break;

            default:
                this.componentLogger.warn('Unknown message command', { command: message.command });
        }
    }

    /**
     * Handle panel-specific actions (override from BasePanel)
     */
    protected async handlePanelAction(componentId: string, actionId: string, data?: any): Promise<void> {
        if (componentId === 'template-actionBar') {
            switch (actionId) {
                case 'refresh':
                    await this.loadData();
                    break;
                // Add your actions
            }
        }
    }

    /**
     * Handle environment selection (from EnvironmentSelector onChange)
     * This is called BOTH on initial auto-select AND manual user change
     */
    private async handleEnvironmentSelection(environmentId: string): Promise<void> {
        this.componentLogger.info('Environment selected', { environmentId });
        await this.loadData(environmentId);
    }

    /**
     * Load panel data
     */
    private async loadData(environmentId?: string): Promise<void> {
        const envId = environmentId || this.environmentSelector.getSelectedEnvironment();

        if (!envId) {
            this.dataTable.setData([]);
            return;
        }

        try {
            this.dataTable.setLoading(true);

            // Call your service
            // const data = await this.yourService.getData(envId);

            // Transform for UI if needed
            // const uiData = data.map(item => ({
            //     id: item.id,
            //     name: item.name,
            //     type: item.type
            // }));

            // Update component
            // this.dataTable.setData(uiData);

            // Placeholder
            this.dataTable.setData([]);

        } catch (error) {
            this.componentLogger.error('Failed to load data', error);
            this.dataTable.setError('Failed to load data');
        } finally {
            this.dataTable.setLoading(false);
        }
    }

    /**
     * Handle custom message
     */
    private async handleYourCustomMessage(data: any): Promise<void> {
        // Implement your message handler
        this.componentLogger.info('Handling custom message', { data });
    }

    /**
     * Cleanup when panel is disposed
     */
    public dispose(): void {
        TemplatePanel.currentPanel = undefined;
        super.dispose();
    }
}
