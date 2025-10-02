export interface TableConfig {
    id: string;
    columns: TableColumn[];
    defaultSort?: {
        column: string;
        direction: 'asc' | 'desc';
        type?: 'string' | 'number' | 'date' | 'version';
    };
    rowActions?: TableAction[];
    contextMenu?: ContextMenuItem[];
    bulkActions?: BulkAction[];
    filterable?: boolean;
    selectable?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    className?: string;
    showFooter?: boolean;
    footerText?: string;
}

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    className?: string;
    renderer?: string;
}

export interface TableAction {
    id: string;
    label: string;
    icon?: string;
    action: string;
    condition?: string;
    className?: string;
}

export interface ContextMenuItem {
    id: string;
    label: string;
    action: string;
    separator?: boolean;
    condition?: string;
}

export interface BulkAction {
    id: string;
    label: string;
    action: string;
    icon?: string;
    requiresSelection?: boolean;
    className?: string;
}

export interface EnvironmentSelectorConfig {
    id?: string;
    statusId?: string;
    label?: string;
    placeholder?: string;
    showStatus?: boolean;
    onSelectionChange?: string;
    className?: string;
}

export interface SolutionSelectorConfig {
    id?: string;
    className?: string;
    label?: string;
    placeholder?: string;
    onSelectionChange?: string;
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
        const statusId = config.statusId || (id === 'environmentSelect' ? 'environmentStatus' : `${id}Status`);
        const className = config.className || 'environment-selector';
        const label = config.label || 'Environment:';
        const showStatus = config.showStatus !== false;
        const placeholder = config.placeholder || 'Loading environments...';

        return `
            <div class="${className}">
                <span class="environment-label">${label}</span>
                <select id="${id}" class="environment-dropdown">
                    <option value="">${placeholder}</option>
                </select>
                ${showStatus ? `<span id="${statusId}" class="environment-status environment-disconnected">Disconnected</span>` : ''}
            </div>
        `;
    }

    /**
     * Create solution selector component
     */
    static createSolutionSelector(config: SolutionSelectorConfig = {}): string {
        const id = config.id || 'solutionSelect';
        const className = config.className || 'solution-selector';
        const label = config.label || 'Solution:';
        const placeholder = config.placeholder || 'Loading solutions...';

        return `
            <div class="${className}">
                <span class="solution-label">${label}</span>
                <select id="${id}" class="solution-dropdown">
                    <option value="">${placeholder}</option>
                </select>
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
            defaultSort,
            rowActions = [],
            contextMenu = [],
            bulkActions = [],
            filterable = false,
            selectable = false,
            stickyHeader = true,
            stickyFirstColumn = true,
            className = 'data-table',
            showFooter = false,
            footerText = 'Showing {filteredCount} of {totalCount} items'
        } = config;

        const sortable = columns.some(col => col.sortable !== false) || !!defaultSort;

        const tableClass = [
            className,
            sortable ? 'sortable-table' : '',
            stickyHeader ? 'sticky-header' : '',
            stickyFirstColumn ? 'sticky-first-column' : '',
            selectable ? 'selectable-table' : '',
            filterable ? 'filterable-table' : ''
        ].filter(Boolean).join(' ');

        const filterControls = filterable ? `
            <div class="table-controls">
                <input type="text" id="${id}_filter" placeholder="Filter table..." class="filter-input">
                <button onclick="clearTableFilter('${id}')" class="clear-filter-btn">Clear</button>
            </div>
        ` : '';

        // Add bulk actions if enabled and actions exist
        const bulkActionsHtml = (selectable && bulkActions.length > 0) ? `
            <div class="bulk-actions" id="${id}_bulkActions" style="display: none;">
                ${bulkActions.map(action => `
                    <button onclick="handleBulkAction('${id}', '${action.action}', '${action.id}')" 
                            class="bulk-action-btn ${action.className || ''}"
                            ${action.requiresSelection ? 'disabled' : ''}>
                        ${action.icon ? `<span class="icon">${action.icon}</span>` : ''}
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        ` : '';

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

        const actionHeader = rowActions.length > 0 ? `
            <th class="actions-column" style="width: ${rowActions.length * 40 + 20}px;">Actions</th>
        ` : '';

        const selectionHeader = selectable ? `
            <th class="selection-column" style="width: 40px;">
                <input type="checkbox" id="${id}_selectAll" onchange="handleSelectAll('${id}', this.checked)">
            </th>
        ` : '';

        const footerHtml = showFooter ? `
            <div class="table-footer" id="${id}Footer">
                <span class="record-count" id="${id}RecordCount">${footerText.replace('{filteredCount}', '0').replace('{totalCount}', '0')}</span>
            </div>
        ` : '';

        return `
            <div class="table-container" id="${id}Container">
                ${filterControls}
                ${bulkActionsHtml}
                <div class="table-scroll-wrapper">
                    <table id="${id}" class="${tableClass}" 
                           data-default-sort='${JSON.stringify(defaultSort || {})}'
                           data-row-actions='${JSON.stringify(rowActions)}'
                           data-context-menu='${JSON.stringify(contextMenu)}'
                           data-footer-text='${footerText}'>
                        <thead>
                            <tr>
                                ${selectionHeader}
                                ${headers}
                                ${actionHeader}
                            </tr>
                        </thead>
                        <tbody id="${id}Body">
                            <!-- Data will be populated by JavaScript -->
                        </tbody>
                    </table>
                </div>
                ${footerHtml}
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
     * Get data table JavaScript - Fixed table sorting functionality
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
                        
                        // Add sort value if provided
                        if (row['data-sort-' + col.key] !== undefined) {
                            td.setAttribute('data-sort-value', row['data-sort-' + col.key]);
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
