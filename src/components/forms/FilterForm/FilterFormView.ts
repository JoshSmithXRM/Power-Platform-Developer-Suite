import { 
    FilterFormConfig, 
    FilterCondition,
    FilterField,
    SavedFilter,
    FILTER_FORM_CSS,
    DEFAULT_FILTER_FORM_CONFIG,
    OPERATOR_LABELS,
    FIELD_TYPE_OPERATORS
} from './FilterFormConfig';

/**
 * FilterFormView.ts
 * 
 * HTML generation for FilterFormComponent
 * Renders the complete filter form UI including conditions, groups, saved filters, and preview
 */

export interface FilterFormViewState {
    conditions: FilterCondition[];
    savedFilters: SavedFilter[];
    selectedSavedFilter?: string;
    isLoading: boolean;
    error?: string;
    validationErrors: string[];
    showPreview: boolean;
    previewContent?: string;
    activeQuickFilter?: string;
}

export class FilterFormView {
    static render(config: FilterFormConfig, state: FilterFormViewState): string {
        const mergedConfig = { ...DEFAULT_FILTER_FORM_CONFIG, ...config };
        const cssClasses = this.buildCssClasses(mergedConfig, state);

        return `
            <div class="${cssClasses.container}" 
                 data-component-id="${config.id}"
                 ${mergedConfig.required ? 'data-required="true"' : ''}
                 ${mergedConfig.disabled ? 'data-disabled="true"' : ''}
                 role="form"
                 ${config.ariaLabel ? `aria-label="${config.ariaLabel}"` : ''}
                 ${config.ariaDescribedBy ? `aria-describedby="${config.ariaDescribedBy}"` : ''}>
                
                ${this.renderLabel(mergedConfig)}
                ${this.renderHeader(mergedConfig, state)}
                ${this.renderBody(mergedConfig, state)}
                ${this.renderFooter(mergedConfig, state)}
                ${this.renderValidationMessage(mergedConfig, state)}
            </div>
        `;
    }

    private static buildCssClasses(config: FilterFormConfig, state: FilterFormViewState): any {
        const base = FILTER_FORM_CSS.COMPONENT;
        const classes = [base];
        
        if (state.isLoading) classes.push(FILTER_FORM_CSS.LOADING);
        if (state.error) classes.push(FILTER_FORM_CSS.ERROR);
        if (config.disabled) classes.push(FILTER_FORM_CSS.DISABLED);
        if (config.required) classes.push(FILTER_FORM_CSS.REQUIRED);
        if (state.validationErrors.length > 0) classes.push(FILTER_FORM_CSS.INVALID);
        if (config.layout === 'compact' || config.condensedView) classes.push(FILTER_FORM_CSS.COMPACT);
        if (config.layout === 'horizontal') classes.push(FILTER_FORM_CSS.HORIZONTAL);
        if (state.conditions.length === 0 && !state.isLoading) classes.push(FILTER_FORM_CSS.EMPTY);

        return {
            container: classes.join(' '),
            wrapper: FILTER_FORM_CSS.WRAPPER
        };
    }

    private static renderLabel(config: FilterFormConfig): string {
        if (!config.label) return '';
        
        const requiredIndicator = config.required ? '<span class="required-indicator">*</span>' : '';
        
        return `
            <label class="component-label" for="${config.id}-form">
                ${config.label}${requiredIndicator}
            </label>
        `;
    }

    private static renderHeader(config: FilterFormConfig, state: FilterFormViewState): string {
        const parts = [];
        
        if (config.enableSavedFilters) {
            parts.push(this.renderSavedFilters(config, state));
        }
        
        if (config.enableQuickFilters && config.quickFilters) {
            parts.push(this.renderQuickFilters(config, state));
        }
        
        return parts.length > 0 ? `<div class="${FILTER_FORM_CSS.HEADER}">${parts.join('')}</div>` : '';
    }

    private static renderSavedFilters(config: FilterFormConfig, state: FilterFormViewState): string {
        return `
            <div class="${FILTER_FORM_CSS.SAVED_FILTERS}">
                <label for="${config.id}-saved-filter">Saved Filters:</label>
                <select class="${FILTER_FORM_CSS.SAVED_FILTER_DROPDOWN}" 
                        id="${config.id}-saved-filter"
                        ${config.disabled ? 'disabled' : ''}>
                    <option value="">Select a saved filter...</option>
                    ${state.savedFilters.map(filter => `
                        <option value="${filter.id}" 
                                ${state.selectedSavedFilter === filter.id ? 'selected' : ''}>
                            ${filter.name}${filter.isDefault ? ' (Default)' : ''}
                        </option>
                    `).join('')}
                </select>
                ${config.allowSaveFilter ? `
                    <button type="button" 
                            class="filter-form-save-button" 
                            data-action="save-filter"
                            title="Save current filter"
                            ${config.disabled ? 'disabled' : ''}>
                        💾 Save
                    </button>
                ` : ''}
                ${config.allowDeleteFilter ? `
                    <button type="button" 
                            class="filter-form-delete-button" 
                            data-action="delete-filter"
                            title="Delete selected filter"
                            ${config.disabled || !state.selectedSavedFilter ? 'disabled' : ''}>
                        🗑️ Delete
                    </button>
                ` : ''}
            </div>
        `;
    }

    private static renderQuickFilters(config: FilterFormConfig, state: FilterFormViewState): string {
        if (!config.quickFilters || config.quickFilters.length === 0) {
            return '';
        }

        const filters = config.quickFilters.map(filter => {
            const isActive = state.activeQuickFilter === filter.name;
            return `
                <button type="button" 
                        class="${FILTER_FORM_CSS.QUICK_FILTER_BUTTON} ${isActive ? FILTER_FORM_CSS.QUICK_FILTER_ACTIVE : ''}"
                        data-quick-filter="${filter.name}"
                        title="${filter.label}"
                        ${config.disabled ? 'disabled' : ''}>
                    ${filter.icon ? `<span class="quick-filter-icon">${filter.icon}</span>` : ''}
                    ${filter.label}
                </button>
            `;
        }).join('');

        return `<div class="${FILTER_FORM_CSS.QUICK_FILTERS}">${filters}</div>`;
    }

    private static renderBody(config: FilterFormConfig, state: FilterFormViewState): string {
        return `
            <div class="${FILTER_FORM_CSS.BODY}" id="${config.id}-form">
                ${this.renderLoadingState(config, state)}
                ${this.renderErrorState(config, state)}
                ${this.renderConditions(config, state)}
                ${this.renderEmptyState(config, state)}
                ${this.renderPreview(config, state)}
            </div>
        `;
    }

    private static renderLoadingState(config: FilterFormConfig, state: FilterFormViewState): string {
        if (!state.isLoading) return '';
        
        return `
            <div class="filter-form-loading">
                <div class="loading-spinner"></div>
                <span class="loading-text">${config.loadingText}</span>
            </div>
        `;
    }

    private static renderErrorState(config: FilterFormConfig, state: FilterFormViewState): string {
        if (!state.error) return '';
        
        return `
            <div class="filter-form-error">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${state.error}</span>
                <button type="button" class="retry-button" data-action="retry">Retry</button>
            </div>
        `;
    }

    private static renderConditions(config: FilterFormConfig, state: FilterFormViewState): string {
        if (state.isLoading || state.error || state.conditions.length === 0) {
            return '';
        }

        return `
            <div class="${FILTER_FORM_CSS.CONDITIONS}">
                ${state.conditions.map((condition, index) => 
                    this.renderCondition(condition, config, state, index, 0)
                ).join('')}
                ${this.renderAddConditionButton(config, state)}
            </div>
        `;
    }

    private static renderCondition(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState, index: number, depth: number): string {
        if (condition.isGroup) {
            return this.renderConditionGroup(condition, config, state, index, depth);
        }

        const field = config.fields.find(f => f.name === condition.field);
        const cssClasses = [
            FILTER_FORM_CSS.CONDITION,
            FILTER_FORM_CSS.CONDITION_ROW,
            `condition-depth-${depth}`
        ].join(' ');

        return `
            <div class="${cssClasses}" 
                 data-condition-id="${condition.id}"
                 data-condition-index="${index}">
                
                ${index > 0 ? this.renderLogicalOperator(condition, config, state) : ''}
                
                <div class="condition-content">
                    ${config.showConditionNumbers ? `<span class="condition-number">${index + 1}.</span>` : ''}
                    
                    ${this.renderFieldSelector(condition, config, state)}
                    ${this.renderOperatorSelector(condition, config, state, field)}
                    ${this.renderValueInput(condition, config, state, field)}
                    
                    <div class="${FILTER_FORM_CSS.ACTIONS}">
                        ${config.allowDragDrop ? '<span class="drag-handle" title="Drag to reorder">⋮⋮</span>' : ''}
                        <button type="button" 
                                class="${FILTER_FORM_CSS.ACTION_BUTTON} ${FILTER_FORM_CSS.REMOVE_CONDITION}"
                                data-action="remove-condition"
                                data-condition-id="${condition.id}"
                                title="Remove condition"
                                ${config.disabled ? 'disabled' : ''}>
                            ×
                        </button>
                    </div>
                </div>
                
                ${this.renderConditionValidation(condition, state)}
            </div>
        `;
    }

    private static renderConditionGroup(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState, index: number, depth: number): string {
        const cssClasses = [
            FILTER_FORM_CSS.CONDITION,
            FILTER_FORM_CSS.CONDITION_GROUP,
            `group-depth-${depth}`
        ].join(' ');

        return `
            <div class="${cssClasses}" 
                 data-condition-id="${condition.id}"
                 data-condition-index="${index}">
                
                ${index > 0 ? this.renderLogicalOperator(condition, config, state) : ''}
                
                <div class="group-header">
                    <span class="group-bracket">(</span>
                    <div class="${FILTER_FORM_CSS.ACTIONS}">
                        ${config.showRemoveGroup ? `
                            <button type="button" 
                                    class="${FILTER_FORM_CSS.ACTION_BUTTON} ${FILTER_FORM_CSS.REMOVE_GROUP}"
                                    data-action="remove-group"
                                    data-condition-id="${condition.id}"
                                    title="Remove group"
                                    ${config.disabled ? 'disabled' : ''}>
                                Remove Group
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="group-conditions">
                    ${condition.groupConditions?.map((groupCondition, groupIndex) => 
                        this.renderCondition(groupCondition, config, state, groupIndex, depth + 1)
                    ).join('') || ''}
                    
                    ${this.renderAddConditionButton(config, state, condition.id)}
                </div>
                
                <div class="group-footer">
                    <span class="group-bracket">)</span>
                </div>
            </div>
        `;
    }

    private static renderLogicalOperator(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState): string {
        if (!config.showLogicalOperators) return '';

        const operator = condition.logicalOperator || config.defaultLogicalOperator || 'AND';
        
        return `
            <div class="${FILTER_FORM_CSS.LOGICAL_OPERATOR}">
                <button type="button" 
                        class="${FILTER_FORM_CSS.LOGICAL_OPERATOR_BUTTON} ${FILTER_FORM_CSS.LOGICAL_OPERATOR_AND} ${operator === 'AND' ? 'active' : ''}"
                        data-action="set-logical-operator"
                        data-condition-id="${condition.id}"
                        data-operator="AND"
                        ${config.disabled ? 'disabled' : ''}>
                    AND
                </button>
                <button type="button" 
                        class="${FILTER_FORM_CSS.LOGICAL_OPERATOR_BUTTON} ${FILTER_FORM_CSS.LOGICAL_OPERATOR_OR} ${operator === 'OR' ? 'active' : ''}"
                        data-action="set-logical-operator"
                        data-condition-id="${condition.id}"
                        data-operator="OR"
                        ${config.disabled ? 'disabled' : ''}>
                    OR
                </button>
            </div>
        `;
    }

    private static renderFieldSelector(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState): string {
        if (!config.showFieldSelector) return '';

        const allowedFields = config.allowedFields || config.fields.map(f => f.name);
        const availableFields = config.fields.filter(f => allowedFields.includes(f.name));

        return `
            <div class="field-selector-container">
                ${config.showFieldLabels ? '<label class="field-label">Field:</label>' : ''}
                <select class="${FILTER_FORM_CSS.FIELD_SELECTOR}"
                        data-condition-id="${condition.id}"
                        ${config.disabled ? 'disabled' : ''}>
                    <option value="">Select field...</option>
                    ${availableFields.map(field => `
                        <option value="${field.name}" 
                                ${condition.field === field.name ? 'selected' : ''}>
                            ${field.displayName}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    private static renderOperatorSelector(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState, field?: FilterField): string {
        if (!config.showOperatorSelector || !field) {
            return '';
        }

        const operators = field.operators || FIELD_TYPE_OPERATORS[field.type] || [];

        return `
            <div class="operator-selector-container">
                ${config.showFieldLabels ? '<label class="field-label">Operator:</label>' : ''}
                <select class="${FILTER_FORM_CSS.OPERATOR_SELECTOR}"
                        data-condition-id="${condition.id}"
                        ${config.disabled ? 'disabled' : ''}>
                    ${operators.map(operator => `
                        <option value="${operator}" 
                                ${condition.operator === operator ? 'selected' : ''}>
                            ${OPERATOR_LABELS[operator] || operator}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    private static renderValueInput(condition: FilterCondition, config: FilterFormConfig, state: FilterFormViewState, field?: FilterField): string {
        if (!config.showValueInput || !field || !condition.operator) {
            return '';
        }

        // Check if operator requires a value
        const noValueOperators = ['is-empty', 'not-empty', 'is-true', 'is-false', 'null', 'not-null', 'today', 'yesterday', 'tomorrow', 'this-week', 'last-week', 'next-week', 'this-month', 'last-month', 'next-month', 'this-year', 'last-year', 'next-year'];
        if (noValueOperators.includes(condition.operator)) {
            return '<div class="no-value-required"><em>No value required</em></div>';
        }

        const multipleValueOperators = ['between', 'not-between', 'in', 'not-in'];
        const requiresMultiple = multipleValueOperators.includes(condition.operator);

        return `
            <div class="value-input-container">
                ${config.showFieldLabels ? '<label class="field-label">Value:</label>' : ''}
                ${this.renderValueInputControl(condition, field, requiresMultiple, config.disabled || false)}
            </div>
        `;
    }

    private static renderValueInputControl(condition: FilterCondition, field: FilterField, requiresMultiple: boolean, disabled: boolean): string {
        const baseClasses = [
            FILTER_FORM_CSS.VALUE_INPUT,
            requiresMultiple ? FILTER_FORM_CSS.VALUE_INPUT_MULTIPLE : ''
        ].filter(Boolean).join(' ');

        switch (field.type) {
            case 'boolean':
                return `
                    <select class="${baseClasses}" 
                            data-condition-id="${condition.id}"
                            ${disabled ? 'disabled' : ''}>
                        <option value="">Select...</option>
                        <option value="true" ${condition.value === true ? 'selected' : ''}>True</option>
                        <option value="false" ${condition.value === false ? 'selected' : ''}>False</option>
                    </select>
                `;

            case 'choice':
                if (field.options) {
                    if (requiresMultiple) {
                        return `
                            <select class="${baseClasses}" 
                                    data-condition-id="${condition.id}"
                                    multiple
                                    ${disabled ? 'disabled' : ''}>
                                ${field.options.map(option => `
                                    <option value="${option.value}" 
                                            ${Array.isArray(condition.value) && condition.value.includes(option.value) ? 'selected' : ''}>
                                        ${option.label}
                                    </option>
                                `).join('')}
                            </select>
                        `;
                    } else {
                        return `
                            <select class="${baseClasses}" 
                                    data-condition-id="${condition.id}"
                                    ${disabled ? 'disabled' : ''}>
                                <option value="">Select...</option>
                                ${field.options.map(option => `
                                    <option value="${option.value}" 
                                            ${condition.value === option.value ? 'selected' : ''}>
                                        ${option.label}
                                    </option>
                                `).join('')}
                            </select>
                        `;
                    }
                }
                break;

            case 'date':
                if (requiresMultiple) {
                    const values = Array.isArray(condition.value) ? condition.value : ['', ''];
                    return `
                        <div class="multiple-date-inputs">
                            <input type="date" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="0"
                                   value="${values[0] || ''}"
                                   placeholder="From date"
                                   ${disabled ? 'disabled' : ''}>
                            <span class="range-separator">to</span>
                            <input type="date" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="1"
                                   value="${values[1] || ''}"
                                   placeholder="To date"
                                   ${disabled ? 'disabled' : ''}>
                        </div>
                    `;
                }
                return `
                    <input type="date" 
                           class="${baseClasses}" 
                           data-condition-id="${condition.id}"
                           value="${condition.value || ''}"
                           ${disabled ? 'disabled' : ''}>
                `;

            case 'datetime':
                if (requiresMultiple) {
                    const values = Array.isArray(condition.value) ? condition.value : ['', ''];
                    return `
                        <div class="multiple-datetime-inputs">
                            <input type="datetime-local" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="0"
                                   value="${values[0] || ''}"
                                   placeholder="From date/time"
                                   ${disabled ? 'disabled' : ''}>
                            <span class="range-separator">to</span>
                            <input type="datetime-local" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="1"
                                   value="${values[1] || ''}"
                                   placeholder="To date/time"
                                   ${disabled ? 'disabled' : ''}>
                        </div>
                    `;
                }
                return `
                    <input type="datetime-local" 
                           class="${baseClasses}" 
                           data-condition-id="${condition.id}"
                           value="${condition.value || ''}"
                           ${disabled ? 'disabled' : ''}>
                `;

            case 'number':
            case 'decimal':
            case 'currency':
                if (requiresMultiple) {
                    const values = Array.isArray(condition.value) ? condition.value : ['', ''];
                    return `
                        <div class="multiple-number-inputs">
                            <input type="number" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="0"
                                   value="${values[0] || ''}"
                                   placeholder="From value"
                                   step="${field.type === 'number' ? '1' : '0.01'}"
                                   ${disabled ? 'disabled' : ''}>
                            <span class="range-separator">to</span>
                            <input type="number" 
                                   class="${baseClasses}" 
                                   data-condition-id="${condition.id}"
                                   data-value-index="1"
                                   value="${values[1] || ''}"
                                   placeholder="To value"
                                   step="${field.type === 'number' ? '1' : '0.01'}"
                                   ${disabled ? 'disabled' : ''}>
                        </div>
                    `;
                }
                return `
                    <input type="number" 
                           class="${baseClasses}" 
                           data-condition-id="${condition.id}"
                           value="${condition.value || ''}"
                           placeholder="${field.placeholder || 'Enter value'}"
                           step="${field.type === 'number' ? '1' : '0.01'}"
                           ${disabled ? 'disabled' : ''}>
                `;

            default:
                // Text-based inputs
                if (requiresMultiple) {
                    const values = Array.isArray(condition.value) ? condition.value : [];
                    return `
                        <div class="multiple-text-inputs">
                            <textarea class="${baseClasses}" 
                                      data-condition-id="${condition.id}"
                                      placeholder="Enter values (one per line)"
                                      rows="3"
                                      ${disabled ? 'disabled' : ''}>${values.join('\\n')}</textarea>
                        </div>
                    `;
                }
                return `
                    <input type="${field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}" 
                           class="${baseClasses}" 
                           data-condition-id="${condition.id}"
                           value="${condition.value || ''}"
                           placeholder="${field.placeholder || 'Enter value'}"
                           ${disabled ? 'disabled' : ''}>
                `;
        }

        return '';
    }

    private static renderConditionValidation(condition: FilterCondition, state: FilterFormViewState): string {
        // This would show field-specific validation errors
        return `
            <div class="${FILTER_FORM_CSS.FIELD_ERROR}" 
                 id="error-${condition.id}" 
                 role="alert" 
                 aria-live="polite" 
                 style="display: none;">
                <!-- Field validation messages will be inserted here -->
            </div>
        `;
    }

    private static renderAddConditionButton(config: FilterFormConfig, state: FilterFormViewState, groupId?: string): string {
        return `
            <div class="add-condition-container">
                <button type="button" 
                        class="${FILTER_FORM_CSS.ACTION_BUTTON} ${FILTER_FORM_CSS.ADD_CONDITION}"
                        data-action="add-condition"
                        ${groupId ? `data-group-id="${groupId}"` : ''}
                        ${config.disabled ? 'disabled' : ''}>
                    + Add Condition
                </button>
                
                ${config.allowGroups && config.showAddGroup && !groupId ? `
                    <button type="button" 
                            class="${FILTER_FORM_CSS.ACTION_BUTTON} ${FILTER_FORM_CSS.ADD_GROUP}"
                            data-action="add-group"
                            ${config.disabled ? 'disabled' : ''}>
                        + Add Group
                    </button>
                ` : ''}
            </div>
        `;
    }

    private static renderEmptyState(config: FilterFormConfig, state: FilterFormViewState): string {
        if (state.isLoading || state.error || state.conditions.length > 0) {
            return '';
        }

        return `
            <div class="filter-form-empty">
                <span class="empty-icon">🔍</span>
                <span class="empty-text">${config.emptyText}</span>
                <button type="button" 
                        class="${FILTER_FORM_CSS.ACTION_BUTTON} ${FILTER_FORM_CSS.ADD_CONDITION}"
                        data-action="add-condition"
                        ${config.disabled ? 'disabled' : ''}>
                    Add Your First Condition
                </button>
            </div>
        `;
    }

    private static renderPreview(config: FilterFormConfig, state: FilterFormViewState): string {
        if (!config.showPreview && !state.showPreview) {
            return '';
        }

        return `
            <div class="${FILTER_FORM_CSS.PREVIEW}">
                <div class="preview-header">
                    <button type="button" 
                            class="${FILTER_FORM_CSS.PREVIEW_TOGGLE}"
                            data-action="toggle-preview">
                        ${state.showPreview ? '▼' : '▶'} Filter Preview (${config.previewFormat?.toUpperCase()})
                    </button>
                </div>
                ${state.showPreview ? `
                    <div class="${FILTER_FORM_CSS.PREVIEW_CONTENT}">
                        <pre><code>${state.previewContent || 'No conditions to preview'}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private static renderFooter(config: FilterFormConfig, state: FilterFormViewState): string {
        const parts = [];
        
        // Action buttons
        const actions = [];
        if (config.onFilterApply) {
            actions.push(`
                <button type="button" 
                        class="filter-form-apply-button" 
                        data-action="apply-filter"
                        ${config.disabled || state.validationErrors.length > 0 ? 'disabled' : ''}>
                    Apply Filter
                </button>
            `);
        }
        
        if (config.onFilterClear) {
            actions.push(`
                <button type="button" 
                        class="filter-form-clear-button" 
                        data-action="clear-filter"
                        ${config.disabled || state.conditions.length === 0 ? 'disabled' : ''}>
                    Clear All
                </button>
            `);
        }
        
        if (actions.length > 0) {
            parts.push(`<div class="${FILTER_FORM_CSS.ACTIONS}">${actions.join('')}</div>`);
        }
        
        // Export section
        if (config.enableExport && config.exportFormats && config.exportFormats.length > 0) {
            parts.push(this.renderExportSection(config, state));
        }
        
        return parts.length > 0 ? `<div class="${FILTER_FORM_CSS.FOOTER}">${parts.join('')}</div>` : '';
    }

    private static renderExportSection(config: FilterFormConfig, state: FilterFormViewState): string {
        const formats = config.exportFormats || [];
        const buttons = formats.map(format => `
            <button type="button" 
                    class="${FILTER_FORM_CSS.EXPORT_BUTTON}" 
                    data-action="export-filter"
                    data-format="${format}"
                    ${config.disabled || state.conditions.length === 0 ? 'disabled' : ''}>
                Export as ${format.toUpperCase()}
            </button>
        `).join('');

        return `
            <div class="${FILTER_FORM_CSS.EXPORT_SECTION}">
                <label>Export:</label>
                ${buttons}
            </div>
        `;
    }

    private static renderValidationMessage(config: FilterFormConfig, state: FilterFormViewState): string {
        return `
            <div class="${FILTER_FORM_CSS.VALIDATION_ERROR}" 
                 id="${config.id}-validation" 
                 role="alert" 
                 aria-live="polite" 
                 style="${state.validationErrors.length > 0 ? '' : 'display: none;'}">
                ${state.validationErrors.map(error => `<div class="validation-error-item">${error}</div>`).join('')}
            </div>
        `;
    }
}