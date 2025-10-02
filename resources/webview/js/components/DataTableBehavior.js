/**
 * DataTableBehavior.js - Webview-side behavior for DataTable components
 * Handles user interactions, DOM manipulation, and communication with Extension Host
 * Supports multi-instance tables with independent event handling
 * 
 * ARCHITECTURE_COMPLIANCE: Follows ComponentUtils registry pattern with required static methods
 */

class DataTableBehavior {
    static instances = new Map(); // Track component instances
    
    // ✅ REQUIRED: Static initialize method for ComponentUtils compatibility
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('DataTableBehavior: componentId and element are required');
            return null;
        }
        
        // Prevent double initialization
        if (this.instances.has(componentId)) {
            console.warn(`DataTableBehavior: ${componentId} already initialized`);
            return this.instances.get(componentId);
        }
        
        // Create and store instance
        const instance = new DataTableBehavior(componentId, element, config);
        this.instances.set(componentId, instance);
        console.log(`DataTableBehavior: Initialized ${componentId}`);
        return instance;
    }
    
    // ✅ REQUIRED: Static handleMessage method for Extension Host communication
    static handleMessage(message) {
        console.log('DEBUG: DataTableBehavior.handleMessage called with:', message);
        
        if (!message || !message.componentId) {
            console.warn('DataTableBehavior handleMessage: Invalid message format', message);
            return;
        }
        
        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`DataTableBehavior: No instance found for ${message.componentId}`);
            return;
        }
        
        // Route to instance method
        instance.handleMessage(message);
    }
    
    constructor(tableId, element, config = {}) {
        this.tableId = tableId;
        this.table = element || document.getElementById(tableId);
        this.container = this.table?.closest('.data-table');
        this.config = config;
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
        const headers = this.table.querySelectorAll('th[data-column-id]');

        headers.forEach(header => {
            const columnId = header.dataset.columnId;
            if (!columnId) return;

            const isSortable = header.classList.contains('sortable');

            // Left click for sorting
            if (isSortable) {
                const sortHandler = (event) => {
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

                header.addEventListener('click', sortHandler);
                this.sortHandlers.set(columnId, sortHandler);
            }
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
        const searchInput = this.container?.querySelector('.data-table-search-input');
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
        console.log(`Sorting table ${this.tableId} by ${columnId} ${direction}`);
        
        if (direction === null) {
            // Remove sort for this column
            this.removeSortByColumn(columnId);
        } else {
            // Apply sort for this column
            this.sortTableByColumn(columnId, direction, multiSort);
        }
        
        // Update sort indicators
        this.updateSortIndicators(this.getCurrentSortConfig());
    }
    
    /**
     * Sort table rows by column value
     */
    sortTableByColumn(columnId, direction, multiSort = false) {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${this.tableId}`);
            return;
        }
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) {
            console.log(`No rows to sort in table ${this.tableId}`);
            return;
        }
        
        // Get column index for sorting
        const header = this.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (!header) {
            console.warn(`Column header not found: ${columnId}`);
            return;
        }
        
        const columnIndex = Array.from(header.parentElement.children).indexOf(header);
        const columnType = header.dataset.columnType || 'text';
        
        console.log(`Sorting column ${columnId} (index: ${columnIndex}, type: ${columnType}) ${direction}`);
        
        // Sort rows
        rows.sort((a, b) => {
            const cellA = a.children[columnIndex];
            const cellB = b.children[columnIndex];
            
            if (!cellA || !cellB) return 0;
            
            let valueA = this.getCellValue(cellA, columnType);
            let valueB = this.getCellValue(cellB, columnType);
            
            // Handle null/undefined values
            if (valueA === null || valueA === undefined) valueA = '';
            if (valueB === null || valueB === undefined) valueB = '';
            
            let comparison = this.compareValues(valueA, valueB, columnType);
            
            // Apply direction
            if (direction === 'desc') {
                comparison = -comparison;
            }
            
            return comparison;
        });
        
        // Re-append sorted rows to tbody
        rows.forEach(row => tbody.appendChild(row));
        
        // Update header sort state
        if (!multiSort) {
            // Clear other sort indicators
            this.table.querySelectorAll('th.sortable').forEach(th => {
                if (th !== header) {
                    th.removeAttribute('data-sort-direction');
                    th.classList.remove('sorted-asc', 'sorted-desc');
                }
            });
        }
        
        // Set current header sort state
        header.setAttribute('data-sort-direction', direction);
        header.classList.remove('sorted-asc', 'sorted-desc');
        header.classList.add(`sorted-${direction}`);
        
        console.log(`Table ${this.tableId} sorted by ${columnId} ${direction}`);
    }
    
    /**
     * Remove sort for a specific column
     */
    removeSortByColumn(columnId) {
        const header = this.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (header) {
            header.removeAttribute('data-sort-direction');
            header.classList.remove('sorted-asc', 'sorted-desc');
            console.log(`Removed sort for column ${columnId}`);
        }
    }
    
    /**
     * Get cell value for sorting
     */
    getCellValue(cell, columnType) {
        if (!cell) return '';
        
        // Try to get value from data attribute first
        if (cell.dataset.sortValue !== undefined) {
            return cell.dataset.sortValue;
        }
        
        // Get text content and convert based on type
        const textContent = cell.textContent.trim();
        
        switch (columnType) {
            case 'number':
                const num = parseFloat(textContent.replace(/[^0-9.-]/g, ''));
                return isNaN(num) ? 0 : num;
                
            case 'date':
                const date = new Date(textContent);
                return isNaN(date.getTime()) ? new Date(0) : date;
                
            case 'boolean':
                return textContent.toLowerCase() === 'true' || textContent === '1';
                
            default:
                return textContent.toLowerCase();
        }
    }
    
    /**
     * Compare two values based on type
     */
    compareValues(a, b, columnType) {
        switch (columnType) {
            case 'number':
                return a - b;
                
            case 'date':
                return a.getTime() - b.getTime();
                
            case 'boolean':
                if (a === b) return 0;
                return a ? 1 : -1;
                
            default:
                return a.localeCompare(b);
        }
    }
    
    /**
     * Get current sort configuration
     */
    getCurrentSortConfig() {
        const sortConfig = [];
        const sortableHeaders = this.table.querySelectorAll('th.sortable[data-sort-direction]');
        
        sortableHeaders.forEach(header => {
            const columnId = header.dataset.columnId;
            const direction = header.dataset.sortDirection;
            if (columnId && direction) {
                sortConfig.push({ column: columnId, direction });
            }
        });
        
        return sortConfig;
    }
    
    /**
     * Filter table by column
     */
    filter(columnId, value) {
        console.log(`Filtering table ${this.tableId} column ${columnId} with value: "${value}"`);
        
        // Apply filter directly in webview
        this.filterTableByColumn(columnId, value);
        
        // Update filter state
        this.updateFilterState(columnId, value);
    }
    
    /**
     * Filter table rows by column value
     */
    filterTableByColumn(columnId, filterValue) {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${this.tableId}`);
            return;
        }
        
        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) {
            console.log(`No rows to filter in table ${this.tableId}`);
            return;
        }
        
        // Get column index for filtering
        const header = this.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (!header) {
            console.warn(`Column header not found: ${columnId}`);
            return;
        }
        
        const columnIndex = Array.from(header.parentElement.children).indexOf(header);
        const filterType = header.dataset.filterType || 'text';
        
        console.log(`Filtering column ${columnId} (index: ${columnIndex}, type: ${filterType}) with value: "${filterValue}"`);
        
        let visibleRowCount = 0;
        
        rows.forEach(row => {
            const cell = row.children[columnIndex];
            if (!cell) {
                row.style.display = 'none';
                return;
            }
            
            const cellValue = this.getCellFilterValue(cell, filterType);
            const isVisible = this.matchesFilter(cellValue, filterValue, filterType);
            
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleRowCount++;
        });
        
        console.log(`Filter applied: ${visibleRowCount} of ${rows.length} rows visible`);
        
        // Update empty state if no rows are visible
        this.updateEmptyStateVisibility(visibleRowCount === 0);
    }
    
    /**
     * Get cell value for filtering
     */
    getCellFilterValue(cell, filterType) {
        if (!cell) return '';
        
        // Try to get value from data attribute first
        if (cell.dataset.filterValue !== undefined) {
            return cell.dataset.filterValue;
        }
        
        // Get text content
        const textContent = cell.textContent.trim();
        
        switch (filterType) {
            case 'number':
                const num = parseFloat(textContent.replace(/[^0-9.-]/g, ''));
                return isNaN(num) ? 0 : num;
                
            case 'date':
                return new Date(textContent);
                
            case 'boolean':
                return textContent.toLowerCase() === 'true' || textContent === '1';
                
            default:
                return textContent.toLowerCase();
        }
    }
    
    /**
     * Check if cell value matches filter
     */
    matchesFilter(cellValue, filterValue, filterType) {
        // Empty filter shows all rows
        if (!filterValue || filterValue.trim() === '') {
            return true;
        }
        
        const filter = filterValue.toLowerCase().trim();
        
        switch (filterType) {
            case 'number':
                const numFilter = parseFloat(filter);
                return !isNaN(numFilter) && cellValue === numFilter;
                
            case 'date':
                // Simple date filtering - could be enhanced for date ranges
                const dateFilter = new Date(filter);
                if (isNaN(dateFilter.getTime())) {
                    // If not a valid date, fall back to text matching
                    return cellValue.toString().toLowerCase().includes(filter);
                }
                return cellValue.toDateString() === dateFilter.toDateString();
                
            case 'boolean':
                const boolFilter = filter === 'true' || filter === '1';
                return cellValue === boolFilter;
                
            case 'select':
            case 'multiselect':
                // Exact match for select filters
                return cellValue.toString().toLowerCase() === filter;
                
            default:
                // Text filtering - contains match
                return cellValue.toString().toLowerCase().includes(filter);
        }
    }
    
    /**
     * Update filter state tracking
     */
    updateFilterState(columnId, value) {
        if (!this.activeFilters) {
            this.activeFilters = new Map();
        }
        
        if (value && value.trim() !== '') {
            this.activeFilters.set(columnId, value);
        } else {
            this.activeFilters.delete(columnId);
        }
        
        console.log(`Active filters:`, Array.from(this.activeFilters.entries()));
    }
    
    /**
     * Update empty state visibility based on filtered results
     */
    updateEmptyStateVisibility(isEmpty) {
        const table = this.container || this.table.closest('.data-table');
        if (!table) return;
        
        const emptyState = table.querySelector('.data-table-empty-state');
        if (emptyState) {
            if (isEmpty) {
                emptyState.classList.add('visible');
                emptyState.style.display = 'block';
                emptyState.textContent = 'No matching results found';
            } else {
                emptyState.classList.remove('visible');
                emptyState.style.display = 'none';
            }
        }
    }
    
    /**
     * Show Power Platform-style filter dropdown
     */
    showFilterDropdown(columnId, event) {
        console.log(`Showing filter dropdown for column ${columnId}`);
        
        // Close any existing dropdowns
        this.closeAllFilterDropdowns();
        
        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';
        dropdown.innerHTML = `
            <div class="filter-dropdown-content">
                <div class="filter-dropdown-header">
                    <span>Filter by</span>
                    <button class="filter-dropdown-close">×</button>
                </div>
                
                <div class="filter-dropdown-body">
                    <div class="filter-operator-section">
                        <label>Filter by operator</label>
                        <select class="filter-operator-select">
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="not_equals">Does not equal</option>
                            <option value="starts_with">Starts with</option>
                            <option value="ends_with">Ends with</option>
                        </select>
                    </div>
                    
                    <div class="filter-value-section">
                        <label>Filter by value</label>
                        <input type="text" class="filter-value-input" placeholder="Enter value...">
                    </div>
                    
                    <div class="filter-actions">
                        <button class="filter-apply-btn">Apply</button>
                        <button class="filter-clear-btn">Clear</button>
                    </div>
                </div>
            </div>
        `;
        
        // Position dropdown
        const rect = event.target.closest('th').getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.zIndex = '1000';
        
        // Add to page
        document.body.appendChild(dropdown);
        
        // Setup event handlers
        this.setupFilterDropdownHandlers(dropdown, columnId);
        
        // Auto-focus the text input
        const valueInput = dropdown.querySelector('.filter-value-input');
        if (valueInput) {
            setTimeout(() => valueInput.focus(), 0);
        }
        
        // Store reference
        this.activeFilterDropdown = { dropdown, columnId };
    }
    
    /**
     * Setup filter dropdown event handlers
     */
    setupFilterDropdownHandlers(dropdown, columnId) {
        const closeBtn = dropdown.querySelector('.filter-dropdown-close');
        const applyBtn = dropdown.querySelector('.filter-apply-btn');
        const clearBtn = dropdown.querySelector('.filter-clear-btn');
        const operatorSelect = dropdown.querySelector('.filter-operator-select');
        const valueInput = dropdown.querySelector('.filter-value-input');
        
        // Close dropdown
        closeBtn.addEventListener('click', () => {
            this.closeAllFilterDropdowns();
        });
        
        // Apply filter function
        const applyFilter = () => {
            const operator = operatorSelect.value;
            const value = valueInput.value.trim();
            
            if (value) {
                this.applyColumnFilter(columnId, operator, value);
            }
            this.closeAllFilterDropdowns();
        };
        
        // Apply filter on button click
        applyBtn.addEventListener('click', applyFilter);
        
        // Apply filter on Enter key press
        valueInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilter();
            }
        });
        
        // Clear filter
        clearBtn.addEventListener('click', () => {
            this.clearColumnFilter(columnId);
            this.closeAllFilterDropdowns();
        });
        
        // Prevent dropdown from closing when clicking inside
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    this.closeAllFilterDropdowns();
                }
            });
        }, 0);
    }
    
    /**
     * Close all filter dropdowns
     */
    closeAllFilterDropdowns() {
        const dropdowns = document.querySelectorAll('.filter-dropdown');
        dropdowns.forEach(dropdown => dropdown.remove());
        this.activeFilterDropdown = null;
    }
    
    /**
     * Apply column filter with operator
     */
    applyColumnFilter(columnId, operator, value) {
        console.log(`Applying filter: ${columnId} ${operator} "${value}"`);
        
        // Store filter state
        if (!this.activeFilters) {
            this.activeFilters = new Map();
        }
        this.activeFilters.set(columnId, { operator, value });
        
        // Apply filter logic
        this.filterTableByColumn(columnId, value);
        
        // Update filter state
        this.updateFilterState(columnId, value);
    }
    
    /**
     * Clear column filter
     */
    clearColumnFilter(columnId) {
        console.log(`Clearing filter for column ${columnId}`);
        
        if (this.activeFilters) {
            this.activeFilters.delete(columnId);
        }
        
        // Show all rows and reapply other filters
        this.reapplyAllFilters();
    }
    
    /**
     * Reapply all active filters
     */
    reapplyAllFilters() {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        
        // First show all rows
        rows.forEach(row => {
            row.style.display = '';
        });
        
        // Then apply each active filter
        if (this.activeFilters && this.activeFilters.size > 0) {
            this.activeFilters.forEach((filterData, columnId) => {
                this.filterTableByColumn(columnId, filterData.value);
            });
        }
    }
    
    /**
     * Clear all filters
     */
    clearAllFilters() {
        console.log(`Clearing all filters for table ${this.tableId}`);
        
        // Show all rows
        const tbody = this.table.querySelector('tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                row.style.display = '';
            });
        }
        
        // Clear filter state
        if (this.activeFilters) {
            this.activeFilters.clear();
        }
        
        // Hide empty state
        this.updateEmptyStateVisibility(false);
        
        console.log(`All filters cleared for table ${this.tableId}`);
    }
    
    /**
     * Search table across all columns
     */
    search(query) {
        console.log(`Searching table ${this.tableId} with query: "${query}"`);

        const tbody = this.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${this.tableId}`);
            return;
        }

        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) {
            console.log(`No rows to search in table ${this.tableId}`);
            return;
        }

        const searchQuery = (query || '').toLowerCase().trim();
        let visibleRowCount = 0;

        // Show all rows if search is empty
        if (searchQuery === '') {
            rows.forEach(row => {
                row.style.display = '';
            });
            this.updateEmptyStateVisibility(false);
            console.log(`Search cleared: all ${rows.length} rows visible`);
            return;
        }

        // Filter rows based on search query (searches across all columns)
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let rowMatches = false;

            // Check if any cell in the row matches the search query
            for (const cell of cells) {
                const cellText = cell.textContent.toLowerCase().trim();
                if (cellText.includes(searchQuery)) {
                    rowMatches = true;
                    break;
                }
            }

            row.style.display = rowMatches ? '' : 'none';
            if (rowMatches) visibleRowCount++;
        });

        console.log(`Search applied: ${visibleRowCount} of ${rows.length} rows visible`);

        // Update empty state if no rows are visible
        this.updateEmptyStateVisibility(visibleRowCount === 0);
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
        console.log('Updating sort indicators:', sortConfig);
        
        // Clear all sort indicators and remove existing ones
        const sortableHeaders = this.table.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
            header.removeAttribute('data-sort-direction');
            
            // Remove existing sort indicators
            const existingIndicator = header.querySelector('.sort-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
        });
        
        // Apply current sort indicators by creating new elements
        sortConfig.forEach((sort, index) => {
            const header = this.table.querySelector(`th[data-column-id="${sort.column}"]`);
            if (!header) return;
            
            header.classList.add(`sorted-${sort.direction}`);
            header.setAttribute('data-sort-direction', sort.direction);
            
            // Create and insert sort indicator
            const sortIndicator = document.createElement('span');
            sortIndicator.className = `sort-indicator sort-indicator--${sort.direction}`;
            sortIndicator.title = `Sorted ${sort.direction}ending`;
            sortIndicator.textContent = sort.direction === 'asc' ? '▲' : '▼';
            
            // Insert the indicator after the header label
            const headerContent = header.querySelector('.data-table-header-content');
            const headerLabel = header.querySelector('.data-table-header-label');
            if (headerContent && headerLabel) {
                headerLabel.insertAdjacentElement('afterend', sortIndicator);
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
     * Instance method to handle messages from Extension Host
     */
    handleMessage(message) {
        console.log(`DataTableBehavior: Handling message for ${this.tableId}:`, message);
        
        if (!message || !message.action) {
            console.warn('DataTableBehavior: Invalid message format', message);
            return;
        }
        
        // Handle different message actions
        const { action, data } = message;
        
        switch (action) {
            case 'componentUpdate':
                if (data && Array.isArray(data)) {
                    // Legacy format: just an array
                    this.updateTableData(data);
                } else if (data && typeof data === 'object') {
                    // New format: object with data, loading, error, etc.
                    console.log(`DataTableBehavior: componentUpdate with state:`, {
                        hasData: !!data.data,
                        dataLength: data.data?.length,
                        loading: data.loading,
                        loadingMessage: data.loadingMessage
                    });

                    // Handle loading state
                    if (data.loading !== undefined) {
                        this.toggleLoadingState(data.loading, data.loadingMessage);
                    }

                    // Handle error state
                    if (data.error) {
                        this.showErrorOverlay(data.error);
                    } else if (data.error === null && !data.loading) {
                        this.hideErrorOverlay();
                    }

                    // Update table data if provided
                    if (data.data && Array.isArray(data.data)) {
                        this.updateTableData(data.data);
                    }
                } else {
                    console.log(`DataTableBehavior: componentUpdate received unexpected format:`, data);
                }
                break;
                
            case 'setData':
                if (data && Array.isArray(data)) {
                    this.updateTableData(data);
                }
                break;
                
            case 'setLoading':
                this.toggleLoadingState(data?.loading, data?.message);
                break;
                
            case 'setError':
                this.showErrorOverlay(data?.error || 'An error occurred');
                break;
                
            case 'clearError':
                this.hideErrorOverlay();
                break;
                
            default:
                console.warn(`DataTableBehavior: Unknown action: ${action}`);
        }
    }
    
    /**
     * Update table data efficiently without full HTML regeneration
     */
    updateTableData(data) {
        console.log(`DataTableBehavior: Updating table ${this.tableId} with ${data.length} rows`);
        
        const tbody = this.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`DataTableBehavior: No tbody found in table ${this.tableId}`);
            return;
        }
        
        // Debug: Analyze header structure vs data
        const headers = this.table.querySelectorAll('th[data-column-id]');
        const headerInfo = Array.from(headers).map(h => ({
            columnId: h.getAttribute('data-column-id'),
            text: h.textContent.trim(),
            index: Array.from(h.parentElement.children).indexOf(h)
        }));
        
        console.log(`DataTableBehavior: Found ${headers.length} headers`);
        headerInfo.forEach((header, idx) => {
            console.log(`  Header ${idx}: columnId="${header.columnId}", text="${header.text}"`);
        });
        
        // DUMP HTML STRUCTURE FOR DEBUGGING
        console.log(`DataTableBehavior: === HTML STRUCTURE DEBUG ===`);
        const headerRow = this.table.querySelector('thead tr');
        if (headerRow) {
            console.log(`HEADER ROW HTML:`, headerRow.outerHTML);
            const allThElements = Array.from(headerRow.querySelectorAll('th'));
            console.log(`ALL TH ELEMENTS (${allThElements.length} total):`);
            allThElements.forEach((th, index) => {
                console.log(`  TH ${index}: columnId="${th.getAttribute('data-column-id')}", text="${th.textContent.trim()}", classes="${th.className}"`);
            });
            
            const dataColumnThs = Array.from(headerRow.querySelectorAll('th[data-column-id]'));
            console.log(`DATA COLUMN TH ELEMENTS (${dataColumnThs.length} total):`);
            dataColumnThs.forEach((th, index) => {
                console.log(`  DATA TH ${index}: columnId="${th.getAttribute('data-column-id')}", text="${th.textContent.trim()}"`);
            });
        } else {
            console.log(`NO HEADER ROW FOUND!`);
        }
        
        if (data.length > 0) {
            const sampleRow = data[0];
            console.log(`DataTableBehavior: Column value mapping:`);
            headerInfo.forEach((header, idx) => {
                const columnId = header.columnId;
                const dataValue = sampleRow[columnId];
                const truncatedValue = typeof dataValue === 'string' && dataValue.length > 50 
                    ? dataValue.substring(0, 50) + '...' 
                    : dataValue;
                console.log(`  ${idx}: "${header.text}" (${columnId}) = "${truncatedValue}"`);
            });
        }
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add new rows
        data.forEach(rowData => {
            const tr = this.createTableRow(rowData);
            tbody.appendChild(tr);
        });
        
    }
    
    /**
     * Create a table row from data
     */
    createTableRow(rowData) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row-id', rowData.id);
        tr.className = 'data-table-body-row';
        
        // Get all header cells in the exact order they appear in the table
        const headerRow = this.table.querySelector('thead tr');
        if (!headerRow) {
            console.error('DataTableBehavior: No header row found');
            return tr;
        }
        
        const headerCells = headerRow.querySelectorAll('th[data-column-id]');
        
        Array.from(headerCells).forEach((header, index) => {
            const columnId = header.getAttribute('data-column-id');
            const td = document.createElement('td');
            td.className = 'data-table-body-cell';
            
            if (columnId && rowData.hasOwnProperty(columnId)) {
                const value = rowData[columnId] || '';
                td.textContent = value;
            } else {
                td.textContent = ''; // Empty cell for non-data columns
            }
            
            tr.appendChild(td);
        });
        return tr;
    }
    
    /**
     * Toggle loading state
     */
    toggleLoadingState(loading, message) {
        if (loading) {
            this.showLoadingOverlay(message || 'Loading...');
        } else {
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        if (!this.container) return;
        
        const overlay = this.container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    /**
     * Hide error overlay
     */
    hideErrorOverlay() {
        if (!this.container) return;
        
        const overlay = this.container.querySelector('.error-overlay');
        if (overlay) {
            overlay.remove();
        }
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
}

// Static behavior object for ComponentUtils integration
const DataTableBehaviorStatic = {
    instances: new Map(),
    
    /**
     * Initialize a data table behavior instance
     */
    initialize(componentId, config, element) {
        if (this.instances.has(componentId)) {
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
        
        return instance;
    },
    
    /**
     * Handle messages from Extension Host
     */
    handleMessage(message) {
        
        if (!message || !message.componentId) {
            console.warn('DataTable handleMessage: Invalid message format', message);
            return;
        }
        
        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`DataTable instance not found: ${message.componentId}. Available instances:`, Array.from(this.instances.keys()));
            return;
        }
        
        
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
        
        // Update empty state visibility - use correct CSS class
        const emptyState = table.querySelector('.data-table-empty-state');
        if (emptyState) {
            if (data.length === 0) {
                emptyState.classList.add('visible');
                emptyState.style.display = 'block';
            } else {
                emptyState.classList.remove('visible');
                emptyState.style.display = 'none';
            }
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
        
        // Clear tbody content
        const tbody = instance.element.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }
        
        // Show the dedicated empty state element
        const emptyState = table.querySelector('.data-table-empty-state');
        if (emptyState) {
            emptyState.classList.add('visible');
            emptyState.style.display = 'block';
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

// ✅ REQUIRED: Component Registry Pattern for ComponentUtils integration
if (typeof window !== 'undefined') {
    // Make behavior available globally
    window.DataTableBehavior = DataTableBehavior;
    
    // ✅ CRITICAL: Register with ComponentUtils (stub or real) following ARCHITECTURE_GUIDE.md pattern
    if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
        window.ComponentUtils.registerBehavior('DataTable', DataTableBehavior);
        console.log('DataTableBehavior registered with ComponentUtils');
    } else {
        console.log('DataTableBehavior loaded, ComponentUtils not available yet');
    }
}
