import { FilterableTableConfig, FilterableTableColumn, FilterableTableRow, FilterCondition, FilterGroup, SavedFilter, FILTER_OPERATORS } from './FilterableTableConfig';
import { DataTableView, DataTableViewState } from '../DataTable/DataTableView';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';

/**
 * FilterableTableView - HTML generation for FilterableTable component
 * Extends DataTableView with advanced filtering UI components
 */

export interface FilterableTableViewState extends DataTableViewState {
    filterGroups: FilterGroup[];
    activeFilters: FilterCondition[];
    savedFilters: SavedFilter[];
    quickFilter: string;
    showAdvancedFilters: boolean;
    highlightMatches: boolean;
}

export class FilterableTableView {
    /**
     * Main render method - generates complete HTML for filterable table
     */
    static render(config: FilterableTableConfig, state: FilterableTableViewState): string {
        const baseHtml = DataTableView.render(config, state);
        
        // Extract the table content and wrap with filterable-specific elements
        const tableMatch = baseHtml.match(/<div class="data-table-container"[^>]*>([\s\S]*?)<\/div>\s*<\/div>$/)
        const tableContent = tableMatch ? tableMatch[1] : baseHtml;
        
        const {
            id,
            className = '',
            filterToolbarPosition = 'top',
            showFilterSummary = true
        } = config;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            'filterable-table',
            className,
            state.showAdvancedFilters ? 'filterable-table--advanced-open' : '',
            state.loading ? 'filterable-table--loading' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="FilterableTable">
                
                ${filterToolbarPosition === 'top' || filterToolbarPosition === 'both' 
                    ? this.renderFilterToolbar(config, state, 'top') : ''}
                
                <div class="filterable-table-container">
                    <div class="filterable-table-wrapper">
                        ${this.renderEnhancedTable(config, state)}
                    </div>
                    
                    ${showFilterSummary ? this.renderFilterSummary(config, state) : ''}
                    ${state.showAdvancedFilters ? this.renderAdvancedFilterBuilder(config, state) : ''}
                </div>
                
                ${filterToolbarPosition === 'bottom' || filterToolbarPosition === 'both' 
                    ? this.renderFilterToolbar(config, state, 'bottom') : ''}
            </div>
        `;
    }

    /**
     * Render filter toolbar
     */
    private static renderFilterToolbar(config: FilterableTableConfig, state: FilterableTableViewState, position: 'top' | 'bottom'): string {
        const {
            searchable = false,
            quickFilterColumns = [],
            advancedFiltering = true,
            filterSaveEnabled = true,
            showActiveFiltersCount = true
        } = config;

        const activeFilterCount = state.activeFilters.length;

        return `
            <div class="filterable-table-toolbar filterable-table-toolbar--${position}">
                <div class="filterable-table-toolbar-left">
                    ${searchable ? this.renderQuickFilter(config, state) : ''}
                    
                    ${showActiveFiltersCount && activeFilterCount > 0 ? `
                        <div class="filterable-table-active-count">
                            <span class="filter-count-badge">
                                ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="filterable-table-toolbar-right">
                    ${advancedFiltering ? `
                        <button class="filterable-table-filter-toggle" 
                                data-component-element="toggle-advanced-filters"
                                title="${state.showAdvancedFilters ? 'Hide' : 'Show'} advanced filters">
                            ${ICONS.FILTER} 
                            ${state.showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
                        </button>
                    ` : ''}
                    
                    ${filterSaveEnabled ? this.renderFilterControls(config, state) : ''}
                    
                    ${activeFilterCount > 0 ? `
                        <button class="filterable-table-clear-filters" 
                                data-component-element="clear-filters"
                                title="Clear all filters">
                            ${ICONS.CLOSE} Clear All
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render quick filter input
     */
    private static renderQuickFilter(config: FilterableTableConfig, state: FilterableTableViewState): string {
        const {
            searchPlaceholder = 'Quick filter...',
            quickFilterColumns = []
        } = config;

        const placeholder = quickFilterColumns.length > 0 
            ? `Search in ${quickFilterColumns.length} column${quickFilterColumns.length !== 1 ? 's' : ''}...`
            : searchPlaceholder;

        return `
            <div class="filterable-table-quick-filter">
                <input type="text" 
                       class="filterable-table-quick-filter-input"
                       placeholder="${this.escapeHtml(placeholder)}"
                       value="${this.escapeHtml(state.quickFilter || '')}"
                       data-component-element="quick-filter">
                <span class="filterable-table-quick-filter-icon">${ICONS.SEARCH}</span>
                ${state.quickFilter ? `
                    <button class="filterable-table-quick-filter-clear" 
                            data-component-element="clear-quick-filter"
                            title="Clear quick filter">
                        ${ICONS.CLOSE}
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render filter controls (save, load, presets)
     */
    private static renderFilterControls(config: FilterableTableConfig, state: FilterableTableViewState): string {
        const {
            filterPresets = [],
            filterShareEnabled = false
        } = config;

        const hasActiveFilters = state.activeFilters.length > 0;

        return `
            <div class="filterable-table-filter-controls">
                ${filterPresets.length > 0 ? `
                    <div class="filterable-table-filter-presets">
                        <select class="filterable-table-preset-select" 
                                data-component-element="filter-preset">
                            <option value="">Load preset...</option>
                            ${filterPresets.map(preset => `
                                <option value="${preset.id}">
                                    ${this.escapeHtml(preset.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                ` : ''}
                
                ${hasActiveFilters ? `
                    <button class="filterable-table-save-filter" 
                            data-component-element="save-filter"
                            title="Save current filter">
                        ${ICONS.SAVE} Save Filter
                    </button>
                ` : ''}
                
                ${filterShareEnabled && hasActiveFilters ? `
                    <button class="filterable-table-share-filter" 
                            data-component-element="share-filter"
                            title="Share current filter">
                        ${ICONS.SHARE} Share
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render filter summary showing active filters
     */
    private static renderFilterSummary(config: FilterableTableConfig, state: FilterableTableViewState): string {
        const { activeFilters } = state;
        
        if (activeFilters.length === 0) {
            return '';
        }

        return `
            <div class="filterable-table-filter-summary">
                <div class="filterable-table-active-filters">
                    <span class="active-filters-label">Active filters:</span>
                    ${activeFilters.map(filter => this.renderFilterTag(filter, config)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual filter tag
     */
    private static renderFilterTag(filter: FilterCondition, config: FilterableTableConfig): string {
        const column = config.columns.find(col => col.id === filter.columnId);
        const columnLabel = column?.label || filter.columnId;
        
        const operatorInfo = this.getOperatorInfo(filter.operator, column?.type || 'text');
        const operatorLabel = operatorInfo?.label || filter.operator;
        
        let valueText = '';
        if (filter.values && filter.values.length > 1) {
            valueText = filter.values.join(', ');
        } else if (filter.value !== null && filter.value !== undefined) {
            valueText = String(filter.value);
        }

        return `
            <span class="filterable-table-filter-tag" 
                  data-filter-id="${filter.id}"
                  title="${this.escapeHtml(`${columnLabel} ${operatorLabel} ${valueText}`)}">
                <span class="filter-tag-column">${this.escapeHtml(columnLabel)}</span>
                <span class="filter-tag-operator">${this.escapeHtml(operatorLabel)}</span>
                ${valueText ? `<span class="filter-tag-value">${this.escapeHtml(valueText)}</span>` : ''}
                <button class="filter-tag-remove" 
                        data-component-element="remove-filter"
                        data-filter-id="${filter.id}"
                        title="Remove filter">
                    ${ICONS.CLOSE}
                </button>
            </span>
        `;
    }

    /**
     * Render advanced filter builder
     */
    private static renderAdvancedFilterBuilder(config: FilterableTableConfig, state: FilterableTableViewState): string {
        const { filterGroups } = state;

        return `
            <div class="filterable-table-filter-builder" 
                 data-component-element="filter-builder">
                
                <div class="filter-builder-header">
                    <h4>Advanced Filters</h4>
                    <button class="filter-builder-close" 
                            data-component-element="close-advanced-filters"
                            title="Close advanced filters">
                        ${ICONS.CLOSE}
                    </button>
                </div>
                
                <div class="filter-builder-content">
                    ${filterGroups.length > 0 ? `
                        <div class="filter-groups">
                            ${filterGroups.map((group, index) => 
                                this.renderFilterGroup(group, index, config, state)
                            ).join('')}
                        </div>
                        
                        ${filterGroups.length > 1 ? `
                            <div class="filter-global-logic">
                                <label>
                                    <span>Group Logic:</span>
                                    <select data-component-element="global-logic">
                                        <option value="AND">Match ALL groups</option>
                                        <option value="OR">Match ANY group</option>
                                    </select>
                                </label>
                            </div>
                        ` : ''}
                    ` : `
                        <div class="filter-builder-empty">
                            <p>No filters configured</p>
                        </div>
                    `}
                    
                    <div class="filter-builder-actions">
                        <button class="filter-add-group" 
                                data-component-element="add-filter-group">
                            ${ICONS.PLUS} Add Filter Group
                        </button>
                        
                        <button class="filter-apply" 
                                data-component-element="apply-filters">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render filter group
     */
    private static renderFilterGroup(group: FilterGroup, index: number, config: FilterableTableConfig, state: FilterableTableViewState): string {
        return `
            <div class="filterable-table-filter-group" 
                 data-group-id="${group.id}"
                 data-group-index="${index}">
                
                <div class="filter-group-header">
                    <div class="filter-group-info">
                        <span class="filter-group-name">${this.escapeHtml(group.name)}</span>
                        <select class="filter-group-logic" 
                                data-component-element="group-logic"
                                data-group-id="${group.id}">
                            <option value="AND" ${group.logic === 'AND' ? 'selected' : ''}>Match ALL</option>
                            <option value="OR" ${group.logic === 'OR' ? 'selected' : ''}>Match ANY</option>
                        </select>
                    </div>
                    
                    <div class="filter-group-actions">
                        <label class="filter-group-enabled">
                            <input type="checkbox" 
                                   ${group.enabled ? 'checked' : ''}
                                   data-component-element="toggle-group"
                                   data-group-id="${group.id}">
                            Enabled
                        </label>
                        
                        <button class="filter-group-remove" 
                                data-component-element="remove-group"
                                data-group-id="${group.id}"
                                title="Remove group">
                            ${ICONS.TRASH}
                        </button>
                    </div>
                </div>
                
                <div class="filter-group-conditions">
                    ${group.conditions.map(condition => 
                        this.renderFilterCondition(condition, config)
                    ).join('')}
                    
                    <button class="filter-add-condition" 
                            data-component-element="add-condition"
                            data-group-id="${group.id}">
                        ${ICONS.PLUS} Add Condition
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render filter condition
     */
    private static renderFilterCondition(condition: FilterCondition, config: FilterableTableConfig): string {
        const { columns } = config;
        const selectedColumn = columns.find(col => col.id === condition.columnId);
        const availableOperators = this.getOperatorsForColumn(selectedColumn);
        
        return `
            <div class="filterable-table-filter-condition" 
                 data-condition-id="${condition.id}">
                
                <div class="filter-condition-controls">
                    <select class="filter-condition-column" 
                            data-component-element="condition-column"
                            data-condition-id="${condition.id}">
                        <option value="">Select column...</option>
                        ${columns.filter(col => col.filterable !== false).map(col => `
                            <option value="${col.id}" ${col.id === condition.columnId ? 'selected' : ''}>
                                ${this.escapeHtml(col.label)}
                            </option>
                        `).join('')}
                    </select>
                    
                    <select class="filter-condition-operator" 
                            data-component-element="condition-operator"
                            data-condition-id="${condition.id}"
                            ${!condition.columnId ? 'disabled' : ''}>
                        <option value="">Select operator...</option>
                        ${Object.entries(availableOperators).map(([key, op]) => `
                            <option value="${key}" ${key === condition.operator ? 'selected' : ''}>
                                ${this.escapeHtml(op.label)}
                            </option>
                        `).join('')}
                    </select>
                    
                    ${this.renderConditionValueInput(condition, selectedColumn, availableOperators[condition.operator])}
                    
                    <label class="filter-condition-enabled">
                        <input type="checkbox" 
                               ${condition.enabled ? 'checked' : ''}
                               data-component-element="toggle-condition"
                               data-condition-id="${condition.id}">
                    </label>
                    
                    <button class="filter-condition-remove" 
                            data-component-element="remove-condition"
                            data-condition-id="${condition.id}"
                            title="Remove condition">
                        ${ICONS.CLOSE}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render condition value input based on operator
     */
    private static renderConditionValueInput(condition: FilterCondition, column: FilterableTableColumn | undefined, operatorInfo: any): string {
        if (!operatorInfo || !operatorInfo.requiresValue) {
            return '<span class="filter-condition-no-value">No value required</span>';
        }

        const columnType = column?.type || 'text';
        const isRange = operatorInfo.requiresRange;
        const allowMultiple = operatorInfo.allowMultiple;
        
        if (isRange) {
            return `
                <div class="filter-condition-range">
                    <input type="${this.getInputType(columnType)}" 
                           class="filter-condition-value filter-condition-value-from"
                           placeholder="From"
                           value="${condition.values?.[0] || ''}"
                           data-component-element="condition-value-from"
                           data-condition-id="${condition.id}">
                    <span class="filter-range-separator">to</span>
                    <input type="${this.getInputType(columnType)}" 
                           class="filter-condition-value filter-condition-value-to"
                           placeholder="To"
                           value="${condition.values?.[1] || ''}"
                           data-component-element="condition-value-to"
                           data-condition-id="${condition.id}">
                </div>
            `;
        }
        
        if (allowMultiple) {
            return `
                <textarea class="filter-condition-value filter-condition-value-multiple"
                          placeholder="Enter values (one per line)"
                          data-component-element="condition-value-multiple"
                          data-condition-id="${condition.id}"
                          rows="3">${condition.values ? condition.values.join('\n') : ''}</textarea>
            `;
        }
        
        // Handle suggestions/options
        if (column?.filterOptions) {
            return `
                <select class="filter-condition-value filter-condition-value-select"
                        data-component-element="condition-value"
                        data-condition-id="${condition.id}">
                    <option value="">Select value...</option>
                    ${column.filterOptions.map(option => `
                        <option value="${this.escapeHtml(String(option.value))}" 
                                ${String(option.value) === String(condition.value) ? 'selected' : ''}>
                            ${this.escapeHtml(option.label)}
                        </option>
                    `).join('')}
                </select>
            `;
        }
        
        return `
            <input type="${this.getInputType(columnType)}" 
                   class="filter-condition-value"
                   placeholder="Enter value..."
                   value="${this.escapeHtml(String(condition.value || ''))}"
                   data-component-element="condition-value"
                   data-condition-id="${condition.id}">
        `;
    }

    /**
     * Render enhanced table with highlighting
     */
    private static renderEnhancedTable(config: FilterableTableConfig, state: FilterableTableViewState): string {
        // Use base DataTable render with filterable enhancements
        const baseTable = DataTableView.render(config, state);
        
        if (!state.highlightMatches || !state.quickFilter) {
            return baseTable;
        }
        
        // Add match highlighting (would be done client-side in real implementation)
        return baseTable;
    }

    /**
     * Get input type for column type
     */
    private static getInputType(columnType: string): string {
        switch (columnType) {
            case 'number': return 'number';
            case 'date': return 'date';
            case 'boolean': return 'checkbox';
            default: return 'text';
        }
    }

    /**
     * Get available operators for column
     */
    private static getOperatorsForColumn(column: FilterableTableColumn | undefined): Record<string, any> {
        if (!column) return {};
        
        const columnType = column.type || 'text';
        
        if (column.filterOperators) {
            // Use custom operators if specified
            const baseOperators = this.getOperatorsByType(columnType);
            const customOperators: Record<string, any> = {};
            
            column.filterOperators.forEach(op => {
                if (baseOperators[op]) {
                    customOperators[op] = baseOperators[op];
                }
            });
            
            return customOperators;
        }
        
        return this.getOperatorsByType(columnType);
    }

    /**
     * Get operators by type
     */
    private static getOperatorsByType(columnType: string): Record<string, any> {
        switch (columnType) {
            case 'number': return FILTER_OPERATORS.NUMBER;
            case 'date': return FILTER_OPERATORS.DATE;
            case 'boolean': return FILTER_OPERATORS.BOOLEAN;
            default: return FILTER_OPERATORS.TEXT;
        }
    }

    /**
     * Get operator info
     */
    private static getOperatorInfo(operator: string, columnType: string): any {
        const operators = this.getOperatorsByType(columnType);
        return operators[operator];
    }

    /**
     * Escape HTML to prevent XSS
     */
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
