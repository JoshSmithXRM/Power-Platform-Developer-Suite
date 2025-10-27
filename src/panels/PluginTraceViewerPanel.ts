import * as vscode from 'vscode';

import { ServiceFactory } from '../services/ServiceFactory';
import { WebviewMessage } from '../types';
import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';
import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { FilterPanelComponent } from '../components/panels/FilterPanel/FilterPanelComponent';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { PluginTraceService, PluginTraceLog, PluginTraceLevel } from '../services/PluginTraceService';
import { PLUGIN_TRACE_CONTEXT_MENU_ITEMS } from '../config/TableActions';
import { FilterCondition } from '../components/panels/FilterPanel/FilterPanelConfig';

import { BasePanel } from './base/BasePanel';

// UI-specific type for table display
interface PluginTraceTableRow {
    id: string;
    status: string; // HTML badge
    createdon: string;
    duration: string;
    operationtype: string;
    pluginname: string;
    pluginstepid: string;
    depth: number;
    mode: string;
    messagename: string;
    entityname: string;
    correlationid: string;
    hasException: boolean;
}

export class PluginTraceViewerPanel extends BasePanel {
    public static readonly viewType = 'pluginTraceViewer';
    private static currentPanel: PluginTraceViewerPanel | undefined;

    // Components
    private environmentSelectorComponent?: EnvironmentSelectorComponent;
    private actionBarComponent?: ActionBarComponent;
    private filterPanelComponent?: FilterPanelComponent;
    private dataTableComponent?: DataTableComponent;
    private componentFactory: ComponentFactory;

    // Services
    private pluginTraceService: PluginTraceService;

    // State
    private selectedEnvironmentId?: string;
    private currentTraceData: PluginTraceLog[] = [];
    private selectedTraceId?: string;
    private currentTraceLevel: PluginTraceLevel = PluginTraceLevel.Off;
    private autoRefreshInterval?: NodeJS.Timeout;
    private autoRefreshIntervalSeconds: number = 0; // 0 = off
    private currentFilters: { quick: string[]; advanced: FilterCondition[] } = { quick: [], advanced: [] };
    private pendingFilterRestoration?: { quick: string[]; advanced: FilterCondition[] };

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (PluginTraceViewerPanel.currentPanel) {
            PluginTraceViewerPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = BasePanel.createWebviewPanel({
            viewType: PluginTraceViewerPanel.viewType,
            title: 'Plugin Trace Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources', 'webview')]
        }, column);

        PluginTraceViewerPanel.currentPanel = new PluginTraceViewerPanel(panel, extensionUri);
    }

    public static createNew(extensionUri: vscode.Uri): void {
        this.createOrShow(extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri, ServiceFactory.getAuthService(), ServiceFactory.getStateService(), {
            viewType: PluginTraceViewerPanel.viewType,
            title: 'Plugin Trace Viewer'
        });

        this.panel.onDidDispose(() => {
            // Call the dispose method to check trace level and warn
            this.dispose();
        });

        this.componentLogger.debug('Constructor starting');

        // Get service
        this.pluginTraceService = ServiceFactory.getPluginTraceService();

        // Create per-panel ComponentFactory instance
        this.componentFactory = new ComponentFactory();

        this.initializeComponents();

        // Set up event bridges for component communication
        this.setupComponentEventBridges([
            this.environmentSelectorComponent,
            this.actionBarComponent,
            this.filterPanelComponent,
            this.dataTableComponent
        ]);

        // Initialize the panel
        this.initialize();

        // Load environments after initialization
        this.loadEnvironmentsWithAutoSelect(this.environmentSelectorComponent!, this.componentLogger).then(async () => {
            // Set the selected environment ID after auto-selection
            const selectedEnv = this.environmentSelectorComponent!.getSelectedEnvironment();
            if (selectedEnv) {
                this.selectedEnvironmentId = selectedEnv.id;
                this.componentLogger.info('Selected environment ID set', { environmentId: this.selectedEnvironmentId });

                // Restore state from cache
                const cachedState = await this._stateService.getPanelState(PluginTraceViewerPanel.viewType);

                this.componentLogger.debug('📦 Loaded cached state', {
                    hasState: !!cachedState,
                    hasFilters: !!cachedState?.filters
                });

                // Restore auto-refresh interval from cached state
                if (cachedState?.autoRefreshIntervalSeconds) {
                    this.autoRefreshIntervalSeconds = cachedState.autoRefreshIntervalSeconds;
                    this.componentLogger.info('Restored auto-refresh interval from cache', {
                        intervalSeconds: this.autoRefreshIntervalSeconds
                    });
                    this.updateAutoRefreshButton(this.autoRefreshIntervalSeconds);
                }

                // Restore filters from cached state
                if (cachedState?.filters) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const savedFilters = cachedState.filters as any;

                    this.componentLogger.debug('Raw saved filters from state', {
                        savedFilters,
                        quickType: Array.isArray(savedFilters.quick) ? 'array' : typeof savedFilters.quick,
                        advancedType: Array.isArray(savedFilters.advanced) ? 'array' : typeof savedFilters.advanced
                    });

                    // Convert objects to arrays if needed (happens when data is serialized/deserialized)
                    const quickFiltersArray = Array.isArray(savedFilters.quick) ? savedFilters.quick :
                        (savedFilters.quick && typeof savedFilters.quick === 'object' ? Object.values(savedFilters.quick) : []);
                    const advancedFiltersArray = Array.isArray(savedFilters.advanced) ? savedFilters.advanced :
                        (savedFilters.advanced && typeof savedFilters.advanced === 'object' ? Object.values(savedFilters.advanced) : []);

                    this.componentLogger.debug('Converted to arrays', {
                        quickFiltersArray,
                        advancedFiltersArray,
                        quickIsArray: Array.isArray(quickFiltersArray),
                        advancedIsArray: Array.isArray(advancedFiltersArray)
                    });

                    this.currentFilters = {
                        quick: quickFiltersArray,
                        advanced: advancedFiltersArray
                    };
                    this.componentLogger.debug('Restored filters from cache', {
                        quickCount: quickFiltersArray.length,
                        advancedCount: advancedFiltersArray.length
                    });

                    // Store filters to apply after webview is ready
                    // We'll apply them in response to the 'panel-ready' event
                    this.pendingFilterRestoration = {
                        quick: quickFiltersArray,
                        advanced: advancedFiltersArray
                    };
                }

                // Restore filter panel collapsed state
                if (typeof cachedState?.filterPanelCollapsed === 'boolean') {
                    this.componentLogger.info('Restoring filter panel collapsed state', {
                        collapsed: cachedState.filterPanelCollapsed
                    });
                    // Send message to webview after panel-ready
                    setTimeout(() => {
                        this.postMessage({
                            action: 'componentStateChange',
                            componentId: 'pluginTrace-filterPanel',
                            state: {
                                collapsed: cachedState.filterPanelCollapsed
                            }
                        });
                    }, 100);
                }

                // Query current trace level from Dynamics
                await this.handleGetTraceLevel(this.selectedEnvironmentId);

                // Load traces (will use restored filters if any)
                await this.handleLoadTraces(this.selectedEnvironmentId, this.currentFilters);

                // Start auto-refresh if it was enabled
                if (this.autoRefreshIntervalSeconds > 0) {
                    this.componentLogger.info('Starting auto-refresh from cached state');
                    this.startAutoRefresh();
                }
            }
        });

        this.componentLogger.info('Panel initialized successfully');
    }

    private initializeComponents(): void {
        this.componentLogger.debug('Initializing components');

        // 1. Environment Selector
        this.environmentSelectorComponent = this.componentFactory.createEnvironmentSelector({
            id: 'pluginTrace-envSelector',
            label: 'Environment',
            placeholder: 'Choose an environment to view plugin traces...',
            showRefreshButton: true
        });

        // 2. Action Bar
        this.actionBarComponent = this.componentFactory.createActionBar({
            id: 'pluginTrace-actionBar',
            actions: [
                { id: 'refresh', label: 'Refresh', icon: 'refresh' },
                {
                    id: 'export',
                    label: 'Export',
                    icon: 'export',
                    type: 'dropdown',
                    dropdownItems: [
                        { id: 'csv', label: 'Export to CSV' },
                        { id: 'json', label: 'Export to JSON' }
                    ]
                },
                {
                    id: 'delete',
                    label: 'Delete',
                    icon: 'trash',
                    type: 'dropdown',
                    dropdownItems: [
                        { id: 'delete-all', label: 'Delete All Traces...' },
                        { id: 'delete-old', label: 'Delete Old Traces...' }
                    ]
                },
                { id: 'sep1', label: '|', type: 'separator' },
                {
                    id: 'traceLevel',
                    label: 'Trace Level: Off',
                    type: 'dropdown',
                    dropdownItems: [
                        { id: '0', label: 'Off' },
                        { id: '1', label: 'Exception' },
                        { id: '2', label: 'All' }
                    ]
                },
                { id: 'sep2', label: '|', type: 'separator' },
                {
                    id: 'autoRefresh',
                    label: 'Auto-Refresh: ⏸ Paused',
                    type: 'dropdown',
                    dropdownItems: [
                        { id: '0', label: '⏸ Paused' },
                        { id: '10', label: '▶ Every 10s' },
                        { id: '30', label: '▶ Every 30s' },
                        { id: '60', label: '▶ Every 60s' }
                    ]
                }
            ],
            layout: 'horizontal'
        });

        // 3. Filter Panel
        this.filterPanelComponent = this.componentFactory.createFilterPanel({
            id: 'pluginTrace-filterPanel',
            collapsible: true,
            defaultCollapsed: false,
            quickFilters: [
                {
                    id: 'exceptionOnly',
                    label: 'Exception Only',
                    conditions: [{ id: 'qf1', field: 'exceptiondetails', operator: 'isNotNull', value: true, logicalOperator: 'AND' }]
                },
                {
                    id: 'lastHour',
                    label: 'Last Hour',
                    conditions: [{ id: 'qf2', field: 'createdon', operator: '>=', value: 'NOW-1H', logicalOperator: 'AND' }]
                },
                {
                    id: 'last24h',
                    label: 'Last 24 Hours',
                    conditions: [{ id: 'qf3', field: 'createdon', operator: '>=', value: 'NOW-24H', logicalOperator: 'AND' }]
                },
                {
                    id: 'today',
                    label: 'Today',
                    conditions: [{ id: 'qf4', field: 'createdon', operator: '>=', value: 'TODAY', logicalOperator: 'AND' }]
                }
            ],
            advancedFilters: [
                { field: 'pluginname', label: 'Plugin Name', type: 'text', operators: ['contains', 'equals', 'startsWith', 'endsWith'] },
                { field: 'entityname', label: 'Entity Name', type: 'text', operators: ['contains', 'equals', 'startsWith'] },
                { field: 'messagename', label: 'Message', type: 'text', operators: ['contains', 'equals'] },
                { field: 'duration', label: 'Duration (ms)', type: 'number', operators: ['>', '<', '>=', '<=', 'between'] },
                { field: 'createdon', label: 'Start Time', type: 'datetime', operators: ['>', '<', '>=', '<=', 'between'] },
                { field: 'depth', label: 'Depth', type: 'number', operators: ['equals', '>', '<'] },
                {
                    field: 'mode',
                    label: 'Mode',
                    type: 'select',
                    operators: ['equals'],
                    options: [
                        { value: '0', label: 'Synchronous' },
                        { value: '1', label: 'Asynchronous' }
                    ]
                },
                { field: 'correlationid', label: 'Correlation ID', type: 'text', operators: ['equals', 'contains'] },
                { field: 'exceptiondetails', label: 'Exception Details', type: 'text', operators: ['contains', 'isNotNull', 'isNull'] }
            ],
            showPreviewCount: true,
            maxConditions: 10
        });

        // 4. Data Table
        this.dataTableComponent = this.componentFactory.createDataTable({
            id: 'pluginTrace-table',
            columns: [
                { id: 'status', field: 'status', label: 'Status', sortable: true, width: '100px', type: 'html' },
                { id: 'createdon', field: 'createdon', label: 'Started', type: 'date', sortable: true, width: '160px' },
                { id: 'duration', field: 'duration', label: 'Duration', sortable: true, width: '80px', align: 'right' },
                { id: 'operationtype', field: 'operationtype', label: 'Operation', sortable: true, width: '90px' },
                { id: 'pluginname', field: 'pluginname', label: 'Plugin', sortable: true, width: '360px' },
                { id: 'pluginstepid', field: 'pluginstepid', label: 'Step', sortable: false, width: '250px' },
                { id: 'depth', field: 'depth', label: 'Depth', sortable: true, width: '60px', align: 'center' },
                { id: 'mode', field: 'mode', label: 'Mode', sortable: true, width: '70px' },
                { id: 'messagename', field: 'messagename', label: 'Message', sortable: true, width: '120px' },
                { id: 'entityname', field: 'entityname', label: 'Entity', sortable: true, width: '120px' }
            ],
            defaultSort: [{ column: 'createdon', direction: 'desc' }],
            stickyHeader: true,
            contextMenu: true,
            contextMenuItems: PLUGIN_TRACE_CONTEXT_MENU_ITEMS,
            emptyMessage: 'No plugin traces found. Adjust filters or enable trace logging.',
            showFooter: true
        });

        this.componentLogger.debug('Components initialized');
    }

    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            const action = message.action || message.command;

            // Only log important messages (debug level for routine events)
            this.componentLogger.debug('📨 MESSAGE RECEIVED', {
                action,
                command: message.command
            });

            switch (action) {
                case 'component-event':
                    this.componentLogger.debug('🎯 Handling component-event');
                    await this.handleComponentEvent(message);
                    break;

                case 'dropdown-item-clicked':
                    this.componentLogger.info('🎯 Handling dropdown-item-clicked');
                    await this.handleDropdownItemClicked(message);
                    break;

                case 'load-environments':
                    await this.handleLoadEnvironments();
                    break;

                case 'environment-changed': {
                    const envId = message.data?.environmentId || message.environmentId;
                    await this.handleEnvironmentChanged(envId);
                    break;
                }

                case 'load-traces':
                    await this.handleLoadTraces(message.environmentId, message.filterOptions);
                    break;

                case 'trace-level-changed':
                    await this.handleSetTraceLevel(message.environmentId, message.level);
                    break;

                case 'filters-applied': {
                    // Convert objects to arrays if needed (happens when data is serialized/deserialized)
                    const quickFilters = message.data?.quickFilters;
                    const advancedFilters = message.data?.advancedFilters;

                    const quickFiltersArray = Array.isArray(quickFilters) ? quickFilters :
                        (quickFilters && typeof quickFilters === 'object' ? Object.values(quickFilters) : []);
                    const advancedFiltersArray = Array.isArray(advancedFilters) ? advancedFilters :
                        (advancedFilters && typeof advancedFilters === 'object' ? Object.values(advancedFilters) : []);

                    await this.handleFiltersApplied(quickFiltersArray, advancedFiltersArray);
                    break;
                }

                case 'trace-selected':
                    await this.handleTraceSelected(message.traceId);
                    break;

                case 'context-menu-action':
                    await this.handleContextMenuAction(message.actionId, message.rowId);
                    break;

                case 'auto-refresh-changed':
                    await this.handleAutoRefreshChange(message.interval);
                    break;

                case 'panel-ready':
                    this.componentLogger.debug('Panel ready event received');
                    // Apply pending filter restoration if any
                    if (this.pendingFilterRestoration) {
                        this.componentLogger.info('Applying pending filter restoration', {
                            pendingFilters: this.pendingFilterRestoration,
                            quickLength: this.pendingFilterRestoration.quick.length,
                            advancedLength: this.pendingFilterRestoration.advanced.length,
                            quickIsArray: Array.isArray(this.pendingFilterRestoration.quick),
                            advancedIsArray: Array.isArray(this.pendingFilterRestoration.advanced)
                        });
                        if (this.pendingFilterRestoration.quick.length > 0) {
                            this.componentLogger.info('Sending setQuickFilters message', {
                                filterIds: this.pendingFilterRestoration.quick
                            });
                            this.postMessage({
                                action: 'setQuickFilters',
                                componentId: this.filterPanelComponent!.getId(),
                                componentType: 'FilterPanel',
                                filterIds: this.pendingFilterRestoration.quick
                            });
                        }
                        if (this.pendingFilterRestoration.advanced.length > 0) {
                            this.componentLogger.info('Sending setAdvancedFilters message', {
                                conditions: this.pendingFilterRestoration.advanced
                            });
                            this.postMessage({
                                action: 'setAdvancedFilters',
                                componentId: this.filterPanelComponent!.getId(),
                                componentType: 'FilterPanel',
                                conditions: this.pendingFilterRestoration.advanced
                            });
                        }
                        this.pendingFilterRestoration = undefined;
                    }
                    break;

                case 'split-ratio-changed':
                    this.componentLogger.info('✅ Split ratio changed', { splitRatio: message.data?.splitRatio });
                    await this.updateState({ splitRatio: message.data?.splitRatio });
                    break;

                case 'right-panel-opened':
                    this.componentLogger.info('✅ Right panel opened');
                    await this.updateState({ rightPanelVisible: true });
                    break;

                case 'right-panel-closed':
                    this.componentLogger.info('✅ Right panel closed');
                    await this.updateState({ rightPanelVisible: false });
                    break;

                case 'filterPanelCollapsed':
                    this.componentLogger.info('✅ Filter panel collapsed state changed', { collapsed: message.data?.collapsed });
                    await this.updateState({ filterPanelCollapsed: message.data?.collapsed });
                    break;

                default:
                    // Only warn about truly unknown actions, not benign ones
                    if (action !== 'overflow-changed' && action !== 'panel-ready') {
                        this.componentLogger.debug('Unknown action', { action });
                    }
            }
        } catch (error: unknown) {
            const action = message.action || message.command;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.componentLogger.error(`Error handling message ${action}`, error as Error);
            this.postMessage({
                action: 'error',
                message: `Error: ${errorMessage}`
            });
        }
    }

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, eventType, data } = message.data || {};

            this.componentLogger.debug('🔧 Component event', {
                componentId,
                eventType
            });

            // Handle action bar events
            if (componentId === 'pluginTrace-actionBar' && eventType === 'actionClicked') {
                const { actionId } = data;
                this.componentLogger.info('✅ Action bar button clicked', { actionId });
                await this.handleActionBarClick(actionId);
            }
            // Handle data table context menu events
            else if (componentId === 'pluginTrace-table' && eventType === 'contextMenuItemClicked') {
                const { itemId, rowId } = data;
                this.componentLogger.info('✅ Context menu action clicked', { itemId, rowId });
                await this.handleContextMenuAction(itemId, rowId);
            }
            // Handle split panel events
            else if (componentId === 'plugin-trace-split-panel' && eventType === 'splitRatioChanged') {
                const { splitRatio } = data;
                this.componentLogger.info('✅ Split ratio changed', { splitRatio });
                await this.updateState({ splitRatio });
            }
            else if (componentId === 'plugin-trace-split-panel' && (eventType === 'rightPanelOpened' || eventType === 'rightPanelClosed')) {
                const { rightPanelVisible } = data;
                this.componentLogger.info('✅ Split panel visibility changed', { rightPanelVisible });
                await this.updateState({ rightPanelVisible });
            }
            else if (eventType !== 'initialized') {
                // Only log non-initialization events that we don't handle
                this.componentLogger.debug('Unhandled component event', { componentId, eventType });
            }
        } catch (error: unknown) {
            this.componentLogger.error('❌ Error handling component event', error as Error);
        }
    }

    private async handleDropdownItemClicked(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, actionId, itemId } = message.data || {};

            this.componentLogger.info('🔽 DROPDOWN ITEM CLICKED', {
                componentId,
                actionId,
                itemId,
                fullMessage: message,
                messageData: message.data
            });

            if (componentId === 'pluginTrace-actionBar') {
                this.componentLogger.info('✅ Calling handleActionBarClick', { actionId, itemId });
                await this.handleActionBarClick(actionId, itemId);
            } else {
                this.componentLogger.warn('⚠️ Unhandled dropdown from component', { componentId });
            }
        } catch (error: unknown) {
            this.componentLogger.error('❌ Error handling dropdown item click', error as Error);
        }
    }

    private async handleLoadEnvironments(): Promise<void> {
        try {
            const environments = await this._authService.getEnvironments();

            const cachedState = await this._stateService.getPanelState(PluginTraceViewerPanel.viewType);
            const selectedEnvironmentId = this.selectedEnvironmentId || cachedState?.selectedEnvironmentId || environments[0]?.id;

            // Restore auto-refresh interval from cached state
            if (cachedState?.autoRefreshIntervalSeconds) {
                this.autoRefreshIntervalSeconds = cachedState.autoRefreshIntervalSeconds;
                this.componentLogger.info('Restored auto-refresh interval from cache', {
                    intervalSeconds: this.autoRefreshIntervalSeconds
                });
                this.updateAutoRefreshButton(this.autoRefreshIntervalSeconds);
            }

            this.postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: selectedEnvironmentId
            });

            if (selectedEnvironmentId) {
                this.selectedEnvironmentId = selectedEnvironmentId;
                await this.handleGetTraceLevel(selectedEnvironmentId);
                await this.handleLoadTraces(selectedEnvironmentId);

                // Start auto-refresh if it was enabled
                if (this.autoRefreshIntervalSeconds > 0) {
                    this.componentLogger.info('Starting auto-refresh from cached state');
                    this.startAutoRefresh();
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load environments';
            this.postMessage({
                action: 'error',
                message: errorMessage
            });
        }
    }

    private async handleEnvironmentChanged(environmentId: string): Promise<void> {
        this.componentLogger.info('🔄 Environment changed', {
            oldEnvironmentId: this.selectedEnvironmentId,
            newEnvironmentId: environmentId,
            currentTraceLevel: this.currentTraceLevel
        });

        // Warn if leaving environment with traces enabled
        if (this.currentTraceLevel === PluginTraceLevel.All && this.selectedEnvironmentId) {
            const previousEnvironmentId = this.selectedEnvironmentId;
            const result = await vscode.window.showWarningMessage(
                'Plugin traces are currently set to "All" in the previous environment. This can impact performance. Turn off traces before switching?',
                'Turn Off & Switch',
                'Keep Enabled & Switch',
                'Cancel'
            );

            if (result === 'Cancel') {
                // Revert environment selector back to old environment
                if (this.environmentSelectorComponent) {
                    this.environmentSelectorComponent.setSelectedEnvironment(previousEnvironmentId);
                }
                return;
            }

            if (result === 'Turn Off & Switch') {
                try {
                    await this.pluginTraceService.setPluginTraceLevel(
                        previousEnvironmentId,
                        PluginTraceLevel.Off
                    );
                    this.componentLogger.info('Turned off traces in previous environment');
                } catch (error) {
                    this.componentLogger.error('Failed to turn off traces', error as Error);
                    vscode.window.showErrorMessage('Failed to turn off plugin traces in previous environment');
                }
            }
        }

        this.selectedEnvironmentId = environmentId;

        await this.updateState({ selectedEnvironmentId: environmentId });

        // Stop auto-refresh when switching environments
        this.stopAutoRefresh();

        // Close detail panel when switching environments
        this.postMessage({
            action: 'closeDetailPanel'
        });

        // Get trace level for new environment
        await this.handleGetTraceLevel(environmentId);

        // Load traces for new environment with current filters
        await this.handleLoadTraces(environmentId, this.currentFilters);

        this.componentLogger.info('✅ Environment change complete');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async handleLoadTraces(environmentId: string, filterOptions?: any): Promise<void> {
        if (!environmentId) {
            this.postMessage({
                action: 'error',
                message: 'Environment ID is required'
            });
            return;
        }

        try {
            this.selectedEnvironmentId = environmentId;

            await this.updateState({ selectedEnvironmentId: environmentId });

            // Show loading state
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(true, 'Loading plugin traces...');
            }

            // Convert filters to service format
            const serviceFilters = this.convertFiltersToServiceFormat(filterOptions || this.currentFilters);

            this.componentLogger.debug('🔍 Loading traces with filters');

            // Fetch traces
            const traces = await this.pluginTraceService.getPluginTraceLogs(environmentId, serviceFilters);

            this.currentTraceData = traces;

            // Transform for display
            const tableData = this.transformTracesForDisplay(traces);

            // Update table
            this.dataTableComponent?.setData(tableData);
            this.dataTableComponent?.setLoading(false);

            this.componentLogger.debug('Loaded traces', { count: traces.length });

            this.postMessage({
                action: 'tracesLoaded',
                count: traces.length
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.componentLogger.error('Failed to load traces', error as Error);
            if (this.dataTableComponent) {
                this.dataTableComponent.setLoading(false);
            }
            this.postMessage({
                action: 'error',
                message: `Failed to load traces: ${errorMessage}`
            });
        }
    }

    private async handleGetTraceLevel(environmentId: string): Promise<void> {
        this.componentLogger.info('Getting plugin trace level', { environmentId });
        try {
            const level = await this.pluginTraceService.getPluginTraceLevel(environmentId);
            this.currentTraceLevel = level;

            this.componentLogger.info('Retrieved trace level from Dynamics', {
                level,
                displayName: this.pluginTraceService.getTraceLevelDisplayName(level)
            });

            // Update the button label
            this.updateTraceLevelButton(level);

            this.postMessage({
                action: 'traceLevelLoaded',
                level: level,
                displayName: this.pluginTraceService.getTraceLevelDisplayName(level)
            });
        } catch (error: unknown) {
            this.componentLogger.error('Failed to get trace level', error as Error);
        }
    }

    private async handleSetTraceLevel(environmentId: string, level: PluginTraceLevel): Promise<void> {
        try {
            await this.pluginTraceService.setPluginTraceLevel(environmentId, level);

            this.currentTraceLevel = level;

            this.postMessage({
                action: 'traceLevelUpdated',
                level: level,
                message: `Trace level set to ${this.pluginTraceService.getTraceLevelDisplayName(level)}`
            });

            // Auto-refresh traces after 1 second
            setTimeout(() => {
                if (this.selectedEnvironmentId) {
                    this.handleLoadTraces(this.selectedEnvironmentId);
                }
            }, 1000);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.componentLogger.error('Failed to set trace level', error as Error);
            this.postMessage({
                action: 'error',
                message: `Failed to set trace level: ${errorMessage}`
            });
        }
    }

    private async handleFiltersApplied(quickFilters: string[], advancedFilters: FilterCondition[]): Promise<void> {
        this.componentLogger.info('Filters applied', {
            quickFilters,
            advancedFilters,
            quickCount: quickFilters.length,
            advancedCount: advancedFilters.length
        });

        this.currentFilters = { quick: quickFilters, advanced: advancedFilters };

        // Save filters to state for persistence
        await this.updateState({ filters: this.currentFilters });

        if (this.selectedEnvironmentId) {
            await this.handleLoadTraces(this.selectedEnvironmentId, this.currentFilters);
        }
    }

    private async handleTraceSelected(traceId: string): Promise<void> {
        const trace = this.currentTraceData.find(t => t.plugintracelogid === traceId);

        if (!trace) {
            this.componentLogger.warn('Trace not found', { traceId });
            return;
        }

        this.selectedTraceId = traceId;

        // Get related traces by correlation ID
        const relatedTraces = this.currentTraceData.filter(t =>
            t.correlationid === trace.correlationid &&
            t.plugintracelogid !== traceId
        );

        this.postMessage({
            action: 'showTraceDetails',
            trace: trace,
            relatedTraces: relatedTraces
        });
    }

    private async handleActionBarClick(actionId: string, itemId?: string): Promise<void> {
        this.componentLogger.info('🎬 ACTION BAR CLICK HANDLER', {
            actionId,
            itemId,
            selectedEnvironmentId: this.selectedEnvironmentId
        });

        switch (actionId) {
            case 'refresh':
                this.componentLogger.info('🔄 Refresh action triggered');
                if (this.selectedEnvironmentId) {
                    // Clear table immediately
                    if (this.dataTableComponent) {
                        this.dataTableComponent.setData([]);
                    }

                    this.actionBarComponent?.setActionLoading('refresh', true);
                    try {
                        await this.handleLoadTraces(this.selectedEnvironmentId);
                    } finally {
                        this.actionBarComponent?.setActionLoading('refresh', false);
                    }
                } else {
                    this.componentLogger.warn('⚠️ No environment selected for refresh');
                }
                break;

            case 'export':
                this.componentLogger.info('💾 Export action triggered', { itemId });
                if (itemId) {
                    await this.handleExportTraces(itemId as 'csv' | 'json');
                } else {
                    this.componentLogger.warn('⚠️ No itemId for export');
                }
                break;

            case 'delete':
                this.componentLogger.info('🗑️ Delete action triggered', { itemId });
                if (itemId === 'delete-all') {
                    await this.handleDeleteAllTraces();
                } else if (itemId === 'delete-old') {
                    await this.handleDeleteOldTraces(30); // Default 30 days
                } else {
                    this.componentLogger.warn('⚠️ Unknown delete itemId', { itemId });
                }
                break;

            case 'traceLevel':
                this.componentLogger.info('📊 Trace level action triggered', { itemId });
                if (itemId && this.selectedEnvironmentId) {
                    const level = parseInt(itemId) as PluginTraceLevel;
                    this.componentLogger.info('Setting trace level', { level });
                    await this.handleSetTraceLevel(this.selectedEnvironmentId, level);
                    this.updateTraceLevelButton(level);
                } else {
                    this.componentLogger.warn('⚠️ Missing itemId or environment for trace level', {
                        itemId,
                        hasEnvironment: !!this.selectedEnvironmentId
                    });
                }
                break;

            case 'autoRefresh':
                this.componentLogger.info('⏱️ Auto-refresh action triggered', { itemId });
                if (itemId) {
                    const intervalSeconds = parseInt(itemId);
                    this.componentLogger.info('Setting auto-refresh', { intervalSeconds });
                    await this.handleAutoRefreshChange(itemId);
                    this.updateAutoRefreshButton(intervalSeconds);
                } else {
                    this.componentLogger.warn('⚠️ No itemId for auto-refresh');
                }
                break;

            default:
                this.componentLogger.warn('⚠️ Unknown action ID', { actionId, itemId });
        }

        this.componentLogger.info('✅ Action bar click handler completed', { actionId });
    }

    private updateTraceLevelButton(level: PluginTraceLevel): void {
        const labels = {
            [PluginTraceLevel.Off]: 'Off',
            [PluginTraceLevel.Exception]: 'Exception',
            [PluginTraceLevel.All]: 'All'
        };

        this.componentLogger.info('Updating trace level button', { level, label: labels[level] });

        const actions = this.actionBarComponent!.getActions();
        const updatedActions = actions.map(action => {
            if (action.id === 'traceLevel') {
                return { ...action, label: `Trace Level: ${labels[level]}` };
            }
            return action;
        });

        this.actionBarComponent!.setActions(updatedActions);
        this.componentLogger.info('Trace level button updated successfully', { newLabel: `Trace Level: ${labels[level]}` });
    }

    private updateAutoRefreshButton(intervalSeconds: number): void {
        const labels: Record<number, string> = {
            0: '⏸ Paused',
            10: '▶ Every 10s',
            30: '▶ Every 30s',
            60: '▶ Every 60s'
        };

        const actions = this.actionBarComponent!.getActions();
        const updatedActions = actions.map(action => {
            if (action.id === 'autoRefresh') {
                return { ...action, label: `Auto-Refresh: ${labels[intervalSeconds] || '⏸ Paused'}` };
            }
            return action;
        });

        this.actionBarComponent!.setActions(updatedActions);
    }

    private async handleContextMenuAction(actionId: string, rowId: string): Promise<void> {
        const trace = this.currentTraceData.find(t => t.plugintracelogid === rowId);

        if (!trace) {
            return;
        }

        switch (actionId) {
            case 'viewDetails':
                await this.handleTraceSelected(rowId);
                break;

            case 'openInDynamics':
                await this.handleOpenInDynamics(rowId);
                break;

            case 'copyTraceId':
                await vscode.env.clipboard.writeText(trace.plugintracelogid);
                vscode.window.showInformationMessage('Trace ID copied to clipboard');
                break;

            case 'copyCorrelationId':
                await vscode.env.clipboard.writeText(trace.correlationid || '');
                vscode.window.showInformationMessage('Correlation ID copied to clipboard');
                break;

            case 'showRelated':
                await this.handleShowRelatedTraces(trace.correlationid || '');
                break;

            case 'showInTimeline':
                await this.handleShowInTimeline(rowId);
                break;

            case 'deleteTrace':
                await this.handleDeleteTrace(rowId);
                break;
        }
    }

    private async handleExportTraces(format: 'csv' | 'json'): Promise<void> {
        // Export whatever is currently loaded (filtered data)
        const dataToExport = this.currentTraceData;

        if (dataToExport.length === 0) {
            vscode.window.showWarningMessage('No traces to export. Load some data first.');
            return;
        }

        // Generate content
        let content: string;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const defaultFilename = `plugin-traces-${this.selectedEnvironmentId || 'unknown'}-${timestamp}.${format}`;

        if (format === 'csv') {
            content = this.convertToCSV(dataToExport);
        } else {
            content = JSON.stringify(dataToExport, null, 2);
        }

        // Show save dialog
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFilename),
            filters: format === 'csv'
                ? { 'CSV Files': ['csv'], 'All Files': ['*'] }
                : { 'JSON Files': ['json'], 'All Files': ['*'] }
        });

        if (!uri) {
            return; // User cancelled
        }

        // Write file
        try {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Exported ${dataToExport.length} trace(s) to ${uri.fsPath}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to export: ${errorMessage}`);
        }
    }

    private convertToCSV(data: PluginTraceLog[]): string {
        if (data.length === 0) return '';

        // Define all columns from PluginTraceLog interface in logical order
        const columns = [
            'plugintracelogid',
            'createdon',
            'operationtype',
            'pluginname',
            'typename',
            'pluginstepid',
            'entityname',
            'messagename',
            'mode',
            'stage',
            'depth',
            'duration',
            'exceptiondetails',
            'messageblock',
            'configuration',
            'performancedetails',
            'correlationid',
            'userid',
            'initiatinguserid',
            'ownerid',
            'businessunitid',
            'organizationid'
        ];

        // CSV escape function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const escape = (val: any): string => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Build CSV
        const rows: string[] = [];

        // Header row
        rows.push(columns.join(','));

        // Data rows
        data.forEach(row => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const values = columns.map(col => escape((row as any)[col]));
            rows.push(values.join(','));
        });

        return rows.join('\n');
    }

    private async handleDeleteTrace(traceId: string): Promise<void> {
        if (!this.selectedEnvironmentId) {
            return;
        }

        const choice = await vscode.window.showWarningMessage(
            'Are you sure you want to delete this trace?',
            { modal: true },
            'Delete',
            'Cancel'
        );

        if (choice !== 'Delete') {
            return;
        }

        try {
            await this.pluginTraceService.deleteTrace(this.selectedEnvironmentId, traceId);

            vscode.window.showInformationMessage('Trace deleted successfully');

            // Reload traces
            await this.handleLoadTraces(this.selectedEnvironmentId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to delete trace: ${errorMessage}`);
        }
    }

    private async handleDeleteAllTraces(): Promise<void> {
        if (!this.selectedEnvironmentId) {
            return;
        }

        const count = this.currentTraceData.length;

        const choice = await vscode.window.showWarningMessage(
            `This will permanently delete ALL ${count} plugin traces. This action cannot be undone.`,
            { modal: true },
            'Delete All',
            'Cancel'
        );

        if (choice !== 'Delete All') {
            return;
        }

        try {
            const deletedCount = await this.pluginTraceService.deleteAllTraces(this.selectedEnvironmentId);

            vscode.window.showInformationMessage(`Deleted ${deletedCount} traces`);

            // Reload traces
            await this.handleLoadTraces(this.selectedEnvironmentId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to delete traces: ${errorMessage}`);
        }
    }

    private async handleDeleteOldTraces(days: number): Promise<void> {
        if (!this.selectedEnvironmentId) {
            return;
        }

        const input = await vscode.window.showInputBox({
            prompt: 'Delete traces older than how many days?',
            value: days.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a valid number greater than 0';
                }
                return null;
            }
        });

        if (!input) {
            return;
        }

        const daysToDelete = parseInt(input);

        const choice = await vscode.window.showWarningMessage(
            `This will delete all traces older than ${daysToDelete} days. This action cannot be undone.`,
            { modal: true },
            'Delete',
            'Cancel'
        );

        if (choice !== 'Delete') {
            return;
        }

        try {
            const deletedCount = await this.pluginTraceService.deleteOldTraces(this.selectedEnvironmentId, daysToDelete);

            vscode.window.showInformationMessage(`Deleted ${deletedCount} old traces`);

            // Reload traces
            await this.handleLoadTraces(this.selectedEnvironmentId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to delete old traces: ${errorMessage}`);
        }
    }

    private async handleOpenInDynamics(traceId: string): Promise<void> {
        if (!this.selectedEnvironmentId) {
            return;
        }

        try {
            const environments = await this._authService.getEnvironments();
            const environment = environments.find(env => env.id === this.selectedEnvironmentId);

            if (!environment) {
                throw new Error('Environment not found');
            }

            const baseUrl = environment.settings.dataverseUrl.replace('/api/data/v9.2', '').replace(/\/$/, '');
            const dynamicsUrl = `${baseUrl}/main.aspx?pagetype=entityrecord&etn=plugintracelog&id=${traceId}`;

            await vscode.env.openExternal(vscode.Uri.parse(dynamicsUrl));

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to open trace in Dynamics: ${errorMessage}`);
        }
    }

    private async handleShowRelatedTraces(correlationId: string): Promise<void> {
        if (!correlationId) {
            return;
        }

        // Apply filter for correlation ID
        const filterCondition: FilterCondition = {
            id: `corr-${Date.now()}`,
            field: 'correlationid',
            operator: 'equals',
            value: correlationId,
            logicalOperator: 'AND'
        };

        this.currentFilters = { quick: [], advanced: [filterCondition] };

        if (this.selectedEnvironmentId) {
            await this.handleLoadTraces(this.selectedEnvironmentId, this.currentFilters);
        }

        this.postMessage({
            action: 'filtersUpdated',
            filters: this.currentFilters
        });
    }

    private async handleShowInTimeline(traceId: string): Promise<void> {
        await this.handleTraceSelected(traceId);

        // Send message to switch to timeline tab
        this.postMessage({
            action: 'switchToTimelineTab'
        });
    }

    private async handleAutoRefreshChange(interval: string): Promise<void> {
        const seconds = parseInt(interval);

        this.autoRefreshIntervalSeconds = seconds;

        // Save to panel state
        await this.updateState({ autoRefreshIntervalSeconds: seconds });

        if (seconds > 0) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    private startAutoRefresh(): void {
        this.stopAutoRefresh();

        if (this.autoRefreshIntervalSeconds <= 0) {
            return;
        }

        this.autoRefreshInterval = setInterval(() => {
            if (this.selectedEnvironmentId) {
                this.handleLoadTraces(this.selectedEnvironmentId);
            }
        }, this.autoRefreshIntervalSeconds * 1000);

        this.componentLogger.info('Auto-refresh started', { interval: this.autoRefreshIntervalSeconds });
    }

    private stopAutoRefresh(): void {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = undefined;
            this.componentLogger.info('Auto-refresh stopped');
        }
    }

    private transformTracesForDisplay(traces: PluginTraceLog[]): PluginTraceTableRow[] {
        return traces.map(trace => ({
            id: trace.plugintracelogid,
            status: this.createStatusBadge(trace),
            createdon: this.formatDate(trace.createdon),
            duration: this.formatDuration(trace.duration),
            operationtype: this.getOperationTypeLabel(trace.operationtype),
            pluginname: trace.pluginname || '',
            pluginstepid: trace.pluginstepid || '',
            depth: trace.depth || 0,
            mode: this.getModeLabel(trace.mode),
            messagename: trace.messagename || '',
            entityname: trace.entityname || '',
            correlationid: trace.correlationid || '',
            hasException: !!(trace.exceptiondetails && trace.exceptiondetails.trim().length > 0)
        }));
    }

    private createStatusBadge(trace: PluginTraceLog): string {
        const hasException = trace.exceptiondetails && trace.exceptiondetails.trim().length > 0;

        if (hasException) {
            return '<span class="status-badge status-error"><span class="status-badge-indicator"></span><span class="status-badge-label">Exception</span></span>';
        } else {
            return '<span class="status-badge status-success"><span class="status-badge-indicator"></span><span class="status-badge-label">Success</span></span>';
        }
    }

    private formatDate(dateString: string): string {
        if (!dateString) {
            return '';
        }
        return new Date(dateString).toLocaleString();
    }

    private formatDuration(duration: number): string {
        if (!duration) {
            return '0ms';
        }

        if (duration < 1000) {
            return `${duration}ms`;
        } else if (duration < 60000) {
            return `${(duration / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    private getModeLabel(mode: number): string {
        return mode === 0 ? 'Sync' : 'Async';
    }

    private getOperationTypeLabel(operationType: string): string {
        // operationtype values: 1 = Plugin, 2 = Workflow Activity
        switch (operationType) {
            case '1':
                return 'Plugin';
            case '2':
                return 'Workflow';
            default:
                return operationType || 'Unknown';
        }
    }

    /**
     * Build an OData filter condition from a single filter
     */
    private buildODataCondition(condition: FilterCondition): string {
        const field = condition.field;
        const operator = condition.operator;
        const value = condition.value;

        switch (field) {
            case 'pluginname':
                if (operator === 'contains') {
                    return `contains(typename,'${value}')`;
                } else if (operator === 'equals') {
                    return `typename eq '${value}'`;
                } else if (operator === 'startsWith') {
                    return `startswith(typename,'${value}')`;
                } else if (operator === 'endsWith') {
                    return `endswith(typename,'${value}')`;
                }
                break;

            case 'entityname':
                if (operator === 'contains') {
                    return `contains(primaryentity,'${value}')`;
                } else if (operator === 'equals') {
                    return `primaryentity eq '${value}'`;
                } else if (operator === 'startsWith') {
                    return `startswith(primaryentity,'${value}')`;
                }
                break;

            case 'messagename':
                if (operator === 'contains') {
                    return `contains(messagename,'${value}')`;
                } else if (operator === 'equals') {
                    return `messagename eq '${value}'`;
                }
                break;

            case 'duration':
                if (operator === '>') {
                    return `performanceexecutionduration gt ${value}`;
                } else if (operator === '<') {
                    return `performanceexecutionduration lt ${value}`;
                } else if (operator === '>=') {
                    return `performanceexecutionduration ge ${value}`;
                } else if (operator === '<=') {
                    return `performanceexecutionduration le ${value}`;
                } else if (operator === 'between' && condition.value2) {
                    return `(performanceexecutionduration ge ${value} and performanceexecutionduration le ${condition.value2})`;
                }
                break;

            case 'createdon':
                if (operator === '>') {
                    const date = new Date(value as string | number | Date);
                    date.setMilliseconds(date.getMilliseconds() + 1);
                    return `createdon ge ${date.toISOString()}`;
                } else if (operator === '<') {
                    const date = new Date(value as string | number | Date);
                    date.setMilliseconds(date.getMilliseconds() - 1);
                    return `createdon le ${date.toISOString()}`;
                } else if (operator === '>=') {
                    return `createdon ge ${value}`;
                } else if (operator === '<=') {
                    return `createdon le ${value}`;
                } else if (operator === 'between' && condition.value2) {
                    return `(createdon ge ${value} and createdon le ${condition.value2})`;
                }
                break;

            case 'depth':
                if (operator === 'equals') {
                    return `depth eq ${value}`;
                } else if (operator === '>') {
                    return `depth gt ${value}`;
                } else if (operator === '<') {
                    return `depth lt ${value}`;
                }
                break;

            case 'mode':
                if (operator === 'equals') {
                    return `mode eq ${value}`;
                }
                break;

            case 'exceptiondetails':
                if (operator === 'isNotNull') {
                    return `exceptiondetails ne null`;
                } else if (operator === 'isNull') {
                    return `exceptiondetails eq null`;
                } else if (operator === 'contains') {
                    return `contains(exceptiondetails,'${value}')`;
                }
                break;
        }

        this.componentLogger.warn('Unsupported filter condition', { field, operator, value });
        return '';
    }

    /**
     * Build OData filter string from advanced filters with OR/AND logic
     */
    private buildODataFilterString(advancedFilters: FilterCondition[]): string {
        if (!advancedFilters || advancedFilters.length === 0) {
            return '';
        }

        const conditions: string[] = [];

        for (let i = 0; i < advancedFilters.length; i++) {
            const condition = advancedFilters[i];
            const odataCondition = this.buildODataCondition(condition);

            if (odataCondition) {
                if (i === 0) {
                    // First condition - no logical operator prefix
                    conditions.push(odataCondition);
                } else {
                    // Subsequent conditions - use the PREVIOUS condition's logical operator
                    const previousCondition = advancedFilters[i - 1];
                    const logicalOp = previousCondition.logicalOperator || 'AND';
                    conditions.push(`${logicalOp.toLowerCase()} ${odataCondition}`);
                }
            }
        }

        return conditions.join(' ');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private convertFiltersToServiceFormat(filters: any): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serviceFilters: any = {
            top: 100 // Default limit
        };

        if (!filters) {
            this.componentLogger.info('No filters provided, using defaults');
            return serviceFilters;
        }

        this.componentLogger.info('🔄 Converting filters', { inputFilters: filters });

        const odataConditions: string[] = [];

        // Handle quick filters - convert to OData conditions
        if (filters.quick && Array.isArray(filters.quick)) {
            this.componentLogger.info('Processing quick filters', { quickFilters: filters.quick });
            filters.quick.forEach((filterId: string) => {
                switch (filterId) {
                    case 'exceptionOnly':
                        odataConditions.push('exceptiondetails ne null');
                        this.componentLogger.debug('Added exceptionOnly OData condition');
                        break;
                    case 'lastHour': {
                        const oneHourAgo = new Date();
                        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
                        odataConditions.push(`createdon ge ${oneHourAgo.toISOString()}`);
                        this.componentLogger.debug('Added lastHour OData condition', { date: oneHourAgo.toISOString() });
                        break;
                    }
                    case 'last24h': {
                        const oneDayAgo = new Date();
                        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
                        odataConditions.push(`createdon ge ${oneDayAgo.toISOString()}`);
                        this.componentLogger.debug('Added last24h OData condition', { date: oneDayAgo.toISOString() });
                        break;
                    }
                    case 'today': {
                        const startOfToday = new Date();
                        startOfToday.setHours(0, 0, 0, 0);
                        odataConditions.push(`createdon ge ${startOfToday.toISOString()}`);
                        this.componentLogger.debug('Added today OData condition', { date: startOfToday.toISOString() });
                        break;
                    }
                }
            });
        }

        // Handle advanced filters - build OData filter string with OR/AND logic
        if (filters.advanced && filters.advanced.length > 0) {
            this.componentLogger.info('Processing advanced filters with OR/AND logic', {
                count: filters.advanced.length,
                filters: filters.advanced
            });

            const advancedODataFilter = this.buildODataFilterString(filters.advanced);
            if (advancedODataFilter) {
                // Wrap advanced filters in parentheses if there are multiple conditions
                if (filters.advanced.length > 1) {
                    odataConditions.push(`(${advancedODataFilter})`);
                } else {
                    odataConditions.push(advancedODataFilter);
                }
                this.componentLogger.debug('Built advanced OData filter', { advancedODataFilter });
            }
        }

        // Combine all OData conditions with AND (quick filters AND advanced filters)
        if (odataConditions.length > 0) {
            serviceFilters.odataFilter = odataConditions.join(' and ');
            this.componentLogger.info('✅ Built complete OData filter', { odataFilter: serviceFilters.odataFilter });
        }

        return serviceFilters;
    }

    protected getHtmlContent(): string {
        // Get saved split ratio from state (default to 50)
        const savedSplitRatio = this.currentState.splitRatio || 50;

        // Always start with detail panel hidden (only show when user selects a trace)
        // But we preserve the split ratio so it opens at their preferred size
        const rightPanelVisible = false;
        const hiddenClass = 'split-panel-right-hidden';

        this.componentLogger.debug('🎨 getHtmlContent called');

        const customHTML = `
            <div class="panel-container">
                <div class="panel-controls">
                    ${this.actionBarComponent!.generateHTML()}
                    ${this.environmentSelectorComponent!.generateHTML()}
                </div>
                <div class="panel-controls">
                    ${this.filterPanelComponent!.generateHTML()}
                </div>
                <div class="panel-content">
                    <div id="splitPanelContainer" class="split-panel split-panel-horizontal split-panel-resizable ${hiddenClass}"
                         data-component-type="SplitPanel"
                         data-component-id="plugin-trace-split-panel"
                         data-orientation="horizontal"
                         data-min-size="300"
                         data-resizable="true"
                         data-split-ratio="${savedSplitRatio}">
                        <div id="traceTableContainer" class="split-panel-left" data-panel="left" style="${rightPanelVisible ? `width: ${savedSplitRatio}%;` : ''}">
                            ${this.dataTableComponent!.generateHTML()}
                        </div>

                        <div class="split-panel-divider" data-divider>
                            <div class="split-panel-divider-handle"></div>
                        </div>

                        <div id="traceDetailContainer" class="split-panel-right trace-detail-panel" data-panel="right" style="${rightPanelVisible ? `width: ${100 - savedSplitRatio}%;` : 'display: none;'}">
                            <div class="trace-detail-header">
                                <h3 id="detailPanelTitle">Trace Details</h3>
                                <button id="closeDetailBtn" class="btn-icon-only" data-action="closeRightPanel" title="Close">×</button>
                            </div>
                            <div class="trace-detail-tabs">
                                <button class="tab-btn active" data-tab="configuration">Configuration</button>
                                <button class="tab-btn" data-tab="execution">Execution</button>
                                <button class="tab-btn" data-tab="timeline">Timeline</button>
                                <button class="tab-btn" data-tab="related">Related</button>
                                <button class="tab-btn" data-tab="raw">Raw Data</button>
                            </div>
                            <div class="trace-detail-content">
                                <div id="tab-configuration" class="tab-content active"></div>
                                <div id="tab-execution" class="tab-content"></div>
                                <div id="tab-timeline" class="tab-content">
                                    <div id="timelineContainer"></div>
                                </div>
                                <div id="tab-related" class="tab-content"></div>
                                <div id="tab-raw" class="tab-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return PanelComposer.composeWithCustomHTML(
            customHTML,
            [
                this.environmentSelectorComponent!,
                this.actionBarComponent!,
                this.filterPanelComponent!,
                this.dataTableComponent!
            ],
            [
                'css/panels/plugin-trace-viewer.css',
                'css/components/timeline.css',
                'css/components/split-panel.css',
                'css/components/viewers/json-viewer.css'
            ],
            [
                'js/utils/ExportUtils.js',
                'js/components/TimelineBehavior.js',
                'js/components/SplitPanelBehavior.js',
                'js/panels/pluginTraceViewerBehavior.js'
            ],
            this.getCommonWebviewResources(),
            'Plugin Trace Viewer'
        );
    }

    public dispose(): void {
        this.stopAutoRefresh();

        // Always clean up the panel reference and call super.dispose
        // (this prevents the "Webview is disposed" error on reopen)
        super.dispose();
        PluginTraceViewerPanel.currentPanel = undefined;

        // Show warning asynchronously if traces are enabled (non-blocking)
        if (this.currentTraceLevel === PluginTraceLevel.All && this.selectedEnvironmentId) {
            const envId = this.selectedEnvironmentId;
            vscode.window.showWarningMessage(
                'Plugin traces were set to "All" in the environment. This can impact performance. Turn off traces?',
                'Turn Off',
                'Keep Enabled'
            ).then(async (choice) => {
                if (choice === 'Turn Off') {
                    try {
                        await this.pluginTraceService.setPluginTraceLevel(
                            envId,
                            PluginTraceLevel.Off
                        );
                        vscode.window.showInformationMessage('Plugin traces turned off successfully');
                    } catch (error) {
                        this.componentLogger.error('Failed to turn off traces', error as Error);
                        vscode.window.showErrorMessage('Failed to turn off plugin traces');
                    }
                }
            });
        }
    }
}
