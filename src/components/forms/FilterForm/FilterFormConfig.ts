import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for FilterFormComponent
 * Provides type-safe configuration for advanced filtering functionality
 */

export interface FilterCondition {
    id: string;
    field: string;
    operator: FilterOperator;
    value: any;
    logicalOperator?: 'AND' | 'OR';
    parentGroupId?: string;
    isGroup?: boolean;
    groupConditions?: FilterCondition[];
}

export interface FilterGroup {
    id: string;
    logicalOperator: 'AND' | 'OR';
    conditions: FilterCondition[];
    parentGroupId?: string;
}

export interface FilterField {
    name: string;
    displayName: string;
    type: FilterFieldType;
    operators: FilterOperator[];
    options?: FilterFieldOption[];
    defaultOperator?: FilterOperator;
    required?: boolean;
    placeholder?: string;
    validation?: (value: any) => boolean | string;
    format?: (value: any) => string;
    parse?: (value: string) => any;
}

export interface FilterFieldOption {
    value: any;
    label: string;
    description?: string;
    group?: string;
}

export type FilterFieldType = 
    | 'text' 
    | 'number' 
    | 'date' 
    | 'datetime'
    | 'boolean' 
    | 'choice' 
    | 'lookup' 
    | 'email' 
    | 'url' 
    | 'guid' 
    | 'decimal' 
    | 'currency'
    | 'duration';

export type FilterOperator = 
    // Text operators
    | 'equals' 
    | 'not-equals'
    | 'contains' 
    | 'not-contains'
    | 'starts-with' 
    | 'ends-with'
    | 'is-empty'
    | 'not-empty'
    // Numeric operators
    | 'greater-than'
    | 'greater-equal'
    | 'less-than'
    | 'less-equal'
    | 'between'
    | 'not-between'
    // Date operators
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'this-week'
    | 'last-week'
    | 'next-week'
    | 'this-month'
    | 'last-month'
    | 'next-month'
    | 'this-year'
    | 'last-year'
    | 'next-year'
    | 'last-x-days'
    | 'next-x-days'
    | 'older-than-x-days'
    // Boolean operators
    | 'is-true'
    | 'is-false'
    // Choice operators
    | 'in'
    | 'not-in'
    // Lookup operators
    | 'null'
    | 'not-null'
    | 'under'
    | 'not-under';

export interface SavedFilter {
    id: string;
    name: string;
    description?: string;
    conditions: FilterCondition[];
    isDefault?: boolean;
    isPublic?: boolean;
    createdBy?: string;
    createdOn?: Date;
    modifiedBy?: string;
    modifiedOn?: Date;
    tags?: string[];
}

export interface FilterFormConfig extends BaseComponentConfig {
    // Basic configuration
    label?: string;
    required?: boolean;
    disabled?: boolean;
    
    // Fields configuration
    fields: FilterField[];
    allowedFields?: string[]; // Restrict which fields can be used
    requiredFields?: string[]; // Fields that must have at least one condition
    
    // Filter capabilities
    allowGroups?: boolean;
    maxNestingDepth?: number;
    maxConditionsPerGroup?: number;
    maxTotalConditions?: number;
    defaultLogicalOperator?: 'AND' | 'OR';
    
    // UI Configuration
    showAddGroup?: boolean;
    showRemoveGroup?: boolean;
    showLogicalOperators?: boolean;
    showFieldSelector?: boolean;
    showOperatorSelector?: boolean;
    showValueInput?: boolean;
    showPreview?: boolean;
    previewFormat?: 'sql' | 'odata' | 'fetchxml' | 'natural';
    
    // Saved filters
    enableSavedFilters?: boolean;
    savedFilters?: SavedFilter[];
    allowSaveFilter?: boolean;
    allowDeleteFilter?: boolean;
    allowPublicFilters?: boolean;
    loadSavedFilters?: () => Promise<SavedFilter[]>;
    saveFilter?: (filter: SavedFilter) => Promise<void>;
    deleteFilter?: (filterId: string) => Promise<void>;
    
    // Quick filters
    enableQuickFilters?: boolean;
    quickFilters?: {
        name: string;
        label: string;
        conditions: FilterCondition[];
        icon?: string;
    }[];
    
    // Default state
    initialConditions?: FilterCondition[];
    initialSavedFilter?: string; // ID of saved filter to load initially
    autoApplyFilters?: boolean;
    
    // Validation
    validateConditions?: boolean;
    customValidation?: (conditions: FilterCondition[]) => boolean | string;
    
    // Layout options
    layout?: 'vertical' | 'horizontal' | 'compact';
    showFieldLabels?: boolean;
    showConditionNumbers?: boolean;
    condensedView?: boolean;
    
    // Advanced options
    allowDragDrop?: boolean;
    allowDuplicateConditions?: boolean;
    showAdvancedOperators?: boolean;
    enableBulkOperations?: boolean;
    
    // Loading states
    loadingText?: string;
    emptyText?: string;
    errorText?: string;
    
    // Callbacks
    onConditionsChange?: (conditions: FilterCondition[]) => void;
    onFilterApply?: (conditions: FilterCondition[]) => void;
    onFilterClear?: () => void;
    onSavedFilterLoad?: (filter: SavedFilter) => void;
    onSavedFilterSave?: (filter: SavedFilter) => void;
    onSavedFilterDelete?: (filterId: string) => void;
    onError?: (error: Error) => void;
    onValidation?: (isValid: boolean, errors: string[]) => void;
    
    // Export capabilities
    enableExport?: boolean;
    exportFormats?: ('json' | 'xml' | 'sql' | 'odata' | 'fetchxml')[];
    onExport?: (format: string, data: any) => void;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * Event data interfaces
 */
export interface FilterFormConditionsChangeEvent {
    componentId: string;
    conditions: FilterCondition[];
    isValid: boolean;
    validationErrors: string[];
    timestamp: number;
}

export interface FilterFormApplyEvent {
    componentId: string;
    conditions: FilterCondition[];
    preview: string;
    timestamp: number;
}

export interface FilterFormSavedFilterEvent {
    componentId: string;
    action: 'load' | 'save' | 'delete';
    filter: SavedFilter;
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_FILTER_FORM_CONFIG: Partial<FilterFormConfig> = {
    required: false,
    disabled: false,
    allowGroups: true,
    maxNestingDepth: 3,
    maxConditionsPerGroup: 10,
    maxTotalConditions: 50,
    defaultLogicalOperator: 'AND',
    showAddGroup: true,
    showRemoveGroup: true,
    showLogicalOperators: true,
    showFieldSelector: true,
    showOperatorSelector: true,
    showValueInput: true,
    showPreview: false,
    previewFormat: 'natural',
    enableSavedFilters: false,
    allowSaveFilter: true,
    allowDeleteFilter: true,
    allowPublicFilters: false,
    enableQuickFilters: true,
    autoApplyFilters: false,
    validateConditions: true,
    layout: 'vertical',
    showFieldLabels: true,
    showConditionNumbers: false,
    condensedView: false,
    allowDragDrop: false,
    allowDuplicateConditions: true,
    showAdvancedOperators: false,
    enableBulkOperations: false,
    loadingText: 'Loading filters...',
    emptyText: 'No filter conditions',
    errorText: 'Error loading filters',
    enableExport: false,
    exportFormats: ['json']
};

/**
 * Predefined operator sets for different field types
 */
export const FIELD_TYPE_OPERATORS: Record<FilterFieldType, FilterOperator[]> = {
    text: ['equals', 'not-equals', 'contains', 'not-contains', 'starts-with', 'ends-with', 'is-empty', 'not-empty'],
    number: ['equals', 'not-equals', 'greater-than', 'greater-equal', 'less-than', 'less-equal', 'between', 'not-between', 'null', 'not-null'],
    decimal: ['equals', 'not-equals', 'greater-than', 'greater-equal', 'less-than', 'less-equal', 'between', 'not-between', 'null', 'not-null'],
    currency: ['equals', 'not-equals', 'greater-than', 'greater-equal', 'less-than', 'less-equal', 'between', 'not-between', 'null', 'not-null'],
    date: ['equals', 'not-equals', 'greater-than', 'less-than', 'between', 'today', 'yesterday', 'tomorrow', 'this-week', 'last-week', 'next-week', 'this-month', 'last-month', 'next-month', 'this-year', 'last-year', 'next-year', 'last-x-days', 'next-x-days', 'older-than-x-days', 'null', 'not-null'],
    datetime: ['equals', 'not-equals', 'greater-than', 'less-than', 'between', 'today', 'yesterday', 'tomorrow', 'this-week', 'last-week', 'next-week', 'this-month', 'last-month', 'next-month', 'this-year', 'last-year', 'next-year', 'last-x-days', 'next-x-days', 'older-than-x-days', 'null', 'not-null'],
    boolean: ['is-true', 'is-false', 'null', 'not-null'],
    choice: ['equals', 'not-equals', 'in', 'not-in', 'null', 'not-null'],
    lookup: ['equals', 'not-equals', 'in', 'not-in', 'null', 'not-null', 'under', 'not-under'],
    email: ['equals', 'not-equals', 'contains', 'not-contains', 'starts-with', 'ends-with', 'is-empty', 'not-empty'],
    url: ['equals', 'not-equals', 'contains', 'not-contains', 'starts-with', 'ends-with', 'is-empty', 'not-empty'],
    guid: ['equals', 'not-equals', 'null', 'not-null'],
    duration: ['equals', 'not-equals', 'greater-than', 'greater-equal', 'less-than', 'less-equal', 'between', 'not-between', 'null', 'not-null']
};

/**
 * Operator display labels
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
    'equals': 'Equals',
    'not-equals': 'Does not equal',
    'contains': 'Contains',
    'not-contains': 'Does not contain',
    'starts-with': 'Starts with',
    'ends-with': 'Ends with',
    'is-empty': 'Is empty',
    'not-empty': 'Is not empty',
    'greater-than': 'Greater than',
    'greater-equal': 'Greater than or equal to',
    'less-than': 'Less than',
    'less-equal': 'Less than or equal to',
    'between': 'Between',
    'not-between': 'Not between',
    'today': 'Today',
    'yesterday': 'Yesterday',
    'tomorrow': 'Tomorrow',
    'this-week': 'This week',
    'last-week': 'Last week',
    'next-week': 'Next week',
    'this-month': 'This month',
    'last-month': 'Last month',
    'next-month': 'Next month',
    'this-year': 'This year',
    'last-year': 'Last year',
    'next-year': 'Next year',
    'last-x-days': 'Last X days',
    'next-x-days': 'Next X days',
    'older-than-x-days': 'Older than X days',
    'is-true': 'Is true',
    'is-false': 'Is false',
    'in': 'In',
    'not-in': 'Not in',
    'null': 'Is null',
    'not-null': 'Is not null',
    'under': 'Under',
    'not-under': 'Not under'
};

/**
 * CSS class constants specific to FilterForm
 */
export const FILTER_FORM_CSS = {
    COMPONENT: 'filter-form',
    CONTAINER: 'filter-form-container',
    WRAPPER: 'filter-form-wrapper',
    
    // Main sections
    HEADER: 'filter-form-header',
    BODY: 'filter-form-body',
    FOOTER: 'filter-form-footer',
    
    // Saved filters
    SAVED_FILTERS: 'filter-form-saved-filters',
    SAVED_FILTER_DROPDOWN: 'filter-form-saved-filter-dropdown',
    SAVED_FILTER_ITEM: 'filter-form-saved-filter-item',
    
    // Quick filters
    QUICK_FILTERS: 'filter-form-quick-filters',
    QUICK_FILTER_BUTTON: 'filter-form-quick-filter-button',
    QUICK_FILTER_ACTIVE: 'filter-form-quick-filter--active',
    
    // Conditions
    CONDITIONS: 'filter-form-conditions',
    CONDITION: 'filter-form-condition',
    CONDITION_GROUP: 'filter-form-condition-group',
    CONDITION_ROW: 'filter-form-condition-row',
    
    // Fields
    FIELD_SELECTOR: 'filter-form-field-selector',
    OPERATOR_SELECTOR: 'filter-form-operator-selector',
    VALUE_INPUT: 'filter-form-value-input',
    VALUE_INPUT_MULTIPLE: 'filter-form-value-input--multiple',
    
    // Logical operators
    LOGICAL_OPERATOR: 'filter-form-logical-operator',
    LOGICAL_OPERATOR_BUTTON: 'filter-form-logical-operator-button',
    LOGICAL_OPERATOR_AND: 'filter-form-logical-operator--and',
    LOGICAL_OPERATOR_OR: 'filter-form-logical-operator--or',
    
    // Actions
    ACTIONS: 'filter-form-actions',
    ACTION_BUTTON: 'filter-form-action-button',
    ADD_CONDITION: 'filter-form-add-condition',
    ADD_GROUP: 'filter-form-add-group',
    REMOVE_CONDITION: 'filter-form-remove-condition',
    REMOVE_GROUP: 'filter-form-remove-group',
    
    // Preview
    PREVIEW: 'filter-form-preview',
    PREVIEW_CONTENT: 'filter-form-preview-content',
    PREVIEW_TOGGLE: 'filter-form-preview-toggle',
    
    // States
    LOADING: 'filter-form--loading',
    EMPTY: 'filter-form--empty',
    ERROR: 'filter-form--error',
    DISABLED: 'filter-form--disabled',
    REQUIRED: 'filter-form--required',
    INVALID: 'filter-form--invalid',
    COMPACT: 'filter-form--compact',
    HORIZONTAL: 'filter-form--horizontal',
    
    // Drag and drop
    DRAGGING: 'filter-form-condition--dragging',
    DROP_TARGET: 'filter-form-drop-target',
    DROP_TARGET_ACTIVE: 'filter-form-drop-target--active',
    
    // Validation
    VALIDATION_ERROR: 'filter-form-validation-error',
    FIELD_ERROR: 'filter-form-field-error',
    
    // Export
    EXPORT_SECTION: 'filter-form-export',
    EXPORT_BUTTON: 'filter-form-export-button'
};

/**
 * Validation rules for FilterForm
 */
export const FILTER_FORM_VALIDATION = {
    MAX_CONDITIONS: 100,
    MAX_NESTING_DEPTH: 5,
    MAX_CONDITIONS_PER_GROUP: 20,
    MIN_CONDITION_VALUE_LENGTH: 0,
    MAX_CONDITION_VALUE_LENGTH: 1000,
    REQUIRED_FIELDS: ['field', 'operator'],
    DEBOUNCE_DELAY_MS: 300
};

/**
 * Helper functions for filter form configuration
 */
export class FilterFormConfigValidator {
    static validate(config: FilterFormConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        if (!config.fields || !Array.isArray(config.fields) || config.fields.length === 0) {
            errors.push('Fields array is required and must contain at least one field');
        }

        // Validate field configurations
        if (config.fields) {
            config.fields.forEach((field, index) => {
                if (!field.name) {
                    errors.push(`Field ${index}: name is required`);
                }
                if (!field.displayName) {
                    errors.push(`Field ${index}: displayName is required`);
                }
                if (!field.type) {
                    errors.push(`Field ${index}: type is required`);
                }
                if (!field.operators || !Array.isArray(field.operators) || field.operators.length === 0) {
                    warnings.push(`Field ${index}: no operators specified, using defaults for type ${field.type}`);
                }
            });
        }

        // Validate numeric limits
        if (config.maxNestingDepth && (config.maxNestingDepth < 1 || config.maxNestingDepth > FILTER_FORM_VALIDATION.MAX_NESTING_DEPTH)) {
            warnings.push(`maxNestingDepth should be between 1 and ${FILTER_FORM_VALIDATION.MAX_NESTING_DEPTH}`);
        }

        if (config.maxConditionsPerGroup && (config.maxConditionsPerGroup < 1 || config.maxConditionsPerGroup > FILTER_FORM_VALIDATION.MAX_CONDITIONS_PER_GROUP)) {
            warnings.push(`maxConditionsPerGroup should be between 1 and ${FILTER_FORM_VALIDATION.MAX_CONDITIONS_PER_GROUP}`);
        }

        if (config.maxTotalConditions && (config.maxTotalConditions < 1 || config.maxTotalConditions > FILTER_FORM_VALIDATION.MAX_CONDITIONS)) {
            warnings.push(`maxTotalConditions should be between 1 and ${FILTER_FORM_VALIDATION.MAX_CONDITIONS}`);
        }

        // Validate callbacks
        const callbacks = ['onConditionsChange', 'onFilterApply', 'onFilterClear', 'onSavedFilterLoad', 'onSavedFilterSave', 'onSavedFilterDelete', 'onError', 'onValidation', 'onExport', 'customValidation', 'loadSavedFilters', 'saveFilter', 'deleteFilter'];
        callbacks.forEach(callback => {
            if (config[callback as keyof FilterFormConfig] && 
                typeof config[callback as keyof FilterFormConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: FilterFormConfig): FilterFormConfig {
        return {
            ...config,
            id: config.id?.trim(),
            label: config.label?.trim(),
            maxNestingDepth: Math.max(1, Math.min(config.maxNestingDepth || 3, FILTER_FORM_VALIDATION.MAX_NESTING_DEPTH)),
            maxConditionsPerGroup: Math.max(1, Math.min(config.maxConditionsPerGroup || 10, FILTER_FORM_VALIDATION.MAX_CONDITIONS_PER_GROUP)),
            maxTotalConditions: Math.max(1, Math.min(config.maxTotalConditions || 50, FILTER_FORM_VALIDATION.MAX_CONDITIONS))
        };
    }

    static validateConditions(conditions: FilterCondition[], config: FilterFormConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!Array.isArray(conditions)) {
            errors.push('Conditions must be an array');
            return { isValid: false, errors };
        }

        // Check total condition count
        const totalConditions = this.countConditions(conditions);
        if (config.maxTotalConditions && totalConditions > config.maxTotalConditions) {
            errors.push(`Too many conditions: ${totalConditions}. Maximum allowed: ${config.maxTotalConditions}`);
        }

        // Validate each condition
        conditions.forEach((condition, index) => {
            const conditionErrors = this.validateCondition(condition, config, 0);
            conditionErrors.forEach(error => errors.push(`Condition ${index + 1}: ${error}`));
        });

        // Check required fields
        if (config.requiredFields && config.requiredFields.length > 0) {
            const usedFields = new Set(conditions.map(c => c.field));
            config.requiredFields.forEach(requiredField => {
                if (!usedFields.has(requiredField)) {
                    errors.push(`Required field "${requiredField}" must have at least one condition`);
                }
            });
        }

        // Custom validation
        if (config.customValidation) {
            const customResult = config.customValidation(conditions);
            if (customResult !== true) {
                errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private static validateCondition(condition: FilterCondition, config: FilterFormConfig, depth: number): string[] {
        const errors: string[] = [];

        // Check required properties
        if (!condition.field) errors.push('Field is required');
        if (!condition.operator) errors.push('Operator is required');
        if (!condition.id) errors.push('ID is required');

        // Check field exists in configuration
        const field = config.fields.find(f => f.name === condition.field);
        if (condition.field && !field) {
            errors.push(`Unknown field: ${condition.field}`);
        }

        // Check operator is valid for field type
        if (field && condition.operator && !field.operators.includes(condition.operator)) {
            errors.push(`Invalid operator "${condition.operator}" for field type "${field.type}"`);
        }

        // Check value requirements
        if (field && condition.operator) {
            const requiresValue = !['is-empty', 'not-empty', 'is-true', 'is-false', 'null', 'not-null', 'today', 'yesterday', 'tomorrow', 'this-week', 'last-week', 'next-week', 'this-month', 'last-month', 'next-month', 'this-year', 'last-year', 'next-year'].includes(condition.operator);
            const requiresMultipleValues = ['between', 'not-between', 'in', 'not-in'].includes(condition.operator);

            if (requiresValue && (condition.value === null || condition.value === undefined || condition.value === '')) {
                errors.push('Value is required for this operator');
            }

            if (requiresMultipleValues && (!Array.isArray(condition.value) || condition.value.length < 2)) {
                errors.push('Multiple values are required for this operator');
            }
        }

        // Check nesting depth
        if (config.maxNestingDepth && depth >= config.maxNestingDepth) {
            errors.push(`Maximum nesting depth exceeded: ${config.maxNestingDepth}`);
        }

        // Validate group conditions recursively
        if (condition.isGroup && condition.groupConditions) {
            if (config.maxConditionsPerGroup && condition.groupConditions.length > config.maxConditionsPerGroup) {
                errors.push(`Too many conditions in group: ${condition.groupConditions.length}. Maximum allowed: ${config.maxConditionsPerGroup}`);
            }

            condition.groupConditions.forEach((groupCondition, index) => {
                const groupErrors = this.validateCondition(groupCondition, config, depth + 1);
                groupErrors.forEach(error => errors.push(`Group condition ${index + 1}: ${error}`));
            });
        }

        return errors;
    }

    private static countConditions(conditions: FilterCondition[]): number {
        let count = 0;
        conditions.forEach(condition => {
            count++;
            if (condition.isGroup && condition.groupConditions) {
                count += this.countConditions(condition.groupConditions);
            }
        });
        return count;
    }

    static generateId(): string {
        return 'condition-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    }

    static createEmptyCondition(fieldName?: string): FilterCondition {
        const field = fieldName;
        return {
            id: this.generateId(),
            field: field || '',
            operator: 'equals',
            value: null,
            logicalOperator: 'AND'
        };
    }

    static createEmptyGroup(): FilterCondition {
        return {
            id: this.generateId(),
            field: '',
            operator: 'equals',
            value: null,
            logicalOperator: 'AND',
            isGroup: true,
            groupConditions: [this.createEmptyCondition()]
        };
    }
}