/**
 * FilterPanelConfig - Configuration for Filter Panel Component
 *
 * Defines the structure for configurable filter panels with quick filters
 * and advanced filter builder functionality.
 */

export type FilterOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | '>'
    | '<'
    | '>='
    | '<='
    | 'between'
    | 'isNotNull'
    | 'isNull';

export interface FilterCondition {
    id: string; // Unique ID for UI tracking
    field: string; // Field name
    operator: FilterOperator; // Operator
    value: unknown; // Filter value - can be string, number, boolean, Date, array, etc.
    value2?: unknown; // Second value for 'between' operator
    logicalOperator: 'AND' | 'OR'; // How to combine with next condition
}

export interface QuickFilterConfig {
    id: string;
    label: string;
    conditions: FilterCondition[];
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface FilterFieldConfig {
    field: string;
    label: string;
    type: 'text' | 'number' | 'datetime' | 'select' | 'boolean';
    operators: FilterOperator[];
    options?: SelectOption[]; // For select type
    placeholder?: string;
}

export interface FilterPanelConfig {
    id: string;
    collapsible: boolean;
    defaultCollapsed: boolean;
    quickFilters: QuickFilterConfig[];
    advancedFilters: FilterFieldConfig[];
    showPreviewCount?: boolean; // Show "X items match" preview
    maxConditions?: number; // Max number of advanced filter conditions (default: 10)
}

/**
 * Operator display labels
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
    'equals': 'Equals',
    'notEquals': 'Not Equals',
    'contains': 'Contains',
    'notContains': 'Does Not Contain',
    'startsWith': 'Starts With',
    'endsWith': 'Ends With',
    '>': 'Greater Than',
    '<': 'Less Than',
    '>=': 'Greater Than or Equal',
    '<=': 'Less Than or Equal',
    'between': 'Between',
    'isNotNull': 'Contains data',
    'isNull': 'Does not contain data'
};

/**
 * Default operators by field type
 */
export const DEFAULT_OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
    'text': ['contains', 'equals', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
    'number': ['equals', '>', '<', '>=', '<=', 'between'],
    'datetime': ['equals', '>', '<', '>=', '<=', 'between'],
    'select': ['equals', 'notEquals'],
    'boolean': ['equals']
};
