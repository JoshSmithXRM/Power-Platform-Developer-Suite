import { DataTableComponent } from '../DataTable/DataTableComponent';
import { FilterableTableConfig, FilterableTableRow, FilterableTableColumn, FilterCondition, FilterGroup, SavedFilter, FilterableTableFilterEvent, FilterableTableSaveEvent, DEFAULT_FILTERABLE_TABLE_CONFIG, FilterableTableConfigValidator, FILTER_OPERATORS } from './FilterableTableConfig';
import { FilterableTableView, FilterableTableViewState } from './FilterableTableView';

/**
 * FilterableTableComponent - Advanced table with enhanced filtering capabilities
 * Extends DataTableComponent with sophisticated filter builder, saved filters, and advanced search
 * Supports complex filter expressions, filter groups, and custom filter operators
 */
export class FilterableTableComponent extends DataTableComponent {
    protected config: FilterableTableConfig;
    
    // Enhanced filtering state
    private filterGroups: FilterGroup[] = [];
    private activeFilters: FilterCondition[] = [];
    private savedFilters: SavedFilter[] = [];
    private quickFilter: string = '';
    private showAdvancedFilters: boolean = false;
    private filterHistory: SavedFilter[] = [];
    private nextConditionId: number = 1;
    private nextGroupId: number = 1;

    constructor(config: FilterableTableConfig) {
        const mergedConfig = { ...DEFAULT_FILTERABLE_TABLE_CONFIG, ...config } as FilterableTableConfig;
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        this.initializeFilterState();
    }

    /**
     * Initialize filtering state from config
     */
    private initializeFilterState(): void {
        if (this.config.filterPresets) {
            this.savedFilters = [...this.config.filterPresets];
        }
        
        if (this.config.defaultFilter) {
            this.loadFilter(this.config.defaultFilter);
        }
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const baseState = this.getState();
        
        const filterableState: FilterableTableViewState = {
            ...baseState,
            totalRows: baseState.data.length,
            loadingMessage: 'Loading...',
            filterGroups: this.filterGroups,
            activeFilters: this.activeFilters,
            savedFilters: this.savedFilters,
            quickFilter: this.quickFilter,
            showAdvancedFilters: this.showAdvancedFilters,
            highlightMatches: this.config.highlightMatches || false
        };
        
        return FilterableTableView.render(this.config, filterableState);
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'components/FilterableTableBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'filterable-table';
    }

    /**
     * Set quick filter query
     */
    public setQuickFilter(query: string): void {
        const oldQuery = this.quickFilter;
        this.quickFilter = query;
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
        
        this.notifyStateChange({
            quickFilter: query,
            oldQuickFilter: oldQuery
        });
        
        this.notifyUpdate();
    }

    /**
     * Get current quick filter query
     */
    public getQuickFilter(): string {
        return this.quickFilter;
    }

    /**
     * Toggle advanced filters panel
     */
    public toggleAdvancedFilters(): void {
        this.showAdvancedFilters = !this.showAdvancedFilters;
        this.notifyUpdate();
    }

    /**
     * Show advanced filters panel
     */
    public showAdvancedFiltersPanel(): void {
        this.showAdvancedFilters = true;
        this.notifyUpdate();
    }

    /**
     * Hide advanced filters panel
     */
    public hideAdvancedFiltersPanel(): void {
        this.showAdvancedFilters = false;
        this.notifyUpdate();
    }

    /**
     * Add new filter group
     */
    public addFilterGroup(name?: string): FilterGroup {
        const groupId = `group_${this.nextGroupId++}`;
        const group: FilterGroup = {
            id: groupId,
            name: name || `Group ${this.filterGroups.length + 1}`,
            logic: 'AND',
            conditions: [],
            enabled: true
        };
        
        this.filterGroups.push(group);
        this.notifyUpdate();
        
        return group;
    }

    /**
     * Remove filter group
     */
    public removeFilterGroup(groupId: string): void {
        const groupIndex = this.filterGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        
        this.filterGroups.splice(groupIndex, 1);
        this.rebuildActiveFilters();
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
        
        this.emitFilterChangeEvent();
        this.notifyUpdate();
    }

    /**
     * Update filter group
     */
    public updateFilterGroup(groupId: string, updates: Partial<FilterGroup>): void {
        const group = this.filterGroups.find(g => g.id === groupId);
        if (!group) return;
        
        Object.assign(group, updates);
        this.rebuildActiveFilters();
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
        
        this.emitFilterChangeEvent();
        this.notifyUpdate();
    }

    /**
     * Add condition to filter group
     */
    public addFilterCondition(groupId: string, condition?: Partial<FilterCondition>): FilterCondition {
        const group = this.filterGroups.find(g => g.id === groupId);
        if (!group) {
            throw new Error(`Filter group ${groupId} not found`);
        }
        
        const conditionId = `condition_${this.nextConditionId++}`;
        const newCondition: FilterCondition = {
            id: conditionId,
            columnId: '',
            operator: '',
            value: null,
            enabled: true,
            ...condition
        };
        
        group.conditions.push(newCondition);
        this.notifyUpdate();
        
        return newCondition;
    }

    /**
     * Remove condition from filter group
     */
    public removeFilterCondition(conditionId: string): void {
        for (const group of this.filterGroups) {
            const conditionIndex = group.conditions.findIndex(c => c.id === conditionId);
            if (conditionIndex !== -1) {
                group.conditions.splice(conditionIndex, 1);
                this.rebuildActiveFilters();
                
                if (this.config.clientSideFiltering) {
                    this.applyAllFilters();
                }
                
                this.emitFilterChangeEvent();
                this.notifyUpdate();
                return;
            }
        }
    }

    /**
     * Update filter condition
     */
    public updateFilterCondition(conditionId: string, updates: Partial<FilterCondition>): void {
        for (const group of this.filterGroups) {
            const condition = group.conditions.find(c => c.id === conditionId);
            if (condition) {
                Object.assign(condition, updates);
                this.rebuildActiveFilters();
                
                if (this.config.clientSideFiltering) {
                    this.applyAllFilters();
                }
                
                this.emitFilterChangeEvent();
                this.notifyUpdate();
                return;
            }
        }
    }

    /**
     * Apply all filters (quick filter + advanced filters)
     */
    private applyAllFilters(): void {
        let filteredData = [...this.getData()];
        
        // Apply quick filter first
        if (this.quickFilter) {
            filteredData = this.applyQuickFilter(filteredData, this.quickFilter);
        }
        
        // Apply advanced filters
        if (this.activeFilters.length > 0) {
            if (this.config.customFilterProcessor) {
                filteredData = this.config.customFilterProcessor(filteredData, this.activeFilters);
            } else {
                filteredData = this.applyAdvancedFilters(filteredData, this.filterGroups);
            }
        }
        
        // Update processed data in base class
        this.setProcessedData(filteredData);
    }

    /**
     * Apply quick filter to data
     */
    private applyQuickFilter(data: FilterableTableRow[], query: string): FilterableTableRow[] {
        if (!query) return data;
        
        const lowerQuery = query.toLowerCase();
        const searchColumns = this.config.quickFilterColumns?.length 
            ? this.config.quickFilterColumns 
            : this.config.columns.map(col => col.id);
        
        return data.filter(row => {
            return searchColumns.some(columnId => {
                const column = this.config.columns.find(col => col.id === columnId);
                if (!column) return false;
                
                const value = row[column.field];
                if (value === null || value === undefined) return false;
                
                const searchText = String(value).toLowerCase();
                
                if (this.config.fuzzySearch) {
                    return this.fuzzyMatch(searchText, lowerQuery);
                } else {
                    return searchText.includes(lowerQuery);
                }
            });
        });
    }

    /**
     * Apply advanced filters to data
     */
    private applyAdvancedFilters(data: FilterableTableRow[], groups: FilterGroup[]): FilterableTableRow[] {
        const activeGroups = groups.filter(g => g.enabled);
        if (activeGroups.length === 0) return data;
        
        return data.filter(row => {
            // Apply group logic (AND/OR between groups)
            return activeGroups.some(group => this.evaluateGroupForRow(row, group));
        });
    }

    /**
     * Evaluate filter group against row
     */
    private evaluateGroupForRow(row: FilterableTableRow, group: FilterGroup): boolean {
        const activeConditions = group.conditions.filter(c => c.enabled && c.columnId && c.operator);
        if (activeConditions.length === 0) return true;
        
        if (group.logic === 'AND') {
            return activeConditions.every(condition => this.evaluateConditionForRow(row, condition));
        } else {
            return activeConditions.some(condition => this.evaluateConditionForRow(row, condition));
        }
    }

    /**
     * Evaluate filter condition against row
     */
    private evaluateConditionForRow(row: FilterableTableRow, condition: FilterCondition): boolean {
        const column = this.config.columns.find(col => col.id === condition.columnId);
        if (!column) return false;
        
        const cellValue = row[column.field];
        const { operator, value, values } = condition;
        
        // Use custom operator if available
        if (this.config.customOperators && this.config.customOperators[operator]) {
            return this.config.customOperators[operator](cellValue, value);
        }
        
        // Use built-in operators
        return this.evaluateOperator(cellValue, operator, value, values, column.type || 'text');
    }

    /**
     * Evaluate built-in operator
     */
    private evaluateOperator(cellValue: any, operator: string, filterValue: any, filterValues?: any[], columnType: string = 'text'): boolean {
        // Handle null/undefined values
        if (cellValue === null || cellValue === undefined) {
            return operator === 'isEmpty' || operator === 'isNotEmpty';
        }
        
        switch (operator) {
            case 'equals':
                return String(cellValue).toLowerCase() === String(filterValue).toLowerCase();
                
            case 'contains':
                return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
                
            case 'startsWith':
                return String(cellValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
                
            case 'endsWith':
                return String(cellValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
                
            case 'greaterThan':
                return Number(cellValue) > Number(filterValue);
                
            case 'lessThan':
                return Number(cellValue) < Number(filterValue);
                
            case 'greaterThanOrEqual':
                return Number(cellValue) >= Number(filterValue);
                
            case 'lessThanOrEqual':
                return Number(cellValue) <= Number(filterValue);
                
            case 'between':
                if (!filterValues || filterValues.length < 2) return false;
                const numValue = Number(cellValue);
                return numValue >= Number(filterValues[0]) && numValue <= Number(filterValues[1]);
                
            case 'in':
                if (!filterValues) return false;
                return filterValues.some(val => String(cellValue).toLowerCase() === String(val).toLowerCase());
                
            case 'notIn':
                if (!filterValues) return true;
                return !filterValues.some(val => String(cellValue).toLowerCase() === String(val).toLowerCase());
                
            case 'isEmpty':
                return cellValue === null || cellValue === undefined || String(cellValue).trim() === '';
                
            case 'isNotEmpty':
                return cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '';
                
            case 'isTrue':
                return Boolean(cellValue) === true;
                
            case 'isFalse':
                return Boolean(cellValue) === false;
                
            // Date operators
            case 'after':
                return new Date(cellValue) > new Date(filterValue);
                
            case 'before':
                return new Date(cellValue) < new Date(filterValue);
                
            case 'today':
                const today = new Date();
                const cellDate = new Date(cellValue);
                return cellDate.toDateString() === today.toDateString();
                
            case 'thisWeek':
                const now = new Date();
                const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                const cellDateWeek = new Date(cellValue);
                return cellDateWeek >= weekStart && cellDateWeek <= weekEnd;
                
            default:
                return false;
        }
    }

    /**
     * Fuzzy match implementation
     */
    private fuzzyMatch(text: string, pattern: string): boolean {
        let patternIdx = 0;
        let textIdx = 0;
        
        while (patternIdx < pattern.length && textIdx < text.length) {
            if (pattern[patternIdx] === text[textIdx]) {
                patternIdx++;
            }
            textIdx++;
        }
        
        return patternIdx === pattern.length;
    }

    /**
     * Rebuild active filters from groups
     */
    private rebuildActiveFilters(): void {
        this.activeFilters = [];
        
        for (const group of this.filterGroups) {
            if (group.enabled) {
                for (const condition of group.conditions) {
                    if (condition.enabled && condition.columnId && condition.operator) {
                        this.activeFilters.push(condition);
                    }
                }
            }
        }
    }

    /**
     * Clear all filters
     */
    public clearAllFilters(): void {
        this.quickFilter = '';
        this.filterGroups = [];
        this.activeFilters = [];
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
        
        this.emitFilterChangeEvent();
        this.notifyUpdate();
    }

    /**
     * Save current filter configuration
     */
    public saveFilter(name: string, description?: string, isDefault?: boolean): SavedFilter {
        const savedFilter: SavedFilter = {
            id: `filter_${Date.now()}`,
            name,
            description,
            groups: JSON.parse(JSON.stringify(this.filterGroups)),
            globalLogic: 'OR', // Could be configurable
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isDefault
        };
        
        this.savedFilters.push(savedFilter);
        
        // Add to history
        this.addToFilterHistory(savedFilter);
        
        this.emitSaveEvent(savedFilter);
        
        if (this.config.onFilterSave) {
            this.config.onFilterSave(savedFilter);
        }
        
        this.notifyUpdate();
        return savedFilter;
    }

    /**
     * Load saved filter
     */
    public loadFilter(filter: SavedFilter): void {
        this.filterGroups = JSON.parse(JSON.stringify(filter.groups));
        this.rebuildActiveFilters();
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
        
        this.addToFilterHistory(filter);
        
        if (this.config.onFilterLoad) {
            this.config.onFilterLoad(filter);
        }
        
        this.emitFilterChangeEvent();
        this.notifyUpdate();
    }

    /**
     * Delete saved filter
     */
    public deleteSavedFilter(filterId: string): void {
        const filterIndex = this.savedFilters.findIndex(f => f.id === filterId);
        if (filterIndex === -1) return;
        
        this.savedFilters.splice(filterIndex, 1);
        
        if (this.config.onFilterDelete) {
            this.config.onFilterDelete(filterId);
        }
        
        this.notifyUpdate();
    }

    /**
     * Add filter to history
     */
    private addToFilterHistory(filter: SavedFilter): void {
        if (!this.config.filterHistory) return;
        
        // Remove if already in history
        this.filterHistory = this.filterHistory.filter(f => f.id !== filter.id);
        
        // Add to beginning
        this.filterHistory.unshift({ ...filter });
        
        // Limit history size
        const maxHistory = this.config.maxFilterHistory || 10;
        if (this.filterHistory.length > maxHistory) {
            this.filterHistory = this.filterHistory.slice(0, maxHistory);
        }
    }

    /**
     * Get saved filters
     */
    public getSavedFilters(): SavedFilter[] {
        return [...this.savedFilters];
    }

    /**
     * Get filter history
     */
    public getFilterHistory(): SavedFilter[] {
        return [...this.filterHistory];
    }

    /**
     * Get active filters
     */
    public getActiveFilters(): FilterCondition[] {
        return [...this.activeFilters];
    }

    /**
     * Get filter groups
     */
    public getFilterGroups(): FilterGroup[] {
        return [...this.filterGroups];
    }

    /**
     * Get filterable table state
     */
    public getFilterableState() {
        const baseState = this.getState();
        return {
            ...baseState,
            filterGroups: this.filterGroups,
            activeFilters: this.activeFilters,
            savedFilters: this.savedFilters,
            quickFilter: this.quickFilter,
            showAdvancedFilters: this.showAdvancedFilters,
            filterHistory: this.filterHistory
        };
    }

    /**
     * Emit filter change event
     */
    private emitFilterChangeEvent(): void {
        const event: FilterableTableFilterEvent = {
            componentId: this.getId(),
            filterGroups: this.filterGroups,
            activeFilters: this.activeFilters,
            resultCount: this.getProcessedData().length,
            timestamp: Date.now()
        };
        
        this.emit('filterChange', event);
        
        if (this.config.onFilterChange) {
            this.config.onFilterChange(this.filterGroups, this.activeFilters);
        }
    }

    /**
     * Emit save filter event
     */
    private emitSaveEvent(filter: SavedFilter): void {
        const event: FilterableTableSaveEvent = {
            componentId: this.getId(),
            savedFilter: filter,
            timestamp: Date.now()
        };
        
        this.emit('filterSave', event);
    }

    /**
     * Override setData to apply filters
     */
    public setData(data: FilterableTableRow[]): void {
        super.setData(data);
        
        if (this.config.clientSideFiltering) {
            this.applyAllFilters();
        }
    }

    /**
     * Get processed data (for accessing filtered results)
     */
    private getProcessedData(): FilterableTableRow[] {
        // This would access the processed data from the base DataTableComponent
        // In real implementation, we'd need to expose this from the base class
        return this.getData(); // Placeholder
    }

    /**
     * Set processed data (for updating filtered results)
     */
    private setProcessedData(data: FilterableTableRow[]): void {
        // This would update the processed data in the base DataTableComponent
        // In real implementation, we'd need to expose this from the base class
    }

    /**
     * Validate configuration
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        const validation = FilterableTableConfigValidator.validate(this.config);
        if (!validation.isValid) {
            throw new Error(`FilterableTable configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                console.warn(`FilterableTable warning: ${warning}`);
            });
        }
    }
}
