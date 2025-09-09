import { BaseComponent } from '../../base/BaseComponent';
import { DataTableConfig, DataTableRow, DataTableColumn, DataTableAction, DataTableSortEvent, DataTableFilterEvent, DataTablePageEvent, DataTableSelectionEvent, DataTableActionEvent, DEFAULT_DATA_TABLE_CONFIG, DATA_TABLE_VALIDATION, DataTableConfigValidator } from './DataTableConfig';
import { DataTableView, DataTableViewState } from './DataTableView';

/**
 * DataTableComponent - Comprehensive data table with sorting, filtering, pagination, and actions
 * Used throughout the extension for displaying tabular data with rich interactions
 * Supports multi-instance usage with independent state management
 */
export class DataTableComponent extends BaseComponent {
    protected config: DataTableConfig;
    private data: DataTableRow[] = [];
    private processedData: DataTableRow[] = [];
    private selectedRows: Set<string | number> = new Set();
    private sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
    private filters: Record<string, any> = {};
    private currentPage: number = 1;
    private pageSize: number = 50;
    private searchQuery: string = '';
    private loading: boolean = false;
    private loadingMessage: string = 'Loading...';
    private error: string | null = null;
    private expandedRows: Set<string | number> = new Set();
    private columnVisibility: Map<string, boolean> = new Map();
    private columnOrder: string[] = [];

    constructor(config: DataTableConfig) {
        const mergedConfig = { ...DEFAULT_DATA_TABLE_CONFIG, ...config } as DataTableConfig;
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        this.initializeState();
    }

    /**
     * Initialize component state from config
     */
    private initializeState(): void {
        if (this.config.data) {
            this.setData(this.config.data);
        }
        
        if (this.config.selectedRows) {
            this.selectedRows = new Set(this.config.selectedRows);
        }
        
        if (this.config.defaultSort) {
            this.sortConfig = [...this.config.defaultSort];
        }
        
        if (this.config.pageSize) {
            this.pageSize = this.config.pageSize;
        }
        
        if (this.config.currentPage) {
            this.currentPage = this.config.currentPage;
        }
        
        if (this.config.loading) {
            this.loading = this.config.loading;
        }
        
        if (this.config.loadingMessage) {
            this.loadingMessage = this.config.loadingMessage;
        }
        
        // Initialize column visibility and order
        this.config.columns.forEach(column => {
            this.columnVisibility.set(column.id, column.visible !== false);
        });
        this.columnOrder = this.config.columns.map(c => c.id);
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const viewState: DataTableViewState = {
            data: this.getPageData(),
            selectedRows: Array.from(this.selectedRows),
            sortConfig: this.sortConfig,
            filters: this.filters,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            totalRows: this.processedData.length,
            searchQuery: this.searchQuery,
            loading: this.loading,
            loadingMessage: this.loadingMessage,
            error: this.error,
            expandedRows: Array.from(this.expandedRows),
            columnVisibility: Object.fromEntries(this.columnVisibility),
            columnOrder: this.columnOrder
        };
        
        return DataTableView.render(this.config, viewState);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'components/data-table.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'components/DataTableBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'data-table';
    }

    /**
     * Set table data
     */
    public setData(data: DataTableRow[]): void {
        this.data = [...data];
        this.processData();
        this.notifyUpdate();
    }

    /**
     * Get current data
     */
    public getData(): DataTableRow[] {
        return [...this.data];
    }

    /**
     * Process data with sorting, filtering, and search
     */
    private processData(): void {
        let processed = [...this.data];
        
        // Apply search
        if (this.searchQuery && this.config.searchable) {
            processed = this.applySearch(processed, this.searchQuery);
        }
        
        // Apply filters
        if (Object.keys(this.filters).length > 0 && this.config.filterable) {
            processed = this.applyFilters(processed, this.filters);
        }
        
        // Apply sorting
        if (this.sortConfig.length > 0 && this.config.sortable) {
            processed = this.applySort(processed, this.sortConfig);
        }
        
        this.processedData = processed;
        
        // Reset to first page if current page is out of bounds
        const maxPage = Math.ceil(this.processedData.length / this.pageSize);
        if (this.currentPage > maxPage && maxPage > 0) {
            this.currentPage = 1;
        }
    }

    /**
     * Apply search to data
     */
    private applySearch(data: DataTableRow[], query: string): DataTableRow[] {
        const lowerQuery = query.toLowerCase();
        return data.filter(row => {
            return this.config.columns.some(column => {
                const value = row[column.field];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }

    /**
     * Apply filters to data
     */
    private applyFilters(data: DataTableRow[], filters: Record<string, any>): DataTableRow[] {
        return data.filter(row => {
            return Object.entries(filters).every(([columnId, filterValue]) => {
                if (!filterValue) return true;
                
                const column = this.config.columns.find(c => c.id === columnId);
                if (!column) return true;
                
                const value = row[column.field];
                
                // Handle different filter types
                if (column.filterType === 'multiselect' && Array.isArray(filterValue)) {
                    return filterValue.includes(value);
                }
                
                if (column.filterType === 'daterange' && typeof filterValue === 'object') {
                    const date = new Date(value);
                    const { from, to } = filterValue;
                    if (from && date < new Date(from)) return false;
                    if (to && date > new Date(to)) return false;
                    return true;
                }
                
                if (column.filterType === 'number') {
                    const numValue = Number(value);
                    const numFilter = Number(filterValue);
                    return numValue === numFilter;
                }
                
                // Default text filter
                return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            });
        });
    }

    /**
     * Apply sorting to data
     */
    private applySort(data: DataTableRow[], sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }>): DataTableRow[] {
        return [...data].sort((a, b) => {
            for (const sort of sortConfig) {
                const column = this.config.columns.find(c => c.id === sort.column);
                if (!column) continue;
                
                let aVal = a[column.field];
                let bVal = b[column.field];
                
                // Use custom sort if provided
                if (column.customSort) {
                    const result = column.customSort(aVal, bVal);
                    if (result !== 0) {
                        return sort.direction === 'asc' ? result : -result;
                    }
                    continue;
                }
                
                // Handle null/undefined
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';
                
                // Type-based sorting
                let comparison = 0;
                if (column.type === 'number') {
                    comparison = Number(aVal) - Number(bVal);
                } else if (column.type === 'date') {
                    comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
                } else if (column.type === 'boolean') {
                    comparison = (aVal === bVal) ? 0 : aVal ? 1 : -1;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }
                
                if (comparison !== 0) {
                    return sort.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }

    /**
     * Get data for current page
     */
    private getPageData(): DataTableRow[] {
        if (!this.config.paginated) {
            return this.processedData;
        }
        
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.processedData.slice(start, end);
    }

    /**
     * Sort table by column
     */
    public sort(columnId: string, direction?: 'asc' | 'desc'): void {
        const column = this.config.columns.find(c => c.id === columnId);
        if (!column || !column.sortable) return;
        
        if (this.config.multiSort) {
            // Multi-sort: add or update sort for this column
            const existingIndex = this.sortConfig.findIndex(s => s.column === columnId);
            if (existingIndex >= 0) {
                if (direction) {
                    this.sortConfig[existingIndex].direction = direction;
                } else {
                    this.sortConfig.splice(existingIndex, 1);
                }
            } else if (direction) {
                this.sortConfig.push({ column: columnId, direction });
            }
        } else {
            // Single sort
            if (direction) {
                this.sortConfig = [{ column: columnId, direction }];
            } else {
                this.sortConfig = [];
            }
        }
        
        this.processData();
        this.emitSortEvent();
        this.notifyUpdate();
    }

    /**
     * Filter table by column
     */
    public filter(columnId: string, value: any): void {
        if (value === null || value === undefined || value === '') {
            delete this.filters[columnId];
        } else {
            this.filters[columnId] = value;
        }
        
        this.currentPage = 1; // Reset to first page
        this.processData();
        this.emitFilterEvent();
        this.notifyUpdate();
    }

    /**
     * Clear all filters
     */
    public clearFilters(): void {
        this.filters = {};
        this.currentPage = 1;
        this.processData();
        this.emitFilterEvent();
        this.notifyUpdate();
    }

    /**
     * Search table
     */
    public search(query: string): void {
        this.searchQuery = query;
        this.currentPage = 1;
        this.processData();
        
        if (this.config.onSearch) {
            this.config.onSearch(query);
        }
        
        this.notifyUpdate();
    }

    /**
     * Change page
     */
    public setPage(page: number): void {
        const maxPage = Math.ceil(this.processedData.length / this.pageSize);
        if (page < 1 || page > maxPage) return;
        
        this.currentPage = page;
        this.emitPageEvent();
        this.notifyUpdate();
    }

    /**
     * Change page size
     */
    public setPageSize(size: number): void {
        if (size < DATA_TABLE_VALIDATION.MIN_PAGE_SIZE || 
            size > DATA_TABLE_VALIDATION.MAX_PAGE_SIZE) return;
        
        this.pageSize = size;
        this.currentPage = 1;
        this.emitPageEvent();
        this.notifyUpdate();
    }

    /**
     * Select/deselect rows
     */
    public selectRows(rowIds: Array<string | number>, selected: boolean = true): void {
        if (selected) {
            if (this.config.selectMode === 'single') {
                this.selectedRows.clear();
                if (rowIds.length > 0) {
                    this.selectedRows.add(rowIds[0]);
                }
            } else {
                rowIds.forEach(id => this.selectedRows.add(id));
            }
        } else {
            rowIds.forEach(id => this.selectedRows.delete(id));
        }
        
        this.emitSelectionEvent();
        this.notifyUpdate();
    }

    /**
     * Toggle row selection
     */
    public toggleRowSelection(rowId: string | number): void {
        if (this.selectedRows.has(rowId)) {
            this.selectRows([rowId], false);
        } else {
            this.selectRows([rowId], true);
        }
    }

    /**
     * Select all rows
     */
    public selectAll(): void {
        const pageData = this.getPageData();
        const ids = pageData.map(row => row.id);
        this.selectRows(ids, true);
    }

    /**
     * Clear selection
     */
    public clearSelection(): void {
        this.selectedRows.clear();
        this.emitSelectionEvent();
        this.notifyUpdate();
    }

    /**
     * Get selected rows
     */
    public getSelectedRows(): DataTableRow[] {
        return this.data.filter(row => this.selectedRows.has(row.id));
    }

    /**
     * Expand/collapse row
     */
    public toggleRowExpansion(rowId: string | number): void {
        if (this.expandedRows.has(rowId)) {
            this.expandedRows.delete(rowId);
            if (this.config.onRowCollapse) {
                const row = this.data.find(r => r.id === rowId);
                if (row) this.config.onRowCollapse(row);
            }
        } else {
            this.expandedRows.add(rowId);
            if (this.config.onRowExpand) {
                const row = this.data.find(r => r.id === rowId);
                if (row) this.config.onRowExpand(row);
            }
        }
        this.notifyUpdate();
    }

    /**
     * Execute row action
     */
    public executeAction(actionId: string, rowId: string | number): void {
        const action = this.config.actions?.find(a => a.id === actionId);
        const row = this.data.find(r => r.id === rowId);
        
        if (!action || !row) return;
        
        if (action.onClick) {
            action.onClick(row, action);
        }
        
        this.emitActionEvent(action, row);
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean, message?: string): void {
        this.loading = loading;
        if (message) {
            this.loadingMessage = message;
        }
        this.notifyUpdate();
    }

    /**
     * Set error state
     */
    public setError(error: string | null): void {
        this.error = error;
        this.notifyUpdate();
    }

    /**
     * Toggle column visibility
     */
    public toggleColumnVisibility(columnId: string): void {
        const current = this.columnVisibility.get(columnId) ?? true;
        this.columnVisibility.set(columnId, !current);
        this.notifyUpdate();
    }

    /**
     * Reorder columns
     */
    public reorderColumns(columnIds: string[]): void {
        // Validate all column IDs exist
        const validIds = new Set(this.config.columns.map(c => c.id));
        if (!columnIds.every(id => validIds.has(id))) return;
        
        this.columnOrder = columnIds;
        
        if (this.config.onColumnReorder) {
            const orderedColumns = columnIds
                .map(id => this.config.columns.find(c => c.id === id))
                .filter(Boolean) as DataTableColumn[];
            this.config.onColumnReorder(orderedColumns);
        }
        
        this.notifyUpdate();
    }

    /**
     * Refresh table data
     */
    public refresh(): void {
        this.processData();
        this.notifyUpdate();
        
        this.emit('refresh', {
            componentId: this.getId(),
            timestamp: Date.now()
        });
    }

    /**
     * Get table state
     */
    public getState() {
        return {
            data: this.data,
            processedData: this.processedData,
            selectedRows: Array.from(this.selectedRows),
            sortConfig: this.sortConfig,
            filters: this.filters,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            searchQuery: this.searchQuery,
            loading: this.loading,
            error: this.error,
            expandedRows: Array.from(this.expandedRows),
            columnVisibility: Object.fromEntries(this.columnVisibility),
            columnOrder: this.columnOrder
        };
    }

    /**
     * Validate configuration
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        const validation = DataTableConfigValidator.validate(this.config);
        if (!validation.isValid) {
            throw new Error(`DataTable configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                console.warn(`DataTable warning: ${warning}`);
            });
        }
    }

    /**
     * Emit sort event
     */
    private emitSortEvent(): void {
        const event: DataTableSortEvent = {
            componentId: this.getId(),
            sortConfig: this.sortConfig,
            timestamp: Date.now()
        };
        
        this.emit('sort', event);
        
        if (this.config.onSort) {
            this.config.onSort(this.sortConfig);
        }
    }

    /**
     * Emit filter event
     */
    private emitFilterEvent(): void {
        const event: DataTableFilterEvent = {
            componentId: this.getId(),
            filters: this.filters,
            timestamp: Date.now()
        };
        
        this.emit('filter', event);
        
        if (this.config.onFilter) {
            this.config.onFilter(this.filters);
        }
    }

    /**
     * Emit page event
     */
    private emitPageEvent(): void {
        const event: DataTablePageEvent = {
            componentId: this.getId(),
            page: this.currentPage,
            pageSize: this.pageSize,
            totalRows: this.processedData.length,
            timestamp: Date.now()
        };
        
        this.emit('page', event);
        
        if (this.config.onPageChange) {
            this.config.onPageChange(this.currentPage, this.pageSize);
        }
    }

    /**
     * Emit selection event
     */
    private emitSelectionEvent(): void {
        const selectedRows = this.getSelectedRows();
        const event: DataTableSelectionEvent = {
            componentId: this.getId(),
            selectedRows,
            addedRows: [],
            removedRows: [],
            timestamp: Date.now()
        };
        
        this.emit('selection', event);
        
        if (this.config.onSelectionChange) {
            this.config.onSelectionChange(selectedRows);
        }
    }

    /**
     * Emit action event
     */
    private emitActionEvent(action: DataTableAction, row: DataTableRow): void {
        const event: DataTableActionEvent = {
            componentId: this.getId(),
            action,
            row,
            timestamp: Date.now()
        };
        
        this.emit('action', event);
        
        if (this.config.onAction) {
            this.config.onAction(action, row);
        }
    }
}
