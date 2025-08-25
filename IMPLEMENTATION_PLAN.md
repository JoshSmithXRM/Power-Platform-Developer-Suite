# Dynamics DevTools - Implementation & Standardization Plan

## 🎯 Phase 1: Foundation Components (Week 1-2)

### **Step 1: Create StateService for Panel Persistence**

**File**: `src/services/StateService.ts`
```typescript
import * as vscode from 'vscode';

export interface PanelState {
    selectedEnvironmentId?: string;
    filters?: Record<string, any>;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    selectedItems?: string[];
    viewConfig?: any;
    lastUpdated?: Date;
}

export interface StateChangedEvent {
    panelType: string;
    state: PanelState;
}

export class StateService {
    private static instance: StateService;
    private context: vscode.ExtensionContext;
    private _onStateChanged = new vscode.EventEmitter<StateChangedEvent>();
    
    public readonly onStateChanged = this._onStateChanged.event;
    
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    public static getInstance(context?: vscode.ExtensionContext): StateService {
        if (!StateService.instance && context) {
            StateService.instance = new StateService(context);
        }
        return StateService.instance;
    }
    
    async savePanelState(panelType: string, state: PanelState): Promise<void> {
        const stateKey = `panel-state-${panelType}`;
        state.lastUpdated = new Date();
        
        await this.context.globalState.update(stateKey, state);
        this._onStateChanged.fire({ panelType, state });
    }
    
    async getPanelState(panelType: string): Promise<PanelState | null> {
        const stateKey = `panel-state-${panelType}`;
        return this.context.globalState.get(stateKey, null);
    }
    
    async clearPanelState(panelType: string): Promise<void> {
        const stateKey = `panel-state-${panelType}`;
        await this.context.globalState.update(stateKey, undefined);
    }
    
    async clearAllPanelStates(): Promise<void> {
        const keys = this.context.globalState.keys();
        const stateKeys = keys.filter(key => key.startsWith('panel-state-'));
        
        for (const key of stateKeys) {
            await this.context.globalState.update(key, undefined);
        }
    }
}
```

### **Step 2: Create ComponentFactory**

**File**: `src/components/ComponentFactory.ts`
```typescript
export interface TableConfig {
    id: string;
    columns: TableColumn[];
    data?: any[];
    sortable?: boolean;
    filterable?: boolean;
    selectable?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    className?: string;
}

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    className?: string;
    renderer?: string; // Function name for custom rendering
}

export interface EnvironmentSelectorConfig {
    id?: string;
    className?: string;
    showStatus?: boolean;
    autoLoad?: boolean;
}

export enum BadgeType {
    Success = 'success',
    Error = 'error',
    Warning = 'warning',
    Info = 'info',
    Managed = 'managed',
    Unmanaged = 'unmanaged',
    Progress = 'progress',
    Pending = 'pending'
}

export class ComponentFactory {
    /**
     * Create environment selector component
     */
    static createEnvironmentSelector(config: EnvironmentSelectorConfig = {}): string {
        const id = config.id || 'environmentSelect';
        const className = config.className || 'environment-selector';
        const showStatus = config.showStatus !== false;
        
        return `
            <div class="${className}">
                <span class="environment-label">Environment:</span>
                <select id="${id}" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                ${showStatus ? '<span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>' : ''}
            </div>
        `;
    }
    
    /**
     * Create data table component
     */
    static createDataTable(config: TableConfig): string {
        const {
            id,
            columns,
            sortable = true,
            stickyHeader = true,
            stickyFirstColumn = true,
            className = 'data-table'
        } = config;
        
        const tableClass = [
            className,
            sortable ? 'sortable-table' : '',
            stickyHeader ? 'sticky-header' : '',
            stickyFirstColumn ? 'sticky-first-column' : ''
        ].filter(Boolean).join(' ');
        
        const headers = columns.map(col => {
            const sortableClass = (sortable && col.sortable !== false) ? 'sortable' : '';
            const style = col.width ? `style="width: ${col.width}"` : '';
            
            return `
                <th class="${sortableClass} ${col.className || ''}" 
                    data-column="${col.key}" 
                    ${style}>
                    ${col.label}
                    ${sortableClass ? '<span class="sort-indicator"></span>' : ''}
                </th>
            `;
        }).join('');
        
        return `
            <div class="table-container" id="${id}Container">
                <table id="${id}" class="${tableClass}">
                    <thead>
                        <tr>${headers}</tr>
                    </thead>
                    <tbody id="${id}Body">
                        <!-- Data will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Create status badge component
     */
    static createStatusBadge(text: string, type: BadgeType): string {
        return `<span class="status-badge status-${type}">${text}</span>`;
    }
    
    /**
     * Create filter controls component
     */
    static createFilterControls(options: { placeholder?: string, className?: string } = {}): string {
        const placeholder = options.placeholder || 'Filter...';
        const className = options.className || 'filter-controls';
        
        return `
            <div class="${className}">
                <input type="text" 
                       id="filterInput" 
                       class="filter-input" 
                       placeholder="${placeholder}">
            </div>
        `;
    }
    
    /**
     * Get base CSS for all components
     */
    static getBaseCss(): string {
        return `
            body {
                margin: 0;
                padding: 20px;
                font-family: var(--vscode-font-family);
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            
            /* Header Styles */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--vscode-editorWidget-border);
            }
            
            .title {
                font-size: 1.5em;
                margin: 0;
                color: var(--vscode-textLink-foreground);
            }
            
            .header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            /* Button Styles */
            .btn, .refresh-btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-family: inherit;
            }
            
            .btn:hover, .refresh-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .btn-secondary {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: var(--vscode-button-secondaryHoverBackground);
            }
            
            .btn:disabled, .btn-secondary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* Content Area */
            #content {
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 6px;
                overflow: hidden;
            }
            
            /* Loading and Error States */
            .loading {
                text-align: center;
                padding: 40px;
                color: var(--vscode-descriptionForeground);
            }
            
            .error {
                background: var(--vscode-inputValidation-errorBackground);
                border: 1px solid var(--vscode-inputValidation-errorBorder);
                color: var(--vscode-inputValidation-errorForeground);
                padding: 12px;
                border-radius: 4px;
                margin: 10px 0;
            }
        `;
    }
    
    /**
     * Get environment selector CSS
     */
    static getEnvironmentSelectorCss(): string {
        return `
            .environment-selector {
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .environment-label {
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
                min-width: 80px;
            }
            
            .environment-dropdown {
                flex: 1;
                max-width: 400px;
                padding: 8px 12px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-family: inherit;
                font-size: 14px;
            }
            
            .environment-dropdown:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            
            .environment-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: 500;
            }
            
            .environment-connected {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }
            
            .environment-disconnected {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }
        `;
    }
    
    /**
     * Get data table CSS
     */
    static getDataTableCss(): string {
        // Return the existing comprehensive table CSS from EnvironmentManager
        return `
            /* Filter Controls */
            .filter-controls {
                margin-bottom: 16px;
                padding: 12px;
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 6px;
            }
            
            .filter-input {
                width: 100%;
                max-width: 300px;
                padding: 8px 12px;
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 4px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-size: 13px;
                font-family: var(--vscode-font-family);
            }
            
            .filter-input:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            
            .filter-input::placeholder {
                color: var(--vscode-input-placeholderForeground);
            }
            
            /* ===== STANDARDIZED TABLE COMPONENT ===== */
            
            .table-container {
                overflow-x: auto;
                overflow-y: auto;
                max-height: calc(100vh - 200px);
                position: relative;
                border-radius: 6px;
            }
            
            .table-container::-webkit-scrollbar {
                height: 8px;
                width: 8px;
            }
            
            .table-container::-webkit-scrollbar-track {
                background: var(--vscode-scrollbarSlider-background);
                border-radius: 4px;
            }
            
            .table-container::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-activeBackground);
                border-radius: 4px;
            }
            
            .table-container::-webkit-scrollbar-thumb:hover {
                background: var(--vscode-scrollbarSlider-hoverBackground);
            }
            
            .data-table {
                width: 100%;
                min-width: 800px;
                border-collapse: collapse;
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 6px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                position: relative;
            }
            
            .data-table th,
            .data-table td {
                padding: 16px 12px;
                text-align: left;
                border-bottom: 1px solid var(--vscode-editorWidget-border);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
            }
            
            .data-table th {
                background: var(--vscode-editorGroupHeader-tabsBackground);
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
                position: sticky;
                top: 0;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                z-index: 10;
            }
            
            .data-table.sticky-first-column th:first-child,
            .data-table.sticky-first-column td:first-child {
                position: sticky;
                left: 0;
                background: var(--vscode-editorWidget-background);
                z-index: 5;
                box-shadow: 2px 0 4px rgba(0,0,0,0.1);
                min-width: 200px;
                max-width: 300px;
            }
            
            .data-table.sticky-first-column th:first-child {
                z-index: 15;
                background: var(--vscode-editorGroupHeader-tabsBackground);
            }
            
            .data-table tr {
                transition: background-color 0.2s ease;
            }
            
            .data-table tr:hover {
                background: var(--vscode-list-hoverBackground);
            }
            
            .data-table.sticky-first-column tr:hover td:first-child {
                background: var(--vscode-list-hoverBackground);
            }
            
            .data-table tr:last-child td {
                border-bottom: none;
            }
            
            /* Sortable Column Styling */
            .sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
            }
            
            .sortable:hover {
                background: var(--vscode-list-hoverBackground);
            }
            
            /* Sort Indicators */
            .sort-indicator {
                margin-left: 8px;
                opacity: 0.6;
                font-size: 0.8em;
                display: inline-block;
                min-width: 12px;
            }
            
            .sort-asc .sort-indicator::after {
                content: ' ▲';
                color: var(--vscode-textLink-foreground);
                margin-left: 4px;
            }
            
            .sort-desc .sort-indicator::after {
                content: ' ▼';
                color: var(--vscode-textLink-foreground);
                margin-left: 4px;
            }
            
            /* Status Badge Styles */
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: 500;
                margin: 2px;
                white-space: nowrap;
            }
            
            .status-success { background: var(--vscode-testing-iconPassed); color: white; }
            .status-error { background: var(--vscode-testing-iconFailed); color: white; }
            .status-warning { background: var(--vscode-charts-orange); color: white; }
            .status-info { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
            .status-progress { background: var(--vscode-charts-orange); color: white; }
            .status-pending { 
                background: var(--vscode-button-secondaryBackground); 
                color: var(--vscode-button-secondaryForeground); 
                border: 1px solid var(--vscode-button-border); 
            }
            .status-managed { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
            .status-unmanaged { 
                background: var(--vscode-button-secondaryBackground); 
                color: var(--vscode-button-secondaryForeground); 
                border: 1px solid var(--vscode-button-border); 
            }
            
            /* Links */
            .solution-name-link {
                color: var(--vscode-textLink-foreground);
                text-decoration: none;
                cursor: pointer;
                font-weight: 500;
            }
            
            .solution-name-link:hover {
                text-decoration: underline;
            }
            
            /* Progress Text */
            .progress-text {
                font-family: var(--vscode-editor-font-family);
                font-weight: 500;
            }
            
            /* Responsive Design */
            @media (max-width: 1200px) {
                .data-table th, .data-table td { padding: 8px 12px; font-size: 12px; }
                .data-table.sticky-first-column th:first-child,
                .data-table.sticky-first-column td:first-child { min-width: 150px; max-width: 200px; }
            }
            
            @media (max-width: 768px) {
                .data-table { min-width: 600px; }
                .data-table th, .data-table td { padding: 6px 8px; max-width: 120px; }
                .data-table.sticky-first-column th:first-child,
                .data-table.sticky-first-column td:first-child { min-width: 120px; max-width: 150px; }
            }
        `;
    }
    
    /**
     * Get environment selector JavaScript
     */
    static getEnvironmentSelectorJs(): string {
        return `
            let currentEnvironmentId = '';
            
            function loadEnvironments() {
                vscode.postMessage({ action: 'loadEnvironments' });
            }
            
            function populateEnvironments(environments, selectedEnvironmentId) {
                const select = document.getElementById('environmentSelect');
                select.innerHTML = '<option value="">Select an environment...</option>';
                
                environments.forEach(env => {
                    const option = document.createElement('option');
                    option.value = env.id;
                    option.textContent = \`\${env.name} (\${env.settings.dataverseUrl})\`;
                    select.appendChild(option);
                });
                
                if (selectedEnvironmentId && environments.find(env => env.id === selectedEnvironmentId)) {
                    select.value = selectedEnvironmentId;
                    currentEnvironmentId = selectedEnvironmentId;
                    updateEnvironmentStatus('Connected', true);
                    if (typeof loadDataForEnvironment === 'function') {
                        loadDataForEnvironment();
                    }
                } else if (environments.length > 0) {
                    select.value = environments[0].id;
                    currentEnvironmentId = environments[0].id;
                    updateEnvironmentStatus('Connected', true);
                    if (typeof loadDataForEnvironment === 'function') {
                        loadDataForEnvironment();
                    }
                }
            }
            
            function updateEnvironmentStatus(status, isConnected) {
                const statusElement = document.getElementById('environmentStatus');
                if (statusElement) {
                    statusElement.textContent = status;
                    statusElement.className = 'environment-status ' + 
                        (isConnected ? 'environment-connected' : 'environment-disconnected');
                }
            }
            
            function onEnvironmentChange() {
                const select = document.getElementById('environmentSelect');
                currentEnvironmentId = select.value;
                
                if (currentEnvironmentId) {
                    updateEnvironmentStatus('Connected', true);
                    vscode.postMessage({ 
                        action: 'environmentChanged', 
                        environmentId: currentEnvironmentId 
                    });
                    if (typeof loadDataForEnvironment === 'function') {
                        loadDataForEnvironment();
                    }
                } else {
                    updateEnvironmentStatus('Disconnected', false);
                    if (typeof clearContentForNoEnvironment === 'function') {
                        clearContentForNoEnvironment();
                    }
                }
            }
            
            document.addEventListener('DOMContentLoaded', () => {
                const envSelect = document.getElementById('environmentSelect');
                if (envSelect) {
                    envSelect.addEventListener('change', onEnvironmentChange);
                }
                loadEnvironments();
            });
        `;
    }
    
    /**
     * Get data table JavaScript
     */
    static getDataTableJs(): string {
        return `
            let currentSort = { column: null, direction: 'asc' };
            
            function setupTableSorting(tableId, defaultSortColumn = null, defaultDirection = 'desc') {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                if (defaultSortColumn) {
                    currentSort = { column: defaultSortColumn, direction: defaultDirection };
                }
                
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.addEventListener('click', () => {
                        const column = header.dataset.column;
                        sortTable(tableId, column);
                    });
                });
                
                if (defaultSortColumn) {
                    applySortIndicators(tableId, defaultSortColumn, defaultDirection);
                }
            }
            
            function sortTable(tableId, column) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                const tbody = table.querySelector('tbody');
                if (!tbody) return;
                
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                rows.sort((a, b) => {
                    const aCell = a.querySelector('[data-column="' + column + '"]');
                    const bCell = b.querySelector('[data-column="' + column + '"]');
                    
                    if (!aCell || !bCell) return 0;
                    
                    const aValue = getSortValue(aCell);
                    const bValue = getSortValue(bCell);
                    
                    let comparison = 0;
                    
                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        comparison = aValue - bValue;
                    } else if (aValue instanceof Date && bValue instanceof Date) {
                        comparison = aValue.getTime() - bValue.getTime();
                    } else if (column === 'version') {
                        const aVer = String(aValue).split('.').map(n => parseInt(n) || 0);
                        const bVer = String(bValue).split('.').map(n => parseInt(n) || 0);
                        for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
                            const aNum = aVer[i] || 0;
                            const bNum = bVer[i] || 0;
                            if (aNum !== bNum) {
                                comparison = aNum - bNum;
                                break;
                            }
                        }
                    } else {
                        const aStr = String(aValue).toLowerCase();
                        const bStr = String(bValue).toLowerCase();
                        comparison = aStr.localeCompare(bStr);
                    }
                    
                    return currentSort.direction === 'desc' ? -comparison : comparison;
                });
                
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
                
                applySortIndicators(tableId, column, currentSort.direction);
                
                // Save sort state
                if (typeof saveTableState === 'function') {
                    saveTableState();
                }
            }
            
            function getSortValue(cell) {
                if (cell.hasAttribute('data-sort-value')) {
                    const value = cell.getAttribute('data-sort-value');
                    const num = parseFloat(value);
                    if (!isNaN(num)) return num;
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) return date;
                    return value;
                }
                
                const text = cell.textContent.trim();
                const num = parseFloat(text);
                if (!isNaN(num)) return num;
                const date = new Date(text);
                if (!isNaN(date.getTime())) return date;
                return text;
            }
            
            function applySortIndicators(tableId, sortColumn, sortDirection) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    const indicator = header.querySelector('.sort-indicator');
                    if (indicator) indicator.textContent = '';
                });
                
                const currentHeader = table.querySelector('th[data-column="' + sortColumn + '"]');
                if (currentHeader) {
                    currentHeader.classList.add('sort-' + sortDirection);
                    let indicator = currentHeader.querySelector('.sort-indicator');
                    if (!indicator) {
                        indicator = document.createElement('span');
                        indicator.className = 'sort-indicator';
                        currentHeader.appendChild(indicator);
                    }
                }
            }
            
            function populateTable(tableId, data, columns) {
                const tbody = document.getElementById(tableId + 'Body');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    
                    columns.forEach(col => {
                        const td = document.createElement('td');
                        td.setAttribute('data-column', col.key);
                        
                        let cellContent = row[col.key] || '';
                        
                        // Apply custom renderer if specified
                        if (col.renderer && typeof window[col.renderer] === 'function') {
                            cellContent = window[col.renderer](cellContent, row);
                        }
                        
                        td.innerHTML = cellContent;
                        
                        if (col.className) {
                            td.className = col.className;
                        }
                        
                        tr.appendChild(td);
                    });
                    
                    tbody.appendChild(tr);
                });
            }
            
            function setupTableFiltering(tableId, filterInputId) {
                const filterInput = document.getElementById(filterInputId);
                const table = document.getElementById(tableId);
                
                if (!filterInput || !table) return;
                
                filterInput.addEventListener('input', function() {
                    const filterValue = this.value.toLowerCase();
                    const rows = table.querySelectorAll('tbody tr');
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(filterValue) ? '' : 'none';
                    });
                });
            }
        `;
    }
}
```

### **Step 3: Create ServiceFactory**

**File**: `src/services/ServiceFactory.ts`
```typescript
import * as vscode from 'vscode';
import { AuthenticationService } from './AuthenticationService';
import { ODataService } from './ODataService';
import { StateService } from './StateService';

export class ServiceFactory {
    private static authService: AuthenticationService;
    private static odataService: ODataService;
    private static stateService: StateService;
    private static initialized = false;
    
    static initialize(context: vscode.ExtensionContext): void {
        if (ServiceFactory.initialized) {
            return;
        }
        
        ServiceFactory.authService = AuthenticationService.getInstance(context);
        ServiceFactory.odataService = new ODataService();
        ServiceFactory.stateService = StateService.getInstance(context);
        ServiceFactory.initialized = true;
    }
    
    static getAuthService(): AuthenticationService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.authService;
    }
    
    static getODataService(): ODataService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.odataService;
    }
    
    static getStateService(): StateService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.stateService;
    }
    
    static isInitialized(): boolean {
        return ServiceFactory.initialized;
    }
}
```

---

## 🎯 Phase 2: Refactor Existing Panels (Week 3)

### **Step 4: Update BasePanel with State Management**

**Changes to**: `src/panels/base/BasePanel.ts`
```typescript
// Add these imports
import { StateService, PanelState } from '../../services/StateService';

// Add to BasePanel class
protected stateService: StateService;
protected currentState: PanelState = {};

constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    authService: AuthenticationService,
    stateService: StateService, // Add this parameter
    config: PanelConfig
) {
    // ... existing constructor code ...
    this.stateService = stateService;
}

/**
 * Initialize with state restoration
 */
protected async initialize(): Promise<void> {
    // Restore state first
    await this.restoreState();
    
    // Then initialize UI
    this.updateWebview();
}

/**
 * Restore panel state from storage
 */
protected async restoreState(): Promise<void> {
    try {
        const savedState = await this.stateService.getPanelState(this.viewType);
        if (savedState) {
            this.currentState = savedState;
            await this.applyRestoredState(savedState);
        }
    } catch (error) {
        console.error(`Error restoring state for ${this.viewType}:`, error);
    }
}

/**
 * Apply restored state - override in child classes
 */
protected async applyRestoredState(state: PanelState): Promise<void> {
    // Base implementation - child classes should override
    if (state.selectedEnvironmentId) {
        // Set environment if available
    }
}

/**
 * Save current panel state
 */
protected async saveState(): Promise<void> {
    try {
        await this.stateService.savePanelState(this.viewType, this.currentState);
    } catch (error) {
        console.error(`Error saving state for ${this.viewType}:`, error);
    }
}

/**
 * Update state and save
 */
protected async updateState(partialState: Partial<PanelState>): Promise<void> {
    this.currentState = { ...this.currentState, ...partialState };
    await this.saveState();
}
```

### **Step 5: Refactor One Panel as Example**

**Example**: Refactor `ImportJobViewerPanel.ts` to use new patterns:

```typescript
import { ComponentFactory, TableConfig, TableColumn } from '../components/ComponentFactory';
import { ServiceFactory } from '../services/ServiceFactory';
import { StateService, PanelState } from '../services/StateService';

export class ImportJobViewerPanel extends BasePanel {
    public static readonly viewType = 'importJobViewer';
    private odataService: ODataService;
    private environmentManager: EnvironmentManager;
    
    public static createOrShow(extensionUri: vscode.Uri): void {
        const existing = BasePanel.focusExisting(ImportJobViewerPanel.viewType);
        if (existing) return;
        ImportJobViewerPanel.createNew(extensionUri);
    }
    
    public static createNew(extensionUri: vscode.Uri): void {
        const panel = BasePanel.createWebviewPanel({
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer',
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true
        });
        
        const authService = ServiceFactory.getAuthService();
        const odataService = ServiceFactory.getODataService();
        const stateService = ServiceFactory.getStateService();
        
        new ImportJobViewerPanel(panel, extensionUri, authService, odataService, stateService);
    }
    
    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        authService: AuthenticationService,
        odataService: ODataService,
        stateService: StateService
    ) {
        super(panel, extensionUri, authService, stateService, {
            viewType: ImportJobViewerPanel.viewType,
            title: 'Import Job Viewer'
        });
        
        this.odataService = odataService;
        this.environmentManager = new EnvironmentManager(authService, (message) => this.postMessage(message));
        
        this.initialize();
    }
    
    protected async applyRestoredState(state: PanelState): Promise<void> {
        if (state.selectedEnvironmentId) {
            this.environmentManager.selectedEnvironmentId = state.selectedEnvironmentId;
        }
    }
    
    protected async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            switch (message.action) {
                case 'loadEnvironments':
                    await this.environmentManager.loadEnvironments();
                    break;
                    
                case 'environmentChanged':
                    this.environmentManager.selectedEnvironmentId = message.environmentId;
                    await this.updateState({ selectedEnvironmentId: message.environmentId });
                    await this.loadImportJobs();
                    break;
                    
                case 'tableSort':
                    await this.updateState({ 
                        sortColumn: message.column, 
                        sortDirection: message.direction 
                    });
                    break;
                    
                case 'refreshImportJobs':
                    await this.loadImportJobs();
                    break;
                    
                default:
                    console.warn(`Unknown message action: ${message.action}`);
            }
        } catch (error) {
            this.handleError(error, message.action);
        }
    }
    
    protected getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Import Job Viewer</title>
            <style>
                ${ComponentFactory.getBaseCss()}
                ${ComponentFactory.getEnvironmentSelectorCss()}
                ${ComponentFactory.getDataTableCss()}
            </style>
        </head>
        <body>
            ${ComponentFactory.createEnvironmentSelector()}
            
            <div class="header">
                <h1 class="title">Import Job Viewer</h1>
                <div class="header-actions">
                    <button class="btn refresh-btn" onclick="refreshImportJobs()">
                        Refresh
                    </button>
                </div>
            </div>
            
            ${ComponentFactory.createFilterControls({ placeholder: 'Filter import jobs...' })}
            
            <div id="content">
                ${ComponentFactory.createDataTable(this.getTableConfig())}
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                ${ComponentFactory.getEnvironmentSelectorJs()}
                ${ComponentFactory.getDataTableJs()}
                ${this.getPanelSpecificJs()}
            </script>
        </body>
        </html>`;
    }
    
    private getTableConfig(): TableConfig {
        return {
            id: 'importJobsTable',
            columns: [
                { key: 'solutionname', label: 'Solution Name', sortable: true },
                { key: 'createdon', label: 'Created On', sortable: true },
                { key: 'completedon', label: 'Completed On', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'progress', label: 'Progress', sortable: false }
            ],
            sortable: true,
            stickyHeader: true,
            stickyFirstColumn: true
        };
    }
    
    private getPanelSpecificJs(): string {
        return `
            function loadDataForEnvironment() {
                vscode.postMessage({ action: 'loadImportJobs' });
            }
            
            function refreshImportJobs() {
                vscode.postMessage({ action: 'refreshImportJobs' });
            }
            
            function saveTableState() {
                vscode.postMessage({ 
                    action: 'tableSort', 
                    column: currentSort.column, 
                    direction: currentSort.direction 
                });
            }
            
            // Set up table when DOM loads
            document.addEventListener('DOMContentLoaded', () => {
                setupTableSorting('importJobsTable', '${this.currentState.sortColumn || 'createdon'}', '${this.currentState.sortDirection || 'desc'}');
                setupTableFiltering('importJobsTable', 'filterInput');
            });
        `;
    }
    
    private handleError(error: any, action: string): void {
        console.error(`Error in ${action}:`, error);
        
        this.postMessage({
            action: 'error',
            message: `Failed to ${action}: ${error.message}`
        });
        
        // Show VS Code notification for critical errors
        if (action === 'loadImportJobs' || action === 'environmentChanged') {
            vscode.window.showErrorMessage(`Import Job Viewer: ${error.message}`);
        }
    }
}
```

---

## 🎯 Phase 3: Create Views System (Week 4)

### **Step 6: Create BaseView Abstract Class**

**File**: `src/views/BaseView.ts`
```typescript
import { TableColumn } from '../components/ComponentFactory';

export interface ViewData {
    [key: string]: any;
}

export interface FilterOption {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'boolean';
    options?: { value: any; label: string }[];
}

export abstract class BaseView<TData = any, TConfig = any> {
    constructor(protected config: TConfig) {}
    
    /**
     * Transform raw data into view-ready format
     */
    abstract transform(data: TData[]): ViewData[];
    
    /**
     * Get column definitions for the table
     */
    abstract getColumns(): TableColumn[];
    
    /**
     * Get available filter options
     */
    getFilterOptions(): FilterOption[] {
        return [];
    }
    
    /**
     * Apply filters to data
     */
    applyFilters(data: ViewData[], filters: Record<string, any>): ViewData[] {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = item[key];
                if (typeof value === 'string') {
                    return String(itemValue).toLowerCase().includes(value.toLowerCase());
                }
                return itemValue === value;
            });
        });
    }
    
    /**
     * Get default sort configuration
     */
    getDefaultSort(): { column: string; direction: 'asc' | 'desc' } {
        return { column: this.getColumns()[0].key, direction: 'asc' };
    }
}
```

### **Step 7: Create Specific View Implementations**

**File**: `src/views/ImportJobView.ts`
```typescript
import { BaseView, ViewData } from './BaseView';
import { TableColumn, ComponentFactory, BadgeType } from '../components/ComponentFactory';

export interface ImportJob {
    importjobid: string;
    solutionname: string;
    createdon: string;
    completedon: string;
    statuscode: number;
    progress: number;
    data: string;
}

export interface ImportJobViewConfig {
    showProgress?: boolean;
    showDetails?: boolean;
}

export class ImportJobView extends BaseView<ImportJob, ImportJobViewConfig> {
    transform(importJobs: ImportJob[]): ViewData[] {
        return importJobs.map(job => ({
            id: job.importjobid,
            solutionname: job.solutionname || 'Unknown',
            createdon: this.formatDate(job.createdon),
            completedon: job.completedon ? this.formatDate(job.completedon) : 'In Progress',
            status: this.renderStatusBadge(job.statuscode),
            progress: this.config.showProgress ? this.renderProgress(job.progress) : '',
            // Add sort values for proper sorting
            'data-sort-createdon': new Date(job.createdon).getTime(),
            'data-sort-completedon': job.completedon ? new Date(job.completedon).getTime() : 0
        }));
    }
    
    getColumns(): TableColumn[] {
        const columns: TableColumn[] = [
            { key: 'solutionname', label: 'Solution Name', sortable: true, width: '200px' },
            { key: 'createdon', label: 'Created On', sortable: true, width: '150px' },
            { key: 'completedon', label: 'Completed On', sortable: true, width: '150px' },
            { key: 'status', label: 'Status', sortable: true, width: '120px' }
        ];
        
        if (this.config.showProgress) {
            columns.push({ key: 'progress', label: 'Progress', sortable: false, width: '100px' });
        }
        
        return columns;
    }
    
    getDefaultSort(): { column: string; direction: 'asc' | 'desc' } {
        return { column: 'createdon', direction: 'desc' };
    }
    
    private formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString();
    }
    
    private renderStatusBadge(statusCode: number): string {
        const statusMap: Record<number, { text: string; type: BadgeType }> = {
            0: { text: 'Submitted', type: BadgeType.Pending },
            1: { text: 'In Progress', type: BadgeType.Progress },
            2: { text: 'Completed', type: BadgeType.Success },
            3: { text: 'Failed', type: BadgeType.Error }
        };
        
        const status = statusMap[statusCode] || { text: 'Unknown', type: BadgeType.Info };
        return ComponentFactory.createStatusBadge(status.text, status.type);
    }
    
    private renderProgress(progress: number): string {
        return `<div class="progress-text">${progress}%</div>`;
    }
}
```

---

## 🎯 Phase 4: Update Extension Entry Point (Week 4)

### **Step 8: Update extension.ts**

```typescript
import { ServiceFactory } from './services/ServiceFactory';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    // Initialize services first
    ServiceFactory.initialize(context);
    
    // Get services from factory
    const authService = ServiceFactory.getAuthService();

    // Initialize providers
    const environmentsProvider = new EnvironmentsProvider(authService);
    const toolsProvider = new ToolsProvider();

    // Register tree data providers
    vscode.window.registerTreeDataProvider('dynamics-devtools-environments', environmentsProvider);
    vscode.window.registerTreeDataProvider('dynamics-devtools-tools', toolsProvider);

    // Initialize command handlers with factory
    const environmentCommands = new EnvironmentCommands(authService, context);
    const panelCommands = new PanelCommands(context, environmentsProvider);
    const metadataBrowserCommands = new MetadataBrowserCommands(context);

    // Register all commands
    const commandDisposables = [
        ...environmentCommands.registerCommands(),
        ...panelCommands.registerCommands(),
        ...metadataBrowserCommands.registerCommands()
    ];

    context.subscriptions.push(...commandDisposables);

    console.log('Dynamics DevTools extension activated successfully!');
}
```

---

## 📋 Implementation Checklist

### ✅ Phase 1: Foundation (Week 1-2)
- [ ] Create StateService class
- [ ] Create ComponentFactory class  
- [ ] Create ServiceFactory class
- [ ] Test foundation components

### ✅ Phase 2: BasePanel Updates (Week 3)
- [ ] Update BasePanel with state management
- [ ] Refactor ImportJobViewerPanel as example
- [ ] Test state persistence
- [ ] Verify sorting works correctly

### ✅ Phase 3: Views System (Week 4)
- [ ] Create BaseView abstract class
- [ ] Create ImportJobView implementation
- [ ] Integrate views with panels
- [ ] Test view rendering

### ✅ Phase 4: Integration (Week 4)
- [ ] Update extension.ts with ServiceFactory
- [ ] Update all command handlers
- [ ] Test complete integration
- [ ] Document usage patterns

### ✅ Phase 5: Remaining Panels (Week 5)
- [ ] Refactor SolutionExplorerPanel
- [ ] Refactor MetadataBrowserPanel  
- [ ] Refactor QueryDataPanel
- [ ] Refactor EnvironmentSetupPanel

---

## 🎯 Testing Strategy

1. **Manual Testing**
   - Panel state persistence across VS Code restarts
   - Environment switching behavior
   - Table sorting in all directions
   - Filter functionality
   - Error handling scenarios

2. **Integration Testing**
   - All panels use ComponentFactory
   - All panels persist state correctly
   - All panels handle environment changes
   - ServiceFactory provides correct instances

3. **Performance Testing**
   - Large dataset rendering
   - State save/restore performance
   - Memory usage with multiple panels

This implementation plan will give you a rock-solid foundation for all future components while solving the current table sorting issues and establishing consistent patterns across the entire extension!
