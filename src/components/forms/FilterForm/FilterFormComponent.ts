import { BaseComponent, BaseComponentConfig } from '../../base/BaseComponent';
import { 
    FilterFormConfig, 
    FilterCondition,
    FilterField,
    SavedFilter,
    FilterFormConditionsChangeEvent,
    FilterFormApplyEvent,
    FilterFormSavedFilterEvent,
    DEFAULT_FILTER_FORM_CONFIG,
    FilterFormConfigValidator
} from './FilterFormConfig';
import { FilterFormView, FilterFormViewState } from './FilterFormView';

/**
 * FilterFormComponent.ts
 * 
 * Main component class for advanced filtering functionality
 * Extends BaseComponent and provides:
 * - Dynamic condition building with groups
 * - Multiple field types and operators
 * - Saved filter management
 * - Real-time validation
 * - Export capabilities
 * - Type-safe configuration and events
 */

export class FilterFormComponent extends BaseComponent {
    private filterConfig: FilterFormConfig;
    private conditions: FilterCondition[] = [];
    private savedFilters: SavedFilter[] = [];
    private selectedSavedFilter?: string;
    private isLoading: boolean = false;
    private error?: string;
    private validationErrors: string[] = [];
    private showPreview: boolean = false;
    private previewContent?: string;
    private activeQuickFilter?: string;
    private validationTimeout?: NodeJS.Timeout;

    constructor(config: FilterFormConfig) {
        // Convert to BaseComponentConfig
        const baseConfig: BaseComponentConfig = {
            id: config.id,
            className: config.className
        };
        super(baseConfig);
        
        // Validate and sanitize configuration
        const validation = FilterFormConfigValidator.validate(config);
        if (!validation.isValid) {
            throw new Error(`FilterFormComponent configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            console.warn(`FilterFormComponent warnings: ${validation.warnings.join(', ')}`);
        }
        
        this.filterConfig = FilterFormConfigValidator.sanitizeConfig({
            ...DEFAULT_FILTER_FORM_CONFIG,
            ...config
        });
        
        this.initialize();
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const state: FilterFormViewState = {
            conditions: this.conditions,
            savedFilters: this.savedFilters,
            selectedSavedFilter: this.selectedSavedFilter,
            isLoading: this.isLoading,
            error: this.error,
            validationErrors: this.validationErrors,
            showPreview: this.showPreview,
            previewContent: this.previewContent,
            activeQuickFilter: this.activeQuickFilter
        };
        
        return FilterFormView.render(this.filterConfig, state);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'css/components/filter-form.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'js/components/FilterFormBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'filter-form';
    }

    private initialize(): void {
        // Load initial data
        if (this.filterConfig.initialConditions) {
            this.setConditions(this.filterConfig.initialConditions);
        } else {
            // Start with one empty condition if no initial conditions
            this.addCondition();
        }
        
        // Load saved filters
        if (this.filterConfig.enableSavedFilters && this.filterConfig.loadSavedFilters) {
            this.loadSavedFilters();
        } else if (this.filterConfig.savedFilters) {
            this.savedFilters = [...this.filterConfig.savedFilters];
        }
        
        // Load initial saved filter
        if (this.filterConfig.initialSavedFilter) {
            this.loadSavedFilter(this.filterConfig.initialSavedFilter);
        }
        
        this.bindInternalEvents();
        this.updatePreview();
    }

    private bindInternalEvents(): void {
        // Listen for component events from webview
        this.on('component-event', (data: any) => {
            this.handleWebviewEvent(data.eventType, data.data);
        });
    }

    private handleWebviewEvent(eventType: string, data: any): void {
        switch (eventType) {
            case 'add-condition':
                this.handleAddCondition(data.groupId);
                break;
            case 'remove-condition':
                this.handleRemoveCondition(data.conditionId);
                break;
            case 'add-group':
                this.handleAddGroup();
                break;
            case 'remove-group':
                this.handleRemoveGroup(data.conditionId);
                break;
            case 'field-changed':
                this.handleFieldChanged(data.conditionId, data.field);
                break;
            case 'operator-changed':
                this.handleOperatorChanged(data.conditionId, data.operator);
                break;
            case 'value-changed':
                this.handleValueChanged(data.conditionId, data.value, data.valueIndex);
                break;
            case 'logical-operator-changed':
                this.handleLogicalOperatorChanged(data.conditionId, data.operator);
                break;
            case 'apply-filter':
                this.handleApplyFilter();
                break;
            case 'clear-filter':
                this.handleClearFilter();
                break;
            case 'saved-filter-changed':
                this.handleSavedFilterChanged(data.filterId);
                break;
            case 'save-filter':
                this.handleSaveFilter(data.name, data.description, data.isPublic);
                break;
            case 'delete-filter':
                this.handleDeleteFilter(data.filterId);
                break;
            case 'quick-filter-clicked':
                this.handleQuickFilterClicked(data.filterName);
                break;
            case 'toggle-preview':
                this.handleTogglePreview();
                break;
            case 'export-filter':
                this.handleExportFilter(data.format);
                break;
            case 'retry':
                this.retry();
                break;
        }
    }

    // Public API Methods

    /**
     * Get current filter conditions
     */
    public getConditions(): FilterCondition[] {
        return [...this.conditions];
    }

    /**
     * Set filter conditions
     */
    public setConditions(conditions: FilterCondition[]): void {
        this.conditions = [...conditions];
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    /**
     * Add a new condition
     */
    public addCondition(groupId?: string, fieldName?: string): void {
        const newCondition = FilterFormConfigValidator.createEmptyCondition(fieldName);
        
        if (groupId) {
            // Add to specific group
            this.addConditionToGroup(groupId, newCondition);
        } else {
            // Add to root level
            this.conditions.push(newCondition);
        }
        
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    /**
     * Remove a condition
     */
    public removeCondition(conditionId: string): void {
        this.conditions = this.removeConditionRecursively(this.conditions, conditionId);
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    /**
     * Add a new group
     */
    public addGroup(): void {
        const newGroup = FilterFormConfigValidator.createEmptyGroup();
        this.conditions.push(newGroup);
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    /**
     * Clear all conditions
     */
    public clearConditions(): void {
        this.conditions = [];
        this.selectedSavedFilter = undefined;
        this.activeQuickFilter = undefined;
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
        this.filterConfig.onFilterClear?.();
    }

    /**
     * Apply current filter
     */
    public applyFilter(): void {
        const validation = this.validateConditions();
        if (!validation.isValid) {
            return;
        }
        
        const event: FilterFormApplyEvent = {
            componentId: this.getId(),
            conditions: this.conditions,
            preview: this.previewContent || '',
            timestamp: Date.now()
        };
        
        this.emit('filterApply', event);
        this.filterConfig.onFilterApply?.(this.conditions);
    }

    /**
     * Load a saved filter
     */
    public loadSavedFilter(filterId: string): void {
        const filter = this.savedFilters.find(f => f.id === filterId);
        if (filter) {
            this.selectedSavedFilter = filterId;
            this.setConditions(filter.conditions);
            this.activeQuickFilter = undefined;
            
            const event: FilterFormSavedFilterEvent = {
                componentId: this.getId(),
                action: 'load',
                filter,
                timestamp: Date.now()
            };
            
            this.emit('savedFilterLoad', event);
            this.filterConfig.onSavedFilterLoad?.(filter);
        }
    }

    /**
     * Save current conditions as a filter
     */
    public async saveFilter(name: string, description?: string, isPublic?: boolean): Promise<void> {
        const filter: SavedFilter = {
            id: FilterFormConfigValidator.generateId(),
            name,
            description,
            conditions: [...this.conditions],
            isPublic: isPublic || false,
            createdOn: new Date(),
            createdBy: 'current-user' // This would be replaced with actual user info
        };
        
        try {
            if (this.filterConfig.saveFilter) {
                await this.filterConfig.saveFilter(filter);
            }
            
            // Add to local collection
            this.savedFilters.push(filter);
            this.selectedSavedFilter = filter.id;
            this.updateView();
            
            const event: FilterFormSavedFilterEvent = {
                componentId: this.getId(),
                action: 'save',
                filter,
                timestamp: Date.now()
            };
            
            this.emit('savedFilterSave', event);
            this.filterConfig.onSavedFilterSave?.(filter);
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Failed to save filter';
            this.updateView();
            this.filterConfig.onError?.(error instanceof Error ? error : new Error(this.error));
        }
    }

    /**
     * Delete a saved filter
     */
    public async deleteFilter(filterId: string): Promise<void> {
        const filter = this.savedFilters.find(f => f.id === filterId);
        if (!filter) return;
        
        try {
            if (this.filterConfig.deleteFilter) {
                await this.filterConfig.deleteFilter(filterId);
            }
            
            // Remove from local collection
            this.savedFilters = this.savedFilters.filter(f => f.id !== filterId);
            if (this.selectedSavedFilter === filterId) {
                this.selectedSavedFilter = undefined;
            }
            this.updateView();
            
            const event: FilterFormSavedFilterEvent = {
                componentId: this.getId(),
                action: 'delete',
                filter,
                timestamp: Date.now()
            };
            
            this.emit('savedFilterDelete', event);
            this.filterConfig.onSavedFilterDelete?.(filterId);
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Failed to delete filter';
            this.updateView();
            this.filterConfig.onError?.(error instanceof Error ? error : new Error(this.error));
        }
    }

    /**
     * Update configuration
     */
    public updateConfig(updates: Partial<FilterFormConfig>): void {
        const newConfig = { ...this.filterConfig, ...updates };
        const validation = FilterFormConfigValidator.validate(newConfig);
        
        if (!validation.isValid) {
            throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
        }
        
        this.filterConfig = FilterFormConfigValidator.sanitizeConfig(newConfig);
        this.validateConditions();
        this.updatePreview();
        this.updateView();
    }

    // Private Methods

    private async loadSavedFilters(): Promise<void> {
        if (!this.filterConfig.loadSavedFilters) {
            return;
        }
        
        this.isLoading = true;
        this.error = undefined;
        this.updateView();
        
        try {
            const filters = await this.filterConfig.loadSavedFilters();
            this.savedFilters = filters;
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Failed to load saved filters';
            this.filterConfig.onError?.(error instanceof Error ? error : new Error(this.error));
        } finally {
            this.isLoading = false;
            this.updateView();
        }
    }

    private addConditionToGroup(groupId: string, condition: FilterCondition): void {
        this.conditions = this.addConditionToGroupRecursively(this.conditions, groupId, condition);
    }

    private addConditionToGroupRecursively(conditions: FilterCondition[], groupId: string, newCondition: FilterCondition): FilterCondition[] {
        return conditions.map(condition => {
            if (condition.id === groupId && condition.isGroup && condition.groupConditions) {
                return {
                    ...condition,
                    groupConditions: [...condition.groupConditions, newCondition]
                };
            } else if (condition.isGroup && condition.groupConditions) {
                return {
                    ...condition,
                    groupConditions: this.addConditionToGroupRecursively(condition.groupConditions, groupId, newCondition)
                };
            }
            return condition;
        });
    }

    private removeConditionRecursively(conditions: FilterCondition[], conditionId: string): FilterCondition[] {
        return conditions
            .filter(condition => condition.id !== conditionId)
            .map(condition => {
                if (condition.isGroup && condition.groupConditions) {
                    return {
                        ...condition,
                        groupConditions: this.removeConditionRecursively(condition.groupConditions, conditionId)
                    };
                }
                return condition;
            });
    }

    private updateConditionProperty(conditionId: string, property: string, value: any): void {
        this.conditions = this.updateConditionRecursively(this.conditions, conditionId, property, value);
    }

    private updateConditionRecursively(conditions: FilterCondition[], conditionId: string, property: string, value: any): FilterCondition[] {
        return conditions.map(condition => {
            if (condition.id === conditionId) {
                return { ...condition, [property]: value };
            } else if (condition.isGroup && condition.groupConditions) {
                return {
                    ...condition,
                    groupConditions: this.updateConditionRecursively(condition.groupConditions, conditionId, property, value)
                };
            }
            return condition;
        });
    }

    private validateConditions(): { isValid: boolean; errors: string[] } {
        // Clear existing timeout
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }

        // Debounce validation
        this.validationTimeout = setTimeout(() => {
            const validation = FilterFormConfigValidator.validateConditions(this.conditions, this.filterConfig);
            this.validationErrors = validation.errors;
            this.updateView();
            this.filterConfig.onValidation?.(validation.isValid, validation.errors);
        }, 300);

        return { isValid: true, errors: [] }; // Return immediate result, async validation in timeout
    }

    private updatePreview(): void {
        if (!this.filterConfig.showPreview && !this.showPreview) {
            return;
        }

        // Generate preview based on format
        switch (this.filterConfig.previewFormat) {
            case 'sql':
                this.previewContent = this.generateSqlPreview();
                break;
            case 'odata':
                this.previewContent = this.generateODataPreview();
                break;
            case 'fetchxml':
                this.previewContent = this.generateFetchXmlPreview();
                break;
            case 'natural':
            default:
                this.previewContent = this.generateNaturalPreview();
                break;
        }
    }

    private generateNaturalPreview(): string {
        if (this.conditions.length === 0) {
            return 'No filter conditions';
        }

        return this.conditions.map(condition => this.conditionToNaturalLanguage(condition)).join(' ');
    }

    private conditionToNaturalLanguage(condition: FilterCondition, depth: number = 0): string {
        if (condition.isGroup && condition.groupConditions) {
            const groupConditions = condition.groupConditions
                .map(c => this.conditionToNaturalLanguage(c, depth + 1))
                .join(` ${condition.logicalOperator || 'AND'} `);
            return `(${groupConditions})`;
        }

        const field = this.filterConfig.fields.find(f => f.name === condition.field);
        const fieldName = field?.displayName || condition.field;
        const operator = condition.operator;
        const value = condition.value;

        let description = fieldName;
        
        switch (operator) {
            case 'equals':
                description += ` equals ${value}`;
                break;
            case 'not-equals':
                description += ` does not equal ${value}`;
                break;
            case 'contains':
                description += ` contains "${value}"`;
                break;
            case 'not-contains':
                description += ` does not contain "${value}"`;
                break;
            case 'starts-with':
                description += ` starts with "${value}"`;
                break;
            case 'ends-with':
                description += ` ends with "${value}"`;
                break;
            case 'is-empty':
                description += ` is empty`;
                break;
            case 'not-empty':
                description += ` is not empty`;
                break;
            case 'greater-than':
                description += ` is greater than ${value}`;
                break;
            case 'less-than':
                description += ` is less than ${value}`;
                break;
            case 'between':
                if (Array.isArray(value) && value.length >= 2) {
                    description += ` is between ${value[0]} and ${value[1]}`;
                }
                break;
            case 'in':
                if (Array.isArray(value)) {
                    description += ` is one of: ${value.join(', ')}`;
                }
                break;
            case 'is-true':
                description += ` is true`;
                break;
            case 'is-false':
                description += ` is false`;
                break;
            case 'null':
                description += ` is null`;
                break;
            case 'not-null':
                description += ` is not null`;
                break;
            default:
                description += ` ${operator} ${value}`;
        }

        return description;
    }

    private generateSqlPreview(): string {
        // Simplified SQL generation - would need proper SQL escaping in production
        if (this.conditions.length === 0) {
            return 'WHERE 1=1';
        }
        return 'WHERE ' + this.conditions.map(c => this.conditionToSql(c)).join(' AND ');
    }

    private conditionToSql(condition: FilterCondition): string {
        if (condition.isGroup && condition.groupConditions) {
            const groupSql = condition.groupConditions
                .map(c => this.conditionToSql(c))
                .join(` ${condition.logicalOperator || 'AND'} `);
            return `(${groupSql})`;
        }

        const field = condition.field;
        const operator = condition.operator;
        const value = condition.value;

        switch (operator) {
            case 'equals':
                return `${field} = '${value}'`;
            case 'not-equals':
                return `${field} <> '${value}'`;
            case 'contains':
                return `${field} LIKE '%${value}%'`;
            case 'starts-with':
                return `${field} LIKE '${value}%'`;
            case 'greater-than':
                return `${field} > ${value}`;
            case 'less-than':
                return `${field} < ${value}`;
            case 'is-empty':
                return `${field} = ''`;
            case 'null':
                return `${field} IS NULL`;
            case 'not-null':
                return `${field} IS NOT NULL`;
            default:
                return `${field} ${operator} '${value}'`;
        }
    }

    private generateODataPreview(): string {
        // Simplified OData generation
        return '$filter=' + this.conditions.map(c => this.conditionToOData(c)).join(' and ');
    }

    private conditionToOData(condition: FilterCondition): string {
        if (condition.isGroup && condition.groupConditions) {
            const groupOData = condition.groupConditions
                .map(c => this.conditionToOData(c))
                .join(` ${condition.logicalOperator?.toLowerCase() || 'and'} `);
            return `(${groupOData})`;
        }

        const field = condition.field;
        const operator = condition.operator;
        const value = condition.value;

        switch (operator) {
            case 'equals':
                return `${field} eq '${value}'`;
            case 'not-equals':
                return `${field} ne '${value}'`;
            case 'contains':
                return `contains(${field},'${value}')`;
            case 'starts-with':
                return `startswith(${field},'${value}')`;
            case 'greater-than':
                return `${field} gt ${value}`;
            case 'less-than':
                return `${field} lt ${value}`;
            case 'null':
                return `${field} eq null`;
            default:
                return `${field} ${operator} '${value}'`;
        }
    }

    private generateFetchXmlPreview(): string {
        // Simplified FetchXML generation - would need proper XML structure in production
        return '<filter>\n' + this.conditions.map(c => this.conditionToFetchXml(c, 1)).join('\n') + '\n</filter>';
    }

    private conditionToFetchXml(condition: FilterCondition, indent: number): string {
        const spaces = '  '.repeat(indent);
        
        if (condition.isGroup && condition.groupConditions) {
            const groupXml = condition.groupConditions
                .map(c => this.conditionToFetchXml(c, indent + 1))
                .join('\n');
            return `${spaces}<filter type="${condition.logicalOperator?.toLowerCase() || 'and'}">\n${groupXml}\n${spaces}</filter>`;
        }

        const field = condition.field;
        const operator = condition.operator;
        const value = condition.value;

        return `${spaces}<condition attribute="${field}" operator="${operator}" value="${value}" />`;
    }

    private updateView(): void {
        const state: FilterFormViewState = {
            conditions: this.conditions,
            savedFilters: this.savedFilters,
            selectedSavedFilter: this.selectedSavedFilter,
            isLoading: this.isLoading,
            error: this.error,
            validationErrors: this.validationErrors,
            showPreview: this.showPreview,
            previewContent: this.previewContent,
            activeQuickFilter: this.activeQuickFilter
        };
        
        const html = FilterFormView.render(this.filterConfig, state);
        this.notifyUpdate();
    }

    private emitConditionsChange(): void {
        const validation = FilterFormConfigValidator.validateConditions(this.conditions, this.filterConfig);
        
        const event: FilterFormConditionsChangeEvent = {
            componentId: this.getId(),
            conditions: this.conditions,
            isValid: validation.isValid,
            validationErrors: validation.errors,
            timestamp: Date.now()
        };
        
        this.emit('conditionsChanged', event);
        this.filterConfig.onConditionsChange?.(this.conditions);
    }

    // Event Handlers

    private handleAddCondition(groupId?: string): void {
        this.addCondition(groupId);
    }

    private handleRemoveCondition(conditionId: string): void {
        this.removeCondition(conditionId);
    }

    private handleAddGroup(): void {
        this.addGroup();
    }

    private handleRemoveGroup(groupId: string): void {
        this.removeCondition(groupId);
    }

    private handleFieldChanged(conditionId: string, field: string): void {
        this.updateConditionProperty(conditionId, 'field', field);
        
        // Reset operator and value when field changes
        const fieldConfig = this.filterConfig.fields.find(f => f.name === field);
        if (fieldConfig) {
            const defaultOperator = fieldConfig.defaultOperator || fieldConfig.operators[0];
            this.updateConditionProperty(conditionId, 'operator', defaultOperator);
            this.updateConditionProperty(conditionId, 'value', null);
        }
        
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    private handleOperatorChanged(conditionId: string, operator: string): void {
        this.updateConditionProperty(conditionId, 'operator', operator);
        
        // Reset value when operator changes to one that doesn't need a value
        const noValueOperators = ['is-empty', 'not-empty', 'is-true', 'is-false', 'null', 'not-null', 'today', 'yesterday', 'tomorrow', 'this-week', 'last-week', 'next-week', 'this-month', 'last-month', 'next-month', 'this-year', 'last-year', 'next-year'];
        if (noValueOperators.includes(operator)) {
            this.updateConditionProperty(conditionId, 'value', null);
        }
        
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    private handleValueChanged(conditionId: string, value: any, valueIndex?: number): void {
        if (valueIndex !== undefined) {
            // Handle multiple values (like between operator)
            const condition = this.findCondition(conditionId);
            if (condition) {
                const currentValue = Array.isArray(condition.value) ? condition.value : [];
                currentValue[valueIndex] = value;
                this.updateConditionProperty(conditionId, 'value', currentValue);
            }
        } else {
            this.updateConditionProperty(conditionId, 'value', value);
        }
        
        this.validateConditions();
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    private handleLogicalOperatorChanged(conditionId: string, operator: 'AND' | 'OR'): void {
        this.updateConditionProperty(conditionId, 'logicalOperator', operator);
        this.updatePreview();
        this.updateView();
        this.emitConditionsChange();
    }

    private handleApplyFilter(): void {
        this.applyFilter();
    }

    private handleClearFilter(): void {
        this.clearConditions();
    }

    private handleSavedFilterChanged(filterId: string): void {
        if (filterId) {
            this.loadSavedFilter(filterId);
        } else {
            this.selectedSavedFilter = undefined;
            this.updateView();
        }
    }

    private handleSaveFilter(name: string, description?: string, isPublic?: boolean): void {
        this.saveFilter(name, description, isPublic);
    }

    private handleDeleteFilter(filterId?: string): void {
        const id = filterId || this.selectedSavedFilter;
        if (id) {
            this.deleteFilter(id);
        }
    }

    private handleQuickFilterClicked(filterName: string): void {
        const quickFilter = this.filterConfig.quickFilters?.find(f => f.name === filterName);
        if (quickFilter) {
            if (this.activeQuickFilter === filterName) {
                // Toggle off
                this.activeQuickFilter = undefined;
                this.clearConditions();
            } else {
                // Apply quick filter
                this.activeQuickFilter = filterName;
                this.selectedSavedFilter = undefined;
                this.setConditions(quickFilter.conditions);
            }
        }
    }

    private handleTogglePreview(): void {
        this.showPreview = !this.showPreview;
        this.updatePreview();
        this.updateView();
    }

    private handleExportFilter(format: string): void {
        let exportData: any;
        
        switch (format) {
            case 'json':
                exportData = JSON.stringify(this.conditions, null, 2);
                break;
            case 'xml':
                exportData = this.generateFetchXmlPreview();
                break;
            case 'sql':
                exportData = this.generateSqlPreview();
                break;
            case 'odata':
                exportData = this.generateODataPreview();
                break;
            case 'fetchxml':
                exportData = this.generateFetchXmlPreview();
                break;
            default:
                exportData = this.conditions;
        }
        
        this.filterConfig.onExport?.(format, exportData);
    }

    private findCondition(conditionId: string): FilterCondition | undefined {
        return this.findConditionRecursively(this.conditions, conditionId);
    }

    private findConditionRecursively(conditions: FilterCondition[], conditionId: string): FilterCondition | undefined {
        for (const condition of conditions) {
            if (condition.id === conditionId) {
                return condition;
            }
            if (condition.isGroup && condition.groupConditions) {
                const found = this.findConditionRecursively(condition.groupConditions, conditionId);
                if (found) return found;
            }
        }
        return undefined;
    }

    private retry(): void {
        this.error = undefined;
        if (this.filterConfig.loadSavedFilters) {
            this.loadSavedFilters();
        }
    }

    // Lifecycle

    public getHtml(): string {
        const state: FilterFormViewState = {
            conditions: this.conditions,
            savedFilters: this.savedFilters,
            selectedSavedFilter: this.selectedSavedFilter,
            isLoading: this.isLoading,
            error: this.error,
            validationErrors: this.validationErrors,
            showPreview: this.showPreview,
            previewContent: this.previewContent,
            activeQuickFilter: this.activeQuickFilter
        };
        
        return FilterFormView.render(this.filterConfig, state);
    }

    public getCssFiles(): string[] {
        return ['css/components/filter-form.css'];
    }

    public getJsFiles(): string[] {
        return ['js/components/FilterFormBehavior.js'];
    }

    public dispose(): void {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        
        super.dispose();
    }
}