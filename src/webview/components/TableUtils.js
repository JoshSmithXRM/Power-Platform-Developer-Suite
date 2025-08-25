/**
 * Table utilities for enhanced data tables
 * Supports sorting, filtering, selection, and actions
 */

class TableUtils {
    static tables = new Map();
    
    /**
     * Initialize table with configuration
     */
    static initializeTable(tableId, config = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tableConfig = {
            id: tableId,
            sortColumn: null,
            sortDirection: 'asc',
            originalData: [],
            filteredData: [],
            selectedRows: new Set(),
            ...config
        };
        
        this.tables.set(tableId, tableConfig);
        
        // Initialize sorting if enabled
        if (table.classList.contains('sortable-table')) {
            this.initializeSorting(tableId);
        }
        
        // Initialize filtering if enabled
        if (table.classList.contains('filterable-table')) {
            this.initializeFiltering(tableId);
        }
        
        // Initialize selection if enabled
        if (table.classList.contains('selectable-table')) {
            this.initializeSelection(tableId);
        }
        
        // Initialize context menu if configured
        const contextMenuItems = JSON.parse(table.dataset.contextMenu || '[]');
        if (contextMenuItems.length > 0) {
            this.initializeContextMenu(tableId);
        }
        
        // Apply default sort if specified
        const defaultSort = JSON.parse(table.dataset.defaultSort || '{}');
        if (defaultSort.column) {
            this.sortTable(tableId, defaultSort.column, defaultSort.direction || 'asc');
        }
    }
    
    /**
     * Initialize table sorting functionality
     */
    static initializeSorting(tableId) {
        const table = document.getElementById(tableId);
        const headers = table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                const config = this.tables.get(tableId);
                
                let direction = 'asc';
                if (config.sortColumn === column && config.sortDirection === 'asc') {
                    direction = 'desc';
                }
                
                this.sortTable(tableId, column, direction);
            });
        });
    }
    
    /**
     * Initialize filtering functionality
     */
    static initializeFiltering(tableId) {
        const filterInput = document.getElementById(`${tableId}_filter`);
        if (!filterInput) return;
        
        filterInput.addEventListener('input', (e) => {
            this.filterTable(tableId, e.target.value);
        });
    }
    
    /**
     * Initialize selection functionality
     */
    static initializeSelection(tableId) {
        const table = document.getElementById(tableId);
        const selectAllCheckbox = document.getElementById(`${tableId}_selectAll`);
        
        // Handle row clicks for selection
        table.addEventListener('click', (e) => {
            const checkbox = e.target.closest('input[type="checkbox"]');
            if (checkbox && checkbox !== selectAllCheckbox) {
                this.handleRowSelection(tableId, checkbox);
            }
        });
        
        // Handle context menu
        table.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.rowId) {
                this.showContextMenu(tableId, e, row);
            }
        });
    }
    
    /**
     * Initialize context menu functionality
     */
    static initializeContextMenu(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        // Handle context menu
        table.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.rowId) {
                this.showContextMenu(tableId, e, row);
            }
        });
    }
    
    /**
     * Sort table by column
     */
    static sortTable(tableId, column, direction = 'asc') {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        config.sortColumn = column;
        config.sortDirection = direction;
        
        // Update sort indicators
        const table = document.getElementById(tableId);
        const headers = table.querySelectorAll('th.sortable');
        headers.forEach(header => {
            const indicator = header.querySelector('.sort-indicator');
            if (header.dataset.column === column) {
                indicator.className = `sort-indicator sort-${direction}`;
            } else {
                indicator.className = 'sort-indicator';
            }
        });
        
        // Sort the data
        config.filteredData.sort((a, b) => {
            const aVal = this.getCellValue(a, column);
            const bVal = this.getCellValue(b, column);
            
            const result = this.compareValues(aVal, bVal);
            return direction === 'asc' ? result : -result;
        });
        
        this.renderTableData(tableId);
    }
    
    /**
     * Filter table data
     */
    static filterTable(tableId, filterText) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const searchTerm = filterText.toLowerCase().trim();
        
        if (!searchTerm) {
            config.filteredData = [...config.originalData];
        } else {
            config.filteredData = config.originalData.filter(row => {
                return Object.values(row).some(value => {
                    return String(value).toLowerCase().includes(searchTerm);
                });
            });
        }
        
        // Re-apply sorting if active
        if (config.sortColumn) {
            this.sortTable(tableId, config.sortColumn, config.sortDirection);
        } else {
            this.renderTableData(tableId);
        }
    }
    
    /**
     * Clear table filter
     */
    static clearTableFilter(tableId) {
        const filterInput = document.getElementById(`${tableId}_filter`);
        if (filterInput) {
            filterInput.value = '';
            this.filterTable(tableId, '');
        }
    }
    
    /**
     * Handle row selection
     */
    static handleRowSelection(tableId, checkbox) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const rowId = checkbox.closest('tr').dataset.rowId;
        
        if (checkbox.checked) {
            config.selectedRows.add(rowId);
        } else {
            config.selectedRows.delete(rowId);
        }
        
        this.updateBulkActions(tableId);
        this.updateSelectAllCheckbox(tableId);
    }
    
    /**
     * Handle select all checkbox
     */
    static handleSelectAll(tableId, checked) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const table = document.getElementById(tableId);
        const rowCheckboxes = table.querySelectorAll('tbody input[type="checkbox"]');
        
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const rowId = checkbox.closest('tr').dataset.rowId;
            
            if (checked) {
                config.selectedRows.add(rowId);
            } else {
                config.selectedRows.delete(rowId);
            }
        });
        
        this.updateBulkActions(tableId);
    }
    
    /**
     * Update bulk actions visibility and state
     */
    static updateBulkActions(tableId) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const bulkActions = document.getElementById(`${tableId}_bulkActions`);
        if (!bulkActions) return;
        
        const hasSelection = config.selectedRows.size > 0;
        bulkActions.style.display = hasSelection ? 'block' : 'none';
        
        // Enable/disable buttons based on selection
        const buttons = bulkActions.querySelectorAll('button[data-requires-selection="true"]');
        buttons.forEach(button => {
            button.disabled = !hasSelection;
        });
    }
    
    /**
     * Update select all checkbox state
     */
    static updateSelectAllCheckbox(tableId) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const selectAllCheckbox = document.getElementById(`${tableId}_selectAll`);
        if (!selectAllCheckbox) return;
        
        const table = document.getElementById(tableId);
        const totalRows = table.querySelectorAll('tbody tr').length;
        const selectedCount = config.selectedRows.size;
        
        selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalRows;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalRows;
    }
    
    /**
     * Show context menu for row
     */
    static showContextMenu(tableId, event, row) {
        event.preventDefault();
        
        const table = document.getElementById(tableId);
        const contextMenuItems = JSON.parse(table.dataset.contextMenu || '[]');
        
        if (contextMenuItems.length === 0) return;
        
        // Remove existing context menu
        this.hideContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.zIndex = '1000';
        
        contextMenuItems.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.textContent = item.label;
                menuItem.onclick = () => {
                    this.hideContextMenu();
                    this.handleRowAction(tableId, item.action, row.dataset.rowId);
                };
                menu.appendChild(menuItem);
            }
        });
        
        document.body.appendChild(menu);
        
        // Hide menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu, { once: true });
        }, 0);
    }
    
    /**
     * Hide context menu
     */
    static hideContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }
    
    /**
     * Handle row action
     */
    static handleRowAction(tableId, action, rowId) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const rowData = config.originalData.find(row => String(row.id) === String(rowId));
        
        // Call custom callback if provided
        if (config.onRowAction && typeof config.onRowAction === 'function') {
            config.onRowAction(action, rowData);
            return;
        }
        
        // Send message to extension (default behavior)
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'tableRowAction',
                tableId: tableId,
                action: action,
                rowId: rowId,
                rowData: rowData
            });
        }
    }
    
    /**
     * Handle bulk action
     */
    static handleBulkAction(tableId, action, actionId) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const selectedRowIds = Array.from(config.selectedRows);
        const selectedData = config.originalData.filter(row => 
            selectedRowIds.includes(String(row.id))
        );
        
        // Send message to extension
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'tableBulkAction',
                tableId: tableId,
                action: action,
                actionId: actionId,
                selectedRowIds: selectedRowIds,
                selectedData: selectedData
            });
        }
    }
    
    /**
     * Load data into table
     */
    static loadTableData(tableId, data) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        config.originalData = data;
        config.filteredData = [...data];
        config.selectedRows.clear();
        
        // Apply current filter if any
        const filterInput = document.getElementById(`${tableId}_filter`);
        if (filterInput && filterInput.value.trim()) {
            this.filterTable(tableId, filterInput.value);
        } else {
            this.renderTableData(tableId);
        }
    }
    
    /**
     * Render table data
     */
    static renderTableData(tableId) {
        const config = this.tables.get(tableId);
        if (!config) return;
        
        const tbody = document.getElementById(`${tableId}Body`);
        const table = document.getElementById(tableId);
        
        if (!tbody || !table) return;
        
        const rowActions = JSON.parse(table.dataset.rowActions || '[]');
        const isSelectable = table.classList.contains('selectable-table');
        
        tbody.innerHTML = config.filteredData.map(row => {
            const rowId = row.id || row._id || Math.random().toString(36);
            
            // Selection column
            const selectionCell = isSelectable ? 
                `<td class="selection-cell">
                    <input type="checkbox" ${config.selectedRows.has(String(rowId)) ? 'checked' : ''}>
                </td>` : '';
            
            // Data columns
            const dataCells = this.getTableColumns(tableId).map(column => {
                const value = this.getCellValue(row, column.key);
                const formattedValue = this.formatCellValue(value, column);
                return `<td class="${column.className || ''}">${formattedValue}</td>`;
            }).join('');
            
            // Action column
            const actionCell = rowActions.length > 0 ? 
                `<td class="actions-cell">
                    ${rowActions.map(action => `
                        <button onclick="TableUtils.handleRowAction('${tableId}', '${action.action}', '${rowId}')" 
                                class="action-btn ${action.className || ''}"
                                title="${action.label}">
                            ${action.icon || action.label}
                        </button>
                    `).join('')}
                </td>` : '';
            
            return `<tr data-row-id="${rowId}">${selectionCell}${dataCells}${actionCell}</tr>`;
        }).join('');
        
        this.updateBulkActions(tableId);
        this.updateSelectAllCheckbox(tableId);
    }
    
    /**
     * Get table columns configuration
     */
    static getTableColumns(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return [];
        
        return Array.from(table.querySelectorAll('th[data-column]')).map(th => ({
            key: th.dataset.column,
            label: th.textContent.trim(),
            className: th.className,
            sortable: th.classList.contains('sortable')
        }));
    }
    
    /**
     * Get cell value from row data
     */
    static getCellValue(row, column) {
        if (column.includes('.')) {
            return column.split('.').reduce((obj, key) => obj?.[key], row);
        }
        return row[column];
    }
    
    /**
     * Format cell value for display
     */
    static formatCellValue(value, column) {
        if (value == null) return '';
        
        // Auto-detect data type and format accordingly
        if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
            const date = value instanceof Date ? value : new Date(value);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return value.toLocaleString();
            } else {
                return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
        }
        
        return String(value);
    }
    
    /**
     * Compare values for sorting
     */
    static compareValues(a, b) {
        // Handle null/undefined
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        
        // Try to detect and compare as numbers
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        
        // Try to detect and compare as dates
        const dateA = new Date(a);
        const dateB = new Date(b);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateA.getTime() - dateB.getTime();
        }
        
        // Compare as strings
        return String(a).localeCompare(String(b));
    }
}

// Global functions for HTML onclick handlers
function clearTableFilter(tableId) {
    TableUtils.clearTableFilter(tableId);
}

function handleSelectAll(tableId, checked) {
    TableUtils.handleSelectAll(tableId, checked);
}

function handleBulkAction(tableId, action, actionId) {
    TableUtils.handleBulkAction(tableId, action, actionId);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableUtils;
}
