import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for DataTableComponent
 * Provides type-safe configuration options for data tables with sorting, filtering, and actions
 */

export interface DataTableColumn {
    id: string;
    label: string;
    field: string;
    type?: 'text' | 'number' | 'date' | 'boolean' | 'html' | 'custom';
    width?: string | number;
    minWidth?: string | number;
    maxWidth?: string | number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    resizable?: boolean;
    visible?: boolean;
    fixed?: boolean;
    
    // Formatting options
    format?: (value: unknown, row: DataTableRow) => string;
    className?: string | ((value: unknown, row: DataTableRow) => string);
    style?: string | ((value: unknown, row: DataTableRow) => string);

    // Filtering options
    filterType?: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
    filterOptions?: Array<{ label: string; value: unknown }>;
    filterPlaceholder?: string;

    // Sorting options
    sortDirection?: 'asc' | 'desc' | null;
    sortOrder?: number;
    customSort?: (a: DataTableRow, b: DataTableRow) => number;

    // Cell rendering
    cellRenderer?: (value: unknown, row: DataTableRow, column: DataTableColumn) => string;
    headerRenderer?: (column: DataTableColumn) => string;
}

export interface DataTableRow {
    id: string | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Dynamic row data - any is appropriate here
    _expanded?: boolean;
    _disabled?: boolean;
    _className?: string;
    _style?: string;
}


export interface DataTableContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean | ((row: DataTableRow) => boolean);
    visible?: boolean | ((row: DataTableRow) => boolean);
    separator?: boolean;
    submenu?: DataTableContextMenuItem[];
    onClick?: (row: DataTableRow, item: DataTableContextMenuItem) => void;
}

export interface DataTableConfig extends BaseComponentConfig {
    // Data configuration
    columns: DataTableColumn[];
    data?: DataTableRow[];
    
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
    multilineHeader?: boolean;
    
    // Row options
    rowHeight?: string | number;
    rowClassName?: string | ((row: DataTableRow, index: number) => string);
    rowStyle?: string | ((row: DataTableRow, index: number) => string);
    expandableRows?: boolean;
    expandedRowRenderer?: (row: DataTableRow) => string;
    
    
    // Sorting options
    sortable?: boolean;
    multiSort?: boolean;
    defaultSort?: { column: string; direction: 'asc' | 'desc' }[];
    onSort?: (sortConfig: { column: string; direction: 'asc' | 'desc' }[]) => void;
    
    // Filtering options
    filterable?: boolean;
    filterDebounce?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFilter?: (filters: Record<string, any>) => void; // Dynamic filter values - any is appropriate here
    
    // Pagination options
    paginated?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    currentPage?: number;
    totalRows?: number;
    showFooter?: boolean;
    onPageChange?: (page: number, pageSize: number) => void;
    
    
    // Context menu
    contextMenu?: boolean;
    contextMenuItems?: DataTableContextMenuItem[];
    onContextMenu?: (item: DataTableContextMenuItem, row: DataTableRow) => void;
    
    // Column management
    showColumnChooser?: boolean;
    
    // Empty state
    emptyMessage?: string;
    emptyIcon?: string;
    emptyAction?: { label: string; onClick: () => void };
    
    // Loading state
    loading?: boolean;
    loadingMessage?: string;
    loadingRows?: number;
    
    // Search
    searchable?: boolean;
    searchPlaceholder?: string;
    searchDebounce?: number;
    onSearch?: (query: string) => void;
    
    // Appearance
    variant?: 'default' | 'compact' | 'comfortable' | 'spacious';
    theme?: 'auto' | 'light' | 'dark';
    zebra?: boolean;
    
    // Advanced options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trackBy?: string | ((row: DataTableRow, index: number) => any); // Row identifier can be any type - any is appropriate here
    debounceTime?: number;
    throttleTime?: number;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
    announceRowCount?: boolean;
    
    // Events
    onRowClick?: (row: DataTableRow, event: MouseEvent) => void;
    onRowDoubleClick?: (row: DataTableRow, event: MouseEvent) => void;
    onRowExpand?: (row: DataTableRow) => void;
    onRowCollapse?: (row: DataTableRow) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCellClick?: (row: DataTableRow, column: DataTableColumn, value: any) => void; // Cell value can be any type - any is appropriate here
}

/**
 * Event data interfaces
 */
export interface DataTableRowEvent {
    componentId: string;
    row: DataTableRow;
    index: number;
    timestamp: number;
}

export interface DataTableSelectionEvent {
    componentId: string;
    selectedRows: DataTableRow[];
    addedRows: DataTableRow[];
    removedRows: DataTableRow[];
    timestamp: number;
}

export interface DataTableSortEvent {
    componentId: string;
    sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }>;
    timestamp: number;
}

export interface DataTableFilterEvent {
    componentId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: Record<string, any>; // Dynamic filter values by column - any is appropriate here
    timestamp: number;
}

export interface DataTablePageEvent {
    componentId: string;
    page: number;
    pageSize: number;
    totalRows: number;
    timestamp: number;
}


/**
 * Default configuration values
 */
export const DEFAULT_DATA_TABLE_CONFIG: Partial<DataTableConfig> = {
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
    sortable: true,
    multiSort: false,
    filterable: true,
    filterDebounce: 300,
    paginated: false,
    pageSize: 50,
    pageSizeOptions: [10, 25, 50, 100],
    currentPage: 1,
    contextMenu: false,
    showColumnChooser: false,
    emptyMessage: 'No data available',
    loading: false,
    loadingMessage: 'Loading...',
    loadingRows: 5,
    searchable: false,
    searchPlaceholder: 'Search...',
    searchDebounce: 300,
    variant: 'default',
    theme: 'auto',
    zebra: false,
    debounceTime: 150,
    throttleTime: 50,
    announceRowCount: true
};

/**
 * Validation rules for configuration
 */
export const DATA_TABLE_VALIDATION = {
    MIN_COLUMNS: 1,
    MAX_COLUMNS: 100,
    MIN_PAGE_SIZE: 1,
    MAX_PAGE_SIZE: 1000,
    MIN_ROW_HEIGHT: 20,
    MAX_ROW_HEIGHT: 500,
    MIN_COLUMN_WIDTH: 30,
    MAX_COLUMN_WIDTH: 2000,
    MIN_DEBOUNCE_TIME: 0,
    MAX_DEBOUNCE_TIME: 5000
};

/**
 * CSS class constants specific to DataTable
 */
export const DATA_TABLE_CSS = {
    COMPONENT: 'data-table',
    CONTAINER: 'data-table-container',
    WRAPPER: 'data-table-wrapper',
    
    // Table structure
    TABLE: 'data-table-element',
    THEAD: 'data-table-thead',
    TBODY: 'data-table-tbody',
    TFOOT: 'data-table-tfoot',
    
    // Header
    HEADER_ROW: 'data-table-header-row',
    HEADER_CELL: 'data-table-header-cell',
    HEADER_CONTENT: 'data-table-header-content',
    HEADER_LABEL: 'data-table-header-label',
    HEADER_SORT: 'data-table-header-sort',
    HEADER_FILTER: 'data-table-header-filter',
    HEADER_RESIZE: 'data-table-header-resize',
    
    // Body
    BODY_ROW: 'data-table-body-row',
    BODY_CELL: 'data-table-body-cell',
    BODY_CONTENT: 'data-table-body-content',
    
    // Selection
    CHECKBOX: 'data-table-checkbox',
    CHECKBOX_ALL: 'data-table-checkbox-all',
    ROW_SELECTED: 'data-table-row--selected',
    
    // Sorting
    SORTABLE: 'data-table-sortable',
    SORTED_ASC: 'data-table-sorted--asc',
    SORTED_DESC: 'data-table-sorted--desc',
    
    // Filtering
    FILTER_ROW: 'data-table-filter-row',
    FILTER_CELL: 'data-table-filter-cell',
    FILTER_INPUT: 'data-table-filter-input',
    
    // States
    LOADING: 'data-table--loading',
    EMPTY: 'data-table--empty',
    ERROR: 'data-table--error',
    DISABLED: 'data-table--disabled',
    
    // Variants
    STRIPED: 'data-table--striped',
    BORDERED: 'data-table--bordered',
    BORDERLESS: 'data-table--borderless',
    HOVER: 'data-table--hover',
    COMPACT: 'data-table--compact',
    RESPONSIVE: 'data-table--responsive',
    
    // Features
    STICKY_HEADER: 'data-table--sticky-header',
    VIRTUAL_SCROLL: 'data-table--virtual-scroll',
    EXPANDABLE: 'data-table--expandable',
    
    // Pagination
    PAGINATION: 'data-table-pagination',
    PAGE_INFO: 'data-table-page-info',
    PAGE_SIZE: 'data-table-page-size',
    PAGE_BUTTONS: 'data-table-page-buttons'
};

/**
 * Helper functions for configuration validation
 */
export class DataTableConfigValidator {
    static validate(config: DataTableConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
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
            if (config.columns.length < DATA_TABLE_VALIDATION.MIN_COLUMNS) {
                errors.push(`At least ${DATA_TABLE_VALIDATION.MIN_COLUMNS} column is required`);
            }
            if (config.columns.length > DATA_TABLE_VALIDATION.MAX_COLUMNS) {
                errors.push(`Maximum ${DATA_TABLE_VALIDATION.MAX_COLUMNS} columns allowed`);
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

        // Validate pagination
        if (config.paginated) {
            if (config.pageSize && (config.pageSize < DATA_TABLE_VALIDATION.MIN_PAGE_SIZE || 
                config.pageSize > DATA_TABLE_VALIDATION.MAX_PAGE_SIZE)) {
                errors.push(`Page size must be between ${DATA_TABLE_VALIDATION.MIN_PAGE_SIZE} and ${DATA_TABLE_VALIDATION.MAX_PAGE_SIZE}`);
            }
        }

        // Validate callbacks
        const callbacks = ['onSelectionChange', 'onSort', 'onFilter', 'onPageChange', 'onAction', 'onRowClick'];
        callbacks.forEach(callback => {
            if (config[callback as keyof DataTableConfig] && 
                typeof config[callback as keyof DataTableConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        // Warnings (skip empty data warning during initialization as this is expected)
        // Note: Empty data is normal during component initialization

        if (config.data && config.data.length > 1000 && !config.paginated) {
            warnings.push('Large dataset without pagination may impact performance');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: DataTableConfig): DataTableConfig {
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