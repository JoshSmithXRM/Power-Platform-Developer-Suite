/**
 * DataTableBehavior.js - Webview-side behavior for DataTable components
 * Handles user interactions, DOM manipulation, and communication with Extension Host
 * Supports multi-instance tables with independent event handling
 */

class DataTableBehavior {
    constructor(tableId) {
        this.tableId = tableId;
        this.table = document.getElementById(tableId);
        this.container = this.table?.closest('.data-table');
        this.initialized = false;
        this.sortHandlers = new Map();
        this.filterHandlers = new Map();
        this.actionHandlers = new Map();
        
        if (!this.table) {
            console.error(`DataTable with ID '${tableId}' not found`);
            return;
        }
        
        this.init();
    }
    
    /**
     * Initialize table behavior
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.setupSorting();
            this.setupFiltering();
            this.setupSelection();
            this.setupRowActions();
            this.setupContextMenu();
            this.setupPagination();
            this.setupSearch();
            this.setupColumnResize();
            this.setupRowExpansion();
            this.setupExport();
            
            this.initialized = true;
            this.notifyReady();
        } catch (error) {
            console.error(`Failed to initialize DataTable '${this.tableId}':`, error);
        }
    }
    
    /**
     * Setup column sorting
     */
    setupSorting() {
        const headers = this.table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            const columnId = header.dataset.columnId;
            if (!columnId) return;
            
            const sortButton = header.querySelector('.sort-button');
            if (!sortButton) return;
            
            const handler = (event) => {
                event.preventDefault();
                
                // Determine new sort direction
                const currentDirection = header.dataset.sortDirection;
                let newDirection;
                
                if (event.ctrlKey || event.metaKey) {
                    // Multi-sort mode
                    if (currentDirection === 'asc') {
                        newDirection = 'desc';
                    } else if (currentDirection === 'desc') {
                        newDirection = null; // Remove sort
                    } else {
                        newDirection = 'asc';
                    }
                } else {
                    // Single sort mode
                    newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
                }
                
                this.sort(columnId, newDirection, event.ctrlKey || event.metaKey);
            };
            
            sortButton.addEventListener('click', handler);
            this.sortHandlers.set(columnId, handler);
        });
    }
    
    /**
     * Setup column filtering
     */
    setupFiltering() {
        const filterInputs = this.table.querySelectorAll('.filter-input');
        
        filterInputs.forEach(input => {
            const columnId = input.dataset.columnId;
            if (!columnId) return;
            
            let timeoutId;
            const handler = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    this.filter(columnId, input.value);
                }, 300); // Debounce filter input
            };
            
            input.addEventListener('input', handler);
            input.addEventListener('change', () => {
                clearTimeout(timeoutId);
                this.filter(columnId, input.value);
            });
            
            this.filterHandlers.set(columnId, handler);
        });
        
        // Setup filter dropdowns
        const filterSelects = this.table.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            const columnId = select.dataset.columnId;
            if (!columnId) return;
            
            select.addEventListener('change', () => {
                this.filter(columnId, select.value);
            });
        });
    }
    
    /**
     * Setup row selection
     */
    setupSelection() {
        // Header checkbox for select all
        const headerCheckbox = this.table.querySelector('th .select-all-checkbox');
        if (headerCheckbox) {
            headerCheckbox.addEventListener('change', () => {
                this.selectAll(headerCheckbox.checked);
            });
        }
        
        // Row checkboxes
        const rowCheckboxes = this.table.querySelectorAll('tbody .row-checkbox');
        rowCheckboxes.forEach(checkbox => {
            const rowId = checkbox.dataset.rowId;
            if (!rowId) return;
            
            checkbox.addEventListener('change', () => {
                this.selectRow(rowId, checkbox.checked);
            });
        });
        
        // Row click selection (if enabled)
        const selectableRows = this.table.querySelectorAll('tbody tr[data-selectable="true"]');
        selectableRows.forEach(row => {
            const rowId = row.dataset.rowId;
            if (!rowId) return;
            
            row.addEventListener('click', (event) => {
                // Don't trigger on checkbox, button, or link clicks
                if (event.target.closest('input, button, a')) return;
                
                const checkbox = row.querySelector('.row-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.selectRow(rowId, checkbox.checked);
                }
            });
        });
    }
    
    /**
     * Setup row actions
     */
    setupRowActions() {
        const actionButtons = this.table.querySelectorAll('.action-button');
        
        actionButtons.forEach(button => {
            const actionId = button.dataset.actionId;
            const rowId = button.dataset.rowId;
            if (!actionId || !rowId) return;
            
            const handler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Check if action requires confirmation
                const confirmMessage = button.dataset.confirmMessage;
                if (confirmMessage && !confirm(confirmMessage)) {
                    return;
                }
                
                this.executeAction(actionId, rowId);
            };
            
            button.addEventListener('click', handler);
            this.actionHandlers.set(`${actionId}-${rowId}`, handler);
        });
        
        // Setup action dropdown menus
        const actionDropdowns = this.table.querySelectorAll('.actions-dropdown');
        actionDropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (!trigger || !menu) return;
            
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Close other open dropdowns
                this.closeAllDropdowns();
                
                // Toggle this dropdown
                dropdown.classList.toggle('open');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (event) => {
                if (!dropdown.contains(event.target)) {
                    dropdown.classList.remove('open');
                }
            });
        });
    }
    
    /**
     * Setup context menu
     */
    setupContextMenu() {
        const contextRows = this.table.querySelectorAll('tbody tr[data-context-menu="true"]');
        
        contextRows.forEach(row => {
            const rowId = row.dataset.rowId;
            if (!rowId) return;
            
            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                this.showContextMenu(event, rowId);
            });
        });
    }
    
    /**
     * Setup pagination controls
     */
    setupPagination() {
        const pagination = this.container?.querySelector('.data-table-pagination');
        if (!pagination) return;
        
        // Page size selector
        const pageSizeSelect = pagination.querySelector('.page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => {
                this.setPageSize(parseInt(pageSizeSelect.value));
            });
        }
        
        // Page buttons
        const pageButtons = pagination.querySelectorAll('.page-button');
        pageButtons.forEach(button => {
            const page = button.dataset.page;
            if (!page) return;
            
            button.addEventListener('click', () => {
                if (page === 'prev') {
                    this.previousPage();
                } else if (page === 'next') {
                    this.nextPage();
                } else {
                    this.setPage(parseInt(page));
                }
            });
        });
        
        // Direct page input
        const pageInput = pagination.querySelector('.page-input');
        if (pageInput) {
            pageInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const page = parseInt(pageInput.value);
                    if (page && page > 0) {
                        this.setPage(page);
                    }
                }
            });
        }
    }
    
    /**
     * Setup search functionality
     */
    setupSearch() {
        const searchInput = this.container?.querySelector('.search-input');
        if (!searchInput) return;
        
        let timeoutId;
        const handler = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.search(searchInput.value);
            }, 300);
        };
        
        searchInput.addEventListener('input', handler);
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                clearTimeout(timeoutId);
                this.search(searchInput.value);
            }
        });
    }
    
    /**
     * Setup column resizing
     */
    setupColumnResize() {
        const resizeHandles = this.table.querySelectorAll('.column-resize-handle');
        
        resizeHandles.forEach(handle => {
            const columnId = handle.dataset.columnId;
            if (!columnId) return;
            
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;
            
            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                
                isResizing = true;
                startX = event.clientX;
                
                const header = handle.closest('th');
                startWidth = header ? header.offsetWidth : 0;
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });
            
            document.addEventListener('mousemove', (event) => {
                if (!isResizing) return;
                
                const diff = event.clientX - startX;
                const newWidth = startWidth + diff;
                
                if (newWidth > 30) { // Minimum column width
                    this.resizeColumn(columnId, newWidth);
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        });
    }
    
    /**
     * Setup row expansion
     */
    setupRowExpansion() {
        const expandButtons = this.table.querySelectorAll('.expand-button');
        
        expandButtons.forEach(button => {
            const rowId = button.dataset.rowId;
            if (!rowId) return;
            
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                this.toggleRowExpansion(rowId);
            });
        });
    }
    
    /**
     * Setup export functionality
     */
    setupExport() {
        const exportButtons = this.container?.querySelectorAll('.export-button');
        if (!exportButtons) return;
        
        exportButtons.forEach(button => {
            const format = button.dataset.format;
            if (!format) return;
            
            button.addEventListener('click', () => {
                this.exportData(format);
            });
        });
    }
    
    /**
     * Sort table by column
     */
    sort(columnId, direction, multiSort = false) {
        this.postMessage({
            type: 'dataTable.sort',
            tableId: this.tableId,
            columnId,
            direction,
            multiSort
        });
    }
    
    /**
     * Filter table by column
     */
    filter(columnId, value) {
        this.postMessage({
            type: 'dataTable.filter',
            tableId: this.tableId,
            columnId,
            value
        });
    }
    
    /**
     * Search table
     */
    search(query) {
        this.postMessage({
            type: 'dataTable.search',
            tableId: this.tableId,
            query
        });
    }
    
    /**
     * Select/deselect row
     */
    selectRow(rowId, selected) {
        this.postMessage({
            type: 'dataTable.selectRow',
            tableId: this.tableId,
            rowId,
            selected
        });
    }
    
    /**
     * Select all rows
     */
    selectAll(selected) {
        this.postMessage({
            type: 'dataTable.selectAll',
            tableId: this.tableId,
            selected
        });
    }
    
    /**
     * Execute row action
     */
    executeAction(actionId, rowId) {
        this.postMessage({
            type: 'dataTable.action',
            tableId: this.tableId,
            actionId,
            rowId
        });
    }
    
    /**
     * Set current page
     */
    setPage(page) {
        this.postMessage({
            type: 'dataTable.setPage',
            tableId: this.tableId,
            page
        });
    }
    
    /**
     * Go to previous page
     */
    previousPage() {
        this.postMessage({
            type: 'dataTable.previousPage',
            tableId: this.tableId
        });
    }
    
    /**
     * Go to next page
     */
    nextPage() {
        this.postMessage({
            type: 'dataTable.nextPage',
            tableId: this.tableId
        });
    }
    
    /**
     * Set page size
     */
    setPageSize(size) {
        this.postMessage({
            type: 'dataTable.setPageSize',
            tableId: this.tableId,
            size
        });
    }
    
    /**
     * Toggle row expansion
     */
    toggleRowExpansion(rowId) {
        this.postMessage({
            type: 'dataTable.toggleExpansion',
            tableId: this.tableId,
            rowId
        });
    }
    
    /**
     * Resize column
     */
    resizeColumn(columnId, width) {
        // Update column width immediately for smooth UX
        const header = this.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (header) {
            header.style.width = `${width}px`;
        }
        
        // Notify extension host
        this.postMessage({
            type: 'dataTable.resizeColumn',
            tableId: this.tableId,
            columnId,
            width
        });
    }
    
    /**
     * Show context menu
     */
    showContextMenu(event, rowId) {
        this.postMessage({
            type: 'dataTable.contextMenu',
            tableId: this.tableId,
            rowId,
            x: event.clientX,
            y: event.clientY
        });
    }
    
    /**
     * Export data
     */
    exportData(format) {
        this.postMessage({
            type: 'dataTable.export',
            tableId: this.tableId,
            format
        });
    }
    
    /**
     * Close all dropdown menus
     */
    closeAllDropdowns() {
        const openDropdowns = this.table.querySelectorAll('.actions-dropdown.open');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
    
    /**
     * Update table state from extension host
     */
    updateState(state) {
        try {
            this.updateSelection(state.selectedRows || []);
            this.updateSortIndicators(state.sortConfig || []);
            this.updatePagination(state);
            this.updateLoadingState(state.loading, state.loadingMessage);
            this.updateErrorState(state.error);
        } catch (error) {
            console.error('Failed to update DataTable state:', error);
        }
    }
    
    /**
     * Update row selection state
     */
    updateSelection(selectedRows) {
        const checkboxes = this.table.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            const rowId = checkbox.dataset.rowId;
            checkbox.checked = selectedRows.includes(rowId);
            
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.toggle('selected', checkbox.checked);
            }
        });
        
        // Update select all checkbox
        const selectAllCheckbox = this.table.querySelector('.select-all-checkbox');
        if (selectAllCheckbox) {
            const totalCheckboxes = checkboxes.length;
            const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked).length;
            
            selectAllCheckbox.checked = selectedCheckboxes === totalCheckboxes && totalCheckboxes > 0;
            selectAllCheckbox.indeterminate = selectedCheckboxes > 0 && selectedCheckboxes < totalCheckboxes;
        }
    }
    
    /**
     * Update sort indicators
     */
    updateSortIndicators(sortConfig) {
        // Clear all sort indicators
        const sortableHeaders = this.table.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
            header.removeAttribute('data-sort-direction');
            
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.className = 'sort-icon';
            }
        });
        
        // Apply current sort indicators
        sortConfig.forEach((sort, index) => {
            const header = this.table.querySelector(`th[data-column-id="${sort.column}"]`);
            if (!header) return;
            
            header.classList.add(`sorted-${sort.direction}`);
            header.setAttribute('data-sort-direction', sort.direction);
            
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.className = `sort-icon sort-${sort.direction}`;
                if (sortConfig.length > 1) {
                    sortIcon.setAttribute('data-sort-order', index + 1);
                }
            }
        });
    }
    
    /**
     * Update pagination display
     */
    updatePagination(state) {
        const pagination = this.container?.querySelector('.data-table-pagination');
        if (!pagination || !state.paginated) return;
        
        const { currentPage, pageSize, totalRows } = state;
        const totalPages = Math.ceil(totalRows / pageSize);
        
        // Update page info
        const pageInfo = pagination.querySelector('.page-info');
        if (pageInfo) {
            const start = (currentPage - 1) * pageSize + 1;
            const end = Math.min(currentPage * pageSize, totalRows);
            pageInfo.textContent = `Showing ${start}-${end} of ${totalRows} rows`;
        }
        
        // Update page buttons
        const prevButton = pagination.querySelector('.page-button[data-page="prev"]');
        if (prevButton) {
            prevButton.disabled = currentPage <= 1;
        }
        
        const nextButton = pagination.querySelector('.page-button[data-page="next"]');
        if (nextButton) {
            nextButton.disabled = currentPage >= totalPages;
        }
        
        // Update page input
        const pageInput = pagination.querySelector('.page-input');
        if (pageInput) {
            pageInput.value = currentPage;
            pageInput.max = totalPages;
        }
    }
    
    /**
     * Update loading state
     */
    updateLoadingState(loading, message = 'Loading...') {
        const loadingOverlay = this.container?.querySelector('.loading-overlay');
        
        if (loading) {
            if (!loadingOverlay) {
                this.showLoadingOverlay(message);
            } else {
                const loadingText = loadingOverlay.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
        } else {
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
        
        this.container?.classList.toggle('loading', loading);
    }
    
    /**
     * Update error state
     */
    updateErrorState(error) {
        const errorOverlay = this.container?.querySelector('.error-overlay');
        
        if (error) {
            if (!errorOverlay) {
                this.showErrorOverlay(error);
            } else {
                const errorText = errorOverlay.querySelector('.error-text');
                if (errorText) {
                    errorText.textContent = error;
                }
            }
        } else {
            if (errorOverlay) {
                errorOverlay.remove();
            }
        }
        
        this.container?.classList.toggle('error', !!error);
    }
    
    /**
     * Show loading overlay
     */
    showLoadingOverlay(message) {
        if (!this.container) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        
        this.container.appendChild(overlay);
    }
    
    /**
     * Show error overlay
     */
    showErrorOverlay(error) {
        if (!this.container) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${error}</div>
            <button class="retry-button" onclick="this.parentElement.remove()">Retry</button>
        `;
        
        this.container.appendChild(overlay);
    }
    
    /**
     * Post message to extension host
     */
    postMessage(message) {
        if (typeof vscode !== 'undefined' && vscode.postMessage) {
            vscode.postMessage(message);
        } else {
            console.warn('vscode.postMessage not available');
        }
    }
    
    /**
     * Notify that table is ready
     */
    notifyReady() {
        this.postMessage({
            type: 'dataTable.ready',
            tableId: this.tableId
        });
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        this.sortHandlers.clear();
        this.filterHandlers.clear();
        this.actionHandlers.clear();
        this.initialized = false;
    }
    
    /**
     * Static initialize method for ComponentUtils compatibility
     */
    static initialize(componentId, config, element) {
        return DataTableBehaviorStatic.initialize(componentId, config, element);
    }
}

// Static behavior object for ComponentUtils integration
const DataTableBehaviorStatic = {
    instances: new Map(),
    
    /**
     * Initialize a data table behavior instance
     */
    initialize(componentId, config, element) {
        if (this.instances.has(componentId)) {
            console.warn(`DataTable behavior ${componentId} already initialized`);
            return this.instances.get(componentId);
        }
        
        const table = element || document.getElementById(componentId);
        if (!table) {
            console.error(`DataTable element with ID '${componentId}' not found`);
            return null;
        }
        
        // Create behavior instance using existing class
        const behaviorInstance = new DataTableBehavior(componentId);
        
        const instance = {
            id: componentId,
            config: config || {},
            element: table,
            behaviorInstance: behaviorInstance
        };
        
        this.instances.set(componentId, instance);
        console.log(`DataTable behavior initialized: ${componentId}`);
        
        return instance;
    },
    
    /**
     * Handle messages from Extension Host
     */
    handleMessage(message) {
        console.log('DEBUG: DataTableBehaviorStatic.handleMessage called with:', message);
        
        if (!message || !message.componentId) {
            console.warn('DataTable handleMessage: Invalid message format', message);
            return;
        }
        
        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`DataTable instance not found: ${message.componentId}. Available instances:`, Array.from(this.instances.keys()));
            return;
        }
        
        console.log(`DEBUG: DataTable ${message.componentId} handling message:`, message);
        
        switch (message.action) {
            case 'componentUpdate':
                this.updateDisplayData(message.componentId, message.data);
                break;
            case 'componentStateChange':
                this.updateState(message.componentId, message.data);
                break;
            case 'setData':
                this.updateDisplayData(message.componentId, message.data);
                break;
            case 'setColumns':
                this.updateColumns(message.componentId, message.data);
                break;
            case 'setLoading':
                this.setLoadingState(message.componentId, message.data);
                break;
            default:
                console.warn(`Unknown DataTable action: ${message.action}`);
        }
    },
    
    /**
     * Update table data efficiently without full page reload
     */
    updateDisplayData(componentId, data) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            console.error(`DataTable instance not found for update: ${componentId}`);
            return;
        }
        
        console.log(`Updating DataTable ${componentId} with ${data?.length || 0} rows`);
        
        try {
            const tbody = instance.element.querySelector('tbody');
            if (!tbody) {
                console.error(`Table body not found in ${componentId}`);
                return;
            }
            
            // Clear existing rows
            tbody.innerHTML = '';
            
            if (!data || !Array.isArray(data)) {
                console.log(`No data to display in ${componentId}`);
                this.showEmptyState(instance);
                return;
            }
            
            // Add new rows
            data.forEach((rowData, index) => {
                const row = this.createTableRow(instance, rowData, index);
                if (row) {
                    tbody.appendChild(row);
                }
            });
            
            // Update table meta information
            this.updateTableMeta(instance, data);
            
            console.log(`DataTable ${componentId} updated successfully with ${data.length} rows`);
            
        } catch (error) {
            console.error(`Error updating DataTable ${componentId}:`, error);
            this.showErrorState(instance, error.message);
        }
    },
    
    /**
     * Create a table row from data
     */
    createTableRow(instance, rowData, index) {
        if (!rowData || !rowData.id) {
            console.warn('Row data missing required id field:', rowData);
            return null;
        }
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-row-id', rowData.id);
        tr.setAttribute('data-row-index', index.toString());
        
        // Get current column configuration
        const table = instance.element;
        const headers = table.querySelectorAll('thead th[data-column-id]');
        
        headers.forEach(header => {
            const columnId = header.getAttribute('data-column-id');
            const td = document.createElement('td');
            
            // Get cell value
            const cellValue = rowData[columnId];
            if (cellValue !== null && cellValue !== undefined) {
                // Handle HTML content or plain text
                if (typeof cellValue === 'string' && cellValue.includes('<')) {
                    td.innerHTML = cellValue;
                } else {
                    td.textContent = cellValue.toString();
                }
            } else {
                td.textContent = '';
            }
            
            td.className = `table-cell table-cell-${columnId}`;
            td.setAttribute('data-column-id', columnId);
            
            tr.appendChild(td);
        });
        
        // Add row actions if configured
        if (instance.config.onRowAction) {
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.row-action')) {
                    const action = e.target.closest('.row-action').getAttribute('data-action');
                    this.handleRowAction(instance, action, rowData);
                }
            });
        }
        
        return tr;
    },
    
    /**
     * Handle row actions
     */
    handleRowAction(instance, action, rowData) {
        console.log(`Row action triggered: ${action} on row:`, rowData);
        
        // Send action back to Extension Host
        if (typeof ComponentUtils !== 'undefined') {
            ComponentUtils.sendMessage('component-action', {
                componentId: instance.id,
                action: 'rowAction',
                data: {
                    action: action,
                    rowData: rowData
                },
                timestamp: Date.now()
            });
        }
    },
    
    /**
     * Update table metadata (row count, pagination, etc.)
     */
    updateTableMeta(instance, data) {
        const table = instance.element.closest('.data-table');
        if (!table) return;
        
        // Update row count
        const rowCountElement = table.querySelector('.table-row-count');
        if (rowCountElement) {
            rowCountElement.textContent = `${data.length} rows`;
        }
        
        // Update empty state visibility
        const emptyState = table.querySelector('.table-empty-state');
        if (emptyState) {
            emptyState.style.display = data.length === 0 ? 'block' : 'none';
        }
        
        // Re-enable sorting and filtering
        if (instance.behaviorInstance && instance.behaviorInstance.setupSorting) {
            instance.behaviorInstance.setupSorting();
            instance.behaviorInstance.setupFiltering();
        }
    },
    
    /**
     * Show empty state
     */
    showEmptyState(instance) {
        const table = instance.element.closest('.data-table');
        if (!table) return;
        
        const tbody = instance.element.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="100%" class="empty-state">No data available</td></tr>';
        }
    },
    
    /**
     * Show error state
     */
    showErrorState(instance, error) {
        const table = instance.element.closest('.data-table');
        if (!table) return;
        
        const tbody = instance.element.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="100%" class="error-state">Error loading data: ${error}</td></tr>`;
        }
    },
    
    /**
     * Update component state
     */
    updateState(componentId, state) {
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        console.log(`Updating state for ${componentId}:`, state);
        
        // Update configuration
        instance.config = { ...instance.config, ...state.config };
        
        // Handle specific state changes
        if (state.loading !== undefined) {
            this.setLoadingState(componentId, state.loading);
        }
    },
    
    /**
     * Set loading state
     */
    setLoadingState(componentId, isLoading) {
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        const table = instance.element.closest('.data-table');
        if (!table) return;
        
        if (isLoading) {
            table.classList.add('table-loading');
            const tbody = instance.element.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="100%" class="loading-state">Loading...</td></tr>';
            }
        } else {
            table.classList.remove('table-loading');
        }
    },
    
    /**
     * Update table columns
     */
    updateColumns(componentId, columns) {
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        console.log(`Updating columns for ${componentId}:`, columns);
        // This would require more complex table header reconstruction
        // For now, log and potentially trigger full table rebuild
        console.warn('Column updates require full table rebuild - consider using updateWebview()');
    },
    
    /**
     * Get instance by component ID
     */
    getInstance(componentId) {
        return this.instances.get(componentId);
    },
    
    /**
     * Cleanup instance
     */
    dispose(componentId) {
        const instance = this.instances.get(componentId);
        if (instance && instance.behaviorInstance) {
            instance.behaviorInstance.destroy();
        }
        this.instances.delete(componentId);
        console.log(`DataTable behavior disposed: ${componentId}`);
    }
};

// Auto-initialize tables when DOM is ready
if (typeof window !== 'undefined') {
    window.DataTableBehavior = DataTableBehavior;
    window.DataTableBehaviorStatic = DataTableBehaviorStatic;
    
    // Add static initialize method to global DataTableBehavior for ComponentUtils
    DataTableBehavior.initialize = DataTableBehavior.initialize || DataTableBehaviorStatic.initialize;
    
    // Add static handleMessage method to global DataTableBehavior for ComponentUtils  
    DataTableBehavior.handleMessage = DataTableBehavior.handleMessage || DataTableBehaviorStatic.handleMessage;
    
    // Register with ComponentUtils if available
    if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
        window.ComponentUtils.registerBehavior('DataTable', DataTableBehavior);
        console.log('DataTableBehavior registered with ComponentUtils');
    } else {
        console.log('DataTableBehavior loaded, ComponentUtils not available yet');
    }
    
    // Initialize all data tables
    function initializeDataTables() {
        const tables = document.querySelectorAll('.data-table table[id]');
        tables.forEach(table => {
            if (!table.dataset.initialized) {
                // Use both class-based and static initialization for compatibility
                new DataTableBehavior(table.id);
                DataTableBehaviorStatic.initialize(table.id, {}, table);
                table.dataset.initialized = 'true';
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDataTables);
    } else {
        initializeDataTables();
    }
    
    // Re-initialize when new content is added
    const observer = new MutationObserver(() => {
        initializeDataTables();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
