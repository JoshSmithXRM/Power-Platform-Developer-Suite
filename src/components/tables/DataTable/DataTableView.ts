import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';
import { ServiceFactory } from '../../../services/ServiceFactory';

import { DataTableConfig, DataTableColumn, DataTableRow } from './DataTableConfig';

/**
 * DataTableView - HTML generation for DataTable component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface DataTableViewState {
    data: DataTableRow[];
    sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }>;
    filters: Record<string, any>;
    currentPage: number;
    pageSize: number;
    totalRows: number;
    searchQuery: string;
    loading: boolean;
    loadingMessage: string;
    error: string | null;
    expandedRows: Array<string | number>;
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
}

export class DataTableView {
    private static _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private static get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('DataTableView');
        }
        return this._logger;
    }

    /**
     * Render the complete HTML for the DataTable component
     */
    static render(config: DataTableConfig, state: DataTableViewState): string {
        this.logger.debug('Rendering DataTable HTML', {
            componentId: config.id,
            dataRows: state.data.length,
            sortConfig: state.sortConfig,
            hasSort: state.sortConfig.length > 0,
            activeFilters: Object.keys(state.filters),
            columns: config.columns.length
        });
        const {
            id,
            height = 'auto',
            striped = false,
            bordered = true,
            hover = true,
            compact = false,
            responsive = true,
            variant = 'default',
            loading = false,
            className = 'data-table'
        } = config;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            'data-table',
            className,
            `data-table--${variant}`,
            striped ? 'data-table--striped' : '',
            bordered ? 'data-table--bordered' : '',
            config.borderless ? 'data-table--borderless' : '',
            hover ? 'data-table--hover' : '',
            compact ? 'data-table--compact' : '',
            responsive ? 'data-table--responsive' : '',
            config.stickyHeader ? 'data-table--sticky-header' : '',
            loading || state.loading ? 'data-table--loading' : '',
            state.data.length === 0 ? 'data-table--empty' : ''
        ].filter(Boolean).join(' ');

        const containerStyle = height !== 'auto' ? `height: ${height}; overflow: auto;` : '';

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="DataTable"
                 style="${containerStyle}">
                
                ${this.renderToolbar(config, state)}
                
                <div class="data-table-wrapper">
                    ${this.renderTable(config, state)}
                </div>
                
                ${this.renderPagination(config, state)}
                
                ${this.renderLoadingOverlay(config)}
                ${this.renderEmptyState(config, state)}
                ${this.renderContextMenu(config)}
                
            </div>
        `;
    }

    /**
     * Render the table toolbar with search and actions
     */
    private static renderToolbar(config: DataTableConfig, state: DataTableViewState): string {
        const hasToolbar = config.searchable || config.showColumnChooser;
        
        if (!hasToolbar) {
            return '';
        }

        return `
            <div class="data-table-toolbar">
                ${config.searchable ? this.renderSearch(config) : ''}
                
                <div class="data-table-toolbar-actions">
                    ${config.showColumnChooser ? this.renderColumnChooser(config, state) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render search box
     */
    private static renderSearch(config: DataTableConfig): string {
        return `
            <div class="data-table-search">
                <input type="text" 
                       class="data-table-search-input"
                       placeholder="${this.escapeHtml(config.searchPlaceholder || 'Search...')}"
                       data-component-element="search">
                <span class="data-table-search-icon">${ICONS.SEARCH}</span>
            </div>
        `;
    }

    /**
     * Render column chooser dropdown
     */
    private static renderColumnChooser(config: DataTableConfig, state: DataTableViewState): string {
        const visibleColumns = config.columns.filter((col: DataTableColumn) => state.columnVisibility[col.id] !== false).length;
        
        return `
            <div class="data-table-column-chooser">
                <button class="data-table-column-chooser-toggle" 
                        data-component-element="column-chooser">
                    ${ICONS.FILTER} Columns (${visibleColumns}/${config.columns.length})
                </button>
                <div class="data-table-column-chooser-menu" style="display: none;">
                    ${config.columns.map((column: DataTableColumn) => `
                        <label class="data-table-column-chooser-item">
                            <input type="checkbox" 
                                   data-column-id="${column.id}"
                                   ${state.columnVisibility[column.id] !== false ? 'checked' : ''}>
                            <span>${this.escapeHtml(column.label)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }


    /**
     * Render the main table
     */
    private static renderTable(config: DataTableConfig, state: DataTableViewState): string {
        const visibleColumns = config.columns.filter((col: DataTableColumn) => state.columnVisibility[col.id] !== false);


        return `
            <table id="${config.id}" class="data-table-element">
                ${config.showHeader !== false ? this.renderTableHeader(config, visibleColumns, state) : ''}
                ${this.renderTableBody(config, visibleColumns, state)}
            </table>
        `;
    }

    /**
     * Render table header
     */
    private static renderTableHeader(
        config: DataTableConfig, 
        columns: DataTableColumn[], 
        state: DataTableViewState
    ): string {
        const headerCells = columns.map(column => this.renderHeaderCell(column, config, state)).join('');
        
        return `
            <thead class="data-table-thead">
                <tr class="data-table-header-row">
                    ${headerCells}
                </tr>
            </thead>
        `;
    }


    /**
     * Render a single header cell
     */
    private static renderHeaderCell(
        column: DataTableColumn, 
        config: DataTableConfig, 
        state: DataTableViewState
    ): string {
        const sortable = config.sortable && column.sortable !== false;
        const sortConfig = state.sortConfig.find(s => s.column === column.id);
        
        // Header cell rendering - keep minimal logging for debugging
        
        const cellClass = [
            'data-table-header-cell',
            sortable ? 'sortable' : '',
            sortConfig ? `sorted-${sortConfig.direction}` : '',
            column.className ? (typeof column.className === 'string' ? column.className : '') : '',
            `data-table-align--${column.align || 'left'}`
        ].filter(Boolean).join(' ');

        const cellStyle = [
            column.width ? `width: ${column.width};` : '',
            column.minWidth ? `min-width: ${column.minWidth};` : '',
            column.maxWidth ? `max-width: ${column.maxWidth};` : '',
            column.style ? (typeof column.style === 'string' ? column.style : '') : ''
        ].filter(Boolean).join(' ');

        return `
            <th class="${cellClass}" 
                style="${cellStyle}"
                data-column-id="${column.id}"
                ${sortable ? 'data-sortable="true"' : ''}
                ${config.filterable && column.filterable !== false ? 'data-filterable="true"' : ''}>
                
                <div class="data-table-header-content">
                    <span class="data-table-header-label">
                        ${column.headerRenderer ? 
                            column.headerRenderer(column) : 
                            this.escapeHtml(column.label)}
                    </span>
                    
                    ${sortable ? this.renderSortIndicator(column, sortConfig) : ''}
                    
                    ${config.filterable && column.filterable !== false ?
                        this.renderFilterIcon(column, state) : ''}
                    
                </div>
            </th>
        `;
    }

    /**
     * Render sort indicator
     */
    private static renderSortIndicator(
        column: DataTableColumn, 
        sortConfig?: { column: string; direction: 'asc' | 'desc' }
    ): string {
        // Only show indicator if this column is actually sorted
        if (!sortConfig) {
            return '';
        }
        
        const icon = sortConfig.direction === 'asc' ? '▲' : '▼';
        const directionClass = `sort-indicator--${sortConfig.direction}`;
        return `<span class="sort-indicator ${directionClass}" title="Sorted ${sortConfig.direction}ending">${icon}</span>`;
    }

    /**
     * Render filter dropdown arrow (always visible on filterable columns)
     */
    private static renderFilterIcon(column: DataTableColumn, state: DataTableViewState): string {
        const hasActiveFilter = state.filters && state.filters[column.id] && 
                               state.filters[column.id] !== '' && 
                               state.filters[column.id] !== null && 
                               state.filters[column.id] !== undefined;
        
        const iconClass = hasActiveFilter ? 'filter-icon--active' : 'filter-icon--inactive';
        const title = hasActiveFilter ? `Filter applied: ${state.filters[column.id]}` : 'Click to filter';
        
        return `
            <button class="data-table-filter-dropdown" 
                    data-component-element="filter"
                    data-column-id="${column.id}"
                    title="${title}">
                <span class="filter-dropdown-arrow ${iconClass}">▼</span>
                ${hasActiveFilter ? '<span class="filter-active-indicator">●</span>' : ''}
            </button>
        `;
    }

    /**
     * Render table body
     */
    private static renderTableBody(
        config: DataTableConfig, 
        columns: DataTableColumn[], 
        state: DataTableViewState
    ): string {
        const visibleData = this.getVisibleData(config, state);

        // Always render tbody element, even when empty (required for dynamic updates)
        return `
            <tbody class="data-table-tbody">
                ${visibleData.map((row, index) => 
                    this.renderTableRow(row, index, columns, config, state)
                ).join('')}
            </tbody>
        `;
    }

    /**
     * Get visible data based on pagination
     */
    private static getVisibleData(config: DataTableConfig, state: DataTableViewState): DataTableRow[] {
        if (!config.paginated) {
            return state.data;
        }

        const start = (state.currentPage - 1) * state.pageSize;
        const end = start + state.pageSize;
        return state.data.slice(start, end);
    }

    /**
     * Render a single table row
     */
    private static renderTableRow(
        row: DataTableRow,
        index: number,
        columns: DataTableColumn[],
        config: DataTableConfig,
        state: DataTableViewState
    ): string {
        const rowClass = [
            'data-table-body-row',
            row._disabled ? 'data-table-row--disabled' : '',
            row._className || '',
            config.rowClassName ? 
                (typeof config.rowClassName === 'function' ? 
                    config.rowClassName(row, index) : config.rowClassName) : ''
        ].filter(Boolean).join(' ');

        const rowStyle = [
            row._style || '',
            config.rowStyle ? 
                (typeof config.rowStyle === 'function' ? 
                    config.rowStyle(row, index) : config.rowStyle) : ''
        ].filter(Boolean).join('; ');

        const bodyCells = columns.map(column => this.renderBodyCell(row, column, config)).join('');

        return `
            <tr class="${rowClass}" 
                style="${rowStyle}"
                data-row-id="${row.id}"
                data-row-index="${index}">
                ${bodyCells}
            </tr>
            ${config.expandableRows && row._expanded ? 
                this.renderExpandedRow(row, columns.length, config) : ''}
        `;
    }


    /**
     * Render a body cell
     */
    private static renderBodyCell(
        row: DataTableRow, 
        column: DataTableColumn, 
        config: DataTableConfig
    ): string {
        const value = row[column.field];
        const formattedValue = column.format ? column.format(value, row) : value;
        
        const cellClass = [
            'data-table-body-cell',
            column.className ? 
                (typeof column.className === 'function' ? 
                    column.className(value, row) : column.className) : '',
            `data-table-align--${column.align || 'left'}`
        ].filter(Boolean).join(' ');

        const cellStyle = [
            column.width ? `width: ${column.width};` : '',
            column.style ? 
                (typeof column.style === 'function' ? 
                    column.style(value, row) : column.style) : ''
        ].filter(Boolean).join(' ');

        const cellContent = column.cellRenderer ? 
            column.cellRenderer(value, row, column) :
            column.type === 'html' ? 
                String(formattedValue) : 
                this.escapeHtml(String(formattedValue ?? ''));

        return `
            <td class="${cellClass}" 
                style="${cellStyle}"
                data-column-id="${column.id}"
                data-field="${column.field}">
                <div class="data-table-body-content">
                    ${cellContent}
                </div>
            </td>
        `;
    }

    /**
     * Render expanded row content
     */
    private static renderExpandedRow(
        row: DataTableRow, 
        colspan: number, 
        config: DataTableConfig
    ): string {
        const content = config.expandedRowRenderer ? 
            config.expandedRowRenderer(row) : '';

        return `
            <tr class="data-table-expanded-row">
                <td colspan="${colspan}" class="data-table-expanded-cell">
                    <div class="data-table-expanded-content">
                        ${content}
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Render pagination controls
     */
    private static renderPagination(config: DataTableConfig, state: DataTableViewState): string {
        if (!config.paginated && !config.showFooter) {
            return '';
        }
        
        if (!config.paginated) {
            // Always show footer with item count, even without pagination
            const totalItems = state.data.length;
            const hasFilters = Object.keys(state.filters).some(key => state.filters[key]);
            const searchActive = state.searchQuery && state.searchQuery.trim() !== '';
            
            return `
                <div class="data-table-pagination">
                    <div class="page-info">
                        ${hasFilters || searchActive 
                            ? `Showing ${totalItems} filtered items`
                            : `Showing ${totalItems} items`
                        }
                    </div>
                </div>
            `;
        }

        const totalPages = Math.ceil(state.totalRows / state.pageSize);
        const startRow = (state.currentPage - 1) * state.pageSize + 1;
        const endRow = Math.min(state.currentPage * state.pageSize, state.totalRows);

        return `
            <div class="data-table-pagination">
                <div class="data-table-page-info">
                    Showing ${startRow}-${endRow} of ${state.totalRows} rows
                </div>
                
                <div class="data-table-page-size">
                    <label>
                        Rows per page:
                        <select data-component-element="page-size">
                            ${config.pageSizeOptions?.map(size => 
                                `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>
                                    ${size}
                                </option>`
                            ).join('') || ''}
                        </select>
                    </label>
                </div>
                
                <div class="data-table-page-buttons">
                    <button class="data-table-page-button" 
                            data-page="first"
                            ${state.currentPage === 1 ? 'disabled' : ''}>
                        ${ICONS.CHEVRON_LEFT}${ICONS.CHEVRON_LEFT}
                    </button>
                    <button class="data-table-page-button" 
                            data-page="prev"
                            ${state.currentPage === 1 ? 'disabled' : ''}>
                        ${ICONS.CHEVRON_LEFT}
                    </button>
                    
                    <span class="data-table-page-current">
                        Page ${state.currentPage} of ${totalPages}
                    </span>
                    
                    <button class="data-table-page-button" 
                            data-page="next"
                            ${state.currentPage === totalPages ? 'disabled' : ''}>
                        ${ICONS.CHEVRON_RIGHT}
                    </button>
                    <button class="data-table-page-button" 
                            data-page="last"
                            ${state.currentPage === totalPages ? 'disabled' : ''}>
                        ${ICONS.CHEVRON_RIGHT}${ICONS.CHEVRON_RIGHT}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render loading overlay
     */
    private static renderLoadingOverlay(config: DataTableConfig): string {
        return `
            <div class="data-table-loading-overlay" style="display: none;">
                <div class="data-table-loading-content">
                    ${ICONS.LOADING} ${config.loadingMessage || 'Loading...'}
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    private static renderEmptyState(config: DataTableConfig, state: DataTableViewState): string {
        // Only show empty state if there's actually no data and not loading
        const hasData = state.data && state.data.length > 0;
        const isLoading = state.loading;
        
        if (hasData || isLoading) {
            return '';
        }

        return `
            <div class="data-table-empty-state visible">
                ${config.emptyIcon ? `<div class="data-table-empty-icon">${config.emptyIcon}</div>` : ''}
                <div class="data-table-empty-message">
                    ${this.escapeHtml(config.emptyMessage || 'No data available')}
                </div>
                ${config.emptyAction ? `
                    <button class="data-table-empty-action" 
                            data-component-element="empty-action">
                        ${this.escapeHtml(config.emptyAction.label)}
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render context menu (hidden by default)
     */
    private static renderContextMenu(config: DataTableConfig): string {
        if (!config.contextMenu || !config.contextMenuItems) {
            return '';
        }

        return `
            <div class="data-table-context-menu" style="display: none;">
                ${config.contextMenuItems.map(item => 
                    this.renderContextMenuItem(item)
                ).join('')}
            </div>
        `;
    }

    /**
     * Render context menu item
     */
    private static renderContextMenuItem(item: any): string {
        if (item.separator) {
            return '<div class="data-table-context-separator"></div>';
        }

        return `
            <button class="data-table-context-item"
                    data-menu-id="${item.id}"
                    data-component-element="context-item"
                    ${item.disabled ? 'disabled' : ''}>
                ${item.icon ? `<span class="menu-icon">${item.icon}</span>` : ''}
                <span class="menu-label">${this.escapeHtml(item.label)}</span>
            </button>
        `;
    }

    /**
     * Helper method to escape HTML - uses Node.js compatible utility
     */
    private static escapeHtml(text: string): string {
        return escapeHtml(text);
    }

    /**
     * Generate minimal table HTML (for simple use cases)
     */
    static renderSimple(
        id: string,
        columns: DataTableColumn[],
        data: DataTableRow[]
    ): string {
        return `
            <table class="data-table data-table--simple" 
                   data-component-id="${id}"
                   data-component-type="DataTable">
                <thead>
                    <tr>
                        ${columns.map(col => 
                            `<th>${this.escapeHtml(col.label)}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => 
                                `<td>${this.escapeHtml(String(row[col.field] ?? ''))}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}