/**
 * EmptyTableBehavior.js - Webview-side behavior for EmptyTable components
 * Handles basic user interactions and communication with Extension Host
 * Simplified behavior for basic table functionality
 */

class EmptyTableBehavior {
    constructor(tableId) {
        this.tableId = tableId;
        this.table = document.getElementById(tableId);
        this.container = this.table?.closest('.empty-table');
        this.initialized = false;
        
        if (!this.table) {
            console.error(`EmptyTable with ID '${tableId}' not found`);
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
            this.setupRowClick();
            this.setupCellClick();
            this.setupEmptyAction();
            
            this.initialized = true;
            this.notifyReady();
        } catch (error) {
            console.error(`Failed to initialize EmptyTable '${this.tableId}':`, error);
        }
    }
    
    /**
     * Setup row click handlers
     */
    setupRowClick() {
        const clickableRows = this.table.querySelectorAll('tbody tr[data-clickable="true"]');
        
        clickableRows.forEach(row => {
            const rowId = row.dataset.rowId;
            if (!rowId) return;
            
            // Single click handler
            row.addEventListener('click', (event) => {
                // Don't trigger on nested clickable elements
                if (event.target.closest('[data-clickable="true"]') !== row) return;
                
                this.handleRowClick(rowId, event);
            });
            
            // Double click handler
            row.addEventListener('dblclick', (event) => {
                // Don't trigger on nested clickable elements
                if (event.target.closest('[data-clickable="true"]') !== row) return;
                
                this.handleRowDoubleClick(rowId, event);
            });
        });
    }
    
    /**
     * Setup cell click handlers
     */
    setupCellClick() {
        const clickableCells = this.table.querySelectorAll('tbody td[data-clickable="true"]');
        
        clickableCells.forEach(cell => {
            const row = cell.closest('tr');
            const rowId = row?.dataset.rowId;
            const columnId = cell.dataset.columnId;
            
            if (!rowId || !columnId) return;
            
            cell.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent row click from firing
                this.handleCellClick(rowId, columnId, event);
            });
        });
    }
    
    /**
     * Setup empty action button
     */
    setupEmptyAction() {
        const emptyActionButton = this.container?.querySelector('[data-component-element="empty-action"]');
        
        if (emptyActionButton) {
            emptyActionButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleEmptyAction();
            });
        }
    }
    
    /**
     * Handle row click
     */
    handleRowClick(rowId, event) {
        this.postMessage({
            type: 'emptyTable.rowClick',
            tableId: this.tableId,
            rowId,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey
        });
    }
    
    /**
     * Handle row double click
     */
    handleRowDoubleClick(rowId, event) {
        this.postMessage({
            type: 'emptyTable.rowDoubleClick',
            tableId: this.tableId,
            rowId,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey
        });
    }
    
    /**
     * Handle cell click
     */
    handleCellClick(rowId, columnId, event) {
        this.postMessage({
            type: 'emptyTable.cellClick',
            tableId: this.tableId,
            rowId,
            columnId,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey
        });
    }
    
    /**
     * Handle empty action button click
     */
    handleEmptyAction() {
        this.postMessage({
            type: 'emptyTable.emptyAction',
            tableId: this.tableId
        });
    }
    
    /**
     * Update table state from extension host
     */
    updateState(state) {
        try {
            this.updateLoadingState(state.loading, state.loadingMessage);
            this.updateErrorState(state.error);
            this.updateEmptyState(state.data?.length === 0 && !state.loading);
        } catch (error) {
            console.error('Failed to update EmptyTable state:', error);
        }
    }
    
    /**
     * Update loading state
     */
    updateLoadingState(loading, message = 'Loading...') {
        const loadingOverlay = this.container?.querySelector('.empty-table-loading-overlay');
        
        if (loading) {
            if (!loadingOverlay) {
                this.showLoadingOverlay(message);
            } else {
                const loadingText = loadingOverlay.querySelector('.empty-table-loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
        } else {
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
        
        this.container?.classList.toggle('empty-table--loading', loading);
        
        // Show/hide loading skeleton rows
        const loadingRows = this.table?.querySelectorAll('.empty-table-loading-row');
        if (loadingRows) {
            loadingRows.forEach(row => {
                row.style.display = loading ? '' : 'none';
            });
        }
    }
    
    /**
     * Update error state
     */
    updateErrorState(error) {
        const errorOverlay = this.container?.querySelector('.empty-table-error-overlay');
        
        if (error) {
            if (!errorOverlay) {
                this.showErrorOverlay(error);
            } else {
                const errorText = errorOverlay.querySelector('.empty-table-error-text');
                if (errorText) {
                    errorText.textContent = error;
                }
            }
        } else {
            if (errorOverlay) {
                errorOverlay.remove();
            }
        }
        
        this.container?.classList.toggle('empty-table--error', !!error);
    }
    
    /**
     * Update empty state
     */
    updateEmptyState(isEmpty) {
        const emptyState = this.container?.querySelector('.empty-table-empty-state');
        
        if (emptyState) {
            emptyState.style.display = isEmpty ? 'block' : 'none';
        }
        
        this.container?.classList.toggle('empty-table--empty', isEmpty);
    }
    
    /**
     * Show loading overlay
     */
    showLoadingOverlay(message) {
        if (!this.container) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'empty-table-loading-overlay';
        overlay.innerHTML = `
            <div class="empty-table-loading-content">
                <div class="empty-table-loading-spinner"></div>
                <div class="empty-table-loading-text">${message}</div>
            </div>
        `;
        
        this.container.appendChild(overlay);
    }
    
    /**
     * Show error overlay
     */
    showErrorOverlay(error) {
        if (!this.container) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'empty-table-error-overlay';
        overlay.innerHTML = `
            <div class="empty-table-error-content">
                <div class="empty-table-error-icon">⚠️</div>
                <div class="empty-table-error-text">${error}</div>
                <button class="empty-table-error-retry" onclick="this.parentElement.parentElement.remove()">
                    Dismiss
                </button>
            </div>
        `;
        
        this.container.appendChild(overlay);
    }
    
    /**
     * Highlight row
     */
    highlightRow(rowId, duration = 2000) {
        const row = this.table?.querySelector(`tr[data-row-id="${rowId}"]`);
        if (!row) return;
        
        row.classList.add('empty-table-row--highlighted');
        
        setTimeout(() => {
            row.classList.remove('empty-table-row--highlighted');
        }, duration);
    }
    
    /**
     * Scroll to row
     */
    scrollToRow(rowId) {
        const row = this.table?.querySelector(`tr[data-row-id="${rowId}"]`);
        if (!row) return;
        
        row.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Highlight after scrolling
        setTimeout(() => {
            this.highlightRow(rowId);
        }, 500);
    }
    
    /**
     * Get row element by ID
     */
    getRowElement(rowId) {
        return this.table?.querySelector(`tr[data-row-id="${rowId}"]`);
    }
    
    /**
     * Get all row elements
     */
    getAllRowElements() {
        return this.table?.querySelectorAll('tbody tr:not(.empty-table-loading-row)') || [];
    }
    
    /**
     * Get table statistics
     */
    getTableStats() {
        const rows = this.getAllRowElements();
        return {
            totalRows: rows.length,
            visibleRows: Array.from(rows).filter(row => 
                row.style.display !== 'none' && 
                !row.classList.contains('empty-table-loading-row')
            ).length
        };
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
            type: 'emptyTable.ready',
            tableId: this.tableId,
            stats: this.getTableStats()
        });
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        this.initialized = false;
        
        // Remove any overlays
        const overlays = this.container?.querySelectorAll(
            '.empty-table-loading-overlay, .empty-table-error-overlay'
        );
        if (overlays) {
            overlays.forEach(overlay => overlay.remove());
        }
    }
}

// Auto-initialize tables when DOM is ready
if (typeof window !== 'undefined') {
    window.EmptyTableBehavior = EmptyTableBehavior;
    
    // Initialize all empty tables
    function initializeEmptyTables() {
        const tables = document.querySelectorAll('.empty-table table[id]');
        tables.forEach(table => {
            if (!table.dataset.initialized) {
                new EmptyTableBehavior(table.id);
                table.dataset.initialized = 'true';
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEmptyTables);
    } else {
        initializeEmptyTables();
    }
    
    // Re-initialize when new content is added
    const observer = new MutationObserver(() => {
        initializeEmptyTables();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
