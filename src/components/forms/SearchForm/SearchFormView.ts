import { SearchFormConfig, SearchFormField, SearchFormGroup, SearchFormOption } from './SearchFormConfig';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';

/**
 * SearchFormView - HTML generation for SearchForm component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface SearchFormViewState {
    fields: SearchFormField[];
    groups: SearchFormGroup[];
    values: Record<string, any>;
    errors: Record<string, string>;
    loading: boolean;
    disabled: boolean;
    collapsed: boolean;
}

export class SearchFormView {
    /**
     * Render the complete HTML for the SearchForm component
     */
    static render(config: SearchFormConfig, state: SearchFormViewState): string {
        const {
            id,
            layout = 'vertical',
            columns = 'auto',
            spacing = 'normal',
            variant = 'default',
            size = 'medium',
            collapsible = false,
            disabled = false,
            readonly = false,
            loading = false,
            className = 'search-form'
        } = config;

        const {
            fields,
            groups,
            values,
            errors,
            collapsed
        } = state;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            CSS_CLASSES.SEARCH_FORM,
            className,
            `search-form--${layout}`,
            `search-form--${spacing}`,
            `search-form--${variant}`,
            `search-form--${size}`,
            disabled || state.disabled ? CSS_CLASSES.COMPONENT_DISABLED : '',
            loading || state.loading ? CSS_CLASSES.COMPONENT_LOADING : '',
            readonly ? 'search-form--readonly' : '',
            collapsible ? 'search-form--collapsible' : '',
            collapsed ? 'search-form--collapsed' : ''
        ].filter(Boolean).join(' ');

        const gridStyle = this.getGridStyle(layout, columns);

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="SearchForm"
                 data-config-layout="${layout}"
                 data-config-variant="${variant}"
                 data-config-size="${size}"
                 data-config-disabled="${disabled}"
                 data-config-readonly="${readonly}"
                 data-config-collapsible="${collapsible}"
                 ${gridStyle ? `style="${gridStyle}"` : ''}>
                
                ${this.renderHeader(config)}
                
                <form class="search-form-body" data-component-element="form">
                    ${this.renderFields(id, fields, groups, values, errors, config, state)}
                </form>
                
                ${this.renderFooter(id, config, state)}
                
                ${this.renderLoadingContainer()}
                ${this.renderErrorContainer()}
                
            </div>
        `;
    }

    /**
     * Render form header (title, collapse button)
     */
    private static renderHeader(config: SearchFormConfig): string {
        if (!config.collapsible && !config.label) {
            return '';
        }

        const headerContent = [];

        if (config.label) {
            headerContent.push(`<h3 class="search-form-title">${this.escapeHtml(config.label)}</h3>`);
        }

        if (config.collapsible) {
            headerContent.push(`
                <button type="button" 
                        class="component-button search-form-collapse" 
                        data-component-element="collapse"
                        aria-label="Toggle form">
                    ${ICONS.CHEVRON_DOWN}
                </button>
            `);
        }

        return headerContent.length > 0 ? 
            `<div class="search-form-header">${headerContent.join('')}</div>` : '';
    }

    /**
     * Render form fields
     */
    private static renderFields(
        componentId: string,
        fields: SearchFormField[],
        groups: SearchFormGroup[],
        values: Record<string, any>,
        errors: Record<string, string>,
        config: SearchFormConfig,
        state: SearchFormViewState
    ): string {
        if (groups && groups.length > 0) {
            return this.renderGroupedFields(componentId, groups, fields, values, errors, config, state);
        } else {
            return this.renderFlatFields(componentId, fields, values, errors, config, state);
        }
    }

    /**
     * Render fields organized in groups
     */
    private static renderGroupedFields(
        componentId: string,
        groups: SearchFormGroup[],
        fields: SearchFormField[],
        values: Record<string, any>,
        errors: Record<string, string>,
        config: SearchFormConfig,
        state: SearchFormViewState
    ): string {
        const groupsHtml = groups.map(group => {
            if (!group.visible) return '';

            const groupFields = fields.filter(field => group.fields.includes(field.id));
            const fieldsHtml = groupFields
                .map(field => this.renderField(componentId, field, values[field.id], errors[field.id], config, state))
                .join('');

            const groupClass = [
                'search-form-group',
                group.collapsible ? 'search-form-group--collapsible' : '',
                group.collapsed ? 'search-form-group--collapsed' : ''
            ].filter(Boolean).join(' ');

            return `
                <div class="${groupClass}" 
                     data-group-id="${group.id}"
                     data-collapsible="${group.collapsible}"
                     data-collapsed="${group.collapsed}">
                    
                    <div class="search-form-group-header">
                        <h4 class="search-form-group-title">${this.escapeHtml(group.label)}</h4>
                        ${group.description ? 
                            `<p class="search-form-group-description">${this.escapeHtml(group.description)}</p>` : ''}
                        ${group.collapsible ? 
                            `<button type="button" class="search-form-group-toggle" data-group-toggle="${group.id}">
                                ${ICONS.CHEVRON_DOWN}
                            </button>` : ''}
                    </div>
                    
                    <div class="search-form-group-fields">
                        ${fieldsHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="search-form-fields" data-component-element="fields">${groupsHtml}</div>`;
    }

    /**
     * Render fields in a flat layout
     */
    private static renderFlatFields(
        componentId: string,
        fields: SearchFormField[],
        values: Record<string, any>,
        errors: Record<string, string>,
        config: SearchFormConfig,
        state: SearchFormViewState
    ): string {
        const fieldsHtml = fields
            .filter(field => field.visible !== false)
            .map(field => this.renderField(componentId, field, values[field.id], errors[field.id], config, state))
            .join('');

        return `<div class="search-form-fields" data-component-element="fields">${fieldsHtml}</div>`;
    }

    /**
     * Render a single form field
     */
    private static renderField(
        componentId: string,
        field: SearchFormField,
        value: any,
        error: string | undefined,
        config: SearchFormConfig,
        state: SearchFormViewState
    ): string {
        if (!field.visible) return '';

        const isDisabled = field.disabled || field.readonly || state.disabled || config.readonly;
        const isRequired = field.required;
        const hasError = !!error;

        const fieldClass = [
            'search-form-field',
            `search-form-field--${field.type}`,
            field.width ? `search-form-field--${field.width}` : 'search-form-field--auto',
            field.size ? `search-form-field--${field.size}` : '',
            isRequired ? 'search-form-field--required' : '',
            isDisabled ? 'search-form-field--disabled' : '',
            field.readonly ? 'search-form-field--readonly' : '',
            hasError ? 'search-form-field--error' : ''
        ].filter(Boolean).join(' ');

        const fieldId = `${componentId}_${field.id}`;

        return `
            <div class="${fieldClass}" 
                 data-field-id="${field.id}"
                 data-field-type="${field.type}"
                 data-required="${isRequired}"
                 data-disabled="${isDisabled}">
                
                ${this.renderFieldLabel(fieldId, field, isRequired || false)}
                ${this.renderFieldInput(fieldId, field, value, isDisabled || false, config)}
                ${hasError ? this.renderFieldError(error!) : ''}
                ${field.placeholder && field.type === 'textarea' ? this.renderFieldHelp(field.placeholder) : ''}
                
            </div>
        `;
    }

    /**
     * Render field label
     */
    private static renderFieldLabel(fieldId: string, field: SearchFormField, isRequired: boolean): string {
        const labelClass = [
            'search-form-label',
            isRequired ? 'search-form-label--required' : ''
        ].filter(Boolean).join(' ');

        return `
            <label for="${fieldId}" class="${labelClass}">
                ${this.escapeHtml(field.label)}${isRequired ? ' *' : ''}
            </label>
        `;
    }

    /**
     * Render field input based on type
     */
    private static renderFieldInput(
        fieldId: string,
        field: SearchFormField,
        value: any,
        isDisabled: boolean,
        config: SearchFormConfig
    ): string {
        switch (field.type) {
            case 'text':
                return this.renderTextInput(fieldId, field, value, isDisabled);
            case 'textarea':
                return this.renderTextarea(fieldId, field, value, isDisabled);
            case 'select':
                return this.renderSelect(fieldId, field, value, isDisabled, false);
            case 'multiselect':
                return this.renderSelect(fieldId, field, value, isDisabled, true);
            case 'date':
                return this.renderDateInput(fieldId, field, value, isDisabled);
            case 'daterange':
                return this.renderDateRangeInput(fieldId, field, value, isDisabled);
            case 'number':
                return this.renderNumberInput(fieldId, field, value, isDisabled);
            case 'boolean':
                return this.renderCheckboxInput(fieldId, field, value, isDisabled);
            case 'tags':
                return this.renderTagsInput(fieldId, field, value, isDisabled);
            default:
                return this.renderTextInput(fieldId, field, value, isDisabled);
        }
    }

    /**
     * Render text input
     */
    private static renderTextInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const inputClass = 'search-form-input component-input';
        const inputValue = value || field.defaultValue || '';

        return `
            <input type="text" 
                   id="${fieldId}"
                   name="${field.name || field.id}"
                   class="${inputClass}"
                   value="${this.escapeHtml(String(inputValue))}"
                   placeholder="${this.escapeHtml(field.placeholder || '')}"
                   ${isDisabled ? 'disabled' : ''}
                   ${field.required ? 'required' : ''}
                   ${field.readonly ? 'readonly' : ''}
                   ${field.minLength ? `minlength="${field.minLength}"` : ''}
                   ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                   ${field.pattern ? `pattern="${field.pattern}"` : ''}
                   data-component-element="field-input">
        `;
    }

    /**
     * Render textarea
     */
    private static renderTextarea(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const textareaClass = 'search-form-textarea component-textarea';
        const textareaValue = value || field.defaultValue || '';

        return `
            <textarea id="${fieldId}"
                      name="${field.name || field.id}"
                      class="${textareaClass}"
                      placeholder="${this.escapeHtml(field.placeholder || '')}"
                      ${isDisabled ? 'disabled' : ''}
                      ${field.required ? 'required' : ''}
                      ${field.readonly ? 'readonly' : ''}
                      ${field.minLength ? `minlength="${field.minLength}"` : ''}
                      ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                      rows="3"
                      data-component-element="field-input">${this.escapeHtml(String(textareaValue))}</textarea>
        `;
    }

    /**
     * Render select dropdown
     */
    private static renderSelect(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean, multiple: boolean): string {
        const selectClass = 'search-form-select component-select';
        const selectedValues = multiple ? (Array.isArray(value) ? value : []) : [value];

        const optionsHtml = this.renderSelectOptions(field.options || [], selectedValues);

        return `
            <select id="${fieldId}"
                    name="${field.name || field.id}${multiple ? '[]' : ''}"
                    class="${selectClass}"
                    ${multiple ? 'multiple' : ''}
                    ${isDisabled ? 'disabled' : ''}
                    ${field.required ? 'required' : ''}
                    ${field.readonly ? 'readonly' : ''}
                    data-component-element="field-input"
                    data-searchable="${field.searchable || false}"
                    data-clearable="${field.clearable || false}">
                ${!multiple && !field.required ? `<option value="">${field.placeholder || 'Select...'}</option>` : ''}
                ${optionsHtml}
            </select>
        `;
    }

    /**
     * Render select options
     */
    private static renderSelectOptions(options: SearchFormOption[], selectedValues: any[]): string {
        const groupedOptions = this.groupOptions(options);

        return Object.entries(groupedOptions).map(([group, groupOptions]) => {
            const optionsHtml = groupOptions.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return `
                    <option value="${this.escapeHtml(String(option.value))}" 
                            ${isSelected ? 'selected' : ''}
                            ${option.disabled ? 'disabled' : ''}
                            title="${this.escapeHtml(option.description || option.label)}">
                        ${this.escapeHtml(option.label)}
                    </option>
                `;
            }).join('');

            if (group === 'default') {
                return optionsHtml;
            } else {
                return `<optgroup label="${this.escapeHtml(group)}">${optionsHtml}</optgroup>`;
            }
        }).join('');
    }

    /**
     * Group options by group property
     */
    private static groupOptions(options: SearchFormOption[]): Record<string, SearchFormOption[]> {
        return options.reduce((groups, option) => {
            const group = option.group || 'default';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(option);
            return groups;
        }, {} as Record<string, SearchFormOption[]>);
    }

    /**
     * Render date input
     */
    private static renderDateInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const inputClass = 'search-form-input component-input';
        const dateValue = value ? this.formatDateValue(value) : field.defaultValue || '';

        return `
            <input type="date" 
                   id="${fieldId}"
                   name="${field.name || field.id}"
                   class="${inputClass}"
                   value="${dateValue}"
                   ${isDisabled ? 'disabled' : ''}
                   ${field.required ? 'required' : ''}
                   ${field.readonly ? 'readonly' : ''}
                   ${field.min ? `min="${this.formatDateValue(field.min)}"` : ''}
                   ${field.max ? `max="${this.formatDateValue(field.max)}"` : ''}
                   data-component-element="field-input">
        `;
    }

    /**
     * Render date range input (two date inputs)
     */
    private static renderDateRangeInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const inputClass = 'search-form-input component-input';
        const startDate = value?.start ? this.formatDateValue(value.start) : '';
        const endDate = value?.end ? this.formatDateValue(value.end) : '';

        return `
            <div class="search-form-date-range">
                <input type="date" 
                       id="${fieldId}_start"
                       name="${field.name || field.id}_start"
                       class="${inputClass}"
                       value="${startDate}"
                       placeholder="Start date"
                       ${isDisabled ? 'disabled' : ''}
                       ${field.readonly ? 'readonly' : ''}
                       ${field.min ? `min="${this.formatDateValue(field.min)}"` : ''}
                       ${field.max ? `max="${this.formatDateValue(field.max)}"` : ''}
                       data-component-element="field-input"
                       data-range-part="start">
                
                <span class="search-form-date-separator">to</span>
                
                <input type="date" 
                       id="${fieldId}_end"
                       name="${field.name || field.id}_end"
                       class="${inputClass}"
                       value="${endDate}"
                       placeholder="End date"
                       ${isDisabled ? 'disabled' : ''}
                       ${field.readonly ? 'readonly' : ''}
                       ${field.min ? `min="${this.formatDateValue(field.min)}"` : ''}
                       ${field.max ? `max="${this.formatDateValue(field.max)}"` : ''}
                       data-component-element="field-input"
                       data-range-part="end">
            </div>
        `;
    }

    /**
     * Render number input
     */
    private static renderNumberInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const inputClass = 'search-form-input component-input';
        const numberValue = value !== undefined ? String(value) : field.defaultValue || '';

        return `
            <input type="number" 
                   id="${fieldId}"
                   name="${field.name || field.id}"
                   class="${inputClass}"
                   value="${numberValue}"
                   placeholder="${this.escapeHtml(field.placeholder || '')}"
                   ${isDisabled ? 'disabled' : ''}
                   ${field.required ? 'required' : ''}
                   ${field.readonly ? 'readonly' : ''}
                   ${field.min !== undefined ? `min="${field.min}"` : ''}
                   ${field.max !== undefined ? `max="${field.max}"` : ''}
                   data-component-element="field-input">
        `;
    }

    /**
     * Render checkbox input
     */
    private static renderCheckboxInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const checkboxClass = 'search-form-checkbox component-checkbox';
        const isChecked = !!value;

        return `
            <label class="search-form-checkbox-wrapper">
                <input type="checkbox" 
                       id="${fieldId}"
                       name="${field.name || field.id}"
                       class="${checkboxClass}"
                       ${isChecked ? 'checked' : ''}
                       ${isDisabled ? 'disabled' : ''}
                       ${field.readonly ? 'readonly' : ''}
                       data-component-element="field-input">
                <span class="search-form-checkbox-label">${this.escapeHtml(field.placeholder || 'Enable')}</span>
            </label>
        `;
    }

    /**
     * Render tags input (text input with tag suggestions)
     */
    private static renderTagsInput(fieldId: string, field: SearchFormField, value: any, isDisabled: boolean): string {
        const inputClass = 'search-form-input component-input';
        const tagsValue = Array.isArray(value) ? value.join(', ') : value || field.defaultValue || '';

        return `
            <div class="search-form-tags-container">
                <input type="text" 
                       id="${fieldId}"
                       name="${field.name || field.id}"
                       class="${inputClass}"
                       value="${this.escapeHtml(String(tagsValue))}"
                       placeholder="${this.escapeHtml(field.placeholder || 'Enter tags separated by commas')}"
                       ${isDisabled ? 'disabled' : ''}
                       ${field.required ? 'required' : ''}
                       ${field.readonly ? 'readonly' : ''}
                       data-component-element="field-input"
                       data-field-type="tags">
                       
                ${field.options ? this.renderTagsSuggestions(field.options) : ''}
            </div>
        `;
    }

    /**
     * Render tag suggestions
     */
    private static renderTagsSuggestions(options: SearchFormOption[]): string {
        const suggestionsHtml = options.map(option => 
            `<div class="search-form-tag-suggestion" 
                  data-tag-value="${this.escapeHtml(String(option.value))}">
                ${this.escapeHtml(option.label)}
            </div>`
        ).join('');

        return `<div class="search-form-tags-suggestions">${suggestionsHtml}</div>`;
    }

    /**
     * Render field error message
     */
    private static renderFieldError(error: string): string {
        return `
            <div class="search-form-error component-error">
                ${ICONS.ERROR} ${this.escapeHtml(error)}
            </div>
        `;
    }

    /**
     * Render field help text
     */
    private static renderFieldHelp(help: string): string {
        return `
            <div class="search-form-help component-help">
                ${this.escapeHtml(help)}
            </div>
        `;
    }

    /**
     * Render form footer with action buttons
     */
    private static renderFooter(componentId: string, config: SearchFormConfig, state: SearchFormViewState): string {
        const {
            showSearchButton = true,
            showClearButton = true,
            showResetButton = false,
            searchButtonText = 'Search',
            clearButtonText = 'Clear',
            resetButtonText = 'Reset'
        } = config;

        if (!showSearchButton && !showClearButton && !showResetButton) {
            return '';
        }

        const buttonsHtml = [];

        if (showSearchButton) {
            buttonsHtml.push(`
                <button type="submit" 
                        class="component-button component-button--primary search-form-search"
                        data-component-element="search"
                        ${state.disabled ? 'disabled' : ''}>
                    ${state.loading ? ICONS.LOADING : ICONS.SEARCH} ${this.escapeHtml(searchButtonText)}
                </button>
            `);
        }

        if (showClearButton) {
            buttonsHtml.push(`
                <button type="button" 
                        class="component-button component-button--secondary search-form-clear"
                        data-component-element="clear"
                        ${state.disabled ? 'disabled' : ''}>
                    ${ICONS.CLEAR} ${this.escapeHtml(clearButtonText)}
                </button>
            `);
        }

        if (showResetButton) {
            buttonsHtml.push(`
                <button type="button" 
                        class="component-button component-button--secondary search-form-reset"
                        data-component-element="reset"
                        ${state.disabled ? 'disabled' : ''}>
                    ${ICONS.RESET} ${this.escapeHtml(resetButtonText)}
                </button>
            `);
        }

        return `<div class="search-form-footer search-form-actions">${buttonsHtml.join('')}</div>`;
    }

    /**
     * Render the loading container (hidden by default)
     */
    private static renderLoadingContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_LOADING_CONTAINER}" data-component-element="loading">
                ${ICONS.LOADING} Processing form...
            </div>
        `;
    }

    /**
     * Render the error container (hidden by default)
     */
    private static renderErrorContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_ERROR_CONTAINER}" data-component-element="error">
                ${ICONS.ERROR} <span data-component-element="error-message"></span>
            </div>
        `;
    }

    /**
     * Helper method to escape HTML
     */
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get CSS Grid style for layout
     */
    private static getGridStyle(layout: string, columns: number | string): string {
        if (layout !== 'grid') {
            return '';
        }

        if (typeof columns === 'number') {
            return `--grid-columns: repeat(${columns}, 1fr);`;
        }

        return '--grid-columns: repeat(auto-fit, minmax(300px, 1fr));';
    }

    /**
     * Format date value for HTML date input
     */
    private static formatDateValue(value: any): string {
        if (!value) return '';
        
        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }
        
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.split('T')[0];
        }
        
        return '';
    }

    /**
     * Generate minimal search form HTML (for inline use)
     */
    static renderMinimal(
        id: string,
        fields: SearchFormField[],
        values?: Record<string, any>
    ): string {
        const fieldsHtml = fields.map(field => {
            const value = values?.[field.id] || field.defaultValue || '';
            return `
                <input type="${field.type === 'textarea' ? 'text' : field.type}" 
                       name="${field.name || field.id}"
                       placeholder="${this.escapeHtml(field.placeholder || field.label)}"
                       value="${this.escapeHtml(String(value))}"
                       class="component-input"
                       data-field-id="${field.id}">
            `;
        }).join('');

        return `
            <form class="search-form search-form--minimal" 
                  data-component-id="${id}"
                  data-component-type="SearchForm">
                <div class="search-form-fields">
                    ${fieldsHtml}
                    <button type="submit" class="component-button component-button--primary">
                        ${ICONS.SEARCH} Search
                    </button>
                </div>
            </form>
        `;
    }
}