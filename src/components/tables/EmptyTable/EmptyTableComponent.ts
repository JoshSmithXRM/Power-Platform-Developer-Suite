import { BaseComponent } from '../../base/BaseComponent';
import { EmptyTableConfig, EmptyTableRow, EmptyTableColumn, EmptyTableRowEvent, DEFAULT_EMPTY_TABLE_CONFIG, EmptyTableConfigValidator } from './EmptyTableConfig';
import { EmptyTableView, EmptyTableViewState } from './EmptyTableView';

/**
 * EmptyTableComponent - Simplified table component for basic data display
 * Provides essential table functionality without advanced features like sorting, filtering, or pagination
 * Ideal for simple data presentation scenarios
 */
export class EmptyTableComponent extends BaseComponent {
    protected config: EmptyTableConfig;
    private data: EmptyTableRow[] = [];
    private loading: boolean = false;
    private loadingMessage: string = 'Loading...';
    private error: string | null = null;

    constructor(config: EmptyTableConfig) {
        const mergedConfig = { ...DEFAULT_EMPTY_TABLE_CONFIG, ...config } as EmptyTableConfig;
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
        
        if (this.config.loading) {
            this.loading = this.config.loading;
        }
        
        if (this.config.loadingMessage) {
            this.loadingMessage = this.config.loadingMessage;
        }
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const viewState: EmptyTableViewState = {
            data: this.data,
            loading: this.loading,
            loadingMessage: this.loadingMessage,
            error: this.error
        };
        
        return EmptyTableView.render(this.config, viewState);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'components/empty-table.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'components/EmptyTableBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'empty-table';
    }

    /**
     * Set table data
     */
    public setData(data: EmptyTableRow[]): void {
        const oldData = [...this.data];
        this.data = [...data];
        
        this.notifyStateChange({
            data: this.data,
            oldData,
            rowCount: this.data.length
        });
        
        this.notifyUpdate();
    }

    /**
     * Get current data
     */
    public getData(): EmptyTableRow[] {
        return [...this.data];
    }

    /**
     * Add rows to the table
     */
    public addRows(rows: EmptyTableRow[]): void {
        const newData = [...this.data, ...rows];
        this.setData(newData);
    }

    /**
     * Remove rows by ID
     */
    public removeRows(rowIds: Array<string | number>): void {
        const rowIdSet = new Set(rowIds);
        const newData = this.data.filter(row => !rowIdSet.has(row.id));
        this.setData(newData);
    }

    /**
     * Update specific row
     */
    public updateRow(rowId: string | number, updates: Partial<EmptyTableRow>): void {
        const rowIndex = this.data.findIndex(row => row.id === rowId);
        if (rowIndex === -1) {
            this.notifyError(new Error(`Row with ID ${rowId} not found`), 'updateRow');
            return;
        }

        const oldData = [...this.data];
        this.data[rowIndex] = { ...this.data[rowIndex], ...updates };
        
        this.notifyStateChange({
            data: this.data,
            oldData,
            updatedRow: this.data[rowIndex],
            updatedRowIndex: rowIndex
        });
        
        this.notifyUpdate();
    }

    /**
     * Get row by ID
     */
    public getRow(rowId: string | number): EmptyTableRow | undefined {
        return this.data.find(row => row.id === rowId);
    }

    /**
     * Clear all data
     */
    public clearData(): void {
        this.setData([]);
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean, message?: string): void {
        const oldLoading = this.loading;
        const oldMessage = this.loadingMessage;
        
        this.loading = loading;
        if (message) {
            this.loadingMessage = message;
        }
        
        this.notifyStateChange({
            loading,
            oldLoading,
            loadingMessage: this.loadingMessage,
            oldLoadingMessage: oldMessage
        });
        
        this.notifyUpdate();
    }

    /**
     * Get loading state
     */
    public isLoading(): boolean {
        return this.loading;
    }

    /**
     * Set error state
     */
    public setError(error: string | null): void {
        const oldError = this.error;
        this.error = error;
        
        this.notifyStateChange({
            error,
            oldError
        });
        
        this.notifyUpdate();
    }

    /**
     * Get error state
     */
    public getError(): string | null {
        return this.error;
    }

    /**
     * Clear error state
     */
    public clearError(): void {
        this.setError(null);
    }

    /**
     * Handle row click
     */
    public handleRowClick(rowId: string | number, event: MouseEvent): void {
        const row = this.getRow(rowId);
        if (!row) return;
        
        const rowIndex = this.data.findIndex(r => r.id === rowId);
        
        this.emitRowEvent('click', row, rowIndex);
        
        if (this.config.onRowClick) {
            try {
                this.config.onRowClick(row, event);
            } catch (error) {
                this.notifyError(error as Error, 'onRowClick callback');
            }
        }
    }

    /**
     * Handle row double click
     */
    public handleRowDoubleClick(rowId: string | number, event: MouseEvent): void {
        const row = this.getRow(rowId);
        if (!row) return;
        
        const rowIndex = this.data.findIndex(r => r.id === rowId);
        
        this.emitRowEvent('doubleClick', row, rowIndex);
        
        if (this.config.onRowDoubleClick) {
            try {
                this.config.onRowDoubleClick(row, event);
            } catch (error) {
                this.notifyError(error as Error, 'onRowDoubleClick callback');
            }
        }
    }

    /**
     * Handle cell click
     */
    public handleCellClick(rowId: string | number, columnId: string, event: MouseEvent): void {
        const row = this.getRow(rowId);
        const column = this.config.columns.find(c => c.id === columnId);
        
        if (!row || !column) return;
        
        const value = row[column.field];
        
        if (this.config.onCellClick) {
            try {
                this.config.onCellClick(row, column, value);
            } catch (error) {
                this.notifyError(error as Error, 'onCellClick callback');
            }
        }
    }

    /**
     * Refresh table (re-render)
     */
    public refresh(): void {
        this.notifyUpdate();
        
        this.emit('refresh', {
            componentId: this.getId(),
            timestamp: Date.now()
        });
    }

    /**
     * Get table statistics
     */
    public getStats() {
        return {
            totalRows: this.data.length,
            columns: this.config.columns.length,
            loading: this.loading,
            error: this.error,
            isEmpty: this.data.length === 0
        };
    }

    /**
     * Get current table state
     */
    public getState() {
        return {
            data: this.data,
            loading: this.loading,
            loadingMessage: this.loadingMessage,
            error: this.error,
            stats: this.getStats()
        };
    }

    /**
     * Enable/disable the component
     */
    public setDisabled(disabled: boolean): void {
        this.updateConfig({ disabled });
    }

    /**
     * Check if component is disabled
     */
    public isDisabled(): boolean {
        return this.config.disabled || false;
    }

    /**
     * Set table height
     */
    public setHeight(height: string | number): void {
        this.updateConfig({ height });
    }

    /**
     * Toggle striped rows
     */
    public setStriped(striped: boolean): void {
        this.updateConfig({ striped });
    }

    /**
     * Toggle hover effect
     */
    public setHover(hover: boolean): void {
        this.updateConfig({ hover });
    }

    /**
     * Set table variant
     */
    public setVariant(variant: 'default' | 'compact' | 'comfortable' | 'spacious'): void {
        this.updateConfig({ variant });
    }

    /**
     * Export data as JSON
     */
    public exportAsJSON(): string {
        return JSON.stringify(this.data, null, 2);
    }

    /**
     * Export data as CSV
     */
    public exportAsCSV(): string {
        if (this.data.length === 0) return '';
        
        const headers = this.config.columns.map(col => col.label).join(',');
        const rows = this.data.map(row => {
            return this.config.columns.map(col => {
                const value = row[col.field];
                // Escape CSV values
                if (value === null || value === undefined) return '';
                const str = String(value);
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',');
        }).join('\n');
        
        return `${headers}\n${rows}`;
    }

    /**
     * Validate configuration
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        const validation = EmptyTableConfigValidator.validate(this.config);
        if (!validation.isValid) {
            throw new Error(`EmptyTable configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                console.warn(`EmptyTable warning: ${warning}`);
            });
        }
    }

    /**
     * Emit row event
     */
    private emitRowEvent(eventType: string, row: EmptyTableRow, index: number): void {
        const event: EmptyTableRowEvent = {
            componentId: this.getId(),
            row,
            index,
            timestamp: Date.now()
        };
        
        this.emit(`row${eventType}`, event);
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(newConfig: Partial<EmptyTableConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Re-validate after config update
        try {
            this.validateConfig();
        } catch (error) {
            // Revert to old config if validation fails
            this.config = oldConfig;
            throw error;
        }
        
        this.emit('configChanged', {
            componentId: this.getId(),
            oldConfig,
            newConfig: this.config,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }
}
