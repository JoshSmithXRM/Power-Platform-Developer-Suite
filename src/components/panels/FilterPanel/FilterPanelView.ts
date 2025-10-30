/**
 * FilterPanelView - Generates HTML for Filter Panel Component
 */

import { FilterPanelConfig, FilterFieldConfig, OPERATOR_LABELS, QuickFilterConfig } from './FilterPanelConfig';

export class FilterPanelView {
    /**
     * Generate complete filter panel HTML
     */
    static generateHTML(config: FilterPanelConfig): string {
        const collapseIcon = config.defaultCollapsed ? '▶' : '▼';
        const contentStyle = config.defaultCollapsed ? 'style="display: none;"' : '';

        return `
            <div class="filter-panel"
                 id="${config.id}"
                 data-component-id="${config.id}"
                 data-component-type="FilterPanel"
                 data-config-collapsible="${config.collapsible || false}"
                 data-config-default-collapsed="${config.defaultCollapsed || false}">
                ${config.collapsible ? `
                    <div class="filter-panel-header" data-toggle="collapse">
                        <span class="filter-panel-toggle">${collapseIcon}</span>
                        <span class="filter-panel-title">Filters</span>
                        <span class="filter-panel-count" data-filter-count></span>
                    </div>
                ` : ''}
                <div class="filter-panel-content" ${contentStyle}>
                    ${this.generateQuickFilters(config)}
                    ${this.generateAdvancedFilters(config)}
                </div>
            </div>
        `;
    }

    /**
     * Generate quick filters section
     */
    private static generateQuickFilters(config: FilterPanelConfig): string {
        if (!config.quickFilters || config.quickFilters.length === 0) {
            return '';
        }

        return `
            <div class="filter-section quick-filters">
                <div class="filter-section-label">Quick Filters</div>
                <div class="quick-filter-list">
                    ${config.quickFilters.map(qf => this.generateQuickFilter(qf)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generate single quick filter checkbox
     */
    private static generateQuickFilter(filter: QuickFilterConfig): string {
        return `
            <label class="quick-filter-item">
                <input
                    type="checkbox"
                    class="quick-filter-checkbox"
                    data-filter-id="${filter.id}"
                    data-conditions='${JSON.stringify(filter.conditions)}'
                />
                <span class="quick-filter-label">${filter.label}</span>
            </label>
        `;
    }

    /**
     * Generate advanced filters section
     */
    private static generateAdvancedFilters(config: FilterPanelConfig): string {
        return `
            <div class="filter-section advanced-filters">
                <div class="filter-section-label">Advanced Filters</div>
                <div class="filter-conditions-container" data-max-conditions="${config.maxConditions || 10}">
                    <div class="filter-conditions-list">
                        <!-- Filter conditions will be added dynamically -->
                    </div>
                    <button class="btn btn-secondary add-condition-btn" data-action="addCondition">
                        <span class="btn-icon">+</span> Add Condition
                    </button>
                </div>
                <div class="filter-actions">
                    <button class="btn btn-primary" data-action="applyFilters">Apply Filters</button>
                    <button class="btn btn-secondary" data-action="clearFilters">Clear All</button>
                    ${config.showPreviewCount !== false ? `
                        <span class="filter-preview-count" data-preview-count></span>
                    ` : ''}
                </div>
            </div>

            <!-- Hidden field configs for behavior script -->
            <script type="application/json" data-field-configs="${config.id}">
                ${JSON.stringify(config.advancedFilters)}
            </script>
        `;
    }

    /**
     * Generate single filter condition row (used by behavior script)
     */
    static generateConditionRow(conditionId: string, fields: FilterFieldConfig[], fieldValue: string = '', operatorValue: string = '', value: unknown = '', logicalOperator: 'AND' | 'OR' = 'AND'): string {
        const selectedField = fields.find(f => f.field === fieldValue);

        return `
            <div class="filter-condition" data-condition-id="${conditionId}">
                <div class="filter-condition-row">
                    <select class="filter-field" data-field-select>
                        <option value="">Select field...</option>
                        ${fields.map(f => `
                            <option value="${f.field}" ${f.field === fieldValue ? 'selected' : ''}>
                                ${f.label}
                            </option>
                        `).join('')}
                    </select>

                    <select class="filter-operator" data-operator-select ${!selectedField ? 'disabled' : ''}>
                        <option value="">Select operator...</option>
                        ${selectedField ? this.generateOperatorOptions(selectedField, operatorValue) : ''}
                    </select>

                    <div class="filter-value-container">
                        ${selectedField ? this.generateValueInput(selectedField, operatorValue, value) : `
                            <input type="text" class="filter-value" disabled placeholder="Select field first" />
                        `}
                    </div>

                    <button class="btn-icon-only btn-remove-condition" data-action="removeCondition" title="Remove condition">
                        ×
                    </button>
                </div>

                <div class="filter-logical-operator">
                    <select class="logical-operator-select" data-logical-operator>
                        <option value="AND" ${logicalOperator === 'AND' ? 'selected' : ''}>AND</option>
                        <option value="OR" ${logicalOperator === 'OR' ? 'selected' : ''}>OR</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Generate operator options based on field type
     */
    private static generateOperatorOptions(field: FilterFieldConfig, selectedValue: string = ''): string {
        return field.operators.map(op => `
            <option value="${op}" ${op === selectedValue ? 'selected' : ''}>
                ${OPERATOR_LABELS[op]}
            </option>
        `).join('');
    }

    /**
     * Generate value input based on field type and operator
     */
    private static generateValueInput(field: FilterFieldConfig, operator: string, value: unknown): string {
        // Boolean type with 'equals' operator
        if (field.type === 'boolean' && operator === 'equals') {
            return `
                <select class="filter-value" data-value-input>
                    <option value="true" ${value === 'true' || value === true ? 'selected' : ''}>Yes</option>
                    <option value="false" ${value === 'false' || value === false ? 'selected' : ''}>No</option>
                </select>
            `;
        }

        // Select type
        if (field.type === 'select' && field.options) {
            return `
                <select class="filter-value" data-value-input>
                    <option value="">Select value...</option>
                    ${field.options.map(opt => `
                        <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
            `;
        }

        // Between operator needs two inputs
        if (operator === 'between') {
            const value1 = Array.isArray(value) ? this.normalizeValue(value[0]) : this.normalizeValue(value);
            const value2 = Array.isArray(value) && value.length > 1 ? this.normalizeValue(value[1]) : '';

            return `
                <input
                    type="${this.getInputType(field.type)}"
                    class="filter-value filter-value-between"
                    data-value-input
                    placeholder="${field.placeholder || 'From'}"
                    value="${value1 || ''}"
                />
                <span class="filter-value-separator">to</span>
                <input
                    type="${this.getInputType(field.type)}"
                    class="filter-value filter-value-between"
                    data-value-input-2
                    placeholder="${field.placeholder || 'To'}"
                    value="${value2 || ''}"
                />
            `;
        }

        // isNull / isNotNull don't need value input
        if (operator === 'isNull' || operator === 'isNotNull') {
            return `<span class="filter-no-value">No value needed</span>`;
        }

        // Default input
        return `
            <input
                type="${this.getInputType(field.type)}"
                class="filter-value"
                data-value-input
                placeholder="${field.placeholder || 'Enter value...'}"
                value="${value || ''}"
            />
        `;
    }

    /**
     * Get HTML input type from field type
     */
    private static getInputType(fieldType: string): string {
        switch (fieldType) {
            case 'number':
                return 'number';
            case 'datetime':
                return 'datetime-local';
            default:
                return 'text';
        }
    }

    /**
     * Normalize unknown value to string for HTML attributes
     */
    private static normalizeValue(value: unknown): string | number {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string' || typeof value === 'number') {
            return value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return String(value);
    }
}
