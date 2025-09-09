import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for EmptyTableComponent
 * Simplified table component for basic data display without advanced features
 */

export interface EmptyTableColumn {
    id: string;
    label: string;
    field: string;
    type?: 'text' | 'number' | 'date' | 'boolean' | 'html';
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    className?: string | ((value: any, row: any) => string);
    style?: string | ((value: any, row: any) => string);
    format?: (value: any, row: any) => string;
    cellRenderer?: (value: any, row: any, column: EmptyTableColumn) => string;
}

export interface EmptyTableRow {
    id: string | number;
    [key: string]: any;
    _className?: string;
    _style?: string;
}

export interface EmptyTableConfig extends BaseComponentConfig {
    // Data configuration
    columns: EmptyTableColumn[];
    data?: EmptyTableRow[];
    
    // Layout options
    height?: string | number;
    maxHeight?: string | number;
    minHeight?: string | number;
    striped?: boolean;
    bordered?: boolean;
    borderless?: boolean;
    hover?: boolean;
    compact?: boolean;
    responsive?: boolean;
    
    // Header options
    showHeader?: boolean;
    stickyHeader?: boolean;
    headerHeight?: string | number;
    
    // Row options
    rowHeight?: string | number;
    rowClassName?: string | ((row: EmptyTableRow, index: number) => string);
    rowStyle?: string | ((row: EmptyTableRow, index: number) => string);
    
    // Empty state
    emptyMessage?: string;
    emptyIcon?: string;
    emptyAction?: { label: string; onClick: () => void };
    
    // Loading state
    loading?: boolean;
    loadingMessage?: string;
    loadingRows?: number;
    
    // Appearance
    variant?: 'default' | 'compact' | 'comfortable' | 'spacious';
    theme?: 'auto' | 'light' | 'dark';
    
    // Events
    onRowClick?: (row: EmptyTableRow, event: MouseEvent) => void;
    onRowDoubleClick?: (row: EmptyTableRow, event: MouseEvent) => void;
    onCellClick?: (row: EmptyTableRow, column: EmptyTableColumn, value: any) => void;
    
    // Advanced options
    trackBy?: string | ((row: EmptyTableRow, index: number) => any);
    
    // Component state
    disabled?: boolean;
    style?: string;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * Event data interfaces
 */
export interface EmptyTableRowEvent {
    componentId: string;
    row: EmptyTableRow;
    index: number;
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_EMPTY_TABLE_CONFIG: Partial<EmptyTableConfig> = {
    columns: [],
    data: [],
    height: 'auto',
    striped: false,
    bordered: true,
    borderless: false,
    hover: true,
    compact: false,
    responsive: true,
    showHeader: true,
    stickyHeader: false,
    emptyMessage: 'No data available',
    loading: false,
    loadingMessage: 'Loading...',
    loadingRows: 5,
    variant: 'default',
    theme: 'auto'
};

/**
 * Validation rules for configuration
 */
export const EMPTY_TABLE_VALIDATION = {
    MIN_COLUMNS: 1,
    MAX_COLUMNS: 50,
    MIN_ROW_HEIGHT: 20,
    MAX_ROW_HEIGHT: 500,
    MIN_COLUMN_WIDTH: 30,
    MAX_COLUMN_WIDTH: 2000
};

/**
 * CSS class constants specific to EmptyTable
 */
export const EMPTY_TABLE_CSS = {
    COMPONENT: 'empty-table',
    CONTAINER: 'empty-table-container',
    WRAPPER: 'empty-table-wrapper',
    
    // Table structure
    TABLE: 'empty-table-element',
    THEAD: 'empty-table-thead',
    TBODY: 'empty-table-tbody',
    
    // Header
    HEADER_ROW: 'empty-table-header-row',
    HEADER_CELL: 'empty-table-header-cell',
    HEADER_CONTENT: 'empty-table-header-content',
    HEADER_LABEL: 'empty-table-header-label',
    
    // Body
    BODY_ROW: 'empty-table-body-row',
    BODY_CELL: 'empty-table-body-cell',
    BODY_CONTENT: 'empty-table-body-content',
    
    // States
    LOADING: 'empty-table--loading',
    EMPTY: 'empty-table--empty',
    ERROR: 'empty-table--error',
    DISABLED: 'empty-table--disabled',
    
    // Variants
    STRIPED: 'empty-table--striped',
    BORDERED: 'empty-table--bordered',
    BORDERLESS: 'empty-table--borderless',
    HOVER: 'empty-table--hover',
    COMPACT: 'empty-table--compact',
    RESPONSIVE: 'empty-table--responsive',
    
    // Features
    STICKY_HEADER: 'empty-table--sticky-header'
};

/**
 * Helper functions for configuration validation
 */
export class EmptyTableConfigValidator {
    static validate(config: EmptyTableConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate columns
        if (!config.columns || !Array.isArray(config.columns)) {
            errors.push('Columns must be an array');
        } else {
            if (config.columns.length < EMPTY_TABLE_VALIDATION.MIN_COLUMNS) {
                errors.push(`At least ${EMPTY_TABLE_VALIDATION.MIN_COLUMNS} column is required`);
            }
            if (config.columns.length > EMPTY_TABLE_VALIDATION.MAX_COLUMNS) {
                errors.push(`Maximum ${EMPTY_TABLE_VALIDATION.MAX_COLUMNS} columns allowed`);
            }

            // Validate each column
            config.columns.forEach((column, index) => {
                if (!column.id || !column.field) {
                    errors.push(`Column at index ${index} must have id and field`);
                }
                if (!column.label) {
                    warnings.push(`Column "${column.id}" has no label`);
                }
            });

            // Check for duplicate column IDs
            const columnIds = config.columns.map(c => c.id);
            const duplicates = columnIds.filter((id, index) => columnIds.indexOf(id) !== index);
            if (duplicates.length > 0) {
                errors.push(`Duplicate column IDs found: ${duplicates.join(', ')}`);
            }
        }

        // Validate data if provided
        if (config.data && !Array.isArray(config.data)) {
            errors.push('Data must be an array');
        }

        // Validate callbacks
        const callbacks = ['onRowClick', 'onRowDoubleClick', 'onCellClick'];
        callbacks.forEach(callback => {
            if (config[callback as keyof EmptyTableConfig] && 
                typeof config[callback as keyof EmptyTableConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        // Warnings
        if (!config.data || config.data.length === 0) {
            warnings.push('No data provided - table will be empty');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: EmptyTableConfig): EmptyTableConfig {
        return {
            ...config,
            id: config.id?.trim(),
            columns: config.columns?.map(column => ({
                ...column,
                id: column.id?.trim(),
                label: column.label?.trim(),
                field: column.field?.trim()
            }))
        };
    }

    static generateColumnId(field: string): string {
        return field.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
}
