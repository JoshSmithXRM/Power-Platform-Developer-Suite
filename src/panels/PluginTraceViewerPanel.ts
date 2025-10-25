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
    expand: string;
    status: string; // HTML badge
    createdon: string;
    duration: string;
    pluginname: string;
    messagename: string;
    entityname: string;
    mode: string;
    depth: number;
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
            PluginTraceViewerPanel.currentPanel = undefined;
            this.stopAutoRefresh();
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
                    const savedFilters = cachedState.filters as any;

                    // Convert objects to arrays if needed (happens when data is serialized/deserialized)
                    const quickFiltersArray = Array.isArray(savedFilters.quick) ? savedFilters.quick :
                        (savedFilters.quick && typeof savedFilters.quick === 'object' ? Object.values(savedFilters.quick) : []);
                    const advancedFiltersArray = Array.isArray(savedFilters.advanced) ? savedFilters.advanced :
                        (savedFilters.advanced && typeof savedFilters.advanced === 'object' ? Object.values(savedFilters.advanced) : []);

                    this.currentFilters = {
                        quick: quickFiltersArray,
                        advanced: advancedFiltersArray
                    };
                    this.componentLogger.info('Restored filters from cache', {
                        filters: this.currentFilters,
                        quickCount: quickFiltersArray.length,
                        advancedCount: advancedFiltersArray.length
                    });

                    // Delay filter restoration to ensure webview is fully loaded
                    // The filters will be applied via direct webview message after a short delay
                    setTimeout(() => {
                        if (quickFiltersArray.length > 0) {
                            this.componentLogger.info('Applying restored quick filters to UI', { filters: quickFiltersArray });
                            this.postMessage({
                                action: 'setQuickFilters',
                                componentId: this.filterPanelComponent!.getId(),
                                componentType: 'FilterPanel',
                                filterIds: quickFiltersArray
                            });
                        }
                        if (advancedFiltersArray.length > 0) {
                            this.componentLogger.info('Applying restored advanced filters to UI', { filters: advancedFiltersArray });
                            this.postMessage({
                                action: 'setAdvancedFilters',
                                componentId: this.filterPanelComponent!.getId(),
                                componentType: 'FilterPanel',
                                conditions: advancedFiltersArray
                            });
                        }
                    }, 500);
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
                        { id: 'all-csv', label: 'Export All (CSV)' },
                        { id: 'all-json', label: 'Export All (JSON)' },
                        { id: 'filtered-csv', label: 'Export Filtered (CSV)' },
                        { id: 'filtered-json', label: 'Export Filtered (JSON)' },
                        { id: 'selected-csv', label: 'Export Selected (CSV)' },
                        { id: 'selected-json', label: 'Export Selected (JSON)' }
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
                    conditions: [{ id: 'qf1', field: 'exceptiondetails', operator: 'isNotEmpty', value: true, logicalOperator: 'AND' }]
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
                { field: 'exceptiondetails', label: 'Has Exception', type: 'boolean', operators: ['isNotEmpty', 'isEmpty'] }
            ],
            showPreviewCount: true,
            maxConditions: 10
        });

        // 4. Data Table
        this.dataTableComponent = this.componentFactory.createDataTable({
            id: 'pluginTrace-table',
            columns: [
                { id: 'expand', field: 'expand', label: '', width: '30px', sortable: false },
                { id: 'status', field: 'status', label: 'Status', sortable: true, width: '90px', type: 'html' },
                { id: 'createdon', field: 'createdon', label: 'Started', sortable: true, width: '140px' },
                { id: 'duration', field: 'duration', label: 'Duration', sortable: true, width: '90px', align: 'right' },
                { id: 'pluginname', field: 'pluginname', label: 'Plugin', sortable: true },
                { id: 'messagename', field: 'messagename', label: 'Message', sortable: true, width: '120px' },
                { id: 'entityname', field: 'entityname', label: 'Entity', sortable: true, width: '120px' },
                { id: 'mode', field: 'mode', label: 'Mode', sortable: true, width: '100px' },
                { id: 'depth', field: 'depth', label: 'Depth', sortable: true, width: '60px', align: 'center' }
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

            // LOG ALL MESSAGES
            this.componentLogger.info('📨 MESSAGE RECEIVED', {
                action,
                command: message.command,
                fullMessage: message
            });

            switch (action) {
                case 'component-event':
                    this.componentLogger.info('🎯 Handling component-event');
                    await this.handleComponentEvent(message);
                    break;

                case 'dropdown-item-clicked':
                    this.componentLogger.info('🎯 Handling dropdown-item-clicked');
                    await this.handleDropdownItemClicked(message);
                    break;

                case 'loadEnvironments':
                    await this.handleLoadEnvironments();
                    break;

                case 'environmentChanged':
                    await this.handleEnvironmentChanged(message.environmentId);
                    break;

                case 'loadTraces':
                    await this.handleLoadTraces(message.environmentId, message.filterOptions);
                    break;

                case 'traceLevelChanged':
                    await this.handleSetTraceLevel(message.environmentId, message.level);
                    break;

                case 'filtersApplied': {
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

                case 'traceSelected':
                    await this.handleTraceSelected(message.traceId);
                    break;

                case 'contextMenuAction':
                    await this.handleContextMenuAction(message.actionId, message.rowId);
                    break;

                case 'autoRefreshChanged':
                    await this.handleAutoRefreshChange(message.interval);
                    break;

                default:
                    this.componentLogger.warn('⚠️ Unknown action', { action, message });
            }
        } catch (error: any) {
            const action = message.action || message.command;
            this.componentLogger.error(`Error handling message ${action}`, error);
            this.postMessage({
                action: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    private async handleComponentEvent(message: WebviewMessage): Promise<void> {
        try {
            const { componentId, eventType, data } = message.data || {};

            this.componentLogger.info('🔧 COMPONENT EVENT', {
                componentId,
                eventType,
                data,
                fullMessageData: message.data
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
            else {
                this.componentLogger.warn('⚠️ Unhandled component event', { componentId, eventType });
            }
        } catch (error: any) {
            this.componentLogger.error('❌ Error handling component event', error);
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
        } catch (error: any) {
            this.componentLogger.error('❌ Error handling dropdown item click', error);
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
        this.selectedEnvironmentId = environmentId;

        await this.updateState({ selectedEnvironmentId: environmentId });

        await this.handleGetTraceLevel(environmentId);
        await this.handleLoadTraces(environmentId);
    }

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

            // Convert filters to service format
            const serviceFilters = this.convertFiltersToServiceFormat(filterOptions || this.currentFilters);

            // Fetch traces
            const traces = await this.pluginTraceService.getPluginTraceLogs(environmentId, serviceFilters);

            this.currentTraceData = traces;

            // Transform for display
            const tableData = this.transformTracesForDisplay(traces);

            // Update table
            this.dataTableComponent?.setData(tableData);

            this.componentLogger.info('Loaded traces', { count: traces.length });

            this.postMessage({
                action: 'tracesLoaded',
                count: traces.length
            });
        } catch (error: any) {
            this.componentLogger.error('Failed to load traces', error);
            this.postMessage({
                action: 'error',
                message: `Failed to load traces: ${error.message}`
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
        } catch (error: any) {
            this.componentLogger.error('Failed to get trace level', error);
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

        } catch (error: any) {
            this.componentLogger.error('Failed to set trace level', error);
            this.postMessage({
                action: 'error',
                message: `Failed to set trace level: ${error.message}`
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
                    await this.handleLoadTraces(this.selectedEnvironmentId);
                } else {
                    this.componentLogger.warn('⚠️ No environment selected for refresh');
                }
                break;

            case 'export':
                this.componentLogger.info('💾 Export action triggered', { itemId });
                if (itemId) {
                    const [scope, format] = itemId.split('-');
                    await this.handleExportTraces(format as 'csv' | 'json', scope as 'all' | 'filtered' | 'selected');
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

    private async handleExportTraces(format: 'csv' | 'json', scope: 'all' | 'filtered' | 'selected'): Promise<void> {
        let dataToExport: PluginTraceLog[] = [];

        switch (scope) {
            case 'all':
            case 'filtered': // TODO: Apply current table filters
                dataToExport = this.currentTraceData;
                break;
            case 'selected':
                if (this.selectedTraceId) {
                    const trace = this.currentTraceData.find(t => t.plugintracelogid === this.selectedTraceId);
                    if (trace) {
                        dataToExport = [trace];
                    }
                }
                break;
        }

        if (dataToExport.length === 0) {
            vscode.window.showWarningMessage('No traces to export');
            return;
        }

        // Send to webview for download
        this.postMessage({
            action: 'exportTraces',
            format: format,
            data: dataToExport,
            filename: `plugin-traces-${this.selectedEnvironmentId || 'unknown'}`
        });
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
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to delete trace: ${error.message}`);
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
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to delete traces: ${error.message}`);
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
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to delete old traces: ${error.message}`);
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

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open trace in Dynamics: ${error.message}`);
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
            expand: '', // For expandable rows (future feature)
            status: this.createStatusBadge(trace),
            createdon: this.formatDate(trace.createdon),
            duration: this.formatDuration(trace.duration),
            pluginname: trace.pluginname || '',
            messagename: trace.messagename || '',
            entityname: trace.entityname || '',
            mode: this.getModeLabel(trace.mode),
            depth: trace.depth || 0,
            correlationid: trace.correlationid || '',
            hasException: !!(trace.exceptiondetails && trace.exceptiondetails.trim().length > 0)
        }));
    }

    private createStatusBadge(trace: PluginTraceLog): string {
        const hasException = trace.exceptiondetails && trace.exceptiondetails.trim().length > 0;

        if (hasException) {
            return '<span class="badge badge-error">Exception</span>';
        } else {
            return '<span class="badge badge-success">Success</span>';
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

    private convertFiltersToServiceFormat(filters: any): any {
        const serviceFilters: any = {
            top: 100 // Default limit
        };

        if (!filters) {
            return serviceFilters;
        }

        // Handle quick filters
        if (filters.quick && filters.quick.includes('exceptionOnly')) {
            serviceFilters.exceptionOnly = true;
        }

        // Handle advanced filters
        if (filters.advanced && filters.advanced.length > 0) {
            this.componentLogger.info('Processing advanced filters', { count: filters.advanced.length, filters: filters.advanced });

            filters.advanced.forEach((condition: FilterCondition) => {
                // Map filter conditions to service parameters
                const field = condition.field;
                const operator = condition.operator;
                const value = condition.value;

                this.componentLogger.debug('Processing filter condition', { field, operator, value });

                switch (field) {
                    case 'pluginname':
                        if (operator === 'contains') {
                            serviceFilters.pluginName = value;
                        }
                        break;
                    case 'entityname':
                        if (operator === 'contains') {
                            serviceFilters.entityName = value;
                        }
                        break;
                    case 'exceptiondetails':
                        if (operator === 'isNotEmpty') {
                            serviceFilters.exceptionOnly = true;
                        }
                        break;
                    case 'createdon':
                        // Handle date filters
                        if (operator === '>=') {
                            serviceFilters.fromDate = value;
                        } else if (operator === '<=') {
                            serviceFilters.toDate = value;
                        } else if (operator === '>') {
                            // Greater than - add 1ms to make it work like >=
                            const date = new Date(value);
                            date.setMilliseconds(date.getMilliseconds() + 1);
                            serviceFilters.fromDate = date.toISOString();
                        } else if (operator === '<') {
                            // Less than - subtract 1ms to make it work like <=
                            const date = new Date(value);
                            date.setMilliseconds(date.getMilliseconds() - 1);
                            serviceFilters.toDate = date.toISOString();
                        }
                        break;
                    // Add more mappings as needed
                }
            });

            this.componentLogger.info('Converted filters to service format', { serviceFilters });
        }

        return serviceFilters;
    }

    protected getHtmlContent(): string {
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
                    <div id="splitPanelContainer" class="split-panel-wrapper"
                         data-component-type="SplitPanel"
                         data-component-id="plugin-trace-split-panel"
                         data-orientation="horizontal"
                         data-min-size="300"
                         data-resizable="true">
                        <div id="traceTableContainer" data-panel="left">
                            ${this.dataTableComponent!.generateHTML()}
                        </div>

                        <div class="split-panel-divider" data-divider></div>

                        <div id="traceDetailContainer" data-panel="right" class="trace-detail-panel" style="display: none;">
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

            <script>
                // Tab switching
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tabId = btn.dataset.tab;

                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        document.getElementById('tab-' + tabId).classList.add('active');
                    });
                });

                // Close detail panel is handled by SplitPanelBehavior via data-action="closeRightPanel"

                // Message handler additions
                window.addEventListener('message', (event) => {
                    const message = event.data;

                    switch (message.action) {
                        case 'showTraceDetails':
                            showTraceDetailPanel(message.trace, message.relatedTraces);
                            break;

                        case 'exportTraces':
                            if (message.format === 'csv') {
                                ExportUtils.exportToCSV(message.data, message.filename);
                            } else {
                                ExportUtils.exportToJSON(message.data, message.filename);
                            }
                            break;

                        case 'switchToTimelineTab':
                            document.querySelector('[data-tab="timeline"]').click();
                            break;
                    }
                });

                function showTraceDetailPanel(trace, relatedTraces) {
                    const detailPanel = document.getElementById('traceDetailContainer');
                    const splitContainer = document.getElementById('splitPanelContainer');

                    // Initialize split panel behavior if not already initialized
                    if (window.SplitPanelBehavior && !window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
                        window.SplitPanelBehavior.initialize(
                            'plugin-trace-split-panel',
                            {
                                orientation: 'horizontal',
                                minSize: 300,
                                resizable: true,
                                initialSplit: 50,
                                rightPanelDefaultHidden: true
                            },
                            splitContainer
                        );
                    }

                    // Show the right panel using split panel behavior
                    if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
                        const instance = window.SplitPanelBehavior.instances.get('plugin-trace-split-panel');
                        window.SplitPanelBehavior.showRightPanel(instance);
                    } else {
                        // Fallback if split panel behavior isn't available
                        detailPanel.style.display = 'flex';
                    }

                    // Configuration tab
                    document.getElementById('tab-configuration').innerHTML = generateConfigurationTab(trace);

                    // Execution tab
                    document.getElementById('tab-execution').innerHTML = generateExecutionTab(trace);

                    // Timeline tab
                    if (trace.correlationid) {
                        const allRelated = [trace, ...relatedTraces].sort((a, b) =>
                            new Date(a.createdon).getTime() - new Date(b.createdon).getTime()
                        );
                        TimelineBehavior.renderTimeline(allRelated, 'timelineContainer', (traceId) => {
                            vscode.postMessage({ action: 'traceSelected', traceId });
                        });
                    } else {
                        document.getElementById('timelineContainer').innerHTML =
                            '<div class="timeline-empty"><p>No correlation ID available for timeline view</p></div>';
                    }

                    // Related tab
                    document.getElementById('tab-related').innerHTML = generateRelatedTab(relatedTraces, trace.plugintracelogid);

                    // Raw data tab with syntax highlighting
                    document.getElementById('tab-raw').innerHTML = '<pre class="json-display">' +
                        renderJSON(trace, 0) + '</pre>';
                }

                function generateConfigurationTab(trace) {
                    return \`
                        <div class="detail-section">
                            <div class="detail-section-title">General</div>
                            <div class="detail-grid">
                                <div class="detail-label">Plugin</div>
                                <div class="detail-value">\${trace.pluginname || '<span class="empty">N/A</span>'}</div>

                                <div class="detail-label">Message</div>
                                <div class="detail-value">\${trace.messagename || '<span class="empty">N/A</span>'}</div>

                                <div class="detail-label">Entity</div>
                                <div class="detail-value">\${trace.entityname || '<span class="empty">N/A</span>'}</div>

                                <div class="detail-label">Operation Type</div>
                                <div class="detail-value">\${trace.operationtype || '<span class="empty">N/A</span>'}</div>

                                <div class="detail-label">Mode</div>
                                <div class="detail-value">\${trace.mode === 0 ? 'Synchronous' : 'Asynchronous'}</div>

                                <div class="detail-label">Depth</div>
                                <div class="detail-value">\${trace.depth || 1}</div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <div class="detail-section-title">Identifiers</div>
                            <div class="detail-grid">
                                <div class="detail-label">Trace ID</div>
                                <div class="detail-value code">\${trace.plugintracelogid}</div>

                                <div class="detail-label">Correlation ID</div>
                                <div class="detail-value code">\${trace.correlationid || '<span class="empty">N/A</span>'}</div>
                            </div>
                        </div>
                    \`;
                }

                function generateExecutionTab(trace) {
                    const hasException = trace.exceptiondetails && trace.exceptiondetails.trim().length > 0;
                    const hasMessage = trace.messageblock && trace.messageblock.trim().length > 0;

                    return \`
                        <div class="detail-section">
                            <div class="detail-section-title">Performance</div>
                            <div class="detail-grid">
                                <div class="detail-label">Start Time</div>
                                <div class="detail-value">\${new Date(trace.createdon).toLocaleString()}</div>

                                <div class="detail-label">Duration</div>
                                <div class="detail-value">\${formatDuration(trace.duration)}</div>

                                <div class="detail-label">Performance Details</div>
                                <div class="detail-value">\${trace.performancedetails || '<span class="empty">N/A</span>'}</div>
                            </div>
                        </div>

                        \${hasMessage ? \`
                        <div class="detail-section">
                            <div class="detail-section-title">Message Block</div>
                            <pre class="detail-code">\${escapeHtml(trace.messageblock)}</pre>
                        </div>
                        \` : ''}

                        \${hasException ? \`
                        <div class="detail-section">
                            <div class="detail-section-title">Exception Details</div>
                            <pre class="detail-code exception">\${escapeHtml(trace.exceptiondetails)}</pre>
                        </div>
                        \` : ''}
                    \`;
                }

                function generateRelatedTab(relatedTraces, currentTraceId) {
                    if (!relatedTraces || relatedTraces.length === 0) {
                        return '<div class="related-traces-empty">No related traces found</div>';
                    }

                    return \`
                        <div class="related-traces-list">
                            \${relatedTraces.map(trace => \`
                                <div class="related-trace-item \${trace.plugintracelogid === currentTraceId ? 'current' : ''}"
                                     onclick="vscode.postMessage({ action: 'traceSelected', traceId: '\${trace.plugintracelogid}' })">
                                    <div class="related-trace-title">
                                        <span class="status-indicator \${trace.exceptiondetails ? 'exception' : 'success'}"></span>
                                        \${trace.pluginname || 'Unknown Plugin'}
                                    </div>
                                    <div class="related-trace-meta">
                                        <span>\${trace.messagename || 'N/A'}</span>
                                        <span>\${formatDuration(trace.duration)}</span>
                                        <span>Depth: \${trace.depth || 1}</span>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }

                function formatDuration(duration) {
                    if (!duration) return '0ms';
                    if (duration < 1000) return duration + 'ms';
                    if (duration < 60000) return (duration / 1000).toFixed(2) + 's';
                    const minutes = Math.floor(duration / 60000);
                    const seconds = ((duration % 60000) / 1000).toFixed(2);
                    return minutes + 'm ' + seconds + 's';
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                /**
                 * Render JSON with syntax highlighting
                 */
                function renderJSON(obj, depth = 0) {
                    if (obj === null) return '<span class="json-null">null</span>';
                    if (obj === undefined) return '<span class="json-undefined">undefined</span>';

                    const indent = '  '.repeat(depth);
                    const type = typeof obj;

                    if (type === 'boolean') {
                        return \`<span class="json-boolean">\${obj}</span>\`;
                    }

                    if (type === 'number') {
                        return \`<span class="json-number">\${obj}</span>\`;
                    }

                    if (type === 'string') {
                        return \`<span class="json-string">"\${escapeHtml(obj)}"</span>\`;
                    }

                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '[]';

                        const items = obj.map(item =>
                            \`\${indent}  \${renderJSON(item, depth + 1)}\`
                        ).join(',\\n');

                        return \`[\\n\${items}\\n\${indent}]\`;
                    }

                    if (type === 'object') {
                        const keys = Object.keys(obj);
                        if (keys.length === 0) return '{}';

                        const items = keys.map(key =>
                            \`\${indent}  <span class="json-key">"\${escapeHtml(key)}"</span>: \${renderJSON(obj[key], depth + 1)}\`
                        ).join(',\\n');

                        return \`{\\n\${items}\\n\${indent}}\`;
                    }

                    return String(obj);
                }
            </script>
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
                'css/components/split-panel.css'
            ],
            [
                'js/utils/ExportUtils.js',
                'js/components/TimelineBehavior.js',
                'js/components/SplitPanelBehavior.js'
            ],
            this.getCommonWebviewResources(),
            'Plugin Trace Viewer'
        );
    }

    public dispose(): void {
        this.stopAutoRefresh();

        // Check if traces are enabled and warn
        if (this.currentTraceLevel === PluginTraceLevel.All) {
            vscode.window.showWarningMessage(
                'Plugin traces are currently set to "All". This can impact performance. Turn off traces?',
                'Turn Off & Close',
                'Keep Enabled & Close',
                'Cancel'
            ).then(async (choice) => {
                if (choice === 'Turn Off & Close') {
                    if (this.selectedEnvironmentId) {
                        try {
                            await this.pluginTraceService.setPluginTraceLevel(
                                this.selectedEnvironmentId,
                                PluginTraceLevel.Off
                            );
                        } catch (error) {
                            this.componentLogger.error('Failed to turn off traces', error as Error);
                        }
                    }
                    super.dispose();
                    PluginTraceViewerPanel.currentPanel = undefined;
                } else if (choice === 'Keep Enabled & Close') {
                    super.dispose();
                    PluginTraceViewerPanel.currentPanel = undefined;
                }
                // Cancel = do nothing, keep panel open
            });
        } else {
            super.dispose();
            PluginTraceViewerPanel.currentPanel = undefined;
        }
    }
}
