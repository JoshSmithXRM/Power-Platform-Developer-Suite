/**
 * SearchFormBehavior - Webview behavior for SearchForm component
 * Handles all user interactions and DOM manipulation in the browser context
 */

class SearchFormBehavior {
    static instances = new Map();

    /**
     * Initialize a SearchForm component instance
     */
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('SearchFormBehavior: componentId and element are required');
            return null;
        }

        if (this.instances.has(componentId)) {
            console.warn(`SearchFormBehavior: ${componentId} already initialized`);
            return this.instances.get(componentId);
        }

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,
            
            // DOM elements
            form: null,
            fieldsContainer: null,
            searchButton: null,
            clearButton: null,
            resetButton: null,
            collapseButton: null,
            loadingContainer: null,
            errorContainer: null,
            
            // State
            fields: [],
            groups: [],
            values: {},
            errors: {},
            loading: false,
            disabled: false,
            collapsed: false,
            
            // Form behavior
            searchTimeoutId: null,
            autoSaveTimeoutId: null,
            lastSearchValues: {},
            
            // Event handlers
            boundHandlers: {}
        };

        try {
            // Find DOM elements
            this.findDOMElements(instance);
            
            // Setup event listeners
            this.setupEventListeners(instance);
            
            // Initialize state
            this.initializeState(instance);
            
            // Setup form validation
            this.setupValidation(instance);
            
            // Register instance
            this.instances.set(componentId, instance);
            
            console.log(`SearchFormBehavior: Initialized ${componentId}`);
            return instance;
            
        } catch (error) {
            console.error(`SearchFormBehavior: Failed to initialize ${componentId}:`, error);
            return null;
        }
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;
        
        instance.form = element.querySelector('[data-component-element="form"]') || 
                       element.querySelector('form');
        
        instance.fieldsContainer = element.querySelector('[data-component-element="fields"]');
        
        instance.searchButton = element.querySelector('[data-component-element="search"]');
        instance.clearButton = element.querySelector('[data-component-element="clear"]');
        instance.resetButton = element.querySelector('[data-component-element="reset"]');
        instance.collapseButton = element.querySelector('[data-component-element="collapse"]');
        
        instance.loadingContainer = element.querySelector('[data-component-element="loading"]');
        instance.errorContainer = element.querySelector('[data-component-element="error"]');
        
        if (!instance.form) {
            throw new Error('Form element not found');
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { form, searchButton, clearButton, resetButton, collapseButton } = instance;
        
        // Form submission
        instance.boundHandlers.formSubmit = (e) => this.handleFormSubmit(instance, e);
        form.addEventListener('submit', instance.boundHandlers.formSubmit);
        
        // Input changes
        instance.boundHandlers.inputChange = (e) => this.handleInputChange(instance, e);
        form.addEventListener('input', instance.boundHandlers.inputChange);
        
        // Input blur for validation
        instance.boundHandlers.inputBlur = (e) => this.handleInputBlur(instance, e);
        form.addEventListener('blur', instance.boundHandlers.inputBlur, true);
        
        // Input focus
        instance.boundHandlers.inputFocus = (e) => this.handleInputFocus(instance, e);
        form.addEventListener('focus', instance.boundHandlers.inputFocus, true);
        
        // Button clicks
        if (clearButton) {
            instance.boundHandlers.clearClick = (e) => this.handleClearClick(instance, e);
            clearButton.addEventListener('click', instance.boundHandlers.clearClick);
        }
        
        if (resetButton) {
            instance.boundHandlers.resetClick = (e) => this.handleResetClick(instance, e);
            resetButton.addEventListener('click', instance.boundHandlers.resetClick);
        }
        
        if (collapseButton) {
            instance.boundHandlers.collapseClick = (e) => this.handleCollapseClick(instance, e);
            collapseButton.addEventListener('click', instance.boundHandlers.collapseClick);
        }
        
        // Group toggles
        instance.boundHandlers.groupToggle = (e) => this.handleGroupToggle(instance, e);
        form.addEventListener('click', instance.boundHandlers.groupToggle);
        
        // Keyboard shortcuts
        instance.boundHandlers.keyDown = (e) => this.handleKeyDown(instance, e);
        instance.element.addEventListener('keydown', instance.boundHandlers.keyDown);
        
        // Tags input behavior
        instance.boundHandlers.tagsSuggestion = (e) => this.handleTagsSuggestion(instance, e);
        form.addEventListener('click', instance.boundHandlers.tagsSuggestion);
        
        console.log(`SearchFormBehavior: Event listeners setup for ${instance.id}`);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        const { form, fieldsContainer } = instance;
        
        // Parse fields from DOM elements
        instance.fields = this.parseFieldsFromDOM(fieldsContainer);
        
        // Parse groups if present
        instance.groups = this.parseGroupsFromDOM(fieldsContainer);
        
        // Initialize values from form data
        instance.values = this.getFormValues(form);
        
        // Check initial collapsed state
        instance.collapsed = instance.element.classList.contains('search-form--collapsed');
        
        console.log(`SearchFormBehavior: State initialized for ${instance.id}`, {
            fieldCount: instance.fields.length,
            groupCount: instance.groups.length,
            hasValues: Object.keys(instance.values).length > 0
        });
    }

    /**
     * Setup form validation
     */
    static setupValidation(instance) {
        if (!instance.config.validateOnChange && !instance.config.validateOnSubmit) {
            return;
        }

        // Add HTML5 validation attributes based on field configuration
        instance.fields.forEach(field => {
            const fieldElement = instance.form.querySelector(`[data-field-id="${field.id}"]`);
            if (!fieldElement) return;

            if (field.required) {
                fieldElement.setAttribute('required', '');
            }
            
            if (field.minLength) {
                fieldElement.setAttribute('minlength', field.minLength);
            }
            
            if (field.maxLength) {
                fieldElement.setAttribute('maxlength', field.maxLength);
            }
            
            if (field.pattern) {
                fieldElement.setAttribute('pattern', field.pattern);
            }
            
            if (field.min !== undefined) {
                fieldElement.setAttribute('min', field.min);
            }
            
            if (field.max !== undefined) {
                fieldElement.setAttribute('max', field.max);
            }
        });

        console.log(`SearchFormBehavior: Validation setup for ${instance.id}`);
    }

    /**
     * Handle form submission
     */
    static handleFormSubmit(instance, event) {
        event.preventDefault();
        
        console.log(`SearchFormBehavior: Form submitted for ${instance.id}`);
        
        const values = this.getFormValues(instance.form);
        instance.values = values;
        
        // Validate if configured
        const validation = instance.config.validateOnSubmit ? 
            this.validateForm(instance) : { isValid: true, errors: {} };
        
        if (!validation.isValid && instance.config.showValidationErrors) {
            this.displayValidationErrors(instance, validation.errors);
            return;
        }
        
        // Clear any previous errors
        this.clearValidationErrors(instance);
        
        // Set loading state
        this.setLoading(instance, true);
        
        // Send search message to Extension Host
        ComponentUtils.sendMessage('formSearched', {
            componentId: instance.id,
            values: values,
            isValid: validation.isValid,
            errors: validation.errors,
            timestamp: Date.now()
        });
        
        // Store last search values
        instance.lastSearchValues = { ...values };
    }

    /**
     * Handle input changes
     */
    static handleInputChange(instance, event) {
        const target = event.target;
        const fieldId = target.getAttribute('data-field-id') || 
                       target.name || 
                       target.id.replace(`${instance.id}_`, '');
        
        if (!fieldId) return;
        
        const value = this.getFieldValue(target);
        const oldValue = instance.values[fieldId];
        
        console.log(`SearchFormBehavior: Field changed: ${fieldId} = ${value}`);
        
        // Update instance values
        instance.values[fieldId] = value;
        
        // Clear field error if validateOnChange is enabled
        if (instance.config.validateOnChange && instance.errors[fieldId]) {
            delete instance.errors[fieldId];
            this.clearFieldError(instance, fieldId);
        }
        
        // Validate field if configured
        if (instance.config.validateOnChange) {
            this.validateField(instance, fieldId, value);
        }
        
        // Send field change message to Extension Host
        ComponentUtils.sendMessage('fieldValueChanged', {
            componentId: instance.id,
            fieldId: fieldId,
            value: value,
            oldValue: oldValue,
            timestamp: Date.now()
        });
        
        // Trigger search if configured
        if (instance.config.searchOnChange) {
            this.debouncedSearch(instance);
        }
        
        // Trigger auto-save if configured
        if (instance.config.autoSave) {
            this.debouncedAutoSave(instance);
        }
    }

    /**
     * Handle input blur events
     */
    static handleInputBlur(instance, event) {
        const target = event.target;
        const fieldId = target.getAttribute('data-field-id') || 
                       target.name || 
                       target.id.replace(`${instance.id}_`, '');
        
        if (!fieldId || !instance.config.validateOnChange) return;
        
        const value = this.getFieldValue(target);
        this.validateField(instance, fieldId, value);
        
        // Remove focus styling
        const fieldContainer = target.closest('.search-form-field');
        if (fieldContainer) {
            fieldContainer.classList.remove('search-form-field--focused');
        }
    }

    /**
     * Handle input focus events
     */
    static handleInputFocus(instance, event) {
        const target = event.target;
        const fieldContainer = target.closest('.search-form-field');
        
        if (fieldContainer) {
            fieldContainer.classList.add('search-form-field--focused');
        }
    }

    /**
     * Handle clear button click
     */
    static handleClearClick(instance, event) {
        event.preventDefault();
        
        console.log(`SearchFormBehavior: Clear clicked for ${instance.id}`);
        
        // Clear all form fields
        const clearedFields = this.clearFormValues(instance.form);
        instance.values = {};
        instance.errors = {};
        
        // Clear validation errors
        this.clearValidationErrors(instance);
        
        // Send clear message to Extension Host
        ComponentUtils.sendMessage('formCleared', {
            componentId: instance.id,
            clearedFields: clearedFields,
            timestamp: Date.now()
        });
    }

    /**
     * Handle reset button click
     */
    static handleResetClick(instance, event) {
        event.preventDefault();
        
        console.log(`SearchFormBehavior: Reset clicked for ${instance.id}`);
        
        // Reset to default values
        const defaultValues = this.resetToDefaultValues(instance);
        instance.values = defaultValues;
        instance.errors = {};
        
        // Clear validation errors
        this.clearValidationErrors(instance);
        
        // Send reset message to Extension Host
        ComponentUtils.sendMessage('formReset', {
            componentId: instance.id,
            values: defaultValues,
            timestamp: Date.now()
        });
    }

    /**
     * Handle collapse button click
     */
    static handleCollapseClick(instance, event) {
        event.preventDefault();
        
        instance.collapsed = !instance.collapsed;
        
        // Update element classes
        if (instance.collapsed) {
            instance.element.classList.add('search-form--collapsed');
        } else {
            instance.element.classList.remove('search-form--collapsed');
        }
        
        // Update button icon
        const icon = event.target.closest('button').querySelector('span') || event.target;
        if (instance.collapsed) {
            icon.innerHTML = '▶';
        } else {
            icon.innerHTML = '▼';
        }
        
        console.log(`SearchFormBehavior: Form ${instance.collapsed ? 'collapsed' : 'expanded'} for ${instance.id}`);
        
        // Send collapse message to Extension Host
        ComponentUtils.sendMessage('formCollapseToggled', {
            componentId: instance.id,
            collapsed: instance.collapsed,
            timestamp: Date.now()
        });
    }

    /**
     * Handle group toggle clicks
     */
    static handleGroupToggle(instance, event) {
        const toggleButton = event.target.closest('[data-group-toggle]');
        if (!toggleButton) return;
        
        event.preventDefault();
        
        const groupId = toggleButton.getAttribute('data-group-toggle');
        const groupElement = instance.element.querySelector(`[data-group-id="${groupId}"]`);
        
        if (!groupElement) return;
        
        const isCollapsed = groupElement.classList.contains('search-form-group--collapsed');
        
        if (isCollapsed) {
            groupElement.classList.remove('search-form-group--collapsed');
            toggleButton.innerHTML = '▼';
        } else {
            groupElement.classList.add('search-form-group--collapsed');
            toggleButton.innerHTML = '▶';
        }
        
        console.log(`SearchFormBehavior: Group ${groupId} ${isCollapsed ? 'expanded' : 'collapsed'} for ${instance.id}`);
    }

    /**
     * Handle keyboard shortcuts
     */
    static handleKeyDown(instance, event) {
        switch (event.key) {
            case 'Enter':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (instance.searchButton && !instance.searchButton.disabled) {
                        instance.searchButton.click();
                    }
                }
                break;
                
            case 'Escape':
                // Close any open dropdowns or clear focus
                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                }
                break;
        }
    }

    /**
     * Handle tags suggestion clicks
     */
    static handleTagsSuggestion(instance, event) {
        const suggestion = event.target.closest('.search-form-tag-suggestion');
        if (!suggestion) return;
        
        event.preventDefault();
        
        const tagValue = suggestion.getAttribute('data-tag-value');
        const tagsContainer = suggestion.closest('.search-form-tags-container');
        const input = tagsContainer?.querySelector('input');
        
        if (!input) return;
        
        // Add tag to input value
        let currentValue = input.value || '';
        const tags = currentValue.split(',').map(tag => tag.trim()).filter(Boolean);
        
        if (!tags.includes(tagValue)) {
            tags.push(tagValue);
            input.value = tags.join(', ');
            
            // Trigger input change event
            const changeEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(changeEvent);
        }
        
        // Hide suggestions
        const suggestions = tagsContainer.querySelector('.search-form-tags-suggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    /**
     * Get field value based on field type
     */
    static getFieldValue(element) {
        switch (element.type) {
            case 'checkbox':
                return element.checked;
            case 'radio':
                return element.checked ? element.value : null;
            case 'select-multiple':
                return Array.from(element.selectedOptions).map(option => option.value);
            case 'number':
                return element.value === '' ? null : Number(element.value);
            case 'date':
                return element.value || null;
            default:
                return element.value;
        }
    }

    /**
     * Get all form values
     */
    static getFormValues(form) {
        const values = {};
        const formData = new FormData(form);
        
        // Handle regular form fields
        for (let [name, value] of formData.entries()) {
            if (values[name] !== undefined) {
                // Multiple values for same name (like checkboxes)
                if (!Array.isArray(values[name])) {
                    values[name] = [values[name]];
                }
                values[name].push(value);
            } else {
                values[name] = value;
            }
        }
        
        // Handle special field types
        const specialFields = form.querySelectorAll('[data-field-type="tags"], [data-range-part]');
        specialFields.forEach(field => {
            const fieldId = field.getAttribute('data-field-id') || 
                           field.name || 
                           field.id.replace(form.closest('[data-component-id]').getAttribute('data-component-id') + '_', '');
            
            if (field.hasAttribute('data-field-type') && field.getAttribute('data-field-type') === 'tags') {
                // Parse comma-separated tags
                const tagString = field.value || '';
                values[fieldId] = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
            } else if (field.hasAttribute('data-range-part')) {
                // Handle date range fields
                const rangePart = field.getAttribute('data-range-part');
                const baseFieldId = fieldId.replace('_' + rangePart, '');
                
                if (!values[baseFieldId]) {
                    values[baseFieldId] = {};
                }
                values[baseFieldId][rangePart] = field.value || null;
            }
        });
        
        return values;
    }

    /**
     * Clear all form values
     */
    static clearFormValues(form) {
        const clearedFields = [];
        const formElements = form.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            const fieldId = element.getAttribute('data-field-id') || 
                           element.name || 
                           element.id;
            
            switch (element.type) {
                case 'checkbox':
                case 'radio':
                    if (element.checked) {
                        element.checked = false;
                        clearedFields.push(fieldId);
                    }
                    break;
                case 'select-multiple':
                    if (element.selectedOptions.length > 0) {
                        element.selectedIndex = -1;
                        clearedFields.push(fieldId);
                    }
                    break;
                default:
                    if (element.value) {
                        element.value = '';
                        clearedFields.push(fieldId);
                    }
                    break;
            }
        });
        
        return clearedFields;
    }

    /**
     * Reset form to default values
     */
    static resetToDefaultValues(instance) {
        const defaultValues = {};
        
        instance.fields.forEach(field => {
            const element = instance.form.querySelector(`[data-field-id="${field.id}"], [name="${field.id}"]`);
            if (!element) return;
            
            const defaultValue = element.getAttribute('data-default-value') || 
                                field.defaultValue || 
                                '';
            
            switch (element.type) {
                case 'checkbox':
                    element.checked = !!defaultValue;
                    defaultValues[field.id] = !!defaultValue;
                    break;
                case 'radio':
                    element.checked = element.value === defaultValue;
                    if (element.checked) {
                        defaultValues[field.id] = defaultValue;
                    }
                    break;
                default:
                    element.value = defaultValue;
                    defaultValues[field.id] = defaultValue;
                    break;
            }
        });
        
        return defaultValues;
    }

    /**
     * Validate a single field
     */
    static validateField(instance, fieldId, value) {
        const field = instance.fields.find(f => f.id === fieldId);
        if (!field) return { isValid: true };
        
        const errors = [];
        
        // Required validation
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field.label} is required`);
        }
        
        // Type-specific validation
        if (value !== undefined && value !== null && value !== '') {
            switch (field.type) {
                case 'text':
                case 'textarea':
                    if (typeof value === 'string') {
                        if (field.minLength && value.length < field.minLength) {
                            errors.push(`${field.label} must be at least ${field.minLength} characters`);
                        }
                        if (field.maxLength && value.length > field.maxLength) {
                            errors.push(`${field.label} must not exceed ${field.maxLength} characters`);
                        }
                        if (field.pattern && !new RegExp(field.pattern).test(value)) {
                            errors.push(`${field.label} format is invalid`);
                        }
                    }
                    break;
                    
                case 'number':
                    if (!isNaN(Number(value))) {
                        const numValue = Number(value);
                        if (field.min !== undefined && numValue < field.min) {
                            errors.push(`${field.label} must be at least ${field.min}`);
                        }
                        if (field.max !== undefined && numValue > field.max) {
                            errors.push(`${field.label} must not exceed ${field.max}`);
                        }
                    } else {
                        errors.push(`${field.label} must be a valid number`);
                    }
                    break;
            }
        }
        
        const isValid = errors.length === 0;
        const error = errors.length > 0 ? errors[0] : null;
        
        if (error) {
            instance.errors[fieldId] = error;
            this.displayFieldError(instance, fieldId, error);
        } else {
            delete instance.errors[fieldId];
            this.clearFieldError(instance, fieldId);
        }
        
        return { isValid, error };
    }

    /**
     * Validate entire form
     */
    static validateForm(instance) {
        const errors = {};
        
        instance.fields.forEach(field => {
            if (field.visible !== false && !field.disabled) {
                const value = instance.values[field.id];
                const result = this.validateField(instance, field.id, value);
                
                if (!result.isValid && result.error) {
                    errors[field.id] = result.error;
                }
            }
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    /**
     * Display field error
     */
    static displayFieldError(instance, fieldId, error) {
        const fieldContainer = instance.form.querySelector(`[data-field-id="${fieldId}"]`)?.closest('.search-form-field');
        if (!fieldContainer) return;
        
        // Add error class
        fieldContainer.classList.add('search-form-field--error');
        
        // Show or create error message
        let errorElement = fieldContainer.querySelector('.search-form-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'search-form-error component-error';
            fieldContainer.appendChild(errorElement);
        }
        
        errorElement.innerHTML = `❌ ${error}`;
    }

    /**
     * Clear field error
     */
    static clearFieldError(instance, fieldId) {
        const fieldContainer = instance.form.querySelector(`[data-field-id="${fieldId}"]`)?.closest('.search-form-field');
        if (!fieldContainer) return;
        
        // Remove error class
        fieldContainer.classList.remove('search-form-field--error');
        
        // Hide error message
        const errorElement = fieldContainer.querySelector('.search-form-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Display validation errors
     */
    static displayValidationErrors(instance, errors) {
        Object.entries(errors).forEach(([fieldId, error]) => {
            this.displayFieldError(instance, fieldId, error);
        });
    }

    /**
     * Clear all validation errors
     */
    static clearValidationErrors(instance) {
        const errorElements = instance.element.querySelectorAll('.search-form-error');
        errorElements.forEach(element => {
            element.style.display = 'none';
        });
        
        const errorFields = instance.element.querySelectorAll('.search-form-field--error');
        errorFields.forEach(field => {
            field.classList.remove('search-form-field--error');
        });
    }

    /**
     * Debounced search
     */
    static debouncedSearch(instance) {
        if (instance.searchTimeoutId) {
            clearTimeout(instance.searchTimeoutId);
        }
        
        const delay = instance.config.searchDelay || 300;
        instance.searchTimeoutId = setTimeout(() => {
            this.performSearch(instance);
        }, delay);
    }

    /**
     * Perform search
     */
    static performSearch(instance) {
        const values = this.getFormValues(instance.form);
        instance.values = values;
        
        // Don't search if values haven't changed
        if (JSON.stringify(values) === JSON.stringify(instance.lastSearchValues)) {
            return;
        }
        
        // Send search message to Extension Host
        ComponentUtils.sendMessage('formSearched', {
            componentId: instance.id,
            values: values,
            isValid: true,
            errors: {},
            timestamp: Date.now()
        });
        
        instance.lastSearchValues = { ...values };
    }

    /**
     * Debounced auto-save
     */
    static debouncedAutoSave(instance) {
        if (instance.autoSaveTimeoutId) {
            clearTimeout(instance.autoSaveTimeoutId);
        }
        
        const delay = instance.config.autoSaveDelay || 1000;
        instance.autoSaveTimeoutId = setTimeout(() => {
            ComponentUtils.sendMessage('formAutoSave', {
                componentId: instance.id,
                values: instance.values,
                timestamp: Date.now()
            });
        }, delay);
    }

    /**
     * Set loading state
     */
    static setLoading(instance, loading) {
        instance.loading = loading;
        
        // Update element class
        if (loading) {
            instance.element.classList.add('search-form--loading');
        } else {
            instance.element.classList.remove('search-form--loading');
        }
        
        // Update button states
        if (instance.searchButton) {
            instance.searchButton.disabled = loading;
            if (loading) {
                instance.searchButton.innerHTML = '⏳ Searching...';
            } else {
                instance.searchButton.innerHTML = `🔍 ${instance.config.searchButtonText || 'Search'}`;
            }
        }
        
        // Update loading container
        if (instance.loadingContainer) {
            instance.loadingContainer.style.display = loading ? 'block' : 'none';
        }
    }

    /**
     * Parse fields from DOM
     */
    static parseFieldsFromDOM(container) {
        const fields = [];
        if (!container) return fields;
        
        const fieldElements = container.querySelectorAll('[data-field-id]');
        
        fieldElements.forEach(element => {
            const fieldId = element.getAttribute('data-field-id');
            const fieldType = element.getAttribute('data-field-type') || 'text';
            const label = element.closest('.search-form-field')?.querySelector('.search-form-label')?.textContent || fieldId;
            const required = element.hasAttribute('required') || element.getAttribute('data-required') === 'true';
            
            fields.push({
                id: fieldId,
                type: fieldType,
                label: label,
                required: required,
                disabled: element.disabled,
                visible: element.style.display !== 'none'
            });
        });
        
        return fields;
    }

    /**
     * Parse groups from DOM
     */
    static parseGroupsFromDOM(container) {
        const groups = [];
        if (!container) return groups;
        
        const groupElements = container.querySelectorAll('[data-group-id]');
        
        groupElements.forEach(element => {
            const groupId = element.getAttribute('data-group-id');
            const label = element.querySelector('.search-form-group-title')?.textContent || groupId;
            const fieldElements = element.querySelectorAll('[data-field-id]');
            const fieldIds = Array.from(fieldElements).map(el => el.getAttribute('data-field-id'));
            
            groups.push({
                id: groupId,
                label: label,
                fields: fieldIds,
                visible: element.style.display !== 'none',
                collapsible: element.getAttribute('data-collapsible') === 'true',
                collapsed: element.getAttribute('data-collapsed') === 'true'
            });
        });
        
        return groups;
    }

    /**
     * Handle messages from Extension Host
     */
    static handleMessage(instance, message) {
        const { action, data } = message;
        
        switch (action) {
            case 'fieldsUpdated':
                instance.fields = data.fields || [];
                break;
                
            case 'valuesUpdated':
                this.updateFormValues(instance, data.values || {});
                break;
                
            case 'loadingStateChanged':
                this.setLoading(instance, data.loading);
                break;
                
            case 'errorsUpdated':
                this.displayValidationErrors(instance, data.errors || {});
                break;
                
            case 'clearErrors':
                this.clearValidationErrors(instance);
                break;
                
            default:
                console.warn(`SearchFormBehavior: Unknown message action: ${action}`);
        }
    }

    /**
     * Update form values from external source
     */
    static updateFormValues(instance, values) {
        instance.values = { ...values };
        
        // Update form elements
        Object.entries(values).forEach(([fieldId, value]) => {
            const element = instance.form.querySelector(`[data-field-id="${fieldId}"], [name="${fieldId}"]`);
            if (!element) return;
            
            switch (element.type) {
                case 'checkbox':
                    element.checked = !!value;
                    break;
                case 'radio':
                    element.checked = element.value === value;
                    break;
                default:
                    element.value = value || '';
                    break;
            }
        });
    }

    /**
     * Get instance state
     */
    static getState(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return null;
        }

        return {
            fields: instance.fields,
            groups: instance.groups,
            values: instance.values,
            errors: instance.errors,
            loading: instance.loading,
            disabled: instance.disabled,
            collapsed: instance.collapsed
        };
    }

    /**
     * Dispose of component instance
     */
    static dispose(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return;
        }

        // Clear timeouts
        if (instance.searchTimeoutId) {
            clearTimeout(instance.searchTimeoutId);
        }
        
        if (instance.autoSaveTimeoutId) {
            clearTimeout(instance.autoSaveTimeoutId);
        }

        // Remove event listeners
        Object.entries(instance.boundHandlers).forEach(([event, handler]) => {
            const element = event === 'formSubmit' || event === 'inputChange' || event === 'inputBlur' || 
                           event === 'inputFocus' || event === 'groupToggle' || event === 'tagsSuggestion' ? 
                           instance.form : 
                           event === 'keyDown' ? instance.element :
                           event === 'clearClick' ? instance.clearButton :
                           event === 'resetClick' ? instance.resetButton :
                           event === 'collapseClick' ? instance.collapseButton : null;
            
            if (element && handler) {
                const eventName = event === 'inputBlur' || event === 'inputFocus' ? 
                    event.replace('input', '').toLowerCase() :
                    event.replace(/[A-Z]/g, m => m.toLowerCase());
                element.removeEventListener(eventName, handler, event.includes('Blur') || event.includes('Focus'));
            }
        });

        // Clear references
        this.instances.delete(componentId);
        
        console.log(`SearchFormBehavior: Disposed ${componentId}`);
    }

    /**
     * Get debug information
     */
    static getDebugInfo(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return null;
        }

        return {
            id: instance.id,
            config: instance.config,
            state: this.getState(componentId),
            hasForm: !!instance.form,
            hasFieldsContainer: !!instance.fieldsContainer,
            fieldCount: instance.fields.length,
            groupCount: instance.groups.length,
            valueCount: Object.keys(instance.values).length,
            errorCount: Object.keys(instance.errors).length,
            eventListeners: Object.keys(instance.boundHandlers)
        };
    }
}

// Auto-register with ComponentUtils
if (typeof ComponentUtils !== 'undefined') {
    ComponentUtils.registerComponent = ComponentUtils.registerComponent || function() {};
}

// Make available globally
window.SearchFormBehavior = SearchFormBehavior;