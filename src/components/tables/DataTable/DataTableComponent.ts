import { BaseDataComponent } from '../../base/BaseDataComponent';
import { IRenderable } from '../../base/BaseComponent';
import { SearchInputComponent } from '../../inputs/SearchInput/SearchInputComponent';

import { DataTableConfig, DataTableRow, DataTableSortEvent, DataTableFilterEvent, DataTablePageEvent, DEFAULT_DATA_TABLE_CONFIG, DATA_TABLE_VALIDATION, DataTableConfigValidator } from './DataTableConfig';
import { DataTableView, DataTableViewState } from './DataTableView';

/**
 * Type-safe data structure returned by DataTableComponent.getData()
 */
export interface DataTableData {
    data: DataTableRow[];
    loading: boolean;
    loadingMessage: string;
    error: string | null;
    totalRows: number;
    currentPage: number;
    pageSize: number;
    hasLoadedData: boolean;
    filters: Record<string, unknown>;
    searchQuery: string;
}

/**
 * DataTableComponent - Comprehensive data table with sorting, filtering, and pagination
 * Used throughout the extension for displaying tabular data with rich interactions
 * Supports multi-instance usage with independent state management
 *
 * Extends BaseDataComponent to inherit loading state management
 */
export class DataTableComponent extends BaseDataComponent<DataTableData> {
    protected config: DataTableConfig;
    private data: DataTableRow[] = [];
    private processedData: DataTableRow[] = [];
    private sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private filters: Record<string, any> = {}; // Dynamic filter values by column - any is appropriate here
    private currentPage: number = 1;
    private pageSize: number = 50;
    private searchQuery: string = '';
    private error: string | null = null;
    private expandedRows: Set<string | number> = new Set();
    private columnVisibility: Map<string, boolean> = new Map();
    private columnOrder: string[] = [];
    private hasLoadedData: boolean = false; // Track if data has been loaded at least once
    private searchInput?: SearchInputComponent;

    constructor(config: DataTableConfig) {
        const mergedConfig = { ...DEFAULT_DATA_TABLE_CONFIG, ...config } as DataTableConfig;
        super(mergedConfig);

        this.config = mergedConfig;

        // Create SearchInputComponent if search is enabled
        if (this.config.searchable) {
            this.searchInput = new SearchInputComponent({
                id: `${this.config.id}-search`,
                placeholder: this.config.searchPlaceholder || 'Search...',
                debounceMs: 300, // DataTable uses 300ms
                iconPosition: 'left',
                ariaLabel: 'Search table'
            });
        }

        this.validateConfig();
        this.initializeState();
    }

    /**
     * Initialize component state from config
     */
    private initializeState(): void {
        this.componentLogger.debug('Initializing DataTable state', {
            componentId: this.config.id,
            initialDataLength: this.config.data?.length || 0,
            columnCount: this.config.columns.length,
            sortable: this.config.sortable,
            filterable: this.config.filterable,
            paginated: this.config.paginated,
            pageSize: this.config.pageSize
        });

        if (this.config.data) {
            this.setData(this.config.data);
        }
        
        if (this.config.defaultSort) {
            this.sortConfig = [...this.config.defaultSort];
            this.componentLogger.debug('Default sort configuration applied', {
                componentId: this.config.id,
                sortConfig: this.sortConfig
            });
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
        
        this.componentLogger.debug('DataTable initialized successfully', {
            componentId: this.config.id
        });
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        this.componentLogger.debug('Generating HTML for DataTable', {
            componentId: this.config.id,
            dataLength: this.data.length,
            processedDataLength: this.processedData.length,
            sortConfig: this.sortConfig,
            hasActiveSort: this.sortConfig.length > 0,
            activeFilters: Object.keys(this.filters),
            currentPage: this.currentPage,
            pageSize: this.pageSize
        });

        const viewState: DataTableViewState = {
            data: this.getPageData(),
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
            columnOrder: this.columnOrder,
            hasLoadedData: this.hasLoadedData
        };
        
        this.componentLogger.debug('ViewState created for HTML generation', {
            componentId: this.config.id,
            viewDataLength: viewState.data.length,
            sortConfig: viewState.sortConfig,
            sortConfigLength: viewState.sortConfig.length,
            totalRows: viewState.totalRows
        });
        
        const html = DataTableView.render(this.config, viewState, this.searchInput);
        
        this.componentLogger.debug('HTML generation complete', {
            componentId: this.config.id,
            htmlLength: html.length,
            sortConfigPassedToView: viewState.sortConfig
        });
        
        return html;
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
     * Get component type identifier
     */
    public getType(): string {
        return 'DataTable';
    }

    /**
     * Set table data
     */
    public setData(data: DataTableRow[]): void {
        this.componentLogger.debug('Setting table data', {
            componentId: this.config.id,
            newDataLength: data.length,
            previousDataLength: this.data.length
        });

        this.data = [...data];
        this.processData();
        this.notifyUpdate();

        this.componentLogger.debug('Table data updated', {
            componentId: this.config.id,
            totalRows: this.data.length
        });
    }

    /**
     * Get current data and state for event bridge
     * Returns full state so webview can update loading, error, etc.
     */
    public getData(): {
        data: DataTableRow[];
        loading: boolean;
        loadingMessage: string;
        error: string | null;
        totalRows: number;
        currentPage: number;
        pageSize: number;
        hasLoadedData: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filters: Record<string, any>; // Dynamic filter values by column - any is appropriate here
        searchQuery: string;
    } {
        const loadingState = this.getLoadingState();
        return {
            data: [...this.processedData],
            loading: loadingState.loading,
            loadingMessage: loadingState.loadingMessage,
            error: this.error,
            totalRows: this.data.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            hasLoadedData: this.hasLoadedData,
            filters: { ...this.filters },
            searchQuery: this.searchQuery
        };
    }

    /**
     * Process data with sorting, filtering, and search
     */
    private processData(): void {
        this.componentLogger.debug('Processing table data', {
            componentId: this.config.id,
            originalDataLength: this.data.length,
            hasSearchQuery: !!this.searchQuery,
            activeFilters: Object.keys(this.filters).length,
            sortConfigLength: this.sortConfig.length
        });

        let processed = [...this.data];
        const originalLength = processed.length;
        
        // Apply search
        if (this.searchQuery && this.config.searchable) {
            processed = this.applySearch(processed, this.searchQuery);
            this.componentLogger.debug('Search applied', {
                componentId: this.config.id,
                searchQuery: this.searchQuery,
                beforeSearch: originalLength,
                afterSearch: processed.length
            });
        }
        
        // Apply filters
        if (Object.keys(this.filters).length > 0 && this.config.filterable) {
            const beforeFilter = processed.length;
            processed = this.applyFilters(processed, this.filters);
            this.componentLogger.debug('Filters applied', {
                componentId: this.config.id,
                activeFilters: Object.keys(this.filters),
                beforeFilter: beforeFilter,
                afterFilter: processed.length
            });
        }
        
        // Apply sorting
        if (this.sortConfig.length > 0 && this.config.sortable) {
            processed = this.applySort(processed, this.sortConfig);
            this.componentLogger.debug('Sort applied', {
                componentId: this.config.id,
                sortConfig: this.sortConfig,
                sortedRowCount: processed.length
            });
        }
        
        this.processedData = processed;
        
        // Reset to first page if current page is out of bounds
        const maxPage = Math.ceil(this.processedData.length / this.pageSize);
        if (this.currentPage > maxPage && maxPage > 0) {
            this.componentLogger.debug('Resetting to first page due to bounds', {
                componentId: this.config.id,
                previousPage: this.currentPage,
                maxPage: maxPage
            });
            this.currentPage = 1;
        }

        this.componentLogger.debug('Data processing completed', {
            componentId: this.config.id,
            processedRows: this.processedData.length
        });
    }

    /**
     * Apply search to data
     */
    private applySearch(data: DataTableRow[], query: string): DataTableRow[] {
        const lowerQuery = query.toLowerCase();
        return data.filter(row => {
            return this.config.columns.some(column => {
                const value = row[column.field] as string | number | boolean | null | undefined;
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }

    /**
     * Apply filters to data
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private applyFilters(data: DataTableRow[], filters: Record<string, any>): DataTableRow[] { // Dynamic filter values - any is appropriate here
        return data.filter(row => {
            return Object.entries(filters).every(([columnId, filterValue]) => {
                if (!filterValue) return true;
                
                const column = this.config.columns.find(c => c.id === columnId);
                if (!column) return true;

                const value = row[column.field] as string | number | boolean | null | undefined;
                
                // Handle different filter types
                if (column.filterType === 'multiselect' && Array.isArray(filterValue)) {
                    return filterValue.includes(value);
                }
                
                if (column.filterType === 'daterange' && typeof filterValue === 'object') {
                    const date = new Date(value as string | number | Date);
                    const { from, to } = filterValue as { from?: string | number | Date; to?: string | number | Date };
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

                let aVal = a[column.field] as string | number | boolean | null | undefined;
                let bVal = b[column.field] as string | number | boolean | null | undefined;
                
                // Use custom sort if provided
                if (column.customSort) {
                    const result = column.customSort(aVal as DataTableRow, bVal as DataTableRow);
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
                    comparison = new Date(aVal as string | number | Date).getTime() - new Date(bVal as string | number | Date).getTime();
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
        this.componentLogger.debug('Sort requested', {
            componentId: this.config.id,
            columnId,
            direction,
            previousSortConfig: [...this.sortConfig]
        });

        const column = this.config.columns.find(c => c.id === columnId);
        if (!column || !column.sortable) {
            this.componentLogger.warn('Sort ignored - column not found or not sortable', {
                componentId: this.config.id,
                columnId,
                columnExists: !!column,
                columnSortable: column?.sortable
            });
            return;
        }
        
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
        
        this.componentLogger.info('Sort configuration updated', {
            componentId: this.config.id,
            columnId,
            direction,
            newSortConfig: [...this.sortConfig],
            multiSort: this.config.multiSort
        });
        
        this.processData();
        this.emitSortEvent();
        this.notifyUpdate();
        
        this.componentLogger.debug('Sort processing complete', {
            componentId: this.config.id,
            sortedDataLength: this.processedData.length
        });
    }

    /**
     * Filter table by column
     */
    public filter(columnId: string, value: unknown): void {
        this.componentLogger.debug('Filter requested', {
            componentId: this.config.id,
            columnId,
            value,
            valueType: typeof value,
            previousFilters: { ...this.filters }
        });

        if (value === null || value === undefined || value === '') {
            delete this.filters[columnId];
            this.componentLogger.debug('Filter removed', {
                componentId: this.config.id,
                columnId
            });
        } else {
            this.filters[columnId] = value;
            this.componentLogger.debug('Filter applied', {
                componentId: this.config.id,
                columnId,
                value
            });
        }
        
        this.currentPage = 1; // Reset to first page
        this.processData();
        this.emitFilterEvent();
        this.notifyUpdate();
        
        this.componentLogger.info('Filter processing complete', {
            componentId: this.config.id,
            activeFilters: Object.keys(this.filters),
            filteredDataLength: this.processedData.length,
            resetToPage: this.currentPage
        });
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
     * Set loading state
     * Overrides BaseDataComponent to also track hasLoadedData flag
     */
    public setLoading(loading: boolean, message?: string): void {
        // Call parent to handle loading state
        super.setLoading(loading, message);

        // Mark data as loaded when loading completes (DataTable-specific behavior)
        if (!loading) {
            this.hasLoadedData = true;
        }
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
        
        // Column reordering callback removed - feature not implemented
        
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getState(): any { // Returns comprehensive state object with dynamic structure - any is appropriate here
        return {
            data: this.data,
            processedData: this.processedData,
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
        this.componentLogger.debug('Validating DataTable configuration', {
            componentId: this.config.id,
            columnCount: this.config.columns?.length || 0,
            hasData: !!this.config.data,
            sortable: this.config.sortable,
            filterable: this.config.filterable
        });

        super.validateConfig();
        
        const validation = DataTableConfigValidator.validate(this.config);
        if (!validation.isValid) {
            const errorMessage = `DataTable configuration errors: ${validation.errors.join(', ')}`;
            const error = new Error(errorMessage);
            this.componentLogger.error('DataTable configuration validation failed', error, {
                componentId: this.config.id,
                errors: validation.errors
            });
            throw error;
        }
        
        if (validation.warnings.length > 0) {
            this.componentLogger.warn('DataTable configuration has warnings', {
                componentId: this.config.id,
                warnings: validation.warnings,
                warningCount: validation.warnings.length
            });
            // Individual warnings already logged in structured format above
        }

        this.componentLogger.debug('DataTable configuration validation passed', {
            componentId: this.config.id
        });
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
     * Get child components for recursive resource collection
     * DataTable embeds SearchInputComponent when searchable is enabled
     */
    public getChildComponents(): IRenderable[] {
        return this.searchInput ? [this.searchInput] : [];
    }
}
