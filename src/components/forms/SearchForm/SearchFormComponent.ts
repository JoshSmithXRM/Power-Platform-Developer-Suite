import { BaseComponent } from '../../base/BaseComponent';
import { SearchFormConfig, SearchFormField, SearchFormGroup, DEFAULT_SEARCH_FORM_CONFIG } from './SearchFormConfig';
import { SearchFormView } from './SearchFormView';

/**
 * SearchFormComponent - Reusable search form with validation and field types
 * Used by panels that need search/filter functionality with complex forms
 * Supports various field types, validation, grouping, and multi-instance usage
 */
export class SearchFormComponent extends BaseComponent {
    protected config: SearchFormConfig;
    private fields: SearchFormField[] = [];
    private groups: SearchFormGroup[] = [];
    private values: Record<string, any> = {};
    private errors: Record<string, string> = {};
    private loading: boolean = false;
    private disabled: boolean = false;
    private collapsed: boolean = false;

    // Debouncing and validation state
    private searchTimeoutId: number | null = null;
    private autoSaveTimeoutId: number | null = null;
    private lastSearchValues: Record<string, any> = {};

    constructor(config: SearchFormConfig) {
        // Merge with defaults
        const mergedConfig = { ...DEFAULT_SEARCH_FORM_CONFIG, ...config };
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        
        // Set initial state
        if (config.fields) {
            this.fields = [...config.fields];
            this.initializeDefaultValues();
        }
        if (config.groups) {
            this.groups = [...config.groups];
        }
        if (config.disabled) {
            this.disabled = config.disabled;
        }
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return SearchFormView.render(this.config, {
            fields: this.fields,
            groups: this.groups,
            values: this.values,
            errors: this.errors,
            loading: this.loading,
            disabled: this.disabled,
            collapsed: this.collapsed
        });
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/search-form.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/SearchFormBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'search-form';
    }

    /**
     * Initialize default values from fields
     */
    private initializeDefaultValues(): void {
        this.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
                this.values[field.id] = field.defaultValue;
            }
        });
    }

    /**
     * Set the list of form fields
     */
    public setFields(fields: SearchFormField[]): void {
        const oldFields = [...this.fields];
        this.fields = [...fields];
        
        // Reset values for removed fields and set defaults for new ones
        const newValues: Record<string, any> = {};
        fields.forEach(field => {
            if (field.id in this.values) {
                newValues[field.id] = this.values[field.id];
            } else if (field.defaultValue !== undefined) {
                newValues[field.id] = field.defaultValue;
            }
        });
        this.values = newValues;
        
        // Clear errors for removed fields
        const newErrors: Record<string, string> = {};
        Object.keys(this.errors).forEach(fieldId => {
            if (fields.some(f => f.id === fieldId)) {
                newErrors[fieldId] = this.errors[fieldId];
            }
        });
        this.errors = newErrors;
        
        this.notifyStateChange({
            fields: this.fields,
            oldFields,
            values: this.values,
            fieldCount: this.fields.length
        });
        
        this.notifyUpdate();
    }

    /**
     * Get the list of form fields
     */
    public getFields(): SearchFormField[] {
        return [...this.fields];
    }

    /**
     * Add a single field
     */
    public addField(field: SearchFormField, position?: number): void {
        const newFields = [...this.fields];
        
        if (position !== undefined && position >= 0 && position <= newFields.length) {
            newFields.splice(position, 0, field);
        } else {
            newFields.push(field);
        }
        
        // Set default value if provided
        if (field.defaultValue !== undefined) {
            this.values[field.id] = field.defaultValue;
        }
        
        this.setFields(newFields);
        
        this.emit('fieldAdded', {
            componentId: this.getId(),
            field,
            position: position || newFields.length - 1,
            timestamp: Date.now()
        });
    }

    /**
     * Remove a field by ID
     */
    public removeField(fieldId: string): boolean {
        const fieldIndex = this.fields.findIndex(field => field.id === fieldId);
        if (fieldIndex === -1) {
            return false;
        }

        const removedField = this.fields[fieldIndex];
        const newFields = this.fields.filter(field => field.id !== fieldId);
        
        // Remove field value and error
        const newValues = { ...this.values };
        delete newValues[fieldId];
        this.values = newValues;
        
        const newErrors = { ...this.errors };
        delete newErrors[fieldId];
        this.errors = newErrors;
        
        this.setFields(newFields);

        this.emit('fieldRemoved', {
            componentId: this.getId(),
            fieldId,
            removedField,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Update an existing field
     */
    public updateField(fieldId: string, updates: Partial<SearchFormField>): boolean {
        const fieldIndex = this.fields.findIndex(field => field.id === fieldId);
        if (fieldIndex === -1) {
            return false;
        }

        const oldField = { ...this.fields[fieldIndex] };
        const newFields = [...this.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates };
        
        this.setFields(newFields);

        this.emit('fieldUpdated', {
            componentId: this.getId(),
            fieldId,
            oldField,
            newField: newFields[fieldIndex],
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Get a specific field by ID
     */
    public getField(fieldId: string): SearchFormField | null {
        return this.fields.find(field => field.id === fieldId) || null;
    }

    /**
     * Set field groups
     */
    public setGroups(groups: SearchFormGroup[]): void {
        const oldGroups = [...this.groups];
        this.groups = [...groups];
        
        this.notifyStateChange({
            groups: this.groups,
            oldGroups,
            groupCount: this.groups.length
        });
        
        this.notifyUpdate();
    }

    /**
     * Get field groups
     */
    public getGroups(): SearchFormGroup[] {
        return [...this.groups];
    }

    /**
     * Set form values
     */
    public setValues(values: Record<string, any>, triggerSearch: boolean = false): void {
        const oldValues = { ...this.values };
        this.values = { ...values };
        
        // Clear errors for changed fields if validateOnChange is enabled
        if (this.config.validateOnChange) {
            Object.keys(values).forEach(fieldId => {
                if (oldValues[fieldId] !== values[fieldId]) {
                    delete this.errors[fieldId];
                }
            });
        }
        
        this.notifyStateChange({
            values: this.values,
            oldValues,
            errors: this.errors
        });
        
        // Trigger validation if configured
        if (this.config.validateOnChange) {
            this.validateForm();
        }
        
        // Trigger search if configured
        if (triggerSearch && this.config.searchOnChange) {
            this.debouncedSearch();
        }
        
        // Trigger auto-save if configured
        if (this.config.autoSave) {
            this.debouncedAutoSave();
        }
        
        this.notifyUpdate();
    }

    /**
     * Get form values
     */
    public getValues(): Record<string, any> {
        return { ...this.values };
    }

    /**
     * Set a single field value
     */
    public setFieldValue(fieldId: string, value: any, triggerSearch: boolean = false): boolean {
        const field = this.getField(fieldId);
        if (!field) {
            return false;
        }

        const oldValue = this.values[fieldId];
        this.values[fieldId] = value;
        
        // Clear error for this field if validateOnChange is enabled
        if (this.config.validateOnChange && this.errors[fieldId]) {
            delete this.errors[fieldId];
        }
        
        // Validate the field
        if (this.config.validateOnChange) {
            this.validateField(field, value);
        }
        
        // Trigger field change callback if provided
        if (field.onChange) {
            try {
                field.onChange(value, field);
            } catch (error) {
                this.notifyError(error as Error, `Field onChange: ${fieldId}`);
            }
        }

        // Trigger global field change callback if provided
        if (this.config.onFieldChange) {
            try {
                this.config.onFieldChange(fieldId, value, field);
            } catch (error) {
                this.notifyError(error as Error, `onFieldChange callback: ${fieldId}`);
            }
        }
        
        this.emit('fieldValueChanged', {
            componentId: this.getId(),
            fieldId,
            field,
            value,
            oldValue,
            isValid: !this.errors[fieldId],
            error: this.errors[fieldId],
            timestamp: Date.now()
        });
        
        // Trigger search if configured
        if (triggerSearch && this.config.searchOnChange) {
            this.debouncedSearch();
        }
        
        // Trigger auto-save if configured
        if (this.config.autoSave) {
            this.debouncedAutoSave();
        }
        
        this.notifyUpdate();
        return true;
    }

    /**
     * Get a single field value
     */
    public getFieldValue(fieldId: string): any {
        return this.values[fieldId];
    }

    /**
     * Validate a single field
     */
    public validateField(field: SearchFormField, value: any): { isValid: boolean; error?: string } {
        const errors: string[] = [];

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
                    if (typeof value === 'number' || !isNaN(Number(value))) {
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
                    
                case 'date':
                case 'daterange':
                    // Date validation would be more complex, placeholder for now
                    break;
            }
        }

        // Custom validation
        if (field.validation && typeof field.validation === 'function') {
            try {
                const customError = field.validation(value);
                if (customError) {
                    errors.push(customError);
                }
            } catch (error) {
                errors.push('Validation error occurred');
            }
        }

        const isValid = errors.length === 0;
        const error = errors.length > 0 ? errors[0] : undefined;

        if (error) {
            this.errors[field.id] = error;
        } else {
            delete this.errors[field.id];
        }

        return { isValid, error };
    }

    /**
     * Validate the entire form
     */
    public validateForm(): { isValid: boolean; errors: Record<string, string> } {
        const newErrors: Record<string, string> = {};

        this.fields.forEach(field => {
            if (field.visible !== false && !field.disabled) {
                const value = this.values[field.id];
                const result = this.validateField(field, value);
                
                if (!result.isValid && result.error) {
                    newErrors[field.id] = result.error;
                    
                    // Stop on first error if configured
                    if (this.config.stopOnFirstError) {
                        return;
                    }
                }
            }
        });

        this.errors = newErrors;
        const isValid = Object.keys(newErrors).length === 0;

        // Trigger validation callback if provided
        if (this.config.onValidation) {
            try {
                this.config.onValidation(newErrors);
            } catch (error) {
                this.notifyError(error as Error, 'onValidation callback');
            }
        }

        this.emit('formValidated', {
            componentId: this.getId(),
            isValid,
            errors: newErrors,
            values: this.values,
            timestamp: Date.now()
        });

        this.notifyUpdate();
        return { isValid, errors: newErrors };
    }

    /**
     * Perform search with current values
     */
    public search(): void {
        this.clearSearchTimeout();
        
        const validation = this.config.validateOnSubmit ? this.validateForm() : { isValid: true, errors: {} };
        
        this.lastSearchValues = { ...this.values };
        
        // Trigger search callback if provided
        if (this.config.onSearch) {
            try {
                this.config.onSearch(this.values, validation.isValid);
            } catch (error) {
                this.notifyError(error as Error, 'onSearch callback');
            }
        }

        this.emit('formSearched', {
            componentId: this.getId(),
            values: this.values,
            isValid: validation.isValid,
            errors: validation.errors,
            timestamp: Date.now()
        });
    }

    /**
     * Debounced search to avoid excessive API calls
     */
    private debouncedSearch(): void {
        if (!this.config.debounceSearch) {
            this.search();
            return;
        }

        this.clearSearchTimeout();
        
        this.searchTimeoutId = window.setTimeout(() => {
            this.search();
        }, this.config.searchDelay || 300);
    }

    /**
     * Clear search timeout
     */
    private clearSearchTimeout(): void {
        if (this.searchTimeoutId) {
            window.clearTimeout(this.searchTimeoutId);
            this.searchTimeoutId = null;
        }
    }

    /**
     * Clear all form values
     */
    public clear(): void {
        const clearedFields: string[] = [];
        
        this.fields.forEach(field => {
            if (this.values[field.id] !== undefined) {
                clearedFields.push(field.id);
                delete this.values[field.id];
            }
        });
        
        this.errors = {};
        
        // Trigger clear callback if provided
        if (this.config.onClear) {
            try {
                this.config.onClear();
            } catch (error) {
                this.notifyError(error as Error, 'onClear callback');
            }
        }

        this.emit('formCleared', {
            componentId: this.getId(),
            clearedFields,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Reset form to default values
     */
    public reset(): void {
        const newValues: Record<string, any> = {};
        
        this.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
                newValues[field.id] = field.defaultValue;
            }
        });
        
        this.values = newValues;
        this.errors = {};
        
        // Trigger reset callback if provided
        if (this.config.onReset) {
            try {
                this.config.onReset();
            } catch (error) {
                this.notifyError(error as Error, 'onReset callback');
            }
        }

        this.emit('formReset', {
            componentId: this.getId(),
            values: this.values,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Auto-save functionality
     */
    private debouncedAutoSave(): void {
        if (!this.config.autoSave) {
            return;
        }

        if (this.autoSaveTimeoutId) {
            window.clearTimeout(this.autoSaveTimeoutId);
        }
        
        this.autoSaveTimeoutId = window.setTimeout(() => {
            this.emit('formAutoSave', {
                componentId: this.getId(),
                values: this.values,
                timestamp: Date.now()
            });
        }, this.config.autoSaveDelay || 1000);
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean): void {
        const oldLoading = this.loading;
        this.loading = loading;
        
        this.notifyStateChange({
            loading,
            oldLoading
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
     * Set disabled state
     */
    public setDisabled(disabled: boolean): void {
        const oldDisabled = this.disabled;
        this.disabled = disabled;
        this.updateConfig({ disabled });
        
        this.notifyStateChange({
            disabled,
            oldDisabled
        });
        
        this.notifyUpdate();
    }

    /**
     * Check if form is disabled
     */
    public isDisabled(): boolean {
        return this.disabled;
    }

    /**
     * Set collapsed state
     */
    public setCollapsed(collapsed: boolean): void {
        const oldCollapsed = this.collapsed;
        this.collapsed = collapsed;
        
        this.emit('formCollapseToggled', {
            componentId: this.getId(),
            collapsed,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Check if form is collapsed
     */
    public isCollapsed(): boolean {
        return this.collapsed;
    }

    /**
     * Get current component state
     */
    public getState() {
        return {
            fields: this.fields,
            groups: this.groups,
            values: this.values,
            errors: this.errors,
            loading: this.loading,
            disabled: this.disabled,
            collapsed: this.collapsed,
            fieldCount: this.fields.length,
            groupCount: this.groups.length,
            hasErrors: Object.keys(this.errors).length > 0,
            isValid: Object.keys(this.errors).length === 0
        };
    }

    /**
     * Enhanced configuration validation
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        if (this.config.onSearch && typeof this.config.onSearch !== 'function') {
            throw new Error('onSearch must be a function');
        }
        
        if (this.config.onFieldChange && typeof this.config.onFieldChange !== 'function') {
            throw new Error('onFieldChange must be a function');
        }

        if (this.config.fields && !Array.isArray(this.config.fields)) {
            throw new Error('fields must be an array');
        }

        if (this.config.groups && !Array.isArray(this.config.groups)) {
            throw new Error('groups must be an array');
        }

        // Validate fields if provided
        if (this.config.fields) {
            this.config.fields.forEach((field, index) => {
                if (!field.id || !field.label) {
                    throw new Error(`Field at index ${index} must have id and label`);
                }
            });
        }
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(newConfig: Partial<SearchFormConfig>): void {
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

    /**
     * Dispose of component resources
     */
    public dispose(): void {
        this.clearSearchTimeout();
        
        if (this.autoSaveTimeoutId) {
            window.clearTimeout(this.autoSaveTimeoutId);
        }
        
        super.dispose();
    }
}