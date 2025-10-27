import { BaseComponentConfig } from './BaseComponent';

// Re-export BaseComponentConfig for convenience
export { BaseComponentConfig };

/**
 * Core interfaces for the component-based architecture
 */

// =============================================================================
// Component Event Types
// =============================================================================

export interface ComponentEvent {
    componentId: string;
    timestamp: number;
}

export interface ComponentUpdateEvent extends ComponentEvent {
    updateType?: 'data' | 'config' | 'state';
    reason?: string;
}

export interface ComponentStateChangeEvent extends ComponentEvent {
    state: unknown;
}

export interface ComponentErrorEvent extends ComponentEvent {
    error: {
        message: string;
        stack?: string;
        name: string;
    };
    context?: string;
}

export interface ComponentInitializedEvent extends ComponentEvent {
    initializationTime: number;
    hasErrors: boolean;
}

export interface ComponentDisposedEvent extends ComponentEvent {
    disposalReason: 'manual' | 'error' | 'panel-closed';
    cleanupCompleted: boolean;
}

export interface ComponentConfigChangedEvent extends ComponentEvent {
    oldConfig: BaseComponentConfig;
    newConfig: BaseComponentConfig;
}

// =============================================================================
// Selector Component Interfaces
// =============================================================================

export interface Environment {
    id: string;
    name: string;
    displayName: string;
    environmentId?: string;
    settings: {
        dataverseUrl: string;
        authenticationMethod: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // Dynamic environment settings - any is appropriate here
    };
}

export interface Solution {
    id: string;
    uniqueName: string;
    displayName: string;
    version: string;
    isManaged: boolean;
}

export interface Entity {
    id: string;
    logicalName: string;
    displayName: string;
    pluralName: string;
    entityType: string;
}

export interface SelectorOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
    data?: unknown;
}

// =============================================================================
// Table Component Interfaces
// =============================================================================

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: unknown, row: TableData) => string;
    className?: string;
}

export interface TableAction {
    id: string;
    action: string;
    label: string;
    icon?: string;
    className?: string;
    disabled?: (row: TableData) => boolean;
    visible?: (row: TableData) => boolean;
}

export interface ContextMenuItem {
    id: string;
    action: string;
    label: string;
    type?: 'item' | 'separator';
    disabled?: (row: TableData) => boolean;
    visible?: (row: TableData) => boolean;
}

export interface BulkAction {
    id: string;
    action: string;
    label: string;
    icon?: string;
    className?: string;
    confirmMessage?: string;
}

export interface TableSortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

export interface TableData {
    id: string | number; // Required for row actions
    [key: string]: unknown;
}

// =============================================================================
// Form Component Interfaces  
// =============================================================================

export interface FormField {
    id: string;
    type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    value?: unknown;
    options?: SelectorOption[]; // For select/radio
    validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        customValidator?: (value: unknown) => string | null; // Returns error message or null
    };
}

export interface ActionButton {
    id: string;
    action: string;
    label: string;
    type?: 'button' | 'submit' | 'reset';
    style?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
    icon?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

// =============================================================================
// Component Configuration Interfaces
// =============================================================================

export interface EnvironmentSelectorConfig extends BaseComponentConfig {
    label?: string;
    placeholder?: string;
    environments?: Environment[];
    selectedEnvironmentId?: string;
    onChange?: (environmentId: string, environment?: Environment) => void;
    onError?: (error: Error) => void;
    showStatus?: boolean;
    required?: boolean;
    disabled?: boolean;
}

export interface SolutionSelectorConfig extends BaseComponentConfig {
    label?: string;
    placeholder?: string;
    solutions?: Solution[];
    selectedSolutionId?: string;
    environmentId?: string; // Required to load solutions
    onChange?: (solutionId: string, solution?: Solution) => void;
    onError?: (error: Error) => void;
    showVersion?: boolean;
    showManagedStatus?: boolean;
    filterManaged?: boolean;
    required?: boolean;
    disabled?: boolean;
}


export interface DataTableConfig extends BaseComponentConfig {
    columns: TableColumn[];
    data?: TableData[];
    defaultSort?: TableSortConfig;
    rowActions?: TableAction[];
    contextMenu?: ContextMenuItem[];
    bulkActions?: BulkAction[];
    filterable?: boolean;
    selectable?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    maxHeight?: string | number;
    emptyMessage?: string;
    loadingMessage?: string;
    onRowClick?: (row: TableData, event: MouseEvent) => void;
    onRowAction?: (actionId: string, row: TableData) => void;
    onBulkAction?: (actionId: string, selectedRows: TableData[]) => void;
    onSort?: (column: string, direction: 'asc' | 'desc') => void;
    onFilter?: (searchTerm: string) => void;
    onSelectionChange?: (selectedRows: TableData[]) => void;
}

export interface ActionBarConfig extends BaseComponentConfig {
    actions: ActionButton[];
    align?: 'left' | 'center' | 'right' | 'space-between';
    size?: 'small' | 'medium' | 'large';
    onActionClick?: (actionId: string, button: ActionButton) => void;
}



// =============================================================================
// Webview Resource Management
// =============================================================================

export interface WebviewResources {
    getCSSUri(path: string): string;
    getScriptUri(path: string): string;
}

export interface ComponentResources {
    cssFiles: string[];
    jsFiles: string[];
}

// =============================================================================
// Panel Composition Interfaces
// =============================================================================

export interface PanelCompositionConfig {
    title: string;
    components: unknown[]; // BaseComponent instances - using unknown to avoid circular dependency
    layout?: 'vertical' | 'horizontal' | 'grid';
    webviewResources: WebviewResources;
    additionalCSS?: string[];
    additionalJS?: string[];
    customHead?: string;
    customBody?: string;
}

// =============================================================================
// Component Factory Interfaces
// =============================================================================

export interface ComponentFactoryMethods {
    createEnvironmentSelector(config: EnvironmentSelectorConfig): unknown;
    createSolutionSelector(config: SolutionSelectorConfig): unknown;
    createDataTable(config: DataTableConfig): unknown;
    createActionBar(config: ActionBarConfig): unknown;
}

// =============================================================================
// Component Validation
// =============================================================================

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

export interface ComponentValidator {
    validateConfig(config: BaseComponentConfig): ValidationResult;
    validateHTML(html: string): ValidationResult;
    validateResources(resources: ComponentResources): ValidationResult;
}