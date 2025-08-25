import * as vscode from 'vscode';
import { AuthenticationService } from '../../services/AuthenticationService';
import { WebviewMessage, EnvironmentConnection } from '../../types';

/**
 * Environment management functionality for panels
 */
export class EnvironmentManager {
    private _selectedEnvironmentId: string | undefined;
    private _cachedEnvironments: EnvironmentConnection[] | undefined;

    constructor(
        private _authService: AuthenticationService,
        private _postMessage: (message: WebviewMessage) => void
    ) { }

    /**
     * Load environments and send to webview
     */
    async loadEnvironments(): Promise<void> {
        try {
            // Use cached environments if available
            if (this._cachedEnvironments) {
                this._postMessage({
                    action: 'environmentsLoaded',
                    data: this._cachedEnvironments,
                    selectedEnvironmentId: this._selectedEnvironmentId
                });
                return;
            }

            const environments = await this._authService.getEnvironments();

            // Cache the environments
            this._cachedEnvironments = environments;

            this._postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: this._selectedEnvironmentId
            });

        } catch (error: any) {
            console.error('Error loading environments:', error);
            this._postMessage({
                action: 'error',
                message: `Failed to load environments: ${error.message}`
            });
        }
    }

    /**
     * Get the selected environment
     */
    get selectedEnvironmentId(): string | undefined {
        return this._selectedEnvironmentId;
    }

    /**
     * Set the selected environment
     */
    set selectedEnvironmentId(environmentId: string | undefined) {
        this._selectedEnvironmentId = environmentId;
    }

    /**
     * Clear environment cache
     */
    clearCache(): void {
        this._cachedEnvironments = undefined;
    }

    /**
     * Get cached environments
     */
    getCachedEnvironments(): EnvironmentConnection[] | undefined {
        return this._cachedEnvironments;
    }

    /**
     * Get environment dropdown HTML
     */
    getEnvironmentSelectorHtml(): string {
        return `
            <div class="environment-selector">
                <span class="environment-label">Environment:</span>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Loading environments...</option>
                </select>
                <span id="environmentStatus" class="environment-status environment-disconnected">Disconnected</span>
            </div>
        `;
    }

    /**
     * Get standardized table CSS that can be used by any panel
     */
    public static getStandardizedTableCss(): string {
        return `
            /* ===== STANDARDIZED TABLE COMPONENT ===== */
            
            /* Table Container with Responsive Scrolling */
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

            /* Standardized Table Styling */
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

            /* Sticky first column for important data */
            .data-table th:first-child,
            .data-table td:first-child {
                position: sticky;
                left: 0;
                background: var(--vscode-editorWidget-background);
                z-index: 5;
                box-shadow: 2px 0 4px rgba(0,0,0,0.1);
                min-width: 200px;
                max-width: 300px;
            }

            .data-table th:first-child {
                z-index: 15;
                background: var(--vscode-editorGroupHeader-tabsBackground);
            }

            .data-table tr {
                transition: background-color 0.2s ease;
            }

            .data-table tr:hover {
                background: var(--vscode-list-hoverBackground);
            }

            .data-table tr:hover td:first-child {
                background: var(--vscode-list-hoverBackground);
            }

            .data-table tr:last-child td {
                border-bottom: none;
            }

            /* Standardized Sortable Column Styling */
            .sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
            }

            .sortable:hover {
                background: var(--vscode-list-hoverBackground);
            }

            /* Standardized Sort Indicators */
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

            /* Standardized Status Badge Styles */
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: 500;
                margin: 2px;
                white-space: nowrap;
            }

            .status-success, .status-complete {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }

            .status-failed, .status-error {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }

            .status-in-progress, .status-progress {
                background: var(--vscode-charts-orange);
                color: white;
            }

            .status-pending {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
            }

            /* Solution-specific badges */
            .managed-badge {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                margin: 2px;
            }

            .unmanaged-badge {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                margin: 2px;
            }

            /* Solution Name Links */
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

            /* Table scroll hints */
            .table-container::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 20px;
                background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .table-container.has-scroll::after {
                opacity: 1;
            }

            /* Responsive breakpoints */
            @media (max-width: 1200px) {
                .data-table th,
                .data-table td {
                    padding: 8px 12px;
                    font-size: 12px;
                }
                
                .data-table th:first-child,
                .data-table td:first-child {
                    min-width: 150px;
                    max-width: 200px;
                }
            }

            @media (max-width: 768px) {
                .data-table {
                    min-width: 600px;
                }
                
                .data-table th,
                .data-table td {
                    padding: 6px 8px;
                    max-width: 120px;
                }
                
                .data-table th:first-child,
                .data-table td:first-child {
                    min-width: 120px;
                    max-width: 150px;
                }
            }
        `;
    }

    /**
     * Get environment dropdown CSS
     */
    /**
     * Get comprehensive base CSS styles for consistent panel appearance
     */
    getBasePanelCss(): string {
        return `
            body {
                margin: 0;
                padding: 20px;
                font-family: var(--vscode-font-family);
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }

            /* Environment Selector Styles */
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

            /* Header Actions */
            .header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
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

            /* Content Area */
            #content {
                background: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-editorWidget-border);
                border-radius: 6px;
                overflow: hidden;
            }

            /* ===== STANDARDIZED TABLE COMPONENT ===== */
            
            /* Table Container with Responsive Scrolling */
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

            /* Standardized Table Styling */
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

            /* Sticky first column for important data */
            .data-table th:first-child,
            .data-table td:first-child {
                position: sticky;
                left: 0;
                background: var(--vscode-editorWidget-background);
                z-index: 5;
                box-shadow: 2px 0 4px rgba(0,0,0,0.1);
                min-width: 200px;
                max-width: 300px;
            }

            .data-table th:first-child {
                z-index: 15;
                background: var(--vscode-editorGroupHeader-tabsBackground);
            }

            .data-table tr {
                transition: background-color 0.2s ease;
            }

            .data-table tr:hover {
                background: var(--vscode-list-hoverBackground);
            }

            .data-table tr:hover td:first-child {
                background: var(--vscode-list-hoverBackground);
            }

            .data-table tr:last-child td {
                border-bottom: none;
            }

            /* Standardized Sortable Column Styling */
            .sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
            }

            .sortable:hover {
                background: var(--vscode-list-hoverBackground);
            }

            /* Standardized Sort Indicators (ImportJob Style) */
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

            /* Standardized Status Badge Styles */
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: 500;
                margin: 2px;
                white-space: nowrap;
            }

            .status-success, .status-complete {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }

            .status-failed, .status-error {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }

            .status-in-progress, .status-progress {
                background: var(--vscode-charts-orange);
                color: white;
            }

            .status-pending {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
            }

            /* Solution-specific badges */
            .managed-badge {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                margin: 2px;
            }

            .unmanaged-badge {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.85em;
                margin: 2px;
            }

            /* Solution Name Links */
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

            /* Table scroll hints */
            .table-container::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 20px;
                background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .table-container.has-scroll::after {
                opacity: 1;
            }

            /* Responsive breakpoints */
            @media (max-width: 1200px) {
                .data-table th,
                .data-table td {
                    padding: 8px 12px;
                    font-size: 12px;
                }
                
                .data-table th:first-child,
                .data-table td:first-child {
                    min-width: 150px;
                    max-width: 200px;
                }
            }

            @media (max-width: 768px) {
                .data-table {
                    min-width: 600px;
                }
                
                .data-table th,
                .data-table td {
                    padding: 6px 8px;
                    max-width: 120px;
                }
                
                .data-table th:first-child,
                .data-table td:first-child {
                    min-width: 120px;
                    max-width: 150px;
                }
            }
        `;
    }

    /**
     * Get environment selector CSS (now part of base styles)
     * @deprecated Use getBasePanelCss() instead for consistent styling
     */
    getEnvironmentSelectorCss(): string {
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
                box-shadow: 0 0 0 1px var(--vscode-focusBorder);
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
     * Get environment dropdown JavaScript
     */
    public static getEnvironmentSelectorJs(): string {
        return `
            let currentEnvironmentId = '';
            
            // Load environments on startup
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
                
                // Restore selected environment or auto-select first environment if available
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
                statusElement.textContent = status;
                statusElement.className = 'environment-status ' + 
                    (isConnected ? 'environment-connected' : 'environment-disconnected');
            }
            
            function onEnvironmentChange() {
                const select = document.getElementById('environmentSelect');
                currentEnvironmentId = select.value;
                
                if (currentEnvironmentId) {
                    updateEnvironmentStatus('Connected', true);
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
            
            // Set up event listeners when DOM is ready
            document.addEventListener('DOMContentLoaded', () => {
                document.getElementById('environmentSelect').addEventListener('change', onEnvironmentChange);
                loadEnvironments();
            });

            // ===== STANDARDIZED TABLE SORTING FUNCTIONALITY =====
            
            let currentSort = { column: null, direction: 'asc' };
            
            function setupTableSorting(tableId, defaultSortColumn = null, defaultDirection = 'desc') {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                // Setup initial sort if specified
                if (defaultSortColumn) {
                    currentSort = { column: defaultSortColumn, direction: defaultDirection };
                }
                
                // Add click handlers to sortable headers
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.addEventListener('click', () => {
                        const column = header.dataset.column;
                        sortTable(tableId, column);
                    });
                });
                
                // Apply initial sort if specified
                if (defaultSortColumn) {
                    applySortIndicators(tableId, defaultSortColumn, defaultDirection);
                }
            }
            
            function sortTable(tableId, column) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                const tbody = table.querySelector('tbody');
                if (!tbody) return;
                
                // Determine sort direction
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                // Get all rows
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                // Sort rows
                rows.sort((a, b) => {
                    const aCell = a.querySelector(\`[data-column="\${column}"]\`);
                    const bCell = b.querySelector(\`[data-column="\${column}"]\`);
                    
                    if (!aCell || !bCell) return 0;
                    
                    const aValue = getSortValue(aCell);
                    const bValue = getSortValue(bCell);
                    
                    let comparison = 0;
                    
                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        comparison = aValue - bValue;
                    } else if (aValue instanceof Date && bValue instanceof Date) {
                        comparison = aValue.getTime() - bValue.getTime();
                    } else {
                        const aStr = String(aValue).toLowerCase();
                        const bStr = String(bValue).toLowerCase();
                        comparison = aStr.localeCompare(bStr);
                    }
                    
                    return currentSort.direction === 'desc' ? -comparison : comparison;
                });
                
                // Clear tbody and append sorted rows
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
                
                // Update sort indicators
                applySortIndicators(tableId, column, currentSort.direction);
            }
            
            function getSortValue(cell) {
                // Check for data-sort-value attribute first
                if (cell.hasAttribute('data-sort-value')) {
                    const value = cell.getAttribute('data-sort-value');
                    
                    // Try to parse as number
                    const num = parseFloat(value);
                    if (!isNaN(num)) return num;
                    
                    // Try to parse as date
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) return date;
                    
                    return value;
                }
                
                // Fallback to text content
                const text = cell.textContent.trim();
                
                // Try to parse as number
                const num = parseFloat(text);
                if (!isNaN(num)) return num;
                
                // Try to parse as date
                const date = new Date(text);
                if (!isNaN(date.getTime())) return date;
                
                return text;
            }
            
            function applySortIndicators(tableId, sortColumn, sortDirection) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                // Remove all existing sort classes
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    const indicator = header.querySelector('.sort-indicator');
                    if (indicator) {
                        indicator.textContent = '';
                    }
                });
                
                // Add sort class to current column
                const currentHeader = table.querySelector(\`th[data-column="\${sortColumn}"]\`);
                if (currentHeader) {
                    currentHeader.classList.add(\`sort-\${sortDirection}\`);
                    
                    let indicator = currentHeader.querySelector('.sort-indicator');
                    if (!indicator) {
                        indicator = document.createElement('span');
                        indicator.className = 'sort-indicator';
                        currentHeader.appendChild(indicator);
                    }
                }
            }

            // Utility function to update table scroll shadow
            function updateTableScrollShadow(containerId) {
                const container = document.getElementById(containerId);
                if (!container) return;
                
                if (container.scrollWidth > container.clientWidth) {
                    container.classList.add('has-scroll');
                } else {
                    container.classList.remove('has-scroll');
                }
            }

            // Auto-update scroll shadows on resize
            window.addEventListener('resize', () => {
                const containers = document.querySelectorAll('.table-container');
                containers.forEach(container => {
                    if (container.scrollWidth > container.clientWidth) {
                        container.classList.add('has-scroll');
                    } else {
                        container.classList.remove('has-scroll');
                    }
                });
            });
        `;
    }

    /**
     * Get just the table sorting JavaScript functions without environment management
     */
    public static getStandardizedTableSortingJs(): string {
        return `
            // ===== STANDARDIZED TABLE SORTING FUNCTIONALITY =====
            
            let currentSort = { column: null, direction: 'asc' };
            
            function setupTableSorting(tableId, defaultSortColumn = null, defaultDirection = 'desc') {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                // Setup initial sort if specified
                if (defaultSortColumn) {
                    currentSort = { column: defaultSortColumn, direction: defaultDirection };
                }
                
                // Add click handlers to sortable headers
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.addEventListener('click', () => {
                        const column = header.dataset.column;
                        sortTable(tableId, column);
                    });
                });
                
                // Apply initial sort if specified
                if (defaultSortColumn) {
                    applySortIndicators(tableId, defaultSortColumn, defaultDirection);
                }
            }
            
            function sortTable(tableId, column) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                const tbody = table.querySelector('tbody');
                if (!tbody) return;
                
                // Determine sort direction
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                // Get all rows
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                // Sort rows
                rows.sort((a, b) => {
                    const aCell = a.querySelector('[data-column="' + column + '"]');
                    const bCell = b.querySelector('[data-column="' + column + '"]');
                    
                    if (!aCell || !bCell) return 0;
                    
                    const aValue = getSortValue(aCell);
                    const bValue = getSortValue(bCell);
                    
                    let comparison = 0;
                    
                    // Handle different data types
                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        comparison = aValue - bValue;
                    } else if (aValue instanceof Date && bValue instanceof Date) {
                        comparison = aValue.getTime() - bValue.getTime();
                    } else if (column === 'version') {
                        // Special handling for version strings (e.g., "1.0.0.1")
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
                        // String comparison
                        const aStr = String(aValue).toLowerCase();
                        const bStr = String(bValue).toLowerCase();
                        comparison = aStr.localeCompare(bStr);
                    }
                    
                    return currentSort.direction === 'desc' ? -comparison : comparison;
                });
                
                // Re-append sorted rows
                tbody.innerHTML = '';
                rows.forEach(row => tbody.appendChild(row));
                
                // Update sort indicators
                applySortIndicators(tableId, column, currentSort.direction);
            }
            
            function getSortValue(cell) {
                // Check if cell has explicit sort value
                if (cell.hasAttribute('data-sort-value')) {
                    const value = cell.getAttribute('data-sort-value');
                    
                    // Try to parse as number
                    const num = parseFloat(value);
                    if (!isNaN(num)) return num;
                    
                    // Try to parse as date
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) return date;
                    
                    return value;
                }
                
                // Use text content
                const text = cell.textContent.trim();
                
                // Try to parse as number
                const num = parseFloat(text);
                if (!isNaN(num)) return num;
                
                // Try to parse as date
                const date = new Date(text);
                if (!isNaN(date.getTime())) return date;
                
                return text;
            }
            
            function applySortIndicators(tableId, sortColumn, sortDirection) {
                const table = document.getElementById(tableId);
                if (!table) return;
                
                // Clear all existing indicators
                const headers = table.querySelectorAll('th.sortable');
                headers.forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    const indicator = header.querySelector('.sort-indicator');
                    if (indicator) {
                        indicator.textContent = '';
                    }
                });
                
                // Add indicator to current column
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
        `;
    }
}
