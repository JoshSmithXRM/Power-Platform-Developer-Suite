/**
 * Default configurations and constants for all components
 */

import { 
    EnvironmentSelectorConfig, 
    SolutionSelectorConfig,
    EntitySelectorConfig,
    DataTableConfig,
    ActionBarConfig,
    SearchFormConfig,
    FilterFormConfig 
} from './ComponentInterface';

// =============================================================================
// Base Configuration Defaults
// =============================================================================

export const DEFAULT_BASE_CONFIG = {
    className: 'component-base'
};

// =============================================================================
// Selector Component Defaults
// =============================================================================

export const DEFAULT_ENVIRONMENT_SELECTOR_CONFIG: Partial<EnvironmentSelectorConfig> = {
    label: 'Environment:',
    placeholder: 'Loading environments...',
    showStatus: true,
    required: false,
    disabled: false,
    className: 'environment-selector'
};

export const DEFAULT_SOLUTION_SELECTOR_CONFIG: Partial<SolutionSelectorConfig> = {
    label: 'Solution:',
    placeholder: 'Select solution...',
    showVersion: true,
    showManagedStatus: true,
    filterManaged: false,
    required: false,
    disabled: false,
    className: 'solution-selector'
};

export const DEFAULT_ENTITY_SELECTOR_CONFIG: Partial<EntitySelectorConfig> = {
    label: 'Entity:',
    placeholder: 'Select entity...',
    showPluralName: false,
    required: false,
    disabled: false,
    className: 'entity-selector'
};

// =============================================================================
// Table Component Defaults
// =============================================================================

export const DEFAULT_DATA_TABLE_CONFIG: Partial<DataTableConfig> = {
    filterable: false,
    selectable: false,
    stickyHeader: true,
    stickyFirstColumn: false,
    emptyMessage: 'No data available',
    loadingMessage: 'Loading...',
    className: 'data-table'
};

export const DEFAULT_TABLE_COLUMN = {
    sortable: true,
    filterable: true,
    align: 'left' as const,
    width: 'auto'
};

// =============================================================================
// Form Component Defaults  
// =============================================================================

export const DEFAULT_ACTION_BAR_CONFIG: Partial<ActionBarConfig> = {
    align: 'left' as const,
    size: 'medium' as const,
    className: 'action-bar'
};

export const DEFAULT_ACTION_BUTTON = {
    type: 'button' as const,
    style: 'secondary' as const,
    disabled: false,
    loading: false
};

export const DEFAULT_SEARCH_FORM_CONFIG: Partial<SearchFormConfig> = {
    placeholder: 'Search...',
    showClearButton: true,
    debounceMs: 300,
    className: 'search-form'
};

export const DEFAULT_FILTER_FORM_CONFIG: Partial<FilterFormConfig> = {
    showResetButton: true,
    showApplyButton: true,
    autoApply: false,
    className: 'filter-form'
};

export const DEFAULT_FORM_FIELD = {
    type: 'text' as const,
    required: false,
    disabled: false
};

// =============================================================================
// CSS Class Name Constants
// =============================================================================

export const CSS_CLASSES = {
    // Base classes
    COMPONENT_BASE: 'component-base',
    COMPONENT_CONTAINER: 'component-container',
    COMPONENT_LABEL: 'component-label',
    COMPONENT_ERROR: 'component-error',
    COMPONENT_LOADING: 'component-loading',
    COMPONENT_DISABLED: 'component-disabled',
    
    // Selector classes
    SELECTOR: 'selector',
    SELECTOR_DROPDOWN: 'selector-dropdown',
    SELECTOR_STATUS: 'selector-status',
    SELECTOR_MULTIPLE: 'selector-multiple',
    
    // Environment selector specific
    ENVIRONMENT_SELECTOR: 'environment-selector',
    ENVIRONMENT_STATUS: 'environment-status',
    ENVIRONMENT_CONNECTED: 'environment-connected',
    ENVIRONMENT_DISCONNECTED: 'environment-disconnected',
    ENVIRONMENT_ERROR: 'environment-error',
    
    // Solution selector specific
    SOLUTION_SELECTOR: 'solution-selector',
    SOLUTION_VERSION: 'solution-version',
    SOLUTION_MANAGED: 'solution-managed',
    SOLUTION_UNMANAGED: 'solution-unmanaged',
    
    // Entity selector specific
    ENTITY_SELECTOR: 'entity-selector',
    ENTITY_TYPE: 'entity-type',
    
    // Table classes
    TABLE: 'table',
    TABLE_CONTAINER: 'table-container',
    TABLE_HEADER: 'table-header',
    TABLE_BODY: 'table-body',
    TABLE_ROW: 'table-row',
    TABLE_CELL: 'table-cell',
    TABLE_SORTABLE: 'table-sortable',
    TABLE_SORTED_ASC: 'table-sorted-asc',
    TABLE_SORTED_DESC: 'table-sorted-desc',
    TABLE_FILTERABLE: 'table-filterable',
    TABLE_SELECTABLE: 'table-selectable',
    TABLE_SELECTED: 'table-selected',
    TABLE_ACTIONS: 'table-actions',
    TABLE_CONTEXT_MENU: 'table-context-menu',
    TABLE_EMPTY: 'table-empty',
    TABLE_LOADING: 'table-loading',
    
    // Action bar classes
    ACTION_BAR: 'action-bar',
    ACTION_BUTTON: 'action-button',
    ACTION_PRIMARY: 'action-primary',
    ACTION_SECONDARY: 'action-secondary',
    ACTION_DANGER: 'action-danger',
    ACTION_SUCCESS: 'action-success',
    ACTION_WARNING: 'action-warning',
    ACTION_DISABLED: 'action-disabled',
    ACTION_LOADING: 'action-loading',
    
    // Form classes
    FORM: 'form',
    FORM_GROUP: 'form-group',
    FORM_FIELD: 'form-field',
    FORM_INPUT: 'form-input',
    FORM_SELECT: 'form-select',
    FORM_TEXTAREA: 'form-textarea',
    FORM_CHECKBOX: 'form-checkbox',
    FORM_RADIO: 'form-radio',
    FORM_VALIDATION_ERROR: 'form-validation-error',
    FORM_REQUIRED: 'form-required',
    
    // Search form specific
    SEARCH_FORM: 'search-form',
    SEARCH_INPUT: 'search-input',
    SEARCH_CLEAR: 'search-clear',
    
    // Filter form specific
    FILTER_FORM: 'filter-form',
    FILTER_BUTTONS: 'filter-buttons',
    FILTER_RESET: 'filter-reset',
    FILTER_APPLY: 'filter-apply'
};

// =============================================================================
// Icon Constants
// =============================================================================

export const ICONS = {
    // Navigation
    CHEVRON_UP: '▲',
    CHEVRON_DOWN: '▼',
    CHEVRON_LEFT: '◀',
    CHEVRON_RIGHT: '▶',
    
    // Actions
    ADD: '➕',
    EDIT: '✏️',
    DELETE: '🗑️',
    REFRESH: '🔄',
    SAVE: '💾',
    CANCEL: '❌',
    SEARCH: '🔍',
    FILTER: '🔻',
    CLEAR: '🧹',
    
    // Status
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    
    // Connectivity
    CONNECTED: '🟢',
    DISCONNECTED: '🔴',
    
    // Content
    VIEW: '👁️',
    DOWNLOAD: '⬇️',
    UPLOAD: '⬆️',
    COPY: '📋',
    LINK: '🔗'
};

// =============================================================================
// Animation and Timing Constants
// =============================================================================

export const TIMING = {
    // Debounce delays
    SEARCH_DEBOUNCE_MS: 300,
    FILTER_DEBOUNCE_MS: 500,
    RESIZE_DEBOUNCE_MS: 250,
    
    // Animation durations
    FADE_DURATION_MS: 200,
    SLIDE_DURATION_MS: 300,
    BOUNCE_DURATION_MS: 150,
    
    // Loading delays
    MIN_LOADING_MS: 500,
    MAX_LOADING_MS: 30000,
    RETRY_DELAY_MS: 1000
};

// =============================================================================
// Validation Rules
// =============================================================================

export const VALIDATION_RULES = {
    // ID validation
    ID_PATTERN: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    ID_MIN_LENGTH: 2,
    ID_MAX_LENGTH: 50,
    
    // Text validation
    LABEL_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    
    // Table validation
    MAX_TABLE_COLUMNS: 20,
    MAX_TABLE_ROWS: 1000,
    MIN_COLUMN_WIDTH: 50,
    MAX_COLUMN_WIDTH: 500,
    
    // Form validation
    MAX_FORM_FIELDS: 50,
    MIN_PASSWORD_LENGTH: 8,
    MAX_INPUT_LENGTH: 255
};

// =============================================================================
// Error Messages
// =============================================================================

export const ERROR_MESSAGES = {
    // Component errors
    COMPONENT_NOT_FOUND: 'Component not found',
    COMPONENT_ALREADY_EXISTS: 'Component already exists',
    COMPONENT_INVALID_ID: 'Component ID must be a valid string',
    COMPONENT_INVALID_CONFIG: 'Component configuration is invalid',
    COMPONENT_INITIALIZATION_FAILED: 'Component initialization failed',
    
    // Data errors
    DATA_LOAD_FAILED: 'Failed to load data',
    DATA_SAVE_FAILED: 'Failed to save data',
    DATA_INVALID_FORMAT: 'Data format is invalid',
    
    // Network errors
    NETWORK_ERROR: 'Network error occurred',
    AUTHENTICATION_FAILED: 'Authentication failed',
    AUTHORIZATION_FAILED: 'Not authorized to perform this action',
    
    // Validation errors
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_URL: 'Please enter a valid URL',
    INVALID_NUMBER: 'Please enter a valid number',
    VALUE_TOO_SHORT: 'Value is too short',
    VALUE_TOO_LONG: 'Value is too long'
};

// =============================================================================
// Helper Functions for Configuration Merging
// =============================================================================

/**
 * Merge default configuration with user-provided configuration
 */
export function mergeConfig<T extends object>(
    defaultConfig: Partial<T>,
    userConfig: Partial<T>
): T {
    return {
        ...defaultConfig,
        ...userConfig
    } as T;
}

/**
 * Validate component ID format
 */
export function validateComponentId(id: string): boolean {
    return VALIDATION_RULES.ID_PATTERN.test(id) &&
           id.length >= VALIDATION_RULES.ID_MIN_LENGTH &&
           id.length <= VALIDATION_RULES.ID_MAX_LENGTH;
}

/**
 * Generate unique component ID
 */
export function generateComponentId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sanitize CSS class name
 */
export function sanitizeCSSClassName(className: string): string {
    return className.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}