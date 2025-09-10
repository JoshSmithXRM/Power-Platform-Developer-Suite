import { DataTableConfig, DataTableColumn, DataTableRow, DataTableAction } from './DataTableConfig';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';

/**
 * DataTableView - HTML generation for DataTable component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface DataTableViewState {
    data: DataTableRow[];
    selectedRows: Array<string | number>;
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
    /**
     * Render the complete HTML for the DataTable component
     */
    static render(config: DataTableConfig, state: DataTableViewState): string {
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
        const hasToolbar = config.searchable || config.exportable || config.showColumnChooser;
        
        if (!hasToolbar) {
            return '';
        }

        return `
            <div class="data-table-toolbar">
                ${config.searchable ? this.renderSearch(config) : ''}
                
                <div class="data-table-toolbar-actions">
                    ${config.showColumnChooser ? this.renderColumnChooser(config, state) : ''}
                    ${config.exportable ? this.renderExportButtons(config) : ''}
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
     * Render export buttons
     */
    private static renderExportButtons(config: DataTableConfig): string {
        const formats = config.exportFormats || ['csv', 'excel', 'json'];
        
        return `
            <div class="data-table-export">
                <button class="data-table-export-toggle" 
                        data-component-element="export">
                    ${ICONS.DOWNLOAD} Export
                </button>
                <div class="data-table-export-menu" style="display: none;">
                    ${formats.map(format => `
                        <button class="data-table-export-item" 
                                data-export-format="${format}">
                            Export as ${format.toUpperCase()}
                        </button>
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
        const hasCheckbox = Boolean(config.selectable && config.showCheckboxes);
        const hasActions = Boolean(config.actions && config.actions.length > 0);

        return `
            <thead class="data-table-thead">
                <tr class="data-table-header-row">
                    ${hasCheckbox ? this.renderCheckboxHeader(config, state) : ''}
                    
                    ${columns.map(column => this.renderHeaderCell(column, config, state)).join('')}
                    
                    ${hasActions ? this.renderActionsHeader(config) : ''}
                </tr>
                
                ${config.filterable && config.showFilterRow ? 
                    this.renderFilterRow(config, columns, hasCheckbox, hasActions) : ''}
            </thead>
        `;
    }

    /**
     * Render checkbox header for select all
     */
    private static renderCheckboxHeader(config: DataTableConfig, state: DataTableViewState): string {
        const allSelected = state.data.length > 0 && 
                           state.data.every(row => state.selectedRows.includes(row.id));
        const someSelected = state.data.some(row => state.selectedRows.includes(row.id));

        return `
            <th class="data-table-header-cell data-table-checkbox-cell">
                <input type="checkbox" 
                       class="data-table-checkbox data-table-checkbox-all"
                       ${allSelected ? 'checked' : ''}
                       ${someSelected && !allSelected ? 'indeterminate' : ''}
                       data-component-element="select-all">
            </th>
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
        
        const cellClass = [
            'data-table-header-cell',
            sortable ? 'data-table-sortable' : '',
            sortConfig ? `data-table-sorted--${sortConfig.direction}` : '',
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
                ${sortable ? 'data-sortable="true"' : ''}>
                
                <div class="data-table-header-content">
                    <span class="data-table-header-label">
                        ${column.headerRenderer ? 
                            column.headerRenderer(column) : 
                            this.escapeHtml(column.label)}
                    </span>
                    
                    ${sortable ? this.renderSortIndicator(column, sortConfig) : ''}
                    
                    ${config.columnResizable && column.resizable !== false ? 
                        '<span class="data-table-header-resize" data-component-element="resize"></span>' : ''}
                </div>
                
                ${config.filterable && config.filterMode === 'menu' && column.filterable !== false ?
                    this.renderFilterMenu(column, state) : ''}
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
        const icon = sortConfig?.direction === 'asc' ? ICONS.CHEVRON_UP : 
                    sortConfig?.direction === 'desc' ? ICONS.CHEVRON_DOWN : '';
        
        return `
            <span class="data-table-header-sort" data-component-element="sort">
                ${icon}
            </span>
        `;
    }

    /**
     * Render filter menu for a column
     */
    private static renderFilterMenu(column: DataTableColumn, state: DataTableViewState): string {
        return `
            <button class="data-table-header-filter" 
                    data-component-element="filter"
                    data-column-id="${column.id}">
                ${ICONS.FILTER}
            </button>
        `;
    }

    /**
     * Render actions header
     */
    private static renderActionsHeader(config: DataTableConfig): string {
        return `
            <th class="data-table-header-cell data-table-actions-cell">
                ${config.actionsLabel || 'Actions'}
            </th>
        `;
    }

    /**
     * Render filter row
     */
    private static renderFilterRow(
        config: DataTableConfig, 
        columns: DataTableColumn[],
        hasCheckbox: boolean,
        hasActions: boolean
    ): string {
        return `
            <tr class="data-table-filter-row">
                ${hasCheckbox ? '<td class="data-table-filter-cell"></td>' : ''}
                
                ${columns.map(column => `
                    <td class="data-table-filter-cell">
                        ${column.filterable !== false ? 
                            this.renderFilterInput(column) : ''}
                    </td>
                `).join('')}
                
                ${hasActions ? '<td class="data-table-filter-cell"></td>' : ''}
            </tr>
        `;
    }

    /**
     * Render filter input for a column
     */
    private static renderFilterInput(column: DataTableColumn): string {
        const filterType = column.filterType || 'text';
        
        switch (filterType) {
            case 'select':
            case 'multiselect':
                return `
                    <select class="data-table-filter-input" 
                            data-column-id="${column.id}"
                            ${filterType === 'multiselect' ? 'multiple' : ''}>
                        <option value="">All</option>
                        ${column.filterOptions?.map(option => 
                            `<option value="${this.escapeHtml(String(option.value))}">
                                ${this.escapeHtml(option.label)}
                            </option>`
                        ).join('') || ''}
                    </select>
                `;
            
            case 'boolean':
                return `
                    <select class="data-table-filter-input" data-column-id="${column.id}">
                        <option value="">All</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                `;
            
            default:
                return `
                    <input type="${filterType === 'number' ? 'number' : 'text'}" 
                           class="data-table-filter-input"
                           data-column-id="${column.id}"
                           placeholder="${this.escapeHtml(column.filterPlaceholder || 'Filter...')}">
                `;
        }
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
        const isSelected = state.selectedRows.includes(row.id);
        const hasCheckbox = Boolean(config.selectable && config.showCheckboxes);
        const hasActions = Boolean(config.actions && config.actions.length > 0);

        const rowClass = [
            'data-table-body-row',
            isSelected ? 'data-table-row--selected' : '',
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

        return `
            <tr class="${rowClass}" 
                style="${rowStyle}"
                data-row-id="${row.id}"
                data-row-index="${index}">
                
                ${hasCheckbox ? this.renderCheckboxCell(row, isSelected, config) : ''}
                
                ${columns.map(column => 
                    this.renderBodyCell(row, column, config)
                ).join('')}
                
                ${hasActions ? this.renderActionsCell(row, config, state) : ''}
            </tr>
            
            ${config.expandableRows && row._expanded ? 
                this.renderExpandedRow(row, columns.length + (hasCheckbox ? 1 : 0) + (hasActions ? 1 : 0), config) : ''}
        `;
    }

    /**
     * Render checkbox cell
     */
    private static renderCheckboxCell(row: DataTableRow, isSelected: boolean, config: DataTableConfig): string {
        return `
            <td class="data-table-body-cell data-table-checkbox-cell">
                <input type="checkbox" 
                       class="data-table-checkbox"
                       data-row-id="${row.id}"
                       ${isSelected ? 'checked' : ''}
                       ${row._disabled ? 'disabled' : ''}
                       data-component-element="select-row">
            </td>
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
     * Render actions cell
     */
    private static renderActionsCell(
        row: DataTableRow, 
        config: DataTableConfig, 
        state: DataTableViewState
    ): string {
        const actions = config.actions || [];
        const visibleActions = actions.filter(action => {
            if (typeof action.visible === 'function') {
                return action.visible(row);
            }
            return action.visible !== false;
        });

        if (visibleActions.length === 0) {
            return '<td class="data-table-body-cell data-table-actions-cell"></td>';
        }

        if (visibleActions.length === 1) {
            // Single action - show as button
            const action = visibleActions[0];
            return `
                <td class="data-table-body-cell data-table-actions-cell">
                    ${this.renderActionButton(action, row)}
                </td>
            `;
        }

        // Multiple actions - show as dropdown
        return `
            <td class="data-table-body-cell data-table-actions-cell">
                <div class="data-table-actions-menu">
                    <button class="data-table-actions-toggle" 
                            data-row-id="${row.id}"
                            data-component-element="actions-toggle">
                        ${ICONS.MORE_HORIZONTAL}
                    </button>
                    <div class="data-table-actions-dropdown" style="display: none;">
                        ${visibleActions.map(action => 
                            this.renderActionMenuItem(action, row)
                        ).join('')}
                    </div>
                </div>
            </td>
        `;
    }

    /**
     * Render single action button
     */
    private static renderActionButton(action: DataTableAction, row: DataTableRow): string {
        const isDisabled = typeof action.disabled === 'function' ? 
            action.disabled(row) : action.disabled;

        const buttonClass = [
            'data-table-action-button',
            action.variant ? `data-table-action--${action.variant}` : ''
        ].filter(Boolean).join(' ');

        return `
            <button class="${buttonClass}"
                    data-action-id="${action.id}"
                    data-row-id="${row.id}"
                    data-component-element="action"
                    title="${this.escapeHtml(action.tooltip || action.label)}"
                    ${isDisabled ? 'disabled' : ''}>
                ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                <span class="action-label">${this.escapeHtml(action.label)}</span>
            </button>
        `;
    }

    /**
     * Render action menu item
     */
    private static renderActionMenuItem(action: DataTableAction, row: DataTableRow): string {
        const isDisabled = typeof action.disabled === 'function' ? 
            action.disabled(row) : action.disabled;

        return `
            <button class="data-table-action-item"
                    data-action-id="${action.id}"
                    data-row-id="${row.id}"
                    data-component-element="action"
                    ${isDisabled ? 'disabled' : ''}>
                ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                <span class="action-label">${this.escapeHtml(action.label)}</span>
            </button>
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