import { DataTableConfig, DataTableColumn, DataTableRow, DataTableAction, DataTableContextMenuItem } from '../DataTable/DataTableConfig';

/**
 * Configuration interface for FilterableTableComponent
 * Extends DataTable with enhanced filtering capabilities and advanced filter UI
 */

export interface FilterableTableColumn extends DataTableColumn {
    // Enhanced filtering options
    advancedFilter?: boolean;
    filterOperators?: ('equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn')[];
    filterSuggestions?: string[] | (() => Promise<string[]>);
    filterValidation?: (value: any) => boolean | string;
    filterGroup?: string;
    
    // Custom filter components
    customFilterComponent?: string;
    customFilterProps?: Record<string, any>;
}

export interface FilterableTableRow extends DataTableRow {
    // Additional properties for filtering
    _filterTags?: string[];
    _filterScore?: number;
    _filterMatches?: Record<string, boolean>;
}

export interface FilterCondition {
    id: string;
    columnId: string;
    operator: string;
    value: any;
    values?: any[]; // For 'in', 'between' operators
    enabled: boolean;
    group?: string;
}

export interface FilterGroup {
    id: string;
    name: string;
    logic: 'AND' | 'OR';
    conditions: FilterCondition[];
    enabled: boolean;
}

export interface SavedFilter {
    id: string;
    name: string;
    description?: string;
    groups: FilterGroup[];
    globalLogic: 'AND' | 'OR';
    createdAt: number;
    updatedAt: number;
    isDefault?: boolean;
    isPublic?: boolean;
}

export interface FilterableTableConfig extends DataTableConfig {
    columns: FilterableTableColumn[];
    data?: FilterableTableRow[];
    
    // Enhanced filtering options
    advancedFiltering?: boolean;
    filterSaveEnabled?: boolean;
    filterShareEnabled?: boolean;
    filterPresets?: SavedFilter[];
    defaultFilter?: SavedFilter;
    
    // Filter UI options
    filterToolbarPosition?: 'top' | 'bottom' | 'both';
    showFilterSummary?: boolean;
    showActiveFiltersCount?: boolean;
    quickFilterColumns?: string[]; // Columns to include in quick filter
    
    // Advanced filter features
    fuzzySearch?: boolean;
    highlightMatches?: boolean;
    filterHistory?: boolean;
    maxFilterHistory?: number;
    
    // Performance options
    filterDebounceTime?: number;
    clientSideFiltering?: boolean;
    serverSideFiltering?: boolean;
    
    // Filter callbacks
    onFilterChange?: (filters: FilterGroup[], activeFilters: FilterCondition[]) => void;
    onFilterSave?: (filter: SavedFilter) => void;
    onFilterLoad?: (filter: SavedFilter) => void;
    onFilterDelete?: (filterId: string) => void;
    onFilterShare?: (filter: SavedFilter) => void;
    
    // Custom filter processors
    customFilterProcessor?: (data: FilterableTableRow[], conditions: FilterCondition[]) => FilterableTableRow[];
    customOperators?: Record<string, (value: any, filterValue: any) => boolean>;
}

/**
 * Event data interfaces for filterable table
 */
export interface FilterableTableFilterEvent {
    componentId: string;
    filterGroups: FilterGroup[];
    activeFilters: FilterCondition[];
    resultCount: number;
    timestamp: number;
}

export interface FilterableTableSaveEvent {
    componentId: string;
    savedFilter: SavedFilter;
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_FILTERABLE_TABLE_CONFIG: Partial<FilterableTableConfig> = {
    // Inherit from DataTable defaults
    advancedFiltering: true,
    filterSaveEnabled: true,
    filterShareEnabled: false,
    filterToolbarPosition: 'top',
    showFilterSummary: true,
    showActiveFiltersCount: true,
    fuzzySearch: false,
    highlightMatches: true,
    filterHistory: true,
    maxFilterHistory: 10,
    filterDebounceTime: 300,
    clientSideFiltering: true,
    serverSideFiltering: false
};

/**
 * Built-in filter operators
 */
export const FILTER_OPERATORS = {
    TEXT: {
        equals: { label: 'Equals', requiresValue: true },
        contains: { label: 'Contains', requiresValue: true },
        startsWith: { label: 'Starts with', requiresValue: true },
        endsWith: { label: 'Ends with', requiresValue: true },
        isEmpty: { label: 'Is empty', requiresValue: false },
        isNotEmpty: { label: 'Is not empty', requiresValue: false }
    },
    NUMBER: {
        equals: { label: 'Equals', requiresValue: true },
        greaterThan: { label: 'Greater than', requiresValue: true },
        lessThan: { label: 'Less than', requiresValue: true },
        greaterThanOrEqual: { label: 'Greater than or equal', requiresValue: true },
        lessThanOrEqual: { label: 'Less than or equal', requiresValue: true },
        between: { label: 'Between', requiresValue: true, requiresRange: true },
        isEmpty: { label: 'Is empty', requiresValue: false },
        isNotEmpty: { label: 'Is not empty', requiresValue: false }
    },
    DATE: {
        equals: { label: 'Equals', requiresValue: true },
        after: { label: 'After', requiresValue: true },
        before: { label: 'Before', requiresValue: true },
        between: { label: 'Between', requiresValue: true, requiresRange: true },
        today: { label: 'Today', requiresValue: false },
        yesterday: { label: 'Yesterday', requiresValue: false },
        thisWeek: { label: 'This week', requiresValue: false },
        thisMonth: { label: 'This month', requiresValue: false },
        thisYear: { label: 'This year', requiresValue: false },
        isEmpty: { label: 'Is empty', requiresValue: false },
        isNotEmpty: { label: 'Is not empty', requiresValue: false }
    },
    BOOLEAN: {
        isTrue: { label: 'Is true', requiresValue: false },
        isFalse: { label: 'Is false', requiresValue: false },
        isEmpty: { label: 'Is empty', requiresValue: false },
        isNotEmpty: { label: 'Is not empty', requiresValue: false }
    },
    LIST: {
        in: { label: 'In', requiresValue: true, allowMultiple: true },
        notIn: { label: 'Not in', requiresValue: true, allowMultiple: true },
        isEmpty: { label: 'Is empty', requiresValue: false },
        isNotEmpty: { label: 'Is not empty', requiresValue: false }
    }
};

/**
 * CSS class constants specific to FilterableTable
 */
export const FILTERABLE_TABLE_CSS = {
    COMPONENT: 'filterable-table',
    CONTAINER: 'filterable-table-container',
    
    // Filter toolbar
    TOOLBAR: 'filterable-table-toolbar',
    TOOLBAR_TOP: 'filterable-table-toolbar--top',
    TOOLBAR_BOTTOM: 'filterable-table-toolbar--bottom',
    
    // Quick filter
    QUICK_FILTER: 'filterable-table-quick-filter',
    QUICK_FILTER_INPUT: 'filterable-table-quick-filter-input',
    
    // Advanced filter builder
    FILTER_BUILDER: 'filterable-table-filter-builder',
    FILTER_GROUP: 'filterable-table-filter-group',
    FILTER_CONDITION: 'filterable-table-filter-condition',
    FILTER_LOGIC: 'filterable-table-filter-logic',
    
    // Filter controls
    FILTER_CONTROLS: 'filterable-table-filter-controls',
    FILTER_PRESET: 'filterable-table-filter-preset',
    FILTER_SAVE: 'filterable-table-filter-save',
    FILTER_CLEAR: 'filterable-table-filter-clear',
    
    // Filter summary
    FILTER_SUMMARY: 'filterable-table-filter-summary',
    FILTER_COUNT: 'filterable-table-filter-count',
    ACTIVE_FILTERS: 'filterable-table-active-filters',
    FILTER_TAG: 'filterable-table-filter-tag',
    
    // Enhanced row states
    ROW_HIGHLIGHTED: 'filterable-table-row--highlighted',
    ROW_MATCH: 'filterable-table-row--match',
    CELL_MATCH: 'filterable-table-cell--match'
};

/**
 * Validation rules for FilterableTable
 */
export const FILTERABLE_TABLE_VALIDATION = {
    MAX_FILTER_GROUPS: 10,
    MAX_CONDITIONS_PER_GROUP: 20,
    MAX_SAVED_FILTERS: 50,
    MAX_FILTER_HISTORY: 20,
    MIN_FILTER_DEBOUNCE: 100,
    MAX_FILTER_DEBOUNCE: 2000
};

/**
 * Helper functions for filterable table configuration
 */
export class FilterableTableConfigValidator {
    static validate(config: FilterableTableConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation from DataTable
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate columns
        if (!config.columns || !Array.isArray(config.columns)) {
            errors.push('Columns must be an array');
        } else {
            config.columns.forEach((column, index) => {
                if (!column.id || !column.field) {
                    errors.push(`Column at index ${index} must have id and field`);
                }
                
                // Validate filter operators
                if (column.filterOperators && !Array.isArray(column.filterOperators)) {
                    errors.push(`Column "${column.id}" filterOperators must be an array`);
                }
                
                // Validate custom filter validation
                if (column.filterValidation && typeof column.filterValidation !== 'function') {
                    errors.push(`Column "${column.id}" filterValidation must be a function`);
                }
            });
        }

        // Validate filter configuration
        if (config.maxFilterHistory && 
            (config.maxFilterHistory < 1 || config.maxFilterHistory > FILTERABLE_TABLE_VALIDATION.MAX_FILTER_HISTORY)) {
            warnings.push(`maxFilterHistory should be between 1 and ${FILTERABLE_TABLE_VALIDATION.MAX_FILTER_HISTORY}`);
        }

        if (config.filterDebounceTime && 
            (config.filterDebounceTime < FILTERABLE_TABLE_VALIDATION.MIN_FILTER_DEBOUNCE || 
             config.filterDebounceTime > FILTERABLE_TABLE_VALIDATION.MAX_FILTER_DEBOUNCE)) {
            warnings.push(`filterDebounceTime should be between ${FILTERABLE_TABLE_VALIDATION.MIN_FILTER_DEBOUNCE} and ${FILTERABLE_TABLE_VALIDATION.MAX_FILTER_DEBOUNCE}ms`);
        }

        // Validate saved filters
        if (config.filterPresets) {
            if (!Array.isArray(config.filterPresets)) {
                errors.push('filterPresets must be an array');
            } else if (config.filterPresets.length > FILTERABLE_TABLE_VALIDATION.MAX_SAVED_FILTERS) {
                warnings.push(`Too many filter presets (${config.filterPresets.length}). Maximum recommended: ${FILTERABLE_TABLE_VALIDATION.MAX_SAVED_FILTERS}`);
            }
        }

        // Validate callbacks
        const callbacks = ['onFilterChange', 'onFilterSave', 'onFilterLoad', 'onFilterDelete', 'customFilterProcessor'];
        callbacks.forEach(callback => {
            if (config[callback as keyof FilterableTableConfig] && 
                typeof config[callback as keyof FilterableTableConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: FilterableTableConfig): FilterableTableConfig {
        return {
            ...config,
            filterDebounceTime: Math.max(
                FILTERABLE_TABLE_VALIDATION.MIN_FILTER_DEBOUNCE,
                Math.min(
                    config.filterDebounceTime || DEFAULT_FILTERABLE_TABLE_CONFIG.filterDebounceTime || 300,
                    FILTERABLE_TABLE_VALIDATION.MAX_FILTER_DEBOUNCE
                )
            ),
            maxFilterHistory: Math.max(
                1,
                Math.min(
                    config.maxFilterHistory || DEFAULT_FILTERABLE_TABLE_CONFIG.maxFilterHistory || 10,
                    FILTERABLE_TABLE_VALIDATION.MAX_FILTER_HISTORY
                )
            )
        };
    }

    static getOperatorsForColumnType(columnType: string): Record<string, any> {
        switch (columnType) {
            case 'number':
                return FILTER_OPERATORS.NUMBER;
            case 'date':
                return FILTER_OPERATORS.DATE;
            case 'boolean':
                return FILTER_OPERATORS.BOOLEAN;
            case 'text':
            default:
                return FILTER_OPERATORS.TEXT;
        }
    }
}
