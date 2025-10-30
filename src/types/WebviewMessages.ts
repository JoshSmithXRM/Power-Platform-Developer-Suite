/**
 * Type-safe webview message system using discriminated unions
 *
 * REPLACES: WebviewMessage interface with index signature [key: string]: any
 *
 * ARCHITECTURE:
 * - Discriminated on 'command' field (not 'action')
 * - Each message type is explicit interface
 * - Union type for exhaustive type checking
 * - Panels use switch/case for type narrowing
 */

/**
 * Base message interface - all messages have command
 */
interface BaseWebviewMessage {
    command: string;
}

/**
 * Environment changed message
 * Sent when user selects different environment
 */
export interface EnvironmentChangedMessage extends BaseWebviewMessage {
    command: 'environment-changed';
    data?: {
        environmentId: string;
    };
    environmentId?: string; // Some messages use flat structure
}

/**
 * Component event message
 * Sent for all component interactions (button clicks, selection changes, etc.)
 */
export interface ComponentEventMessage extends BaseWebviewMessage {
    command: 'component-event';
    data: {
        componentId: string;
        eventType: string;
        data?: unknown;
    };
}

/**
 * Sync deployment settings message
 * Sent from ConnectionReferencesPanel and EnvironmentVariablesPanel
 */
export interface SyncDeploymentSettingsMessage extends BaseWebviewMessage {
    command: 'sync-deployment-settings';
    data: {
        relationships?: unknown; // ConnectionReferences-specific
        environmentVariablesData?: unknown; // EnvironmentVariables-specific
        solutionUniqueName?: string;
    };
}

/**
 * Open in Maker message
 * Opens entity/solution in Power Apps maker portal
 */
export interface OpenInMakerMessage extends BaseWebviewMessage {
    command: 'open-in-maker';
    data: {
        environmentId: string;
        solutionId?: string;
        entityType?: string;
        entityId?: string;
    };
}

/**
 * Table search message
 * Triggers search in DataTable component
 */
export interface TableSearchMessage extends BaseWebviewMessage {
    command: 'table-search';
    tableId: string;
    searchQuery?: string;
}

/**
 * Panel ready message
 * Sent by webview when fully loaded
 */
export interface PanelReadyMessage extends BaseWebviewMessage {
    command: 'panel-ready';
}

/**
 * Search message
 * Sent by SearchInput component
 */
export interface SearchMessage extends BaseWebviewMessage {
    command: 'search';
    data?: {
        componentId: string;
        query?: string;
    };
}

/**
 * Solution selected message
 * Sent when user selects solution in SolutionSelector
 */
export interface SolutionSelectedMessage extends BaseWebviewMessage {
    command: 'solution-selected';
    data?: {
        solutionId: string;
    };
}

/**
 * Load solutions message
 * Triggers solution list refresh
 */
export interface LoadSolutionsMessage extends BaseWebviewMessage {
    command: 'load-solutions';
    data?: {
        environmentId: string;
    };
}

/**
 * Load environment variables message
 */
export interface LoadEnvironmentVariablesMessage extends BaseWebviewMessage {
    command: 'load-environment-variables';
    data?: {
        environmentId: string;
        solutionId?: string;
    };
}

/**
 * Load import jobs message
 */
export interface LoadImportJobsMessage extends BaseWebviewMessage {
    command: 'load-import-jobs';
    data?: {
        environmentId: string;
    };
}

/**
 * View import job XML message
 */
export interface ViewImportJobXmlMessage extends BaseWebviewMessage {
    command: 'view-import-job-xml';
    data?: {
        environmentId?: string;
        importJobId: string;
    };
}

/**
 * Open solution history message
 */
export interface OpenSolutionHistoryMessage extends BaseWebviewMessage {
    command: 'open-solution-history';
    data?: {
        environmentId: string;
    };
}

/**
 * Save environment message (EnvironmentSetupPanel)
 */
export interface SaveEnvironmentMessage extends BaseWebviewMessage {
    command: 'save-environment';
    data: {
        id?: string;
        name: string;
        settings: {
            dataverseUrl: string;
            [key: string]: unknown;
        };
    };
}

/**
 * Test connection message (EnvironmentSetupPanel)
 */
export interface TestConnectionMessage extends BaseWebviewMessage {
    command: 'test-connection';
    data: {
        settings: {
            dataverseUrl: string;
            [key: string]: unknown;
        };
    };
}

/**
 * Delete environment message
 */
export interface DeleteEnvironmentMessage extends BaseWebviewMessage {
    command: 'delete-environment';
    data: {
        environmentId: string;
    };
}

/**
 * New environment message
 */
export interface NewEnvironmentMessage extends BaseWebviewMessage {
    command: 'new-environment';
}

/**
 * Load environment message
 */
export interface LoadEnvironmentMessage extends BaseWebviewMessage {
    command: 'load-environment';
    data: {
        environmentId: string;
    };
}

/**
 * Generic error message
 */
export interface ErrorMessage extends BaseWebviewMessage {
    command: 'error';
    message: string;
}

/**
 * Component update message (event bridge)
 */
export interface ComponentUpdateMessage extends BaseWebviewMessage {
    command: 'component-update';
    componentId: string;
    componentType?: string;
    data: unknown;
}

/**
 * Component state change message (event bridge)
 */
export interface ComponentStateChangeMessage extends BaseWebviewMessage {
    command: 'component-state-change';
    componentId: string;
    state: unknown;
}

/**
 * Deployment settings synced message
 */
export interface DeploymentSettingsSyncedMessage extends BaseWebviewMessage {
    command: 'deployment-settings-synced';
    data: {
        filePath: string;
        added: number;
        removed: number;
        updated: number;
        isNewFile: boolean;
    };
}

/**
 * Environments loaded message
 */
export interface EnvironmentsLoadedMessage extends BaseWebviewMessage {
    command: 'environments-loaded';
    data: unknown;
    selectedEnvironmentId?: string;
}

/**
 * Solutions loaded message
 */
export interface SolutionsLoadedMessage extends BaseWebviewMessage {
    command: 'solutions-loaded';
    data: unknown;
    selectedSolutionId?: string;
}

/**
 * Set split ratio message (UI state)
 */
export interface SetSplitRatioMessage extends BaseWebviewMessage {
    command: 'set-split-ratio';
    componentId: string;
    ratio: number;
}

/**
 * Show right panel message (UI state)
 */
export interface ShowRightPanelMessage extends BaseWebviewMessage {
    command: 'show-right-panel';
    componentId: string;
}

/**
 * Set quick filters message
 */
export interface SetQuickFiltersMessage extends BaseWebviewMessage {
    command: 'set-quick-filters';
    componentId?: string;
    componentType?: string;
    filterIds?: unknown[];
    filters?: unknown;
}

/**
 * Set advanced filters message
 */
export interface SetAdvancedFiltersMessage extends BaseWebviewMessage {
    command: 'set-advanced-filters';
    componentId?: string;
    componentType?: string;
    conditions?: unknown[];
    filters?: unknown;
}

/**
 * Close detail panel message
 */
export interface CloseDetailPanelMessage extends BaseWebviewMessage {
    command: 'close-detail-panel';
}

/**
 * Close details message
 */
export interface CloseDetailsMessage extends BaseWebviewMessage {
    command: 'close-details';
}

/**
 * Traces loaded message
 */
export interface TracesLoadedMessage extends BaseWebviewMessage {
    command: 'traces-loaded';
    data?: unknown;
    count?: number;
}

/**
 * Trace level loaded message
 */
export interface TraceLevelLoadedMessage extends BaseWebviewMessage {
    command: 'trace-level-loaded';
    data?: unknown;
    level?: unknown;
    displayName?: string;
}

/**
 * Trace level updated message
 */
export interface TraceLevelUpdatedMessage extends BaseWebviewMessage {
    command: 'trace-level-updated';
    data?: unknown;
    level?: unknown;
    message?: string;
}

/**
 * Show trace details message
 */
export interface ShowTraceDetailsMessage extends BaseWebviewMessage {
    command: 'show-trace-details';
    trace: unknown;
    relatedTraces?: unknown;
}

/**
 * Filters updated message
 */
export interface FiltersUpdatedMessage extends BaseWebviewMessage {
    command: 'filters-updated';
    filters: unknown;
}

/**
 * Switch to timeline tab message
 */
export interface SwitchToTimelineTabMessage extends BaseWebviewMessage {
    command: 'switch-to-timeline-tab';
}

/**
 * Environment loaded message
 */
export interface EnvironmentLoadedMessage extends BaseWebviewMessage {
    command: 'environment-loaded';
    data: unknown;
}

/**
 * Environment saved message
 */
export interface EnvironmentSavedMessage extends BaseWebviewMessage {
    command: 'environment-saved';
    data: unknown;
}

/**
 * Test connection result message
 */
export interface TestConnectionResultMessage extends BaseWebviewMessage {
    command: 'test-connection-result';
    success?: boolean;
    message?: string;
    data?: {
        success: boolean;
        error?: string;
    };
}

/**
 * Tree loading message
 */
export interface TreeLoadingMessage extends BaseWebviewMessage {
    command: 'tree-loading';
    loading: boolean;
}

/**
 * Populate tree message
 */
export interface PopulateTreeMessage extends BaseWebviewMessage {
    command: 'populate-tree';
    data: unknown;
}

/**
 * Set mode message
 */
export interface SetModeMessage extends BaseWebviewMessage {
    command: 'set-mode';
    mode: string;
}

/**
 * Show detail message
 */
export interface ShowDetailMessage extends BaseWebviewMessage {
    command: 'show-detail';
    data: unknown;
}

/**
 * Update selection message
 */
export interface UpdateSelectionMessage extends BaseWebviewMessage {
    command: 'update-selection';
    selection?: unknown;
    data?: unknown;
}

/**
 * Show node details message
 */
export interface ShowNodeDetailsMessage extends BaseWebviewMessage {
    command: 'show-node-details';
    node?: unknown;
    data?: unknown;
}

/**
 * Open solution in Maker message
 */
export interface OpenSolutionInMakerMessage extends BaseWebviewMessage {
    command: 'open-solution-in-maker';
}

/**
 * Open solution in Classic message
 */
export interface OpenSolutionInClassicMessage extends BaseWebviewMessage {
    command: 'open-solution-in-classic';
}

/**
 * Browse tables message
 */
export interface BrowseTablesMessage extends BaseWebviewMessage {
    command: 'browse-tables';
}

/**
 * Toggle section message
 */
export interface ToggleSectionMessage extends BaseWebviewMessage {
    command: 'toggle-section';
    sectionId?: string;
}

/**
 * Select entity message
 */
export interface SelectEntityMessage extends BaseWebviewMessage {
    command: 'select-entity';
    data?: unknown;
}

/**
 * Select choice message
 */
export interface SelectChoiceMessage extends BaseWebviewMessage {
    command: 'select-choice';
    data?: unknown;
}

/**
 * Trace selected message
 */
export interface TraceSelectedMessage extends BaseWebviewMessage {
    command: 'trace-selected';
    traceId: string;
}

/**
 * Dropdown item clicked message
 * Sent when user clicks item in ActionBar dropdown
 */
export interface DropdownItemClickedMessage extends BaseWebviewMessage {
    command: 'dropdown-item-clicked';
    data?: {
        componentId?: string;
        actionId?: string;
        itemId?: string;
    };
}

/**
 * Overflow changed message
 * Sent by ActionBar when overflow state changes (informational only)
 */
export interface OverflowChangedMessage extends BaseWebviewMessage {
    command: 'overflow-changed';
    data?: {
        isOverflowing?: boolean;
    };
}

/**
 * Discriminated union of all webview message types
 *
 * Usage in panels:
 * ```typescript
 * protected async handleMessage(message: WebviewMessage): Promise<void> {
 *     switch (message.command) {
 *         case 'environment-changed':
 *             // TypeScript knows message is EnvironmentChangedMessage
 *             const envId = message.data?.environmentId;
 *             break;
 *         case 'component-event':
 *             // TypeScript knows message is ComponentEventMessage
 *             const componentId = message.data.componentId;
 *             break;
 *     }
 * }
 * ```
 */
export type WebviewMessage =
    | EnvironmentChangedMessage
    | ComponentEventMessage
    | SyncDeploymentSettingsMessage
    | OpenInMakerMessage
    | TableSearchMessage
    | PanelReadyMessage
    | SearchMessage
    | SolutionSelectedMessage
    | LoadSolutionsMessage
    | LoadEnvironmentVariablesMessage
    | LoadImportJobsMessage
    | ViewImportJobXmlMessage
    | OpenSolutionHistoryMessage
    | SaveEnvironmentMessage
    | TestConnectionMessage
    | DeleteEnvironmentMessage
    | NewEnvironmentMessage
    | LoadEnvironmentMessage
    | ErrorMessage
    | ComponentUpdateMessage
    | ComponentStateChangeMessage
    | DeploymentSettingsSyncedMessage
    | EnvironmentsLoadedMessage
    | SolutionsLoadedMessage
    | SetSplitRatioMessage
    | ShowRightPanelMessage
    | SetQuickFiltersMessage
    | SetAdvancedFiltersMessage
    | CloseDetailPanelMessage
    | TracesLoadedMessage
    | TraceLevelLoadedMessage
    | TraceLevelUpdatedMessage
    | ShowTraceDetailsMessage
    | FiltersUpdatedMessage
    | SwitchToTimelineTabMessage
    | EnvironmentLoadedMessage
    | EnvironmentSavedMessage
    | TestConnectionResultMessage
    | TreeLoadingMessage
    | PopulateTreeMessage
    | SetModeMessage
    | ShowDetailMessage
    | UpdateSelectionMessage
    | ShowNodeDetailsMessage
    | OpenSolutionInMakerMessage
    | OpenSolutionInClassicMessage
    | BrowseTablesMessage
    | ToggleSectionMessage
    | SelectEntityMessage
    | SelectChoiceMessage
    | CloseDetailsMessage
    | TraceSelectedMessage
    | DropdownItemClickedMessage
    | OverflowChangedMessage;

/**
 * Type guard for environment-changed messages
 */
export function isEnvironmentChangedMessage(message: WebviewMessage): message is EnvironmentChangedMessage {
    return message.command === 'environment-changed';
}

/**
 * Type guard for component-event messages
 */
export function isComponentEventMessage(message: WebviewMessage): message is ComponentEventMessage {
    return message.command === 'component-event';
}

/**
 * Type guard for sync-deployment-settings messages
 */
export function isSyncDeploymentSettingsMessage(message: WebviewMessage): message is SyncDeploymentSettingsMessage {
    return message.command === 'sync-deployment-settings';
}

/**
 * Type guard to check if message has a data property
 * Use this when you need to check for data existence before accessing it
 */
export function hasDataProperty(message: WebviewMessage): message is WebviewMessage & { data: unknown } {
    return 'data' in message;
}
