import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';

import { BasePanel, DefaultInstanceState } from './base/BasePanel';

/**
 * Debug Panel for viewing panel state and preferences
 * Uses __global__ environment ID since it's not environment-specific
 */

interface StateDebugInstanceState extends DefaultInstanceState {
    selectedEnvironmentId: string;
}

interface StateDebugPreferences {
    expandedSections?: string[];
}

interface StateEntry {
    key: string;
    value: unknown;
    type: 'instance' | 'preference';
}

export class StateDebugPanel extends BasePanel<StateDebugInstanceState, StateDebugPreferences> {
    public static readonly viewType = 'stateDebug';
    private static currentPanel: StateDebugPanel | undefined;

    private actionBarComponent?: ActionBarComponent;
    private componentFactory: ComponentFactory;
    private stateEntries: StateEntry[] = [];

    public static createOrShow(extensionUri: vscode.Uri): void {
        BasePanel.handlePanelCreation(
            {
                viewType: StateDebugPanel.viewType,
                title: 'State Debug Viewer',
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
            },
            extensionUri,
            (panel, uri) => new StateDebugPanel(panel, uri),
            () => StateDebugPanel.currentPanel,
            (panel) => { StateDebugPanel.currentPanel = panel; },
            false
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), {
            viewType: StateDebugPanel.viewType,
            title: 'State Debug Viewer'
        });

        this.componentLogger.debug('Constructor starting');

        // Create per-panel ComponentFactory instance
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges
        this.setupComponentEventBridges([
            this.actionBarComponent
        ]);

        // Clear static reference when panel is disposed
        panel.onDidDispose(() => {
            StateDebugPanel.currentPanel = undefined;
        });

        // Initialize with __global__ environment (no environment selector needed)
        this.initializeGlobalEnvironment();

        this.componentLogger.info('Panel initialized successfully');
    }

    /**
     * Initialize with global environment ID
     * State Debug Panel doesn't use environment selector
     */
    private async initializeGlobalEnvironment(): Promise<void> {
        // Switch to __global__ environment
        await this.stateManager.switchEnvironment('__global__');
        this.currentEnvironmentId = '__global__';

        // Initial render
        // eslint-disable-next-line no-restricted-syntax
        this.updateWebview(); // Debug panel displays raw state data, no components to update

        // Load state data
        await this.loadStateData();
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');

        // Action Bar Component
        this.actionBarComponent = this.componentFactory.createActionBar({
            id: 'stateDebug-actions',
            actions: [
                {
                    id: 'refresh',
                    label: 'Refresh',
                    icon: 'refresh',
                    variant: 'secondary',
                    disabled: false
                },
                {
                    id: 'clear-all',
                    label: 'Clear All State',
                    icon: 'trash',
                    variant: 'secondary',
                    disabled: false,
                    confirmMessage: 'Are you sure you want to clear ALL panel state? This cannot be undone.'
                },
                {
                    id: 'export',
                    label: 'Export JSON',
                    icon: 'export',
                    variant: 'secondary',
                    disabled: false
                }
            ]
        });

        this.componentLogger.debug('Components initialized successfully');
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.command) {
                case 'component-event': {
                    const componentId = message.data.componentId;
                    const eventType = message.data.eventType;
                    const data = message.data.eventData && typeof message.data.eventData === 'object' ? message.data.eventData as { actionId?: string } : undefined;

                    // Handle action bar events
                    if (componentId === 'stateDebug-actions' && eventType === 'actionClicked') {
                        const actionId = data?.actionId ?? '';
                        await this.handleActionClicked(actionId);
                    }
                    break;
                }

                default:
                    this.componentLogger.warn('Unhandled message command', { command: message.command });
                    break;
            }
        } catch (error) {
            this.componentLogger.error('Error handling message', error as Error, { command: message.command });
        }
    }

    private async handleActionClicked(actionId: string): Promise<void> {
        switch (actionId) {
            case 'refresh':
                await this.loadStateData();
                vscode.window.showInformationMessage('State data refreshed');
                break;

            case 'clear-all':
                await this.clearAllState();
                break;

            case 'export':
                await this.exportState();
                break;

            default:
                this.componentLogger.warn('Unhandled action', { actionId });
                break;
        }
    }

    /**
     * Load all state data from repositories
     */
    private async loadStateData(): Promise<void> {
        this.componentLogger.info('Loading state data');

        const entries: StateEntry[] = [];

        try {
            // Get both repositories
            const instanceRepo = ServiceFactory.getInstanceStateRepository();
            const prefsRepo = ServiceFactory.getPreferencesRepository();

            // Get all keys from instance repository
            const instanceKeys = await instanceRepo.keys();
            this.componentLogger.debug('Instance keys found', { count: instanceKeys.length, keys: instanceKeys });

            for (const key of instanceKeys) {
                const value = await instanceRepo.get(key);
                entries.push({
                    key,
                    value,
                    type: 'instance'
                });
            }

            // Get all keys from preferences repository
            const prefsKeys = await prefsRepo.keys();
            this.componentLogger.debug('Preference keys found', { count: prefsKeys.length, keys: prefsKeys });

            for (const key of prefsKeys) {
                const value = await prefsRepo.get(key);
                entries.push({
                    key,
                    value,
                    type: 'preference'
                });
            }

            this.stateEntries = entries;
            this.componentLogger.info('State data loaded', { totalEntries: entries.length });

            // Update the UI
            // eslint-disable-next-line no-restricted-syntax
            this.updateWebview(); // Debug panel displays dynamic state data, full regeneration needed

        } catch (error) {
            this.componentLogger.error('Error loading state data', error as Error);
            vscode.window.showErrorMessage('Failed to load state data: ' + (error as Error).message);
        }
    }

    /**
     * Clear all state (both instance and preferences)
     * Checks for active panels and warns user before clearing
     */
    private async clearAllState(): Promise<void> {
        try {
            // Check if there are other active panels
            // Using IPanelBase interface - only need dispose() and viewType (ISP)
            const allPanels = BasePanel.getAllActivePanels();
            const otherPanels = allPanels.filter(panel => panel !== this);

            if (otherPanels.length > 0) {
                const panelNames = otherPanels
                    .map(p => p.viewType)
                    .filter((value, index, self) => self.indexOf(value) === index) // unique
                    .join(', ');

                const answer = await vscode.window.showWarningMessage(
                    `${otherPanels.length} panel(s) are currently open (${panelNames}). ` +
                    `Clearing state while panels are active may cause errors. ` +
                    `Close all panels first, or continue anyway?`,
                    { modal: true },
                    'Close All Panels & Clear',
                    'Clear Anyway',
                    'Cancel'
                );

                if (answer === 'Cancel' || !answer) {
                    return;
                }

                if (answer === 'Close All Panels & Clear') {
                    // Dispose all other panels first
                    this.componentLogger.info('Disposing other panels before clearing state', {
                        count: otherPanels.length
                    });

                    for (const panel of otherPanels) {
                        panel.dispose();
                    }

                    // Give VS Code time to clean up
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // If 'Clear Anyway' was chosen, we proceed without disposing panels
            }

            const instanceRepo = ServiceFactory.getInstanceStateRepository();
            const prefsRepo = ServiceFactory.getPreferencesRepository();

            const instanceKeys = await instanceRepo.keys();
            const prefsKeys = await prefsRepo.keys();

            // Delete all instance state
            for (const key of instanceKeys) {
                await instanceRepo.delete(key);
            }

            // Delete all preferences
            for (const key of prefsKeys) {
                await prefsRepo.delete(key);
            }

            this.componentLogger.info('Cleared all state', {
                instanceKeysDeleted: instanceKeys.length,
                prefsKeysDeleted: prefsKeys.length
            });

            vscode.window.showInformationMessage(
                `Cleared ${instanceKeys.length} instance states and ${prefsKeys.length} preferences`
            );

            // Reload to show empty state
            await this.loadStateData();

        } catch (error) {
            this.componentLogger.error('Error clearing state', error as Error);
            vscode.window.showErrorMessage('Failed to clear state: ' + (error as Error).message);
        }
    }

    /**
     * Export state to JSON file
     */
    private async exportState(): Promise<void> {
        try {
            const stateData = {
                timestamp: new Date().toISOString(),
                instanceState: {} as Record<string, unknown>,
                preferences: {} as Record<string, unknown>
            };

            // Organize by type
            for (const entry of this.stateEntries) {
                if (entry.type === 'instance') {
                    stateData.instanceState[entry.key] = entry.value;
                } else {
                    stateData.preferences[entry.key] = entry.value;
                }
            }

            const json = JSON.stringify(stateData, null, 2);

            // Save to file
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('panel-state-export.json'),
                filters: {
                    'JSON': ['json']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
                vscode.window.showInformationMessage(`State exported to ${uri.fsPath}`);
            }

        } catch (error) {
            this.componentLogger.error('Error exporting state', error as Error);
            vscode.window.showErrorMessage('Failed to export state: ' + (error as Error).message);
        }
    }

    /**
     * Apply preferences (no-op for debug panel)
     */
    protected async applyPreferences(_prefs: StateDebugPreferences | null): Promise<void> {
        // Debug panel doesn't have preferences to restore yet
        this.componentLogger.debug('applyPreferences called (no-op for debug panel)');
    }

    /**
     * Load environment data (no-op for debug panel)
     */
    protected async loadEnvironmentData(_environmentId: string): Promise<void> {
        // Not applicable - debug panel uses __global__ environment
        this.componentLogger.debug('loadEnvironmentData called (no-op for debug panel)');
    }

    protected getHtmlContent(): string {
        this.componentLogger.trace('Generating HTML content');

        if (!this.actionBarComponent) {
            return this.getErrorHtml('State Debug', 'Failed to initialize components');
        }

        const instanceEntries = this.stateEntries.filter(e => e.type === 'instance');
        const prefEntries = this.stateEntries.filter(e => e.type === 'preference');

        const customHtml = `
            <style>
                .panel-content {
                    overflow-y: auto;
                    height: 100%;
                }

                .state-debug-container {
                    padding: 20px;
                }

                h2 {
                    color: var(--vscode-foreground);
                    font-size: 16px;
                    font-weight: 600;
                    margin-top: 30px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 8px;
                }

                h2:first-child {
                    margin-top: 0;
                }

                .state-section {
                    margin-bottom: 30px;
                }

                .state-entry {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    margin-bottom: 12px;
                    overflow: hidden;
                }

                .state-entry-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: var(--vscode-list-hoverBackground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .state-key {
                    font-family: var(--vscode-font-family);
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }

                .state-type {
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .state-type.instance {
                    background: var(--vscode-textLink-foreground);
                    color: var(--vscode-editor-background);
                }

                .state-type.preference {
                    background: var(--vscode-charts-green);
                    color: var(--vscode-editor-background);
                }

                .state-value {
                    padding: 12px;
                }

                .state-value pre {
                    margin: 0;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 12px;
                    color: var(--vscode-editor-foreground);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }

                .empty-message {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    padding: 20px;
                    text-align: center;
                }
            </style>
            <div class="panel-container">
                <div class="panel-controls">
                    ${this.actionBarComponent.generateHTML()}
                </div>
                <div class="panel-content">
                    <div class="state-debug-container">
                        <h2>Instance State (Volatile - cleared on panel close)</h2>
                        <div class="state-section">
                            ${instanceEntries.length === 0 ?
                                '<p class="empty-message">No instance state found</p>' :
                                instanceEntries.map(entry => this.generateStateEntry(entry)).join('')
                            }
                        </div>

                        <h2>Preferences (Persistent - saved per environment)</h2>
                        <div class="state-section">
                            ${prefEntries.length === 0 ?
                                '<p class="empty-message">No preferences found</p>' :
                                prefEntries.map(entry => this.generateStateEntry(entry)).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        return PanelComposer.composeWithCustomHTML(
            customHtml,
            [this.actionBarComponent],
            [], // No external CSS files needed
            [], // No custom scripts needed
            this.getCommonWebviewResources(),
            'State Debug Viewer'
        );
    }

    private generateStateEntry(entry: StateEntry): string {
        const valueJson = JSON.stringify(entry.value, null, 2);
        const escapedJson = this.escapeHtml(valueJson);

        return `
            <div class="state-entry">
                <div class="state-entry-header">
                    <span class="state-key">${this.escapeHtml(entry.key)}</span>
                    <span class="state-type ${entry.type}">${entry.type}</span>
                </div>
                <div class="state-value">
                    <pre>${escapedJson}</pre>
                </div>
            </div>
        `;
    }

    private escapeHtml(text: string): string {
        const div = { textContent: text } as { textContent: string };
        return div.textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
