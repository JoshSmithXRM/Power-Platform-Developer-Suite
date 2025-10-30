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
        eventData?: unknown;
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
    | LoadEnvironmentMessage;

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
