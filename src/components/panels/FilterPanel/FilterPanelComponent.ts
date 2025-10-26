import { BaseComponent } from '../../base/BaseComponent';

import { FilterPanelConfig, FilterCondition, FilterFieldConfig, QuickFilterConfig } from './FilterPanelConfig';
import { FilterPanelView } from './FilterPanelView';

/**
 * FilterPanelComponent - Reusable advanced filter panel
 * Provides quick filters and advanced filter builder functionality
 * Used by panels that need complex filtering capabilities
 */
export class FilterPanelComponent extends BaseComponent {
    protected config: FilterPanelConfig;
    private activeQuickFilters: Set<string> = new Set();
    private advancedFilterConditions: FilterCondition[] = [];
    private collapsed: boolean;

    constructor(config: FilterPanelConfig) {
        super(config);
        this.config = config;
        this.collapsed = config.defaultCollapsed;
        this.validateConfig();
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return FilterPanelView.generateHTML(this.config);
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/filter-panel.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/FilterPanelBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'filter-panel';
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'FilterPanel';
    }

    /**
     * Validate component configuration
     */
    protected validateConfig(): void {
        if (!this.config.id) {
            throw new Error('FilterPanel: id is required');
        }

        if (!this.config.advancedFilters || this.config.advancedFilters.length === 0) {
            throw new Error('FilterPanel: advancedFilters array is required');
        }

        // Validate field configs
        this.config.advancedFilters.forEach(field => {
            if (!field.field || !field.label || !field.type) {
                throw new Error(`FilterPanel: Invalid field config - field, label, and type are required`);
            }

            if (!field.operators || field.operators.length === 0) {
                throw new Error(`FilterPanel: Field '${field.field}' must have at least one operator`);
            }

            if (field.type === 'select' && (!field.options || field.options.length === 0)) {
                throw new Error(`FilterPanel: Field '${field.field}' with type 'select' must have options`);
            }
        });

        // Validate quick filters
        if (this.config.quickFilters) {
            this.config.quickFilters.forEach(qf => {
                if (!qf.id || !qf.label) {
                    throw new Error('FilterPanel: Quick filter must have id and label');
                }
                if (!qf.conditions || qf.conditions.length === 0) {
                    throw new Error(`FilterPanel: Quick filter '${qf.id}' must have at least one condition`);
                }
            });
        }
    }

    /**
     * Set active quick filters
     */
    public setActiveQuickFilters(filterIds: string[]): void {
        const oldFilters = new Set(this.activeQuickFilters);
        this.activeQuickFilters = new Set(filterIds);

        this.notifyStateChange({
            activeQuickFilters: Array.from(this.activeQuickFilters),
            oldActiveQuickFilters: Array.from(oldFilters)
        });
    }

    /**
     * Get active quick filters
     */
    public getActiveQuickFilters(): string[] {
        return Array.from(this.activeQuickFilters);
    }

    /**
     * Set advanced filter conditions
     */
    public setAdvancedFilterConditions(conditions: FilterCondition[]): void {
        const oldConditions = [...this.advancedFilterConditions];
        this.advancedFilterConditions = [...conditions];

        this.notifyStateChange({
            advancedFilterConditions: this.advancedFilterConditions,
            oldAdvancedFilterConditions: oldConditions
        });
    }

    /**
     * Get advanced filter conditions
     */
    public getAdvancedFilterConditions(): FilterCondition[] {
        return [...this.advancedFilterConditions];
    }

    /**
     * Get all active filter conditions (quick + advanced combined)
     */
    public getAllActiveConditions(): FilterCondition[] {
        const conditions: FilterCondition[] = [];

        // Add quick filter conditions
        this.activeQuickFilters.forEach(filterId => {
            const quickFilter = this.config.quickFilters?.find(qf => qf.id === filterId);
            if (quickFilter) {
                conditions.push(...quickFilter.conditions);
            }
        });

        // Add advanced filter conditions
        conditions.push(...this.advancedFilterConditions);

        return conditions;
    }

    /**
     * Clear all filters
     */
    public clearAllFilters(): void {
        this.activeQuickFilters.clear();
        this.advancedFilterConditions = [];

        this.notifyStateChange({
            cleared: true,
            activeQuickFilters: [],
            advancedFilterConditions: []
        });
    }

    /**
     * Toggle collapsed state
     */
    public setCollapsed(collapsed: boolean): void {
        if (!this.config.collapsible) {
            return;
        }

        const oldCollapsed = this.collapsed;
        this.collapsed = collapsed;

        if (oldCollapsed !== collapsed) {
            this.notifyStateChange({
                collapsed: this.collapsed
            });
        }
    }

    /**
     * Get field configuration by field name
     */
    public getFieldConfig(fieldName: string): FilterFieldConfig | undefined {
        return this.config.advancedFilters.find(f => f.field === fieldName);
    }

    /**
     * Get all field configurations
     */
    public getFieldConfigs(): FilterFieldConfig[] {
        return [...this.config.advancedFilters];
    }

    /**
     * Get quick filter configuration by ID
     */
    public getQuickFilterConfig(filterId: string): QuickFilterConfig | undefined {
        return this.config.quickFilters?.find(qf => qf.id === filterId);
    }

    /**
     * Export component state (for persistence)
     */
    public exportState(): any {
        return {
            id: this.config.id,
            activeQuickFilters: Array.from(this.activeQuickFilters),
            advancedFilterConditions: [...this.advancedFilterConditions],
            collapsed: this.collapsed
        };
    }

    /**
     * Import component state (from persistence)
     */
    public importState(state: any): void {
        if (state.activeQuickFilters) {
            this.activeQuickFilters = new Set(state.activeQuickFilters);
        }

        if (state.advancedFilterConditions) {
            this.advancedFilterConditions = [...state.advancedFilterConditions];
        }

        if (typeof state.collapsed === 'boolean') {
            this.collapsed = state.collapsed;
        }
    }
}
