/**
 * FilterableTableBehavior.js - Webview-side behavior for FilterableTable components
 * Extends DataTableBehavior with advanced filtering interactions and UI management
 * Handles filter builder, saved filters, and enhanced filtering UX
 */

class FilterableTableBehavior {
    constructor(tableId) {
        this.tableId = tableId;
        this.table = document.getElementById(tableId);
        this.container = this.table?.closest('.filterable-table');
        this.initialized = false;
        
        // Filter state
        this.filterGroups = [];
        this.activeFilters = [];
        this.savedFilters = [];
        this.quickFilter = '';
        this.showAdvancedFilters = false;
        
        // Debounce timers
        this.quickFilterTimer = null;
        this.filterChangeTimer = null;
        
        if (!this.table) {
            console.error(`FilterableTable with ID '${tableId}' not found`);
            return;
        }
        
        this.init();
    }
    
    /**
     * Initialize filterable table behavior
     */
    init() {
        if (this.initialized) return;
        
        try {
            // Initialize base table behavior first
            if (window.DataTableBehavior) {
                this.dataTableBehavior = new window.DataTableBehavior(this.tableId);
            }
            
            this.setupQuickFilter();
            this.setupFilterControls();
            this.setupAdvancedFilters();
            this.setupFilterBuilder();
            this.setupSavedFilters();
            
            this.initialized = true;
            this.notifyReady();
        } catch (error) {
            console.error(`Failed to initialize FilterableTable '${this.tableId}':`, error);
        }
    }
    
    /**
     * Setup quick filter functionality
     */
    setupQuickFilter() {
        const quickFilterInput = this.container?.querySelector('[data-component-element="quick-filter"]');
        const clearButton = this.container?.querySelector('[data-component-element="clear-quick-filter"]');
        
        if (quickFilterInput) {
            quickFilterInput.addEventListener('input', (event) => {
                const value = event.target.value;
                this.handleQuickFilterChange(value);
            });
            
            quickFilterInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    clearTimeout(this.quickFilterTimer);
                    this.handleQuickFilterChange(event.target.value, true);
                }
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearQuickFilter();
            });
        }
    }
    
    /**
     * Setup filter control buttons
     */
    setupFilterControls() {
        // Toggle advanced filters
        const toggleButton = this.container?.querySelector('[data-component-element="toggle-advanced-filters"]');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleAdvancedFilters();
            });
        }
        
        // Clear all filters
        const clearAllButton = this.container?.querySelector('[data-component-element="clear-filters"]');
        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
        
        // Save filter
        const saveButton = this.container?.querySelector('[data-component-element="save-filter"]');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.showSaveFilterDialog();
            });
        }
        
        // Share filter
        const shareButton = this.container?.querySelector('[data-component-element="share-filter"]');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                this.shareCurrentFilter();
            });
        }
    }
    
    /**
     * Setup advanced filters panel
     */
    setupAdvancedFilters() {
        // Close advanced filters
        const closeButton = this.container?.querySelector('[data-component-element="close-advanced-filters"]');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideAdvancedFilters();
            });
        }
        
        // Apply filters
        const applyButton = this.container?.querySelector('[data-component-element="apply-filters"]');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        // Add filter group
        const addGroupButton = this.container?.querySelector('[data-component-element="add-filter-group"]');
        if (addGroupButton) {
            addGroupButton.addEventListener('click', () => {
                this.addFilterGroup();
            });
        }
        
        // Global logic selector
        const globalLogicSelect = this.container?.querySelector('[data-component-element="global-logic"]');
        if (globalLogicSelect) {
            globalLogicSelect.addEventListener('change', (event) => {
                this.updateGlobalLogic(event.target.value);
            });
        }
    }
    
    /**
     * Setup filter builder interactions
     */
    setupFilterBuilder() {
        this.setupFilterGroupControls();
        this.setupFilterConditionControls();
    }
    
    /**
     * Setup filter group controls
     */
    setupFilterGroupControls() {
        // Group logic selectors
        const groupLogicSelects = this.container?.querySelectorAll('[data-component-element="group-logic"]');
        groupLogicSelects?.forEach(select => {
            select.addEventListener('change', (event) => {
                const groupId = event.target.dataset.groupId;
                this.updateGroupLogic(groupId, event.target.value);
            });
        });
        
        // Group enabled toggles
        const groupToggles = this.container?.querySelectorAll('[data-component-element="toggle-group"]');
        groupToggles?.forEach(toggle => {
            toggle.addEventListener('change', (event) => {
                const groupId = event.target.dataset.groupId;
                this.toggleGroup(groupId, event.target.checked);
            });
        });
        
        // Remove group buttons
        const removeGroupButtons = this.container?.querySelectorAll('[data-component-element="remove-group"]');
        removeGroupButtons?.forEach(button => {
            button.addEventListener('click', (event) => {
                const groupId = event.target.dataset.groupId;
                this.removeFilterGroup(groupId);
            });
        });
        
        // Add condition buttons
        const addConditionButtons = this.container?.querySelectorAll('[data-component-element="add-condition"]');
        addConditionButtons?.forEach(button => {
            button.addEventListener('click', (event) => {
                const groupId = event.target.dataset.groupId;
                this.addFilterCondition(groupId);
            });
        });
    }
    
    /**
     * Setup filter condition controls
     */
    setupFilterConditionControls() {
        // Column selectors
        const columnSelects = this.container?.querySelectorAll('[data-component-element="condition-column"]');
        columnSelects?.forEach(select => {
            select.addEventListener('change', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.updateConditionColumn(conditionId, event.target.value);
            });
        });
        
        // Operator selectors
        const operatorSelects = this.container?.querySelectorAll('[data-component-element="condition-operator"]');
        operatorSelects?.forEach(select => {
            select.addEventListener('change', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.updateConditionOperator(conditionId, event.target.value);
            });
        });
        
        // Value inputs
        this.setupConditionValueInputs();
        
        // Condition toggles
        const conditionToggles = this.container?.querySelectorAll('[data-component-element="toggle-condition"]');
        conditionToggles?.forEach(toggle => {
            toggle.addEventListener('change', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.toggleCondition(conditionId, event.target.checked);
            });
        });
        
        // Remove condition buttons
        const removeConditionButtons = this.container?.querySelectorAll('[data-component-element="remove-condition"]');
        removeConditionButtons?.forEach(button => {
            button.addEventListener('click', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.removeFilterCondition(conditionId);
            });
        });
    }
    
    /**
     * Setup condition value inputs
     */
    setupConditionValueInputs() {
        // Single value inputs
        const valueInputs = this.container?.querySelectorAll('[data-component-element="condition-value"]');
        valueInputs?.forEach(input => {
            input.addEventListener('input', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.updateConditionValue(conditionId, event.target.value);
            });
        });
        
        // Range inputs
        const fromInputs = this.container?.querySelectorAll('[data-component-element="condition-value-from"]');
        fromInputs?.forEach(input => {
            input.addEventListener('input', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.updateConditionRangeValue(conditionId, 'from', event.target.value);
            });
        });
        
        const toInputs = this.container?.querySelectorAll('[data-component-element="condition-value-to"]');
        toInputs?.forEach(input => {
            input.addEventListener('input', (event) => {
                const conditionId = event.target.dataset.conditionId;
                this.updateConditionRangeValue(conditionId, 'to', event.target.value);
            });
        });
        
        // Multiple value inputs
        const multipleInputs = this.container?.querySelectorAll('[data-component-element="condition-value-multiple"]');
        multipleInputs?.forEach(input => {
            input.addEventListener('input', (event) => {
                const conditionId = event.target.dataset.conditionId;
                const values = event.target.value.split('\n').filter(v => v.trim());
                this.updateConditionMultipleValues(conditionId, values);
            });
        });
    }
    
    /**
     * Setup saved filters functionality
     */
    setupSavedFilters() {
        const presetSelect = this.container?.querySelector('[data-component-element="filter-preset"]');
        if (presetSelect) {
            presetSelect.addEventListener('change', (event) => {
                const filterId = event.target.value;
                if (filterId) {
                    this.loadSavedFilter(filterId);
                }
            });
        }
        
        // Setup filter tag removal
        const filterTags = this.container?.querySelectorAll('.filter-tag-remove');
        filterTags?.forEach(button => {
            button.addEventListener('click', (event) => {
                const filterId = event.target.dataset.filterId;
                this.removeActiveFilter(filterId);
            });
        });
    }
    
    /**
     * Handle quick filter changes with debouncing
     */
    handleQuickFilterChange(value, immediate = false) {
        this.quickFilter = value;
        
        clearTimeout(this.quickFilterTimer);
        
        const delay = immediate ? 0 : 300;
        this.quickFilterTimer = setTimeout(() => {
            this.postMessage({
                type: 'filterableTable.quickFilter',
                tableId: this.tableId,
                query: value
            });
        }, delay);
    }
    
    /**
     * Clear quick filter
     */
    clearQuickFilter() {
        const quickFilterInput = this.container?.querySelector('[data-component-element="quick-filter"]');
        if (quickFilterInput) {
            quickFilterInput.value = '';
        }
        
        this.handleQuickFilterChange('', true);
    }
    
    /**
     * Toggle advanced filters panel
     */
    toggleAdvancedFilters() {
        this.showAdvancedFilters = !this.showAdvancedFilters;
        this.container?.classList.toggle('filterable-table--advanced-open', this.showAdvancedFilters);
        
        this.postMessage({
            type: 'filterableTable.toggleAdvanced',
            tableId: this.tableId,
            show: this.showAdvancedFilters
        });
    }
    
    /**
     * Hide advanced filters panel
     */
    hideAdvancedFilters() {
        this.showAdvancedFilters = false;
        this.container?.classList.remove('filterable-table--advanced-open');
        
        this.postMessage({
            type: 'filterableTable.toggleAdvanced',
            tableId: this.tableId,
            show: false
        });
    }
    
    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.postMessage({
            type: 'filterableTable.clearAll',
            tableId: this.tableId
        });
    }
    
    /**
     * Add filter group
     */
    addFilterGroup() {
        this.postMessage({
            type: 'filterableTable.addGroup',
            tableId: this.tableId
        });
    }
    
    /**
     * Remove filter group
     */
    removeFilterGroup(groupId) {
        this.postMessage({
            type: 'filterableTable.removeGroup',
            tableId: this.tableId,
            groupId
        });
    }
    
    /**
     * Update group logic
     */
    updateGroupLogic(groupId, logic) {
        this.postMessage({
            type: 'filterableTable.updateGroup',
            tableId: this.tableId,
            groupId,
            updates: { logic }
        });
    }
    
    /**
     * Toggle group enabled state
     */
    toggleGroup(groupId, enabled) {
        this.postMessage({
            type: 'filterableTable.updateGroup',
            tableId: this.tableId,
            groupId,
            updates: { enabled }
        });
    }
    
    /**
     * Add filter condition
     */
    addFilterCondition(groupId) {
        this.postMessage({
            type: 'filterableTable.addCondition',
            tableId: this.tableId,
            groupId
        });
    }
    
    /**
     * Remove filter condition
     */
    removeFilterCondition(conditionId) {
        this.postMessage({
            type: 'filterableTable.removeCondition',
            tableId: this.tableId,
            conditionId
        });
    }
    
    /**
     * Update condition column
     */
    updateConditionColumn(conditionId, columnId) {
        this.postMessage({
            type: 'filterableTable.updateCondition',
            tableId: this.tableId,
            conditionId,
            updates: { columnId }
        });
    }
    
    /**
     * Update condition operator
     */
    updateConditionOperator(conditionId, operator) {
        this.postMessage({
            type: 'filterableTable.updateCondition',
            tableId: this.tableId,
            conditionId,
            updates: { operator }
        });
    }
    
    /**
     * Update condition value
     */
    updateConditionValue(conditionId, value) {
        clearTimeout(this.filterChangeTimer);
        this.filterChangeTimer = setTimeout(() => {
            this.postMessage({
                type: 'filterableTable.updateCondition',
                tableId: this.tableId,
                conditionId,
                updates: { value }
            });
        }, 300);
    }
    
    /**
     * Update condition range value
     */
    updateConditionRangeValue(conditionId, rangeType, value) {
        clearTimeout(this.filterChangeTimer);
        this.filterChangeTimer = setTimeout(() => {
            this.postMessage({
                type: 'filterableTable.updateConditionRange',
                tableId: this.tableId,
                conditionId,
                rangeType,
                value
            });
        }, 300);
    }
    
    /**
     * Update condition multiple values
     */
    updateConditionMultipleValues(conditionId, values) {
        clearTimeout(this.filterChangeTimer);
        this.filterChangeTimer = setTimeout(() => {
            this.postMessage({
                type: 'filterableTable.updateCondition',
                tableId: this.tableId,
                conditionId,
                updates: { values }
            });
        }, 300);
    }
    
    /**
     * Toggle condition enabled state
     */
    toggleCondition(conditionId, enabled) {
        this.postMessage({
            type: 'filterableTable.updateCondition',
            tableId: this.tableId,
            conditionId,
            updates: { enabled }
        });
    }
    
    /**
     * Apply filters
     */
    applyFilters() {
        this.postMessage({
            type: 'filterableTable.applyFilters',
            tableId: this.tableId
        });
    }
    
    /**
     * Load saved filter
     */
    loadSavedFilter(filterId) {
        this.postMessage({
            type: 'filterableTable.loadFilter',
            tableId: this.tableId,
            filterId
        });
    }
    
    /**
     * Remove active filter
     */
    removeActiveFilter(filterId) {
        this.postMessage({
            type: 'filterableTable.removeActiveFilter',
            tableId: this.tableId,
            filterId
        });
    }
    
    /**
     * Show save filter dialog
     */
    showSaveFilterDialog() {
        const name = prompt('Enter filter name:');
        if (name && name.trim()) {
            const description = prompt('Enter filter description (optional):');
            this.postMessage({
                type: 'filterableTable.saveFilter',
                tableId: this.tableId,
                name: name.trim(),
                description: description?.trim()
            });
        }
    }
    
    /**
     * Share current filter
     */
    shareCurrentFilter() {
        this.postMessage({
            type: 'filterableTable.shareFilter',
            tableId: this.tableId
        });
    }
    
    /**
     * Update global logic
     */
    updateGlobalLogic(logic) {
        this.postMessage({
            type: 'filterableTable.updateGlobalLogic',
            tableId: this.tableId,
            logic
        });
    }
    
    /**
     * Update table state from extension host
     */
    updateState(state) {
        try {
            // Update base table state
            if (this.dataTableBehavior) {
                this.dataTableBehavior.updateState(state);
            }
            
            // Update filterable-specific state
            this.updateFilterState(state);
            this.updateFilterSummary(state);
            this.updateAdvancedFiltersPanel(state);
        } catch (error) {
            console.error('Failed to update FilterableTable state:', error);
        }
    }
    
    /**
     * Update filter state
     */
    updateFilterState(state) {
        this.filterGroups = state.filterGroups || [];
        this.activeFilters = state.activeFilters || [];
        this.savedFilters = state.savedFilters || [];
        this.quickFilter = state.quickFilter || '';
        this.showAdvancedFilters = state.showAdvancedFilters || false;
        
        // Update quick filter input
        const quickFilterInput = this.container?.querySelector('[data-component-element="quick-filter"]');
        if (quickFilterInput && quickFilterInput.value !== this.quickFilter) {
            quickFilterInput.value = this.quickFilter;
        }
        
        // Update active filters count
        const countBadge = this.container?.querySelector('.filter-count-badge');
        if (countBadge) {
            const count = this.activeFilters.length;
            countBadge.textContent = `${count} filter${count !== 1 ? 's' : ''} active`;
            countBadge.parentElement.style.display = count > 0 ? '' : 'none';
        }
    }
    
    /**
     * Update filter summary
     */
    updateFilterSummary(state) {
        const summary = this.container?.querySelector('.filterable-table-filter-summary');
        if (summary) {
            summary.style.display = this.activeFilters.length > 0 ? '' : 'none';
        }
    }
    
    /**
     * Update advanced filters panel
     */
    updateAdvancedFiltersPanel(state) {
        this.container?.classList.toggle('filterable-table--advanced-open', this.showAdvancedFilters);
        
        const toggleButton = this.container?.querySelector('[data-component-element="toggle-advanced-filters"]');
        if (toggleButton) {
            toggleButton.textContent = this.showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters';
        }
    }
    
    /**
     * Highlight matching text
     */
    highlightMatches(query) {
        if (!query || !this.config?.highlightMatches) return;
        
        const rows = this.table?.querySelectorAll('tbody tr');
        rows?.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                const text = cell.textContent;
                if (text && text.toLowerCase().includes(query.toLowerCase())) {
                    // Add highlighting (simplified implementation)
                    cell.classList.add('filterable-table-cell--match');
                } else {
                    cell.classList.remove('filterable-table-cell--match');
                }
            });
        });
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
            type: 'filterableTable.ready',
            tableId: this.tableId
        });
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        if (this.dataTableBehavior) {
            this.dataTableBehavior.destroy();
        }
        
        clearTimeout(this.quickFilterTimer);
        clearTimeout(this.filterChangeTimer);
        
        this.initialized = false;
    }
}

// Auto-initialize tables when DOM is ready
if (typeof window !== 'undefined') {
    window.FilterableTableBehavior = FilterableTableBehavior;
    
    // Initialize all filterable tables
    function initializeFilterableTables() {
        const tables = document.querySelectorAll('.filterable-table table[id]');
        tables.forEach(table => {
            if (!table.dataset.filterableInitialized) {
                new FilterableTableBehavior(table.id);
                table.dataset.filterableInitialized = 'true';
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFilterableTables);
    } else {
        initializeFilterableTables();
    }
    
    // Re-initialize when new content is added
    const observer = new MutationObserver(() => {
        initializeFilterableTables();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
