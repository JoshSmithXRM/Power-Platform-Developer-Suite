/**
 * DataTableBehavior.js - Webview-side behavior for DataTable components
 * Handles user interactions, DOM manipulation, and communication with Extension Host
 * Supports multi-instance tables with independent event handling
 *
 * ARCHITECTURE_COMPLIANCE: Extends BaseBehavior for enforced componentUpdate pattern
 */

class DataTableBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'DataTable';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        this.handleComponentUpdate(instance, data);
    }

    /**
     * Create instance (returns plain object, not DataTableBehavior instance)
     */
    static createInstance(componentId, config, element) {
        const table = element || document.getElementById(componentId);

        if (!table) {
            console.error(`DataTable with ID '${componentId}' not found`);
            return null;
        }

        return {
            id: componentId,
            tableId: componentId,
            table: table,
            container: table.closest('.data-table'),
            config: config || {},
            initialized: false,
            sortHandlers: new Map(),
            filterHandlers: new Map(),
            actionHandlers: new Map(),
            contextMenu: null,
            currentContextRow: null,
            activeFilters: new Map(),
            activeFilterDropdown: null
        };
    }

    /**
     * Setup event listeners - override from BaseBehavior
     */
    static setupEventListeners(instance) {
        if (instance.initialized) return;

        try {
            this.setupSorting(instance);
            this.setupSelection(instance);
            this.setupRowActions(instance);
            this.setupContextMenu(instance);
            this.setupPagination(instance);
            this.setupSearch(instance);
            this.setupColumnResize(instance);
            this.setupRowExpansion(instance);
            this.setupExport(instance);

            instance.initialized = true;
            this.notifyReady(instance);
        } catch (error) {
            console.error(`Failed to initialize DataTable '${instance.tableId}':`, error);
        }
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        this.handleCustomMessage(instance, message);
    }

    /**
     * Setup column sorting
     */
    static setupSorting(instance) {
        const headers = instance.table.querySelectorAll('th[data-column-id]');

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

                    this.sort(instance, columnId, newDirection, event.ctrlKey || event.metaKey);
                };

                header.addEventListener('click', sortHandler);
                instance.sortHandlers.set(columnId, sortHandler);
            }
        });
    }

    /**
     * Setup row selection
     */
    static setupSelection(instance) {
        // Header checkbox for select all
        const headerCheckbox = instance.table.querySelector('th .select-all-checkbox');
        if (headerCheckbox) {
            headerCheckbox.addEventListener('change', () => {
                this.selectAll(instance, headerCheckbox.checked);
            });
        }

        // Row checkboxes
        const rowCheckboxes = instance.table.querySelectorAll('tbody .row-checkbox');
        rowCheckboxes.forEach(checkbox => {
            const rowId = checkbox.dataset.rowId;
            if (!rowId) return;

            checkbox.addEventListener('change', () => {
                this.selectRow(instance, rowId, checkbox.checked);
            });
        });

        // Row click selection (if enabled)
        const selectableRows = instance.table.querySelectorAll('tbody tr[data-selectable="true"]');
        selectableRows.forEach(row => {
            const rowId = row.dataset.rowId;
            if (!rowId) return;

            row.addEventListener('click', (event) => {
                // Don't trigger on checkbox, button, or link clicks
                if (event.target.closest('input, button, a')) return;

                const checkbox = row.querySelector('.row-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.selectRow(instance, rowId, checkbox.checked);
                }
            });
        });
    }

    /**
     * Setup row actions
     */
    static setupRowActions(instance) {
        const actionButtons = instance.table.querySelectorAll('.action-button');

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

                this.executeAction(instance, actionId, rowId);
            };

            button.addEventListener('click', handler);
            instance.actionHandlers.set(`${actionId}-${rowId}`, handler);
        });

        // Setup action dropdown menus
        const actionDropdowns = instance.table.querySelectorAll('.actions-dropdown');
        actionDropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');

            if (!trigger || !menu) return;

            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                // Close other open dropdowns
                this.closeAllDropdowns(instance);

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
    static setupContextMenu(instance) {
        const contextMenu = instance.container?.querySelector('.data-table-context-menu');
        if (!contextMenu) return;

        // Store reference
        instance.contextMenu = contextMenu;
        instance.currentContextRow = null;

        // Setup right-click listeners on table rows
        instance.table.addEventListener('contextmenu', (event) => {
            const row = event.target.closest('tbody tr[data-row-id]');
            if (!row) return;

            event.preventDefault();
            this.showContextMenu(instance, event, row);
        });

        // Setup click listeners on context menu items
        const menuItems = contextMenu.querySelectorAll('[data-menu-id]');
        menuItems.forEach(item => {
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                const menuId = item.dataset.menuId;
                this.handleContextMenuItemClick(instance, menuId);
                this.hideContextMenu(instance);
            });
        });

        // Close context menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!contextMenu.contains(event.target) && contextMenu.style.display !== 'none') {
                this.hideContextMenu(instance);
            }
        });

        // Close context menu on scroll
        instance.table.addEventListener('scroll', () => {
            if (contextMenu.style.display !== 'none') {
                this.hideContextMenu(instance);
            }
        });
    }

    /**
     * Setup pagination controls
     */
    static setupPagination(instance) {
        const pagination = instance.container?.querySelector('.data-table-pagination');
        if (!pagination) return;

        // Page size selector
        const pageSizeSelect = pagination.querySelector('.page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => {
                this.setPageSize(instance, parseInt(pageSizeSelect.value));
            });
        }

        // Page buttons
        const pageButtons = pagination.querySelectorAll('.page-button');
        pageButtons.forEach(button => {
            const page = button.dataset.page;
            if (!page) return;

            button.addEventListener('click', () => {
                if (page === 'prev') {
                    this.previousPage(instance);
                } else if (page === 'next') {
                    this.nextPage(instance);
                } else {
                    this.setPage(instance, parseInt(page));
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
                        this.setPage(instance, page);
                    }
                }
            });
        }
    }

    /**
     * Setup search functionality - now listens to SearchInputComponent events
     */
    static setupSearch(instance) {
        // Find SearchInputComponent if it exists
        const searchContainer = instance.container?.querySelector('[data-component-type="SearchInput"]');
        if (!searchContainer) return;

        const searchComponentId = searchContainer.getAttribute('data-component-id');
        if (!searchComponentId) return;

        // Listen for search events from SearchInputComponent
        instance.searchMessageHandler = (event) => {
            if (event.detail &&
                event.detail.source === 'component' &&
                event.detail.command === 'search' &&
                event.detail.data &&
                event.detail.data.componentId === searchComponentId) {
                this.search(instance, event.detail.data.query);
            }
        };

        window.addEventListener('component-message', instance.searchMessageHandler);
    }

    /**
     * Setup column resizing
     */
    static setupColumnResize(instance) {
        const resizeHandles = instance.table.querySelectorAll('.column-resize-handle');

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
                    this.resizeColumn(instance, columnId, newWidth);
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
    static setupRowExpansion(instance) {
        const expandButtons = instance.table.querySelectorAll('.expand-button');

        expandButtons.forEach(button => {
            const rowId = button.dataset.rowId;
            if (!rowId) return;

            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.toggleRowExpansion(instance, rowId);
            });
        });
    }

    /**
     * Setup export functionality
     */
    static setupExport(instance) {
        const exportButtons = instance.container?.querySelectorAll('.export-button');
        if (!exportButtons) return;

        exportButtons.forEach(button => {
            const format = button.dataset.format;
            if (!format) return;

            button.addEventListener('click', () => {
                this.exportData(instance, format);
            });
        });
    }

    /**
     * Sort table by column
     */
    static sort(instance, columnId, direction, multiSort = false) {
        console.log(`Sorting table ${instance.tableId} by ${columnId} ${direction}`);

        if (direction === null) {
            // Remove sort for this column
            this.removeSortByColumn(instance, columnId);
        } else {
            // Apply sort for this column
            this.sortTableByColumn(instance, columnId, direction, multiSort);
        }

        // Update sort indicators
        this.updateSortIndicators(instance, this.getCurrentSortConfig(instance));
    }

    /**
     * Sort table rows by column value
     */
    static sortTableByColumn(instance, columnId, direction, multiSort = false) {
        const tbody = instance.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${instance.tableId}`);
            return;
        }

        const rows = Array.from(tbody.querySelectorAll('tr'));
        if (rows.length === 0) {
            console.log(`No rows to sort in table ${instance.tableId}`);
            return;
        }

        // Get column index for sorting
        const header = instance.table.querySelector(`th[data-column-id="${columnId}"]`);
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
            instance.table.querySelectorAll('th.sortable').forEach(th => {
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

        console.log(`Table ${instance.tableId} sorted by ${columnId} ${direction}`);
    }

    /**
     * Remove sort for a specific column
     */
    static removeSortByColumn(instance, columnId) {
        const header = instance.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (header) {
            header.removeAttribute('data-sort-direction');
            header.classList.remove('sorted-asc', 'sorted-desc');
            console.log(`Removed sort for column ${columnId}`);
        }
    }

    /**
     * Get cell value for sorting
     */
    static getCellValue(cell, columnType) {
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
    static compareValues(a, b, columnType) {
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
    static getCurrentSortConfig(instance) {
        const sortConfig = [];
        const sortableHeaders = instance.table.querySelectorAll('th.sortable[data-sort-direction]');

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
    static filter(instance, columnId, value) {
        console.log(`Filtering table ${instance.tableId} column ${columnId} with value: "${value}"`);

        // Apply filter directly in webview
        this.filterTableByColumn(instance, columnId, value);

        // Update filter state
        this.updateFilterState(instance, columnId, value);
    }

    /**
     * Filter table rows by column value
     */
    static filterTableByColumn(instance, columnId, filterValue) {
        const tbody = instance.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${instance.tableId}`);
            return;
        }

        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) {
            console.log(`No rows to filter in table ${instance.tableId}`);
            return;
        }

        // Get column index for filtering
        const header = instance.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (!header) {
            console.warn(`Column header not found: ${columnId}`);
            return;
        }

        const columnIndex = Array.from(header.parentElement.children).indexOf(header);
        const filterType = header.dataset.filterType || 'text';

        console.log(`Filtering column ${columnId} (index: ${columnIndex}, type: ${filterType}) with value: "${filterValue}"`);

        let visibleRowCount = 0;
        const totalRowCount = rows.length;

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

        // Update footer count
        const isFiltered = filterValue && filterValue.toString().trim() !== '';
        this.updateSearchCount(instance, visibleRowCount, totalRowCount, isFiltered);

        // Update empty state if no rows are visible
        this.updateEmptyStateVisibility(instance, visibleRowCount === 0);
    }

    /**
     * Get cell value for filtering
     */
    static getCellFilterValue(cell, filterType) {
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
    static matchesFilter(cellValue, filterValue, filterType) {
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
    static updateFilterState(instance, columnId, value) {
        if (!instance.activeFilters) {
            instance.activeFilters = new Map();
        }

        if (value && value.trim() !== '') {
            instance.activeFilters.set(columnId, value);
        } else {
            instance.activeFilters.delete(columnId);
        }

        console.log(`Active filters:`, Array.from(instance.activeFilters.entries()));
    }

    /**
     * Update empty state visibility based on filtered results
     */
    static updateEmptyStateVisibility(instance, isEmpty) {
        const table = instance.container || instance.table.closest('.data-table');
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
     * Update footer count after client-side search/filter
     */
    static updateSearchCount(instance, visibleCount, totalCount, isFiltered) {
        const pageInfo = instance.container?.querySelector('.page-info') || instance.container?.querySelector('.data-table-page-info');
        if (!pageInfo) return;

        const newText = isFiltered
            ? `Showing ${visibleCount} of ${totalCount} items`
            : `Showing ${totalCount} items`;

        pageInfo.textContent = newText;
    }

    /**
     * Show Power Platform-style filter dropdown
     */
    static showFilterDropdown(instance, columnId, event) {
        console.log(`Showing filter dropdown for column ${columnId}`);

        // Close any existing dropdowns
        this.closeAllFilterDropdowns(instance);

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
        this.setupFilterDropdownHandlers(instance, dropdown, columnId);

        // Auto-focus the text input
        const valueInput = dropdown.querySelector('.filter-value-input');
        if (valueInput) {
            setTimeout(() => valueInput.focus(), 0);
        }

        // Store reference
        instance.activeFilterDropdown = { dropdown, columnId };
    }

    /**
     * Setup filter dropdown event handlers
     */
    static setupFilterDropdownHandlers(instance, dropdown, columnId) {
        const closeBtn = dropdown.querySelector('.filter-dropdown-close');
        const applyBtn = dropdown.querySelector('.filter-apply-btn');
        const clearBtn = dropdown.querySelector('.filter-clear-btn');
        const operatorSelect = dropdown.querySelector('.filter-operator-select');
        const valueInput = dropdown.querySelector('.filter-value-input');

        // Close dropdown
        closeBtn.addEventListener('click', () => {
            this.closeAllFilterDropdowns(instance);
        });

        // Apply filter function
        const applyFilter = () => {
            const operator = operatorSelect.value;
            const value = valueInput.value.trim();

            if (value) {
                this.applyColumnFilter(instance, columnId, operator, value);
            }
            this.closeAllFilterDropdowns(instance);
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
            this.clearColumnFilter(instance, columnId);
            this.closeAllFilterDropdowns(instance);
        });

        // Prevent dropdown from closing when clicking inside
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    this.closeAllFilterDropdowns(instance);
                }
            });
        }, 0);
    }

    /**
     * Close all filter dropdowns
     */
    static closeAllFilterDropdowns(instance) {
        const dropdowns = document.querySelectorAll('.filter-dropdown');
        dropdowns.forEach(dropdown => dropdown.remove());
        instance.activeFilterDropdown = null;
    }

    /**
     * Apply column filter with operator
     */
    static applyColumnFilter(instance, columnId, operator, value) {
        console.log(`Applying filter: ${columnId} ${operator} "${value}"`);

        // Store filter state
        if (!instance.activeFilters) {
            instance.activeFilters = new Map();
        }
        instance.activeFilters.set(columnId, { operator, value });

        // Apply filter logic
        this.filterTableByColumn(instance, columnId, value);

        // Update filter state
        this.updateFilterState(instance, columnId, value);
    }

    /**
     * Clear column filter
     */
    static clearColumnFilter(instance, columnId) {
        console.log(`Clearing filter for column ${columnId}`);

        if (instance.activeFilters) {
            instance.activeFilters.delete(columnId);
        }

        // Show all rows and reapply other filters
        this.reapplyAllFilters(instance);
    }

    /**
     * Reapply all active filters
     */
    static reapplyAllFilters(instance) {
        const tbody = instance.table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');

        // First show all rows
        rows.forEach(row => {
            row.style.display = '';
        });

        // Then apply each active filter
        if (instance.activeFilters && instance.activeFilters.size > 0) {
            instance.activeFilters.forEach((filterData, columnId) => {
                this.filterTableByColumn(instance, columnId, filterData.value);
            });
        }
    }

    /**
     * Clear all filters
     */
    static clearAllFilters(instance) {
        console.log(`Clearing all filters for table ${instance.tableId}`);

        // Show all rows
        const tbody = instance.table.querySelector('tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            const totalRowCount = rows.length;
            rows.forEach(row => {
                row.style.display = '';
            });

            // Update footer count
            this.updateSearchCount(instance, totalRowCount, totalRowCount, false);
        }

        // Clear filter state
        if (instance.activeFilters) {
            instance.activeFilters.clear();
        }

        // Hide empty state
        this.updateEmptyStateVisibility(instance, false);

        console.log(`All filters cleared for table ${instance.tableId}`);
    }

    /**
     * Search table across all columns
     */
    static search(instance, query) {
        console.log(`Searching table ${instance.tableId} with query: "${query}"`);

        // Notify Extension Host so search is persisted across data refreshes
        this.postMessage(instance, {
            command: 'table-search',
            tableId: instance.tableId,
            searchQuery: query || ''
        });

        const tbody = instance.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`No tbody found in table ${instance.tableId}`);
            return;
        }

        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) {
            console.log(`No rows to search in table ${instance.tableId}`);
            return;
        }

        const searchQuery = (query || '').toLowerCase().trim();
        let visibleRowCount = 0;
        const totalRowCount = rows.length;

        // Show all rows if search is empty
        if (searchQuery === '') {
            rows.forEach(row => {
                row.style.display = '';
            });
            this.updateEmptyStateVisibility(instance, false);
            this.updateSearchCount(instance, totalRowCount, totalRowCount, false);
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

        // Update footer count
        this.updateSearchCount(instance, visibleRowCount, totalRowCount, true);

        // Update empty state if no rows are visible
        this.updateEmptyStateVisibility(instance, visibleRowCount === 0);
    }

    /**
     * Select/deselect row
     */
    static selectRow(instance, rowId, selected) {
        this.postMessage(instance, {
            type: 'dataTable.selectRow',
            tableId: instance.tableId,
            rowId,
            selected
        });
    }

    /**
     * Select all rows
     */
    static selectAll(instance, selected) {
        this.postMessage(instance, {
            type: 'dataTable.selectAll',
            tableId: instance.tableId,
            selected
        });
    }

    /**
     * Execute row action
     */
    static executeAction(instance, actionId, rowId) {
        this.postMessage(instance, {
            type: 'dataTable.action',
            tableId: instance.tableId,
            actionId,
            rowId
        });
    }

    /**
     * Set current page
     */
    static setPage(instance, page) {
        this.postMessage(instance, {
            type: 'dataTable.setPage',
            tableId: instance.tableId,
            page
        });
    }

    /**
     * Go to previous page
     */
    static previousPage(instance) {
        this.postMessage(instance, {
            type: 'dataTable.previousPage',
            tableId: instance.tableId
        });
    }

    /**
     * Go to next page
     */
    static nextPage(instance) {
        this.postMessage(instance, {
            type: 'dataTable.nextPage',
            tableId: instance.tableId
        });
    }

    /**
     * Set page size
     */
    static setPageSize(instance, size) {
        this.postMessage(instance, {
            type: 'dataTable.setPageSize',
            tableId: instance.tableId,
            size
        });
    }

    /**
     * Toggle row expansion
     */
    static toggleRowExpansion(instance, rowId) {
        this.postMessage(instance, {
            type: 'dataTable.toggleExpansion',
            tableId: instance.tableId,
            rowId
        });
    }

    /**
     * Resize column
     */
    static resizeColumn(instance, columnId, width) {
        // Update column width immediately for smooth UX
        const header = instance.table.querySelector(`th[data-column-id="${columnId}"]`);
        if (header) {
            header.style.width = `${width}px`;
        }

        // Notify extension host
        this.postMessage(instance, {
            type: 'dataTable.resizeColumn',
            tableId: instance.tableId,
            columnId,
            width
        });
    }

    /**
     * Show context menu
     */
    static showContextMenu(instance, event, row) {
        if (!instance.contextMenu || !row) return;

        // Store current row for later use
        instance.currentContextRow = row;

        // Position the context menu at mouse location
        instance.contextMenu.style.display = 'block';
        instance.contextMenu.style.left = `${event.clientX}px`;
        instance.contextMenu.style.top = `${event.clientY}px`;

        // Adjust if menu would go off-screen
        const menuRect = instance.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (menuRect.right > viewportWidth) {
            instance.contextMenu.style.left = `${viewportWidth - menuRect.width - 10}px`;
        }

        if (menuRect.bottom > viewportHeight) {
            instance.contextMenu.style.top = `${viewportHeight - menuRect.height - 10}px`;
        }
    }

    /**
     * Hide context menu
     */
    static hideContextMenu(instance) {
        if (!instance.contextMenu) return;

        instance.contextMenu.style.display = 'none';
        instance.currentContextRow = null;
    }

    /**
     * Handle context menu item click
     */
    static handleContextMenuItemClick(instance, itemId) {
        if (!instance.currentContextRow) return;

        const rowId = instance.currentContextRow.dataset.rowId;
        const rowData = this.getRowData(instance, rowId);

        // Send component event to Extension Host using ComponentUtils
        if (typeof ComponentUtils !== 'undefined') {
            ComponentUtils.emitComponentEvent(instance.tableId, 'contextMenuItemClicked', {
                itemId: itemId,
                rowId: rowId,
                rowData: rowData
            });
        } else {
            // Fallback to direct postMessage if ComponentUtils not available
            this.postMessage(instance, {
                command: 'component-event',
                data: {
                    componentId: instance.tableId,
                    eventType: 'contextMenuItemClicked',
                    data: {
                        itemId: itemId,
                        rowId: rowId,
                        rowData: rowData
                    }
                }
            });
        }
    }

    /**
     * Get row data by row ID
     */
    static getRowData(instance, rowId) {
        const row = instance.table.querySelector(`tr[data-row-id="${rowId}"]`);
        if (!row) return null;

        const rowData = { id: rowId };
        const cells = row.querySelectorAll('td[data-column-id]');

        cells.forEach(cell => {
            const columnId = cell.dataset.columnId;
            if (columnId) {
                // Get text content, but preserve original value if available
                rowData[columnId] = cell.textContent.trim();
            }
        });

        return rowData;
    }

    /**
     * Export data
     */
    static exportData(instance, format) {
        this.postMessage(instance, {
            type: 'dataTable.export',
            tableId: instance.tableId,
            format
        });
    }

    /**
     * Close all dropdown menus
     */
    static closeAllDropdowns(instance) {
        const openDropdowns = instance.table.querySelectorAll('.actions-dropdown.open');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    /**
     * Update table state from extension host
     */
    static updateState(instance, state) {
        try {
            this.updateSelection(instance, state.selectedRows || []);
            this.updateSortIndicators(instance, state.sortConfig || []);
            this.updatePagination(instance, state);
            this.updateLoadingState(instance, state.loading, state.loadingMessage);
            this.updateErrorState(instance, state.error);
        } catch (error) {
            console.error('Failed to update DataTable state:', error);
        }
    }

    /**
     * Update row selection state
     */
    static updateSelection(instance, selectedRows) {
        const checkboxes = instance.table.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            const rowId = checkbox.dataset.rowId;
            checkbox.checked = selectedRows.includes(rowId);

            const row = checkbox.closest('tr');
            if (row) {
                row.classList.toggle('selected', checkbox.checked);
            }
        });

        // Update select all checkbox
        const selectAllCheckbox = instance.table.querySelector('.select-all-checkbox');
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
    static updateSortIndicators(instance, sortConfig) {
        console.log('Updating sort indicators:', sortConfig);

        // Clear all sort indicators and remove existing ones
        const sortableHeaders = instance.table.querySelectorAll('th.sortable');
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
            const header = instance.table.querySelector(`th[data-column-id="${sort.column}"]`);
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
    static updatePagination(instance, state) {
        const pagination = instance.container?.querySelector('.data-table-pagination');
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
    static updateLoadingState(instance, loading, message = 'Loading...') {
        const loadingOverlay = instance.container?.querySelector('.loading-overlay');

        if (loading) {
            if (!loadingOverlay) {
                this.showLoadingOverlay(instance, message);
            } else {
                loadingOverlay.classList.add('visible');
                const loadingText = loadingOverlay.querySelector('.loading-indicator-message');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
        } else {
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }

        instance.container?.classList.toggle('loading', loading);
    }

    /**
     * Update error state
     */
    static updateErrorState(instance, error) {
        const errorOverlay = instance.container?.querySelector('.error-overlay');

        if (error) {
            if (!errorOverlay) {
                this.showErrorOverlay(instance, error);
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

        instance.container?.classList.toggle('error', !!error);
    }

    /**
     * Show loading overlay
     */
    static showLoadingOverlay(instance, message) {
        if (!instance.container) return;

        // Remove any existing overlay first
        const existingOverlay = instance.container.querySelector('.loading-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay visible'; // Add 'visible' class
        // Use shared loading indicator HTML structure (matches LoadingIndicatorView.generate())
        overlay.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-indicator-spinner"></div>
                <div class="loading-indicator-message">${message}</div>
            </div>
        `;

        instance.container.appendChild(overlay);
    }

    /**
     * Show error overlay
     */
    static showErrorOverlay(instance, error) {
        if (!instance.container) return;

        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${error}</div>
            <button class="retry-button" onclick="this.parentElement.remove()">Retry</button>
        `;

        instance.container.appendChild(overlay);
    }

    /**
     * Post message to extension host
     */
    static postMessage(instance, message) {
        if (typeof vscode !== 'undefined' && vscode.postMessage) {
            vscode.postMessage(message);
        } else {
            console.warn('vscode.postMessage not available');
        }
    }

    /**
     * Notify that table is ready
     */
    static notifyReady(instance) {
        this.postMessage(instance, {
            type: 'dataTable.ready',
            tableId: instance.tableId
        });
    }

    /**
     * Handle component update from event bridge
     * Called by BaseBehavior.onComponentUpdate()
     */
    static handleComponentUpdate(instance, data) {
        console.log(`DataTableBehavior: handleComponentUpdate for ${instance.tableId}:`, data);

        if (data && Array.isArray(data)) {
            // Legacy format: just an array
            this.updateTableData(instance, data);
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
                this.toggleLoadingState(instance, data.loading, data.loadingMessage);
            }

            // Handle error state
            if (data.error) {
                this.showErrorOverlay(instance, data.error);
            } else if (data.error === null && !data.loading) {
                this.hideErrorOverlay(instance);
            }

            // Update table data if provided
            if (data.data && Array.isArray(data.data)) {
                this.updateTableData(instance, data.data, data);
            }
        } else {
            console.log(`DataTableBehavior: componentUpdate received unexpected format:`, data);
        }
    }

    /**
     * Handle custom messages beyond componentUpdate
     * Called by BaseBehavior.handleCustomAction()
     */
    static handleCustomMessage(instance, message) {
        console.log(`DataTableBehavior: handleCustomMessage for ${instance.tableId}:`, message);

        if (!message || !message.action) {
            console.warn('DataTableBehavior: Invalid message format', message);
            return;
        }

        const { action, data } = message;

        switch (action) {
            case 'setData':
                if (data && Array.isArray(data)) {
                    this.updateTableData(instance, data);
                }
                break;

            case 'setLoading':
                this.toggleLoadingState(instance, data?.loading, data?.message);
                break;

            case 'setError':
                this.showErrorOverlay(instance, data?.error || 'An error occurred');
                break;

            case 'clearError':
                this.hideErrorOverlay(instance);
                break;

            default:
                console.warn(`DataTableBehavior: Unknown action: ${action}`);
        }
    }

    /**
     * Update table data efficiently without full HTML regeneration
     */
    static updateTableData(instance, data, componentData = {}) {
        console.log(`DataTableBehavior: Updating table ${instance.tableId} with ${data.length} rows`);

        const tbody = instance.table.querySelector('tbody');
        if (!tbody) {
            console.warn(`DataTableBehavior: No tbody found in table ${instance.tableId}`);
            return;
        }

        // Analyze header structure
        const headers = instance.table.querySelectorAll('th[data-column-id]');
        const headerInfo = Array.from(headers).map(h => ({
            columnId: h.getAttribute('data-column-id'),
            text: h.textContent.trim(),
            index: Array.from(h.parentElement.children).indexOf(h)
        }));
        // Clear existing rows
        tbody.innerHTML = '';

        // Add new rows
        data.forEach(rowData => {
            const tr = this.createTableRow(instance, rowData);
            tbody.appendChild(tr);
        });

        // Update footer with row counts
        const visibleCount = data.length; // Filtered/visible rows
        const totalCount = componentData.totalRows !== undefined ? componentData.totalRows : data.length; // Total unfiltered rows
        const pageInfo = instance.container?.querySelector('.page-info') || instance.container?.querySelector('.data-table-page-info');
        if (pageInfo) {
            const hasFilters = componentData.filters && Object.keys(componentData.filters).some(key => componentData.filters[key]);
            const searchActive = componentData.searchQuery && componentData.searchQuery.trim() !== '';
            const isFiltered = hasFilters || searchActive;

            // Show "X of Y" when filtered, "X" when not
            const newText = isFiltered
                ? `Showing ${visibleCount} of ${totalCount} items`
                : `Showing ${totalCount} items`;

            pageInfo.textContent = newText;
        }

    }

    /**
     * Create a table row from data
     */
    static createTableRow(instance, rowData) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row-id', rowData.id);
        tr.className = 'data-table-body-row';

        // Get all header cells in the exact order they appear in the table
        const headerRow = instance.table.querySelector('thead tr');
        if (!headerRow) {
            console.error('DataTableBehavior: No header row found');
            return tr;
        }

        const headerCells = headerRow.querySelectorAll('th[data-column-id]');

        Array.from(headerCells).forEach((header, index) => {
            const columnId = header.getAttribute('data-column-id');
            const columnType = header.getAttribute('data-column-type'); // Get column type
            const td = document.createElement('td');
            td.className = 'data-table-body-cell';
            td.setAttribute('data-column-id', columnId);

            if (columnId && rowData.hasOwnProperty(columnId)) {
                const value = rowData[columnId] || '';
                // Use innerHTML for HTML columns, textContent for others (security)
                if (columnType === 'html') {
                    td.innerHTML = value;
                } else {
                    td.textContent = value;
                }
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
    static toggleLoadingState(instance, loading, message) {
        console.log(`DataTableBehavior ${instance.tableId}: toggleLoadingState(${loading}, "${message}")`);
        if (loading) {
            this.showLoadingOverlay(instance, message || 'Loading...');
        } else {
            this.hideLoadingOverlay(instance);
        }
    }

    /**
     * Hide loading overlay
     */
    static hideLoadingOverlay(instance) {
        if (!instance.container) return;

        const overlay = instance.container.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Hide error overlay
     */
    static hideErrorOverlay(instance) {
        if (!instance.container) return;

        const overlay = instance.container.querySelector('.error-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        instance.sortHandlers.clear();
        instance.filterHandlers.clear();
        instance.actionHandlers.clear();

        // Remove search event listener
        if (instance.searchMessageHandler) {
            window.removeEventListener('component-message', instance.searchMessageHandler);
        }

        instance.initialized = false;
    }
}


// Register behavior
DataTableBehavior.register();
