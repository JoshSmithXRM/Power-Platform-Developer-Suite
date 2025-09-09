import { EnvironmentSelectorComponent } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorComponent';
import { EnvironmentSelectorConfig } from '../components/selectors/EnvironmentSelector/EnvironmentSelectorConfig';
import { ActionBarComponent } from '../components/actions/ActionBar/ActionBarComponent';
import { ActionBarConfig } from '../components/actions/ActionBar/ActionBarConfig';
import { SearchFormComponent } from '../components/forms/SearchForm/SearchFormComponent';
import { SearchFormConfig } from '../components/forms/SearchForm/SearchFormConfig';
import { DataTableComponent } from '../components/tables/DataTable/DataTableComponent';
import { DataTableConfig } from '../components/tables/DataTable/DataTableConfig';
import { EmptyTableComponent } from '../components/tables/EmptyTable/EmptyTableComponent';
import { EmptyTableConfig } from '../components/tables/EmptyTable/EmptyTableConfig';
import { FilterableTableComponent } from '../components/tables/FilterableTable/FilterableTableComponent';
import { FilterableTableConfig } from '../components/tables/FilterableTable/FilterableTableConfig';
import { SolutionSelectorComponent } from '../components/selectors/SolutionSelector/SolutionSelectorComponent';
import { SolutionSelectorConfig } from '../components/selectors/SolutionSelector/SolutionSelectorConfig';
import { EntitySelectorComponent } from '../components/selectors/EntitySelector/EntitySelectorComponent';
import { EntitySelectorConfig } from '../components/selectors/EntitySelector/EntitySelectorConfig';
import { FilterFormComponent } from '../components/forms/FilterForm/FilterFormComponent';
import { FilterFormConfig } from '../components/forms/FilterForm/FilterFormConfig';
import { BaseComponent } from '../components/base/BaseComponent';

/**
 * ComponentFactory.ts
 * 
 * Enhanced factory for creating and managing all component instances
 * Provides type-safe creation methods for all components with validation
 * Manages component lifecycle and instance tracking
 */

export interface ComponentInstance {
    id: string;
    type: string;
    component: BaseComponent;
    created: Date;
    lastUpdated: Date;
    isActive: boolean;
}

export interface ComponentFactoryConfig {
    enableInstanceTracking?: boolean;
    maxInstancesPerType?: number;
    autoCleanupInactive?: boolean;
    cleanupIntervalMs?: number;
}

export class ComponentFactory {
    private instances: Map<string, ComponentInstance> = new Map();
    private config: ComponentFactoryConfig;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config: ComponentFactoryConfig = {}) {
        this.config = {
            enableInstanceTracking: true,
            maxInstancesPerType: 50,
            autoCleanupInactive: false,
            cleanupIntervalMs: 300000, // 5 minutes
            ...config
        };

        if (this.config.autoCleanupInactive) {
            this.startCleanupTimer();
        }
    }

    // Phase 3: Core Components

    /**
     * Create an EnvironmentSelectorComponent
     */
    public createEnvironmentSelector(config: EnvironmentSelectorConfig): EnvironmentSelectorComponent {
        this.validateComponentConfig(config, 'EnvironmentSelector');
        
        const component = new EnvironmentSelectorComponent(config);
        this.trackInstance(config.id, 'EnvironmentSelector', component);
        
        return component;
    }

    /**
     * Create an ActionBarComponent
     */
    public createActionBar(config: ActionBarConfig): ActionBarComponent {
        this.validateComponentConfig(config, 'ActionBar');
        
        const component = new ActionBarComponent(config);
        this.trackInstance(config.id, 'ActionBar', component);
        
        return component;
    }

    /**
     * Create a SearchFormComponent
     */
    public createSearchForm(config: SearchFormConfig): SearchFormComponent {
        this.validateComponentConfig(config, 'SearchForm');
        
        const component = new SearchFormComponent(config);
        this.trackInstance(config.id, 'SearchForm', component);
        
        return component;
    }

    // Phase 4: Data Components

    /**
     * Create a DataTableComponent
     */
    public createDataTable(config: DataTableConfig): DataTableComponent {
        this.validateComponentConfig(config, 'DataTable');
        
        const component = new DataTableComponent(config);
        this.trackInstance(config.id, 'DataTable', component);
        
        return component;
    }

    /**
     * Create an EmptyTableComponent
     */
    public createEmptyTable(config: EmptyTableConfig): EmptyTableComponent {
        this.validateComponentConfig(config, 'EmptyTable');
        
        const component = new EmptyTableComponent(config);
        this.trackInstance(config.id, 'EmptyTable', component);
        
        return component;
    }

    /**
     * Create a FilterableTableComponent
     */
    public createFilterableTable(config: FilterableTableConfig): FilterableTableComponent {
        this.validateComponentConfig(config, 'FilterableTable');
        
        const component = new FilterableTableComponent(config);
        this.trackInstance(config.id, 'FilterableTable', component);
        
        return component;
    }

    // Phase 5: Specialized Components

    /**
     * Create a SolutionSelectorComponent
     */
    public createSolutionSelector(config: SolutionSelectorConfig): SolutionSelectorComponent {
        this.validateComponentConfig(config, 'SolutionSelector');
        
        const component = new SolutionSelectorComponent(config);
        this.trackInstance(config.id, 'SolutionSelector', component);
        
        return component;
    }

    /**
     * Create an EntitySelectorComponent
     */
    public createEntitySelector(config: EntitySelectorConfig): EntitySelectorComponent {
        this.validateComponentConfig(config, 'EntitySelector');
        
        const component = new EntitySelectorComponent(config);
        this.trackInstance(config.id, 'EntitySelector', component);
        
        return component;
    }

    /**
     * Create a FilterFormComponent
     */
    public createFilterForm(config: FilterFormConfig): FilterFormComponent {
        this.validateComponentConfig(config, 'FilterForm');
        
        const component = new FilterFormComponent(config);
        this.trackInstance(config.id, 'FilterForm', component);
        
        return component;
    }

    // Instance Management

    /**
     * Get a component instance by ID
     */
    public getInstance(id: string): ComponentInstance | undefined {
        return this.instances.get(id);
    }

    /**
     * Get all instances of a specific component type
     */
    public getInstancesByType(type: string): ComponentInstance[] {
        return Array.from(this.instances.values()).filter(instance => instance.type === type);
    }

    /**
     * Get all active component instances
     */
    public getActiveInstances(): ComponentInstance[] {
        return Array.from(this.instances.values()).filter(instance => instance.isActive);
    }

    /**
     * Get total count of instances by type
     */
    public getInstanceCount(type?: string): number {
        if (type) {
            return this.getInstancesByType(type).length;
        }
        return this.instances.size;
    }

    /**
     * Mark a component instance as inactive
     */
    public deactivateInstance(id: string): boolean {
        const instance = this.instances.get(id);
        if (instance) {
            instance.isActive = false;
            instance.lastUpdated = new Date();
            return true;
        }
        return false;
    }

    /**
     * Remove a component instance and dispose of it
     */
    public removeInstance(id: string): boolean {
        const instance = this.instances.get(id);
        if (instance) {
            instance.component.dispose();
            this.instances.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Clear all instances (with disposal)
     */
    public clearAllInstances(): void {
        for (const instance of this.instances.values()) {
            instance.component.dispose();
        }
        this.instances.clear();
    }

    /**
     * Update the last updated timestamp for an instance
     */
    public touchInstance(id: string): void {
        const instance = this.instances.get(id);
        if (instance) {
            instance.lastUpdated = new Date();
        }
    }

    // Validation

    /**
     * Validate component configuration
     */
    private validateComponentConfig(config: any, type: string): void {
        if (!config) {
            throw new Error(`Component configuration is required for ${type}`);
        }

        if (!config.id || typeof config.id !== 'string') {
            throw new Error(`Component ID is required and must be a string for ${type}`);
        }

        if (config.id.trim() === '') {
            throw new Error(`Component ID cannot be empty for ${type}`);
        }

        // Check for duplicate IDs
        if (this.instances.has(config.id)) {
            throw new Error(`Component with ID '${config.id}' already exists`);
        }

        // Check instance limits
        if (this.config.maxInstancesPerType) {
            const typeInstanceCount = this.getInstanceCount(type);
            if (typeInstanceCount >= this.config.maxInstancesPerType) {
                throw new Error(`Maximum instances (${this.config.maxInstancesPerType}) reached for component type ${type}`);
            }
        }
    }

    /**
     * Track a component instance
     */
    private trackInstance(id: string, type: string, component: BaseComponent): void {
        if (!this.config.enableInstanceTracking) {
            return;
        }

        const instance: ComponentInstance = {
            id,
            type,
            component,
            created: new Date(),
            lastUpdated: new Date(),
            isActive: true
        };

        this.instances.set(id, instance);

        // Set up component disposal listener
        component.once('disposed', () => {
            this.instances.delete(id);
        });

        // Set up update listener
        component.on('update', () => {
            this.touchInstance(id);
        });
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanupInactiveInstances();
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Clean up inactive instances
     */
    private cleanupInactiveInstances(): void {
        const now = new Date();
        const cleanupThreshold = this.config.cleanupIntervalMs || 300000; // 5 minutes

        const toRemove: string[] = [];

        for (const [id, instance] of this.instances.entries()) {
            if (!instance.isActive) {
                const timeSinceUpdate = now.getTime() - instance.lastUpdated.getTime();
                if (timeSinceUpdate > cleanupThreshold) {
                    toRemove.push(id);
                }
            }
        }

        for (const id of toRemove) {
            this.removeInstance(id);
        }

        if (toRemove.length > 0) {
            console.log(`ComponentFactory: Cleaned up ${toRemove.length} inactive instances`);
        }
    }

    // Utility Methods

    /**
     * Get factory statistics
     */
    public getStatistics(): {
        totalInstances: number;
        activeInstances: number;
        inactiveInstances: number;
        instancesByType: Record<string, number>;
        oldestInstance?: { id: string; type: string; age: number };
        newestInstance?: { id: string; type: string; age: number };
    } {
        const instances = Array.from(this.instances.values());
        const now = new Date();

        const stats = {
            totalInstances: instances.length,
            activeInstances: instances.filter(i => i.isActive).length,
            inactiveInstances: instances.filter(i => !i.isActive).length,
            instancesByType: {} as Record<string, number>,
            oldestInstance: undefined as { id: string; type: string; age: number } | undefined,
            newestInstance: undefined as { id: string; type: string; age: number } | undefined
        };

        // Count by type
        for (const instance of instances) {
            stats.instancesByType[instance.type] = (stats.instancesByType[instance.type] || 0) + 1;
        }

        // Find oldest and newest
        if (instances.length > 0) {
            const sorted = instances.sort((a, b) => a.created.getTime() - b.created.getTime());
            
            const oldest = sorted[0];
            const newest = sorted[sorted.length - 1];

            stats.oldestInstance = {
                id: oldest.id,
                type: oldest.type,
                age: now.getTime() - oldest.created.getTime()
            };

            stats.newestInstance = {
                id: newest.id,
                type: newest.type,
                age: now.getTime() - newest.created.getTime()
            };
        }

        return stats;
    }

    /**
     * Validate all tracked instances
     */
    public validateAllInstances(): { valid: string[]; invalid: string[]; errors: Record<string, string> } {
        const result = {
            valid: [] as string[],
            invalid: [] as string[],
            errors: {} as Record<string, string>
        };

        for (const [id, instance] of this.instances.entries()) {
            try {
                // Basic validation
                if (!instance.component || typeof instance.component.getId !== 'function') {
                    throw new Error('Invalid component instance');
                }

                if (instance.component.getId() !== id) {
                    throw new Error('Component ID mismatch');
                }

                result.valid.push(id);
            } catch (error) {
                result.invalid.push(id);
                result.errors[id] = error instanceof Error ? error.message : 'Unknown error';
            }
        }

        return result;
    }

    /**
     * Export factory state for debugging
     */
    public exportState() {
        return {
            config: this.config,
            instances: Array.from(this.instances.values()).map(instance => ({
                id: instance.id,
                type: instance.type,
                created: instance.created.toISOString(),
                lastUpdated: instance.lastUpdated.toISOString(),
                isActive: instance.isActive
            })),
            statistics: this.getStatistics()
        };
    }

    /**
     * Dispose of the factory and all instances
     */
    public dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }

        this.clearAllInstances();
    }
}

// Singleton instance for global use
export const componentFactory = new ComponentFactory();