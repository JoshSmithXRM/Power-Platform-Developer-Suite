import { EmptyTableConfig, EmptyTableColumn, EmptyTableRow } from './EmptyTableConfig';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';

/**
 * EmptyTableView - HTML generation for EmptyTable component
 * This runs in Extension Host context and generates the HTML structure
 * Simplified table for basic data display without advanced features
 */

export interface EmptyTableViewState {
    data: EmptyTableRow[];
    loading: boolean;
    loadingMessage: string;
    error: string | null;
}

export class EmptyTableView {
    /**
     * Main render method - generates complete HTML for the table
     */
    static render(config: EmptyTableConfig, state: EmptyTableViewState): string {
        const {
            id,
            className = '',
            style = '',
            height,
            maxHeight,
            minHeight,
            striped = false,
            bordered = true,
            borderless = false,
            hover = true,
            compact = false,
            responsive = true,
            variant = 'default'
        } = config;

        // Build container classes
        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            'empty-table',
            className,
            striped ? 'empty-table--striped' : '',
            bordered ? 'empty-table--bordered' : '',
            borderless ? 'empty-table--borderless' : '',
            hover ? 'empty-table--hover' : '',
            compact ? 'empty-table--compact' : '',
            responsive ? 'empty-table--responsive' : '',
            variant ? `empty-table--${variant}` : '',
            state.loading ? 'empty-table--loading' : '',
            (!state.data || state.data.length === 0) ? 'empty-table--empty' : '',
            state.error ? 'empty-table--error' : ''
        ].filter(Boolean).join(' ');

        // Build container styles
        const containerStyle = [
            style,
            height ? `height: ${typeof height === 'number' ? height + 'px' : height}` : '',
            maxHeight ? `max-height: ${typeof maxHeight === 'number' ? maxHeight + 'px' : maxHeight}` : '',
            minHeight ? `min-height: ${typeof minHeight === 'number' ? minHeight + 'px' : minHeight}` : ''
        ].filter(Boolean).join('; ');

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="EmptyTable"
                 ${containerStyle ? `style="${containerStyle}"` : ''}>
                
                <div class="empty-table-container">
                    <div class="empty-table-wrapper">
                        ${this.renderTable(config, state)}
                    </div>
                    
                    ${state.loading ? this.renderLoadingOverlay(state.loadingMessage) : ''}
                    ${state.error ? this.renderErrorOverlay(state.error) : ''}
                    ${(!state.data || state.data.length === 0) && !state.loading ? this.renderEmptyState(config) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render the main table structure
     */
    private static renderTable(config: EmptyTableConfig, state: EmptyTableViewState): string {
        const {
            showHeader = true,
            stickyHeader = false,
            columns
        } = config;

        const tableClass = [
            'empty-table-element',
            stickyHeader ? 'empty-table--sticky-header' : ''
        ].filter(Boolean).join(' ');

        return `
            <table class="${tableClass}">
                ${showHeader ? this.renderTableHeader(config, columns) : ''}
                ${this.renderTableBody(config, columns, state)}
            </table>
        `;
    }

    /**
     * Render table header
     */
    private static renderTableHeader(
        config: EmptyTableConfig,
        columns: EmptyTableColumn[]
    ): string {
        return `
            <thead class="empty-table-thead">
                <tr class="empty-table-header-row">
                    ${columns.map(column => this.renderHeaderCell(column, config)).join('')}
                </tr>
            </thead>
        `;
    }

    /**
     * Render individual header cell
     */
    private static renderHeaderCell(
        column: EmptyTableColumn,
        config: EmptyTableConfig
    ): string {
        const {
            id,
            label,
            width,
            align = 'left'
        } = column;

        // Build cell classes
        const cellClass = [
            'empty-table-header-cell',
            align !== 'left' ? `empty-table-header-cell--${align}` : ''
        ].filter(Boolean).join(' ');

        // Build cell styles
        const cellStyle = [
            width ? `width: ${typeof width === 'number' ? width + 'px' : width}` : ''
        ].filter(Boolean).join('; ');

        return `
            <th class="${cellClass}" 
                ${cellStyle ? `style="${cellStyle}"` : ''}
                data-column-id="${id}">
                
                <div class="empty-table-header-content">
                    <span class="empty-table-header-label">
                        ${this.escapeHtml(label)}
                    </span>
                </div>
            </th>
        `;
    }

    /**
     * Render table body
     */
    private static renderTableBody(
        config: EmptyTableConfig,
        columns: EmptyTableColumn[],
        state: EmptyTableViewState
    ): string {
        const data = state.data || [];

        return `
            <tbody class="empty-table-tbody">
                ${data.map((row, index) => this.renderTableRow(row, columns, index, config)).join('')}
                ${state.loading ? this.renderLoadingRows(columns.length, config.loadingRows || 5) : ''}
            </tbody>
        `;
    }

    /**
     * Render individual table row
     */
    private static renderTableRow(
        row: EmptyTableRow,
        columns: EmptyTableColumn[],
        index: number,
        config: EmptyTableConfig
    ): string {
        // Build row classes
        const rowClass = [
            'empty-table-body-row',
            row._className || ''
        ].filter(Boolean).join(' ');

        // Build row styles
        const rowStyle = [
            row._style || '',
            config.rowHeight ? `height: ${typeof config.rowHeight === 'number' ? config.rowHeight + 'px' : config.rowHeight}` : ''
        ].filter(Boolean).join('; ');

        // Apply row class/style functions
        let finalRowClass = rowClass;
        let finalRowStyle = rowStyle;
        
        if (config.rowClassName) {
            const additionalClass = typeof config.rowClassName === 'function' 
                ? config.rowClassName(row, index)
                : config.rowClassName;
            finalRowClass = [rowClass, additionalClass].filter(Boolean).join(' ');
        }
        
        if (config.rowStyle) {
            const additionalStyle = typeof config.rowStyle === 'function'
                ? config.rowStyle(row, index)
                : config.rowStyle;
            finalRowStyle = [rowStyle, additionalStyle].filter(Boolean).join('; ');
        }

        return `
            <tr class="${finalRowClass}" 
                ${finalRowStyle ? `style="${finalRowStyle}"` : ''}
                data-row-id="${row.id}"
                data-row-index="${index}"
                ${config.onRowClick ? 'data-clickable="true"' : ''}>
                
                ${columns.map(column => this.renderTableCell(row, column, config)).join('')}
            </tr>
        `;
    }

    /**
     * Render individual table cell
     */
    private static renderTableCell(
        row: EmptyTableRow,
        column: EmptyTableColumn,
        config: EmptyTableConfig
    ): string {
        const {
            id,
            field,
            type = 'text',
            align = 'left',
            format,
            cellRenderer,
            className,
            style
        } = column;

        // Get the raw value
        const rawValue = row[field];
        
        // Apply formatting
        let displayValue = rawValue;
        if (format && typeof format === 'function') {
            displayValue = format(rawValue, row);
        } else if (cellRenderer && typeof cellRenderer === 'function') {
            displayValue = cellRenderer(rawValue, row, column);
        } else {
            displayValue = this.formatCellValue(rawValue, type);
        }

        // Build cell classes
        let cellClass = [
            'empty-table-body-cell',
            align !== 'left' ? `empty-table-body-cell--${align}` : '',
            type ? `empty-table-body-cell--${type}` : ''
        ].filter(Boolean).join(' ');

        if (className) {
            const additionalClass = typeof className === 'function'
                ? className(rawValue, row)
                : className;
            cellClass = [cellClass, additionalClass].filter(Boolean).join(' ');
        }

        // Build cell styles
        let cellStyle = '';
        if (style) {
            cellStyle = typeof style === 'function'
                ? style(rawValue, row)
                : style;
        }

        return `
            <td class="${cellClass}" 
                ${cellStyle ? `style="${cellStyle}"` : ''}
                data-column-id="${id}"
                data-field="${field}"
                ${config.onCellClick ? 'data-clickable="true"' : ''}>
                
                <div class="empty-table-body-content">
                    ${displayValue !== null && displayValue !== undefined ? displayValue : ''}
                </div>
            </td>
        `;
    }

    /**
     * Render loading skeleton rows
     */
    private static renderLoadingRows(columnCount: number, rowCount: number): string {
        const rows = [];
        for (let i = 0; i < rowCount; i++) {
            const cells = [];
            for (let j = 0; j < columnCount; j++) {
                cells.push(`
                    <td class="empty-table-body-cell empty-table-loading-cell">
                        <div class="empty-table-loading-skeleton"></div>
                    </td>
                `);
            }
            rows.push(`
                <tr class="empty-table-body-row empty-table-loading-row">
                    ${cells.join('')}
                </tr>
            `);
        }
        return rows.join('');
    }

    /**
     * Render loading overlay
     */
    private static renderLoadingOverlay(message: string): string {
        return `
            <div class="empty-table-loading-overlay">
                <div class="empty-table-loading-content">
                    <div class="empty-table-loading-spinner"></div>
                    <div class="empty-table-loading-text">${this.escapeHtml(message)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render error overlay
     */
    private static renderErrorOverlay(error: string): string {
        return `
            <div class="empty-table-error-overlay">
                <div class="empty-table-error-content">
                    <div class="empty-table-error-icon">${ICONS.ERROR}</div>
                    <div class="empty-table-error-text">${this.escapeHtml(error)}</div>
                    <button class="empty-table-error-retry" onclick="this.parentElement.parentElement.style.display='none'">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    private static renderEmptyState(config: EmptyTableConfig): string {
        const {
            emptyMessage = 'No data available',
            emptyIcon,
            emptyAction
        } = config;

        return `
            <div class="empty-table-empty-state">
                ${emptyIcon ? `<div class="empty-table-empty-icon">${emptyIcon}</div>` : ''}
                <div class="empty-table-empty-message">
                    ${this.escapeHtml(emptyMessage)}
                </div>
                ${emptyAction ? `
                    <div class="empty-table-empty-action">
                        <button class="empty-table-empty-action-button" 
                                data-component-element="empty-action">
                            ${this.escapeHtml(emptyAction.label)}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Format cell value based on type
     */
    private static formatCellValue(value: any, type: string): string {
        if (value === null || value === undefined) {
            return '';
        }

        switch (type) {
            case 'number':
                return typeof value === 'number' ? value.toLocaleString() : String(value);
                
            case 'date':
                if (value instanceof Date) {
                    return value.toLocaleDateString();
                } else if (typeof value === 'string' || typeof value === 'number') {
                    const date = new Date(value);
                    return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
                }
                return String(value);
                
            case 'boolean':
                return value ? 'Yes' : 'No';
                
            case 'html':
                return String(value); // Don't escape HTML type
                
            default:
                return this.escapeHtml(String(value));
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate a simple table structure (for ComponentFactory compatibility)
     */
    static generateSimpleTable(
        id: string,
        columns: EmptyTableColumn[],
        data: EmptyTableRow[] = [],
        options: Partial<EmptyTableConfig> = {}
    ): string {
        const config: EmptyTableConfig = {
            id,
            columns,
            data,
            ...options
        };
        
        const state: EmptyTableViewState = {
            data,
            loading: false,
            loadingMessage: 'Loading...',
            error: null
        };
        
        return this.render(config, state);
    }
}
