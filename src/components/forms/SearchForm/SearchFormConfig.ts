import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for SearchFormComponent
 * Provides type-safe configuration options for search forms with filters and validation
 */

export interface SearchFormField {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean' | 'textarea' | 'tags';
    placeholder?: string;
    defaultValue?: any;
    value?: any;
    required?: boolean;
    disabled?: boolean;
    visible?: boolean;
    readonly?: boolean;
    
    // Validation options
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    validation?: (value: any) => string | null;
    
    // Field-specific options
    options?: SearchFormOption[];
    multiple?: boolean;
    searchable?: boolean;
    clearable?: boolean;
    
    // Appearance
    width?: 'auto' | 'full' | 'half' | 'third' | 'quarter' | string;
    size?: 'small' | 'medium' | 'large';
    
    // Event handlers
    onChange?: (value: any, field: SearchFormField) => void;
    onFocus?: (field: SearchFormField) => void;
    onBlur?: (value: any, field: SearchFormField) => void;
}

export interface SearchFormOption {
    id: string;
    label: string;
    value: any;
    disabled?: boolean;
    group?: string;
    description?: string;
    icon?: string;
}

export interface SearchFormGroup {
    id: string;
    label: string;
    fields: string[];
    collapsible?: boolean;
    collapsed?: boolean;
    visible?: boolean;
    description?: string;
}

export interface SearchFormConfig extends BaseComponentConfig {
    // Basic configuration
    label?: string;
    fields?: SearchFormField[];
    groups?: SearchFormGroup[];
    
    // Layout options
    layout?: 'horizontal' | 'vertical' | 'grid' | 'inline';
    columns?: 1 | 2 | 3 | 4 | 'auto';
    spacing?: 'compact' | 'normal' | 'wide';
    
    // Search behavior
    searchOnChange?: boolean;
    searchDelay?: number;
    clearable?: boolean;
    resetable?: boolean;
    collapsible?: boolean;
    
    // Validation
    validateOnChange?: boolean;
    validateOnSubmit?: boolean;
    showValidationErrors?: boolean;
    stopOnFirstError?: boolean;
    
    // Appearance options
    variant?: 'default' | 'compact' | 'detailed' | 'card' | 'inline';
    size?: 'small' | 'medium' | 'large';
    theme?: 'auto' | 'light' | 'dark';
    
    // Action buttons
    showSearchButton?: boolean;
    showClearButton?: boolean;
    showResetButton?: boolean;
    searchButtonText?: string;
    clearButtonText?: string;
    resetButtonText?: string;
    
    // State options
    disabled?: boolean;
    readonly?: boolean;
    loading?: boolean;
    
    // Event handlers
    onSearch?: (values: Record<string, any>, isValid: boolean) => void;
    onClear?: () => void;
    onReset?: () => void;
    onFieldChange?: (fieldId: string, value: any, field: SearchFormField) => void;
    onValidation?: (errors: Record<string, string>) => void;
    
    // Advanced options
    preserveState?: boolean;
    autoSave?: boolean;
    autoSaveDelay?: number;
    debounceSearch?: boolean;
    highlightChanges?: boolean;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * Event data interfaces
 */
export interface SearchFormSearchEvent {
    componentId: string;
    values: Record<string, any>;
    isValid: boolean;
    errors: Record<string, string>;
    timestamp: number;
}

export interface SearchFormFieldEvent {
    componentId: string;
    fieldId: string;
    field: SearchFormField;
    value: any;
    oldValue: any;
    isValid: boolean;
    error?: string;
    timestamp: number;
}

export interface SearchFormValidationEvent {
    componentId: string;
    isValid: boolean;
    errors: Record<string, string>;
    values: Record<string, any>;
    timestamp: number;
}

export interface SearchFormClearEvent {
    componentId: string;
    clearedFields: string[];
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_SEARCH_FORM_CONFIG: Partial<SearchFormConfig> = {
    fields: [],
    groups: [],
    layout: 'vertical',
    columns: 'auto',
    spacing: 'normal',
    searchOnChange: true,
    searchDelay: 300,
    clearable: true,
    resetable: true,
    collapsible: false,
    validateOnChange: true,
    validateOnSubmit: true,
    showValidationErrors: true,
    stopOnFirstError: false,
    variant: 'default',
    size: 'medium',
    theme: 'auto',
    showSearchButton: true,
    showClearButton: true,
    showResetButton: false,
    searchButtonText: 'Search',
    clearButtonText: 'Clear',
    resetButtonText: 'Reset',
    disabled: false,
    readonly: false,
    loading: false,
    preserveState: true,
    autoSave: false,
    autoSaveDelay: 1000,
    debounceSearch: true,
    highlightChanges: false
};

/**
 * Validation rules for configuration
 */
export const SEARCH_FORM_VALIDATION = {
    FIELD_ID_MIN_LENGTH: 1,
    FIELD_ID_MAX_LENGTH: 50,
    FIELD_LABEL_MAX_LENGTH: 100,
    SEARCH_DELAY_MIN: 0,
    SEARCH_DELAY_MAX: 5000,
    AUTO_SAVE_DELAY_MIN: 100,
    AUTO_SAVE_DELAY_MAX: 10000,
    MAX_FIELDS: 50,
    MAX_OPTIONS_PER_FIELD: 100,
    MIN_LENGTH_MIN: 0,
    MAX_LENGTH_MIN: 1,
    MAX_LENGTH_MAX: 10000
};

/**
 * CSS class constants specific to SearchForm
 */
export const SEARCH_FORM_CSS = {
    COMPONENT: 'search-form',
    CONTAINER: 'search-form-container',
    HEADER: 'search-form-header',
    TITLE: 'search-form-title',
    BODY: 'search-form-body',
    FOOTER: 'search-form-footer',
    
    // Field containers
    FIELDS: 'search-form-fields',
    FIELD: 'search-form-field',
    FIELD_GROUP: 'search-form-group',
    FIELD_ROW: 'search-form-row',
    
    // Field elements
    FIELD_LABEL: 'search-form-label',
    FIELD_INPUT: 'search-form-input',
    FIELD_SELECT: 'search-form-select',
    FIELD_TEXTAREA: 'search-form-textarea',
    FIELD_CHECKBOX: 'search-form-checkbox',
    FIELD_HELP: 'search-form-help',
    
    // Buttons
    ACTIONS: 'search-form-actions',
    SEARCH_BUTTON: 'search-form-search',
    CLEAR_BUTTON: 'search-form-clear',
    RESET_BUTTON: 'search-form-reset',
    
    // Layout variants
    HORIZONTAL: 'search-form--horizontal',
    VERTICAL: 'search-form--vertical',
    GRID: 'search-form--grid',
    INLINE: 'search-form--inline',
    
    // Size variants
    SMALL: 'search-form--small',
    MEDIUM: 'search-form--medium',
    LARGE: 'search-form--large',
    
    // Style variants
    DEFAULT: 'search-form--default',
    COMPACT: 'search-form--compact',
    DETAILED: 'search-form--detailed',
    CARD: 'search-form--card',
    INLINE_VARIANT: 'search-form--inline-variant',
    
    // State modifiers
    LOADING: 'search-form--loading',
    DISABLED: 'search-form--disabled',
    READONLY: 'search-form--readonly',
    COLLAPSIBLE: 'search-form--collapsible',
    COLLAPSED: 'search-form--collapsed',
    
    // Field states
    FIELD_REQUIRED: 'search-form-field--required',
    FIELD_DISABLED: 'search-form-field--disabled',
    FIELD_READONLY: 'search-form-field--readonly',
    FIELD_ERROR: 'search-form-field--error',
    FIELD_VALID: 'search-form-field--valid',
    FIELD_FOCUSED: 'search-form-field--focused',
    
    // Field widths
    FIELD_AUTO: 'search-form-field--auto',
    FIELD_FULL: 'search-form-field--full',
    FIELD_HALF: 'search-form-field--half',
    FIELD_THIRD: 'search-form-field--third',
    FIELD_QUARTER: 'search-form-field--quarter'
};

/**
 * Field type configuration
 */
export const FIELD_TYPE_CONFIG = {
    text: {
        inputType: 'text',
        supportsMinMax: false,
        supportsOptions: false,
        supportsMultiple: false
    },
    select: {
        inputType: 'select',
        supportsMinMax: false,
        supportsOptions: true,
        supportsMultiple: false
    },
    multiselect: {
        inputType: 'select',
        supportsMinMax: false,
        supportsOptions: true,
        supportsMultiple: true
    },
    date: {
        inputType: 'date',
        supportsMinMax: true,
        supportsOptions: false,
        supportsMultiple: false
    },
    daterange: {
        inputType: 'date',
        supportsMinMax: true,
        supportsOptions: false,
        supportsMultiple: false
    },
    number: {
        inputType: 'number',
        supportsMinMax: true,
        supportsOptions: false,
        supportsMultiple: false
    },
    boolean: {
        inputType: 'checkbox',
        supportsMinMax: false,
        supportsOptions: false,
        supportsMultiple: false
    },
    textarea: {
        inputType: 'textarea',
        supportsMinMax: false,
        supportsOptions: false,
        supportsMultiple: false
    },
    tags: {
        inputType: 'text',
        supportsMinMax: false,
        supportsOptions: true,
        supportsMultiple: true
    }
};

/**
 * Helper functions for configuration validation
 */
export class SearchFormConfigValidator {
    static validate(config: SearchFormConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate fields array
        if (config.fields) {
            if (!Array.isArray(config.fields)) {
                errors.push('Fields must be an array');
            } else {
                if (config.fields.length > SEARCH_FORM_VALIDATION.MAX_FIELDS) {
                    errors.push(`Maximum ${SEARCH_FORM_VALIDATION.MAX_FIELDS} fields allowed`);
                }

                // Validate each field
                config.fields.forEach((field, index) => {
                    this.validateField(field, index, errors, warnings);
                });

                // Check for duplicate field IDs
                const fieldIds = config.fields.map(f => f.id);
                const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
                if (duplicates.length > 0) {
                    errors.push(`Duplicate field IDs found: ${duplicates.join(', ')}`);
                }
            }
        }

        // Validate callback functions
        if (config.onSearch && typeof config.onSearch !== 'function') {
            errors.push('onSearch must be a function');
        }

        if (config.onFieldChange && typeof config.onFieldChange !== 'function') {
            errors.push('onFieldChange must be a function');
        }

        // Validate search delay
        if (config.searchDelay !== undefined) {
            if (typeof config.searchDelay !== 'number' ||
                config.searchDelay < SEARCH_FORM_VALIDATION.SEARCH_DELAY_MIN ||
                config.searchDelay > SEARCH_FORM_VALIDATION.SEARCH_DELAY_MAX) {
                errors.push(`Search delay must be between ${SEARCH_FORM_VALIDATION.SEARCH_DELAY_MIN} and ${SEARCH_FORM_VALIDATION.SEARCH_DELAY_MAX} milliseconds`);
            }
        }

        // Validate enum values
        const validLayouts = ['horizontal', 'vertical', 'grid', 'inline'];
        if (config.layout && !validLayouts.includes(config.layout)) {
            errors.push(`Layout must be one of: ${validLayouts.join(', ')}`);
        }

        const validSizes = ['small', 'medium', 'large'];
        if (config.size && !validSizes.includes(config.size)) {
            errors.push(`Size must be one of: ${validSizes.join(', ')}`);
        }

        const validVariants = ['default', 'compact', 'detailed', 'card', 'inline'];
        if (config.variant && !validVariants.includes(config.variant)) {
            errors.push(`Variant must be one of: ${validVariants.join(', ')}`);
        }

        // Warnings
        if (!config.fields || config.fields.length === 0) {
            warnings.push('No fields provided - form will be empty');
        }

        if (config.searchOnChange && config.searchDelay === 0) {
            warnings.push('Search on change with zero delay may cause performance issues');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private static validateField(field: SearchFormField, index: number, errors: string[], warnings: string[]): void {
        if (!field.id || typeof field.id !== 'string') {
            errors.push(`Field at index ${index} must have a valid ID`);
        } else if (field.id.length > SEARCH_FORM_VALIDATION.FIELD_ID_MAX_LENGTH) {
            errors.push(`Field ID "${field.id}" exceeds maximum length of ${SEARCH_FORM_VALIDATION.FIELD_ID_MAX_LENGTH}`);
        }

        if (!field.label || typeof field.label !== 'string') {
            errors.push(`Field "${field.id}" must have a valid label`);
        } else if (field.label.length > SEARCH_FORM_VALIDATION.FIELD_LABEL_MAX_LENGTH) {
            errors.push(`Field label "${field.label}" exceeds maximum length of ${SEARCH_FORM_VALIDATION.FIELD_LABEL_MAX_LENGTH}`);
        }

        // Validate field type
        const validTypes = Object.keys(FIELD_TYPE_CONFIG);
        if (!validTypes.includes(field.type)) {
            errors.push(`Field "${field.id}" has invalid type "${field.type}"`);
        }

        // Validate field-specific options
        const typeConfig = FIELD_TYPE_CONFIG[field.type as keyof typeof FIELD_TYPE_CONFIG];
        if (typeConfig) {
            if (field.options && !typeConfig.supportsOptions) {
                warnings.push(`Field "${field.id}" of type "${field.type}" does not support options`);
            }

            if (field.multiple && !typeConfig.supportsMultiple) {
                warnings.push(`Field "${field.id}" of type "${field.type}" does not support multiple selection`);
            }

            if ((field.min !== undefined || field.max !== undefined) && !typeConfig.supportsMinMax) {
                warnings.push(`Field "${field.id}" of type "${field.type}" does not support min/max values`);
            }
        }

        // Validate options if present
        if (field.options) {
            if (field.options.length > SEARCH_FORM_VALIDATION.MAX_OPTIONS_PER_FIELD) {
                errors.push(`Field "${field.id}" exceeds maximum ${SEARCH_FORM_VALIDATION.MAX_OPTIONS_PER_FIELD} options`);
            }

            field.options.forEach((option, optionIndex) => {
                if (!option.id || !option.label) {
                    errors.push(`Option at index ${optionIndex} in field "${field.id}" must have ID and label`);
                }
            });
        }

        // Validate validation function
        if (field.validation && typeof field.validation !== 'function') {
            errors.push(`Validation for field "${field.id}" must be a function`);
        }
    }

    static sanitizeConfig(config: SearchFormConfig): SearchFormConfig {
        return {
            ...config,
            id: config.id?.trim(),
            className: config.className?.trim(),
            searchButtonText: config.searchButtonText?.trim(),
            clearButtonText: config.clearButtonText?.trim(),
            resetButtonText: config.resetButtonText?.trim(),
            fields: config.fields?.map(field => ({
                ...field,
                id: field.id?.trim(),
                name: field.name?.trim(),
                label: field.label?.trim(),
                placeholder: field.placeholder?.trim()
            }))
        };
    }
}