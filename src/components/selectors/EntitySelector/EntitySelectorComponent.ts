import { BaseComponent, BaseComponentConfig } from '../../base/BaseComponent';
import { 
    EntitySelectorConfig, 
    EntityMetadata, 
    EntitySelectorSelectionEvent,
    EntitySelectorLoadEvent,
    EntitySelectorMetadataLoadEvent,
    DEFAULT_ENTITY_SELECTOR_CONFIG,
    EntitySelectorConfigValidator
} from './EntitySelectorConfig';
import { EntitySelectorView, EntitySelectorViewState } from './EntitySelectorView';

/**
 * EntitySelectorComponent.ts
 * 
 * Main component class for entity selection functionality
 * Extends BaseComponent and provides:
 * - Dataverse entity selection with metadata
 * - Search, filtering, and grouping capabilities
 * - Single and multi-selection modes
 * - Async entity loading with caching
 * - Integration with environment context
 * - Type-safe configuration and events
 */

export class EntitySelectorComponent extends BaseComponent {
    private entityConfig: EntitySelectorConfig;
    private entities: EntityMetadata[] = [];
    private selectedEntities: EntityMetadata[] = [];
    private filteredEntities: EntityMetadata[] = [];
    private searchQuery: string = '';
    private isOpen: boolean = false;
    private isLoading: boolean = false;
    private error?: string;
    private quickFilters: EntitySelectorViewState['quickFilters'] = {};
    private metadataCache: Map<string, EntityMetadata> = new Map();
    private searchTimeout?: NodeJS.Timeout;

    constructor(config: EntitySelectorConfig) {
        // Convert to BaseComponentConfig
        const baseConfig: BaseComponentConfig = {
            id: config.id,
            className: config.className
        };
        super(baseConfig);
        
        // Validate and sanitize configuration
        const validation = EntitySelectorConfigValidator.validate(config);
        if (!validation.isValid) {
            throw new Error(`EntitySelectorComponent configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            console.warn(`EntitySelectorComponent warnings: ${validation.warnings.join(', ')}`);
        }
        
        this.entityConfig = EntitySelectorConfigValidator.sanitizeConfig({
            ...DEFAULT_ENTITY_SELECTOR_CONFIG,
            ...config
        });
        
        this.initialize();
    }

    private initialize(): void {
        // Initialize quick filters from config
        if (this.entityConfig.quickFilters) {
            this.quickFilters = { ...this.entityConfig.quickFilters };
        }
        
        // Load initial data if provided
        if (this.entityConfig.entities) {
            this.setEntities(this.entityConfig.entities);
        } else if (this.entityConfig.loadEntities) {
            this.loadEntities();
        }
        
        // Set initial selection
        if (this.entityConfig.selectedEntity) {
            this.setSelectedByLogicalName(this.entityConfig.selectedEntity);
        } else if (this.entityConfig.defaultEntity) {
            this.setDefaultSelection();
        }
        
        this.bindInternalEvents();
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const state: EntitySelectorViewState = {
            selectedEntities: this.selectedEntities,
            filteredEntities: this.filteredEntities,
            searchQuery: this.searchQuery,
            isOpen: this.isOpen,
            isLoading: this.isLoading,
            error: this.error,
            quickFilters: this.quickFilters
        };
        
        return EntitySelectorView.render(this.entityConfig, state);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'css/components/entity-selector.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'js/components/EntitySelectorBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'entity-selector';
    }

    private bindInternalEvents(): void {
        // Listen for component events from webview
        this.on('component-event', (data: any) => {
            this.handleWebviewEvent(data.eventType, data.data);
        });
    }

    private handleWebviewEvent(eventType: string, data: any): void {
        switch (eventType) {
            case 'dropdownOpened':
                this.handleDropdownOpened();
                break;
            case 'dropdownClosed':
                this.handleDropdownClosed();
                break;
            case 'search':
                this.handleSearch(data.query);
                break;
            case 'quickFilterChanged':
                this.handleQuickFilterChanged(data.filterType, data.active);
                break;
            case 'selectionChanged':
                this.handleSelectionChanged(data.selectedEntities, data.addedEntities, data.removedEntities);
                break;
            case 'groupToggled':
                this.handleGroupToggled(data.groupName, data.collapsed);
                break;
            case 'maxSelectionsReached':
                this.handleMaxSelectionsReached(data.maxSelections);
                break;
            case 'entityMetadataRequested':
                this.handleMetadataRequested(data.logicalName);
                break;
            case 'retry':
                this.retry();
                break;
            case 'clear-search':
                this.clearSearch();
                break;
        }
    }

    // Public API Methods

    /**
     * Set the entities to display in the selector
     */
    public setEntities(entities: EntityMetadata[]): void {
        this.entities = [...entities];
        this.applyFilters();
        this.updateView();
        
        // Emit load event
        const loadEvent: EntitySelectorLoadEvent = {
            componentId: this.getId(),
            entities: this.entities,
            filteredCount: this.filteredEntities.length,
            timestamp: Date.now()
        };
        
        this.emit('entityLoad', loadEvent);
        this.entityConfig.onEntityLoad?.(this.entities);
    }

    /**
     * Get currently selected entities
     */
    public getSelectedEntities(): EntityMetadata[] {
        return [...this.selectedEntities];
    }

    /**
     * Set selected entities programmatically
     */
    public setSelectedEntities(entities: EntityMetadata[]): void {
        const maxSelections = this.entityConfig.maxSelections || 1;
        if (!this.entityConfig.allowMultiSelect && entities.length > 1) {
            throw new Error('Multi-selection is not enabled');
        }
        if (entities.length > maxSelections) {
            throw new Error(`Cannot select more than ${maxSelections} entities`);
        }
        
        const previousEntities = [...this.selectedEntities];
        this.selectedEntities = [...entities];
        this.updateView();
        
        this.emitSelectionChange(entities, entities, previousEntities);
    }

    /**
     * Set selected entity by logical name
     */
    public setSelectedByLogicalName(logicalName: string): void {
        const entity = this.entities.find(e => e.logicalName === logicalName);
        if (entity) {
            this.setSelectedEntities([entity]);
        }
    }

    /**
     * Clear all selections
     */
    public clearSelection(): void {
        const previousEntities = [...this.selectedEntities];
        this.selectedEntities = [];
        this.updateView();
        
        this.emitSelectionChange([], [], previousEntities);
    }

    /**
     * Refresh entities by reloading from source
     */
    public async refresh(): Promise<void> {
        if (this.entityConfig.loadEntities) {
            await this.loadEntities();
        }
    }

    /**
     * Update configuration
     */
    public updateConfig(updates: Partial<EntitySelectorConfig>): void {
        const newConfig = { ...this.entityConfig, ...updates };
        const validation = EntitySelectorConfigValidator.validate(newConfig);
        
        if (!validation.isValid) {
            throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
        }
        
        this.entityConfig = EntitySelectorConfigValidator.sanitizeConfig(newConfig);
        this.applyFilters();
        this.updateView();
    }

    /**
     * Search entities
     */
    public search(query: string): void {
        this.searchQuery = query;
        this.applyFilters();
        this.updateView();
        
        this.entityConfig.onSearch?.(query);
    }

    /**
     * Set quick filter
     */
    public setQuickFilter(filterType: keyof EntitySelectorViewState['quickFilters'], active: boolean): void {
        if (this.quickFilters) {
            this.quickFilters[filterType] = active;
            this.applyFilters();
            this.updateView();
        }
    }

    // Private Methods

    private async loadEntities(): Promise<void> {
        if (!this.entityConfig.loadEntities) {
            return;
        }
        
        this.isLoading = true;
        this.error = undefined;
        this.updateView();
        
        try {
            const entities = await this.entityConfig.loadEntities();
            this.setEntities(entities);
            
            // Auto-select if configured
            if (this.selectedEntities.length === 0) {
                if (this.entityConfig.autoSelectDefault && this.entityConfig.defaultEntity) {
                    this.setDefaultSelection();
                } else if (this.entityConfig.autoSelectFirst && entities.length > 0) {
                    this.setSelectedEntities([entities[0]]);
                }
            }
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Failed to load entities';
            this.entityConfig.onError?.(error instanceof Error ? error : new Error(this.error));
        } finally {
            this.isLoading = false;
            this.updateView();
        }
    }

    private setDefaultSelection(): void {
        if (!this.entityConfig.defaultEntity) return;
        
        const entity = this.entities.find(e => e.logicalName === this.entityConfig.defaultEntity);
        if (entity) {
            this.setSelectedEntities([entity]);
        }
    }

    private applyFilters(): void {
        let filtered = [...this.entities];
        
        // Apply configuration-based filters
        filtered = EntitySelectorConfigValidator.filterEntities(filtered, this.entityConfig);
        
        // Apply search filter
        if (this.searchQuery.trim()) {
            const searchFields = this.entityConfig.searchFields || ['displayName', 'logicalName', 'description'];
            filtered = EntitySelectorConfigValidator.searchEntities(filtered, this.searchQuery, searchFields);
        }
        
        // Apply quick filters
        filtered = this.applyQuickFilters(filtered);
        
        // Sort entities
        filtered = EntitySelectorConfigValidator.sortEntities(filtered, this.entityConfig);
        
        this.filteredEntities = filtered;
    }

    private applyQuickFilters(entities: EntityMetadata[]): EntityMetadata[] {
        let filtered = entities;
        
        if (this.quickFilters.system) {
            filtered = filtered.filter(e => e.entityType === 'System');
        }
        
        if (this.quickFilters.custom) {
            filtered = filtered.filter(e => e.entityType === 'Custom');
        }
        
        if (this.quickFilters.virtual) {
            filtered = filtered.filter(e => e.entityType === 'Virtual');
        }
        
        if (this.quickFilters.activity) {
            filtered = filtered.filter(e => e.entityType === 'Activity');
        }
        
        if (this.quickFilters.userOwned) {
            filtered = filtered.filter(e => e.ownershipType === 'UserOwned');
        }
        
        if (this.quickFilters.teamOwned) {
            filtered = filtered.filter(e => e.ownershipType === 'TeamOwned');
        }
        
        if (this.quickFilters.validForAdvancedFind) {
            filtered = filtered.filter(e => e.isValidForAdvancedFind);
        }
        
        if (this.quickFilters.quickCreateEnabled) {
            filtered = filtered.filter(e => e.isQuickCreateEnabled);
        }
        
        if (this.quickFilters.auditEnabled) {
            filtered = filtered.filter(e => e.isAuditEnabled);
        }
        
        return filtered;
    }

    private updateView(): void {
        const state: EntitySelectorViewState = {
            selectedEntities: this.selectedEntities,
            filteredEntities: this.filteredEntities,
            searchQuery: this.searchQuery,
            isOpen: this.isOpen,
            isLoading: this.isLoading,
            error: this.error,
            quickFilters: this.quickFilters
        };
        
        const html = EntitySelectorView.render(this.entityConfig, state);
        this.notifyUpdate();
    }

    // Event Handlers

    private handleDropdownOpened(): void {
        this.isOpen = true;
        
        // Load metadata on demand if configured
        if (this.entityConfig.loadMetadataOnDemand) {
            this.preloadVisibleEntityMetadata();
        }
    }

    private handleDropdownClosed(): void {
        this.isOpen = false;
    }

    private handleSearch(query: string): void {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.search(query);
        }, 300);
    }

    private handleQuickFilterChanged(filterType: string, active: boolean): void {
        if (this.quickFilters && filterType in this.quickFilters) {
            this.quickFilters[filterType as keyof typeof this.quickFilters] = active;
            this.applyFilters();
            this.updateView();
        }
    }

    private handleSelectionChanged(selectedEntities: any[], addedEntities: any[], removedEntities: any[]): void {
        // Convert to EntityMetadata objects
        const selected = this.convertWebviewEntitiesToMetadata(selectedEntities);
        const added = this.convertWebviewEntitiesToMetadata(addedEntities);
        const removed = this.convertWebviewEntitiesToMetadata(removedEntities);
        
        this.selectedEntities = selected;
        
        // Validate selection
        const validation = this.validateSelection(selected);
        if (!validation.isValid) {
            // Revert selection and show error
            this.updateView();
            return;
        }
        
        this.emitSelectionChange(selected, added, removed);
    }

    private convertWebviewEntitiesToMetadata(webviewEntities: any[]): EntityMetadata[] {
        return webviewEntities.map(webviewEntity => {
            // Find full metadata object
            const fullEntity = this.entities.find(e => e.logicalName === webviewEntity.logicalName);
            if (fullEntity) {
                return fullEntity;
            }
            
            // Create minimal entity from webview data
            return {
                logicalName: webviewEntity.logicalName,
                displayName: webviewEntity.displayName,
                pluralDisplayName: webviewEntity.displayName,
                schemaName: webviewEntity.logicalName,
                entitySetName: webviewEntity.logicalName,
                objectTypeCode: 0,
                isCustomEntity: webviewEntity.isCustomEntity || false,
                isSystemEntity: webviewEntity.isSystemEntity || false,
                isVirtualEntity: webviewEntity.isVirtualEntity || false,
                isActivityEntity: false,
                isIntersectEntity: false,
                isPrivate: false,
                isReadingPaneEnabled: false,
                isQuickCreateEnabled: false,
                isAuditEnabled: false,
                isValidForAdvancedFind: false,
                isValidForQueue: false,
                isMailMergeEnabled: false,
                isDuplicateDetectionEnabled: false,
                isBusinessProcessEnabled: false,
                isDocumentManagementEnabled: false,
                primaryIdAttribute: webviewEntity.logicalName + 'id',
                primaryNameAttribute: 'name',
                entityType: webviewEntity.entityType || 'System',
                ownershipType: webviewEntity.ownershipType || 'UserOwned'
            } as EntityMetadata;
        });
    }

    private validateSelection(entities: EntityMetadata[]): { isValid: boolean; error?: string } {
        if (this.entityConfig.required && entities.length === 0) {
            return { isValid: false, error: 'Selection is required' };
        }
        
        if (!this.entityConfig.allowMultiSelect && entities.length > 1) {
            return { isValid: false, error: 'Multiple selections not allowed' };
        }
        
        const maxSelections = this.entityConfig.maxSelections || 1;
        if (entities.length > maxSelections) {
            return { isValid: false, error: `Cannot select more than ${maxSelections} entities` };
        }
        
        if (this.entityConfig.validate) {
            const customValidation = this.entityConfig.validate(entities);
            if (customValidation !== true) {
                return { 
                    isValid: false, 
                    error: typeof customValidation === 'string' ? customValidation : 'Validation failed' 
                };
            }
        }
        
        return { isValid: true };
    }

    private emitSelectionChange(selected: EntityMetadata[], added: EntityMetadata[], removed: EntityMetadata[]): void {
        const event: EntitySelectorSelectionEvent = {
            componentId: this.getId(),
            selectedEntities: selected,
            addedEntities: added,
            removedEntities: removed,
            timestamp: Date.now()
        };
        
        this.emit('selectionChanged', event);
        this.entityConfig.onSelectionChange?.(selected);
    }

    private handleGroupToggled(groupName: string, collapsed: boolean): void {
        // Group toggle handling - could be extended for state persistence
        console.log(`Group "${groupName}" ${collapsed ? 'collapsed' : 'expanded'}`);
    }

    private handleMaxSelectionsReached(maxSelections: number): void {
        console.warn(`Maximum selections reached: ${maxSelections}`);
        // Could emit a warning event or show a notification
    }

    private async handleMetadataRequested(logicalName: string): Promise<void> {
        if (!this.entityConfig.loadEntityMetadata || this.metadataCache.has(logicalName)) {
            return;
        }
        
        try {
            const metadata = await this.entityConfig.loadEntityMetadata(logicalName);
            this.metadataCache.set(logicalName, metadata);
            
            // Emit metadata loaded event
            const event: EntitySelectorMetadataLoadEvent = {
                componentId: this.getId(),
                entity: metadata,
                timestamp: Date.now()
            };
            
            this.emit('metadataLoaded', event);
            this.entityConfig.onMetadataLoad?.(metadata);
        } catch (error) {
            console.error(`Failed to load metadata for ${logicalName}:`, error);
        }
    }

    private async preloadVisibleEntityMetadata(): Promise<void> {
        if (!this.entityConfig.loadEntityMetadata || !this.entityConfig.loadMetadataOnDemand) {
            return;
        }
        
        // Load metadata for the first few visible entities
        const entitiesToLoad = this.filteredEntities.slice(0, 20);
        const promises = entitiesToLoad
            .filter(entity => !this.metadataCache.has(entity.logicalName))
            .map(entity => this.handleMetadataRequested(entity.logicalName));
            
        await Promise.allSettled(promises);
    }

    private retry(): void {
        this.error = undefined;
        if (this.entityConfig.loadEntities) {
            this.loadEntities();
        }
    }

    private clearSearch(): void {
        this.search('');
    }

    // Lifecycle

    public getHtml(): string {
        const state: EntitySelectorViewState = {
            selectedEntities: this.selectedEntities,
            filteredEntities: this.filteredEntities,
            searchQuery: this.searchQuery,
            isOpen: this.isOpen,
            isLoading: this.isLoading,
            error: this.error,
            quickFilters: this.quickFilters
        };
        
        return EntitySelectorView.render(this.entityConfig, state);
    }

    public getCssFiles(): string[] {
        return ['css/components/entity-selector.css'];
    }

    public getJsFiles(): string[] {
        return ['js/components/EntitySelectorBehavior.js'];
    }

    public dispose(): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.metadataCache.clear();
        super.dispose();
    }
}