import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for EntitySelectorComponent
 * Provides type-safe configuration for Dataverse entity selection
 */

export interface EntityMetadata {
    logicalName: string;
    displayName: string;
    pluralDisplayName: string;
    schemaName: string;
    entitySetName: string;
    objectTypeCode: number;
    isCustomEntity: boolean;
    isSystemEntity: boolean;
    isVirtualEntity: boolean;
    isActivityEntity: boolean;
    isIntersectEntity: boolean;
    isPrivate: boolean;
    isReadingPaneEnabled: boolean;
    isQuickCreateEnabled: boolean;
    isAuditEnabled: boolean;
    isValidForAdvancedFind: boolean;
    isValidForQueue: boolean;
    isMailMergeEnabled: boolean;
    isDuplicateDetectionEnabled: boolean;
    isBusinessProcessEnabled: boolean;
    isDocumentManagementEnabled: boolean;
    primaryIdAttribute: string;
    primaryNameAttribute: string;
    primaryImageAttribute?: string;
    description?: string;
    iconVectorName?: string;
    iconSmallName?: string;
    iconMediumName?: string;
    iconLargeName?: string;
    color?: string;
    entityType: 'System' | 'Custom' | 'Virtual' | 'Activity' | 'Intersect';
    ownershipType: 'None' | 'UserOwned' | 'TeamOwned' | 'OrganizationOwned';
    attributeCount?: number;
    relationshipCount?: number;
    privilegeCount?: number;
    formCount?: number;
    viewCount?: number;
    workflowCount?: number;
    modifiedOn?: Date;
    createdOn?: Date;
    publisher?: {
        id: string;
        uniqueName: string;
        friendlyName: string;
    };
    solution?: {
        id: string;
        uniqueName: string;
        friendlyName: string;
        isManaged: boolean;
    };
}

export interface EntitySelectorConfig extends BaseComponentConfig {
    // Basic configuration
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    
    // Entity filtering options
    showSystemEntities?: boolean;
    showCustomEntities?: boolean;
    showVirtualEntities?: boolean;
    showActivityEntities?: boolean;
    showIntersectEntities?: boolean;
    showPrivateEntities?: boolean;
    filterByEntityTypes?: ('System' | 'Custom' | 'Virtual' | 'Activity' | 'Intersect')[];
    filterByOwnership?: ('None' | 'UserOwned' | 'TeamOwned' | 'OrganizationOwned')[];
    filterByPublisher?: string[]; // Publisher unique names
    filterBySolution?: string[]; // Solution unique names
    excludeEntities?: string[]; // Entity logical names to exclude
    includeEntities?: string[]; // Only show these entities
    
    // Advanced filtering
    requirePrimaryName?: boolean; // Only entities with primary name attribute
    requireValidForAdvancedFind?: boolean;
    requireQuickCreateEnabled?: boolean;
    requireAuditEnabled?: boolean;
    requireBusinessProcessEnabled?: boolean;
    requireDocumentManagement?: boolean;
    requireDuplicateDetection?: boolean;
    minAttributeCount?: number;
    maxAttributeCount?: number;
    
    // Display options
    showEntityType?: boolean;
    showOwnership?: boolean;
    showPublisher?: boolean;
    showSolution?: boolean;
    showDescription?: boolean;
    showAttributeCount?: boolean;
    showRelationshipCount?: boolean;
    showPrivilegeCount?: boolean;
    showModifiedDate?: boolean;
    showIcon?: boolean;
    showColor?: boolean;
    sortBy?: 'displayName' | 'logicalName' | 'entityType' | 'modifiedOn' | 'attributeCount';
    sortDirection?: 'asc' | 'desc';
    
    // Grouping options
    groupByType?: boolean;
    groupByOwnership?: boolean;
    groupByPublisher?: boolean;
    groupBySolution?: boolean;
    
    // Search and filtering
    searchable?: boolean;
    searchPlaceholder?: string;
    searchFields?: ('displayName' | 'logicalName' | 'description' | 'publisher' | 'solution')[];
    quickFilters?: {
        system?: boolean;
        custom?: boolean;
        virtual?: boolean;
        activity?: boolean;
        userOwned?: boolean;
        teamOwned?: boolean;
        validForAdvancedFind?: boolean;
        quickCreateEnabled?: boolean;
        auditEnabled?: boolean;
    };
    
    // Default selections
    defaultEntity?: string; // Entity logical name
    selectedEntity?: string;
    autoSelectFirst?: boolean;
    autoSelectDefault?: boolean;
    
    // Multi-selection support
    allowMultiSelect?: boolean;
    maxSelections?: number;
    
    // Advanced options
    showTooltips?: boolean;
    enableKeyboardNav?: boolean;
    loadMetadataOnDemand?: boolean; // Load full metadata only when needed
    cacheMetadata?: boolean;
    
    // Loading and empty states
    loadingText?: string;
    emptyText?: string;
    errorText?: string;
    
    // Callbacks
    onSelectionChange?: (selectedEntities: EntityMetadata[]) => void;
    onEntityLoad?: (entities: EntityMetadata[]) => void;
    onError?: (error: Error) => void;
    onSearch?: (query: string) => void;
    onMetadataLoad?: (entity: EntityMetadata) => void;
    
    // Data source
    entities?: EntityMetadata[];
    loadEntities?: () => Promise<EntityMetadata[]>;
    loadEntityMetadata?: (logicalName: string) => Promise<EntityMetadata>;
    
    // Environment context
    environmentId?: string;
    
    // Validation
    validate?: (selectedEntities: EntityMetadata[]) => boolean | string;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * Event data interfaces
 */
export interface EntitySelectorSelectionEvent {
    componentId: string;
    selectedEntities: EntityMetadata[];
    addedEntities: EntityMetadata[];
    removedEntities: EntityMetadata[];
    timestamp: number;
}

export interface EntitySelectorLoadEvent {
    componentId: string;
    entities: EntityMetadata[];
    filteredCount: number;
    timestamp: number;
}

export interface EntitySelectorMetadataLoadEvent {
    componentId: string;
    entity: EntityMetadata;
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_ENTITY_SELECTOR_CONFIG: Partial<EntitySelectorConfig> = {
    label: 'Entity:',
    placeholder: 'Select entity...',
    required: false,
    disabled: false,
    showSystemEntities: true,
    showCustomEntities: true,
    showVirtualEntities: false,
    showActivityEntities: true,
    showIntersectEntities: false,
    showPrivateEntities: false,
    requireValidForAdvancedFind: false,
    showEntityType: true,
    showOwnership: false,
    showPublisher: false,
    showSolution: false,
    showDescription: false,
    showAttributeCount: false,
    showRelationshipCount: false,
    showPrivilegeCount: false,
    showModifiedDate: false,
    showIcon: true,
    showColor: false,
    sortBy: 'displayName',
    sortDirection: 'asc',
    groupByType: false,
    groupByOwnership: false,
    groupByPublisher: false,
    groupBySolution: false,
    searchable: true,
    searchPlaceholder: 'Search entities...',
    searchFields: ['displayName', 'logicalName', 'description'],
    allowMultiSelect: false,
    maxSelections: 1,
    showTooltips: true,
    enableKeyboardNav: true,
    loadMetadataOnDemand: true,
    cacheMetadata: true,
    autoSelectFirst: false,
    autoSelectDefault: true,
    loadingText: 'Loading entities...',
    emptyText: 'No entities found',
    errorText: 'Error loading entities'
};

/**
 * Entity type definitions
 */
export const ENTITY_TYPES = {
    SYSTEM: 'System',
    CUSTOM: 'Custom',
    VIRTUAL: 'Virtual',
    ACTIVITY: 'Activity',
    INTERSECT: 'Intersect'
} as const;

/**
 * Ownership type definitions
 */
export const OWNERSHIP_TYPES = {
    NONE: 'None',
    USER_OWNED: 'UserOwned',
    TEAM_OWNED: 'TeamOwned',
    ORGANIZATION_OWNED: 'OrganizationOwned'
} as const;

/**
 * Well-known system entities that are commonly filtered out
 */
export const COMMON_SYSTEM_ENTITIES = [
    'activitypointer',
    'annotation',
    'attachment',
    'asyncoperation',
    'audit',
    'bulkdeletefailure',
    'bulkdeleteoperation',
    'businessunit',
    'calendar',
    'calendarrule',
    'connection',
    'connectionrole',
    'duplicaterecord',
    'duplicaterule',
    'duplicaterulecondition',
    'importdata',
    'importfile',
    'importjob',
    'importlog',
    'importmap',
    'organization',
    'organizationui',
    'owner',
    'pluginassembly',
    'plugintype',
    'principal',
    'privilege',
    'processsession',
    'queue',
    'queueitem',
    'role',
    'roleprivileges',
    'roletemplate',
    'savedquery',
    'sdkmessage',
    'sdkmessagefilter',
    'sdkmessageprocessingstep',
    'sdkmessageprocessingstepimage',
    'sdkmessageprocessingstepsecureconfig',
    'solution',
    'solutioncomponent',
    'stringmap',
    'subject',
    'systemuser',
    'team',
    'teammembership',
    'template',
    'territory',
    'timezonedefinition',
    'timezonelocalizedname',
    'timezonerule',
    'transformationmapping',
    'transformationparametermapping',
    'transactioncurrency',
    'userentityinstancedata',
    'userentityuisettings',
    'userform',
    'userquery',
    'usersettings',
    'webresource',
    'workflowlog'
];

/**
 * CSS class constants specific to EntitySelector
 */
export const ENTITY_SELECTOR_CSS = {
    COMPONENT: 'entity-selector',
    CONTAINER: 'entity-selector-container',
    WRAPPER: 'entity-selector-wrapper',
    
    // Dropdown structure
    DROPDOWN: 'entity-selector-dropdown',
    DROPDOWN_TRIGGER: 'entity-selector-trigger',
    DROPDOWN_MENU: 'entity-selector-menu',
    DROPDOWN_OPEN: 'entity-selector-dropdown--open',
    
    // Options
    OPTION: 'entity-selector-option',
    OPTION_SELECTED: 'entity-selector-option--selected',
    OPTION_DISABLED: 'entity-selector-option--disabled',
    OPTION_FOCUSED: 'entity-selector-option--focused',
    
    // Entity info
    ENTITY_INFO: 'entity-selector-entity-info',
    ENTITY_NAME: 'entity-selector-entity-name',
    ENTITY_LOGICAL_NAME: 'entity-selector-entity-logical-name',
    ENTITY_TYPE: 'entity-selector-entity-type',
    ENTITY_OWNERSHIP: 'entity-selector-entity-ownership',
    ENTITY_DESCRIPTION: 'entity-selector-entity-description',
    ENTITY_PUBLISHER: 'entity-selector-entity-publisher',
    ENTITY_SOLUTION: 'entity-selector-entity-solution',
    ENTITY_STATS: 'entity-selector-entity-stats',
    ENTITY_ICON: 'entity-selector-entity-icon',
    
    // Type badges
    TYPE_SYSTEM: 'entity-type--system',
    TYPE_CUSTOM: 'entity-type--custom',
    TYPE_VIRTUAL: 'entity-type--virtual',
    TYPE_ACTIVITY: 'entity-type--activity',
    TYPE_INTERSECT: 'entity-type--intersect',
    
    // Ownership badges
    OWNERSHIP_USER: 'entity-ownership--user',
    OWNERSHIP_TEAM: 'entity-ownership--team',
    OWNERSHIP_ORGANIZATION: 'entity-ownership--organization',
    OWNERSHIP_NONE: 'entity-ownership--none',
    
    // Groups
    GROUP: 'entity-selector-group',
    GROUP_HEADER: 'entity-selector-group-header',
    GROUP_OPTIONS: 'entity-selector-group-options',
    
    // Search
    SEARCH: 'entity-selector-search',
    SEARCH_INPUT: 'entity-selector-search-input',
    SEARCH_CLEAR: 'entity-selector-search-clear',
    
    // Quick filters
    QUICK_FILTERS: 'entity-selector-quick-filters',
    FILTER_BUTTON: 'entity-selector-filter-button',
    FILTER_ACTIVE: 'entity-selector-filter--active',
    
    // States
    LOADING: 'entity-selector--loading',
    EMPTY: 'entity-selector--empty',
    ERROR: 'entity-selector--error',
    DISABLED: 'entity-selector--disabled',
    REQUIRED: 'entity-selector--required',
    INVALID: 'entity-selector--invalid',
    
    // Multi-select
    MULTI_SELECT: 'entity-selector--multi-select',
    SELECTED_COUNT: 'entity-selector-selected-count',
    SELECTION_TAGS: 'entity-selector-selection-tags',
    SELECTION_TAG: 'entity-selector-selection-tag',
    TAG_REMOVE: 'entity-selector-tag-remove'
};

/**
 * Validation rules for EntitySelector
 */
export const ENTITY_SELECTOR_VALIDATION = {
    MAX_SELECTIONS: 100,
    MIN_SEARCH_LENGTH: 1,
    MAX_SEARCH_LENGTH: 100,
    DEBOUNCE_DELAY_MS: 300
};

/**
 * Helper functions for entity selector configuration
 */
export class EntitySelectorConfigValidator {
    static validate(config: EntitySelectorConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate max selections
        if (config.allowMultiSelect && config.maxSelections) {
            if (config.maxSelections < 1) {
                errors.push('maxSelections must be at least 1');
            }
            if (config.maxSelections > ENTITY_SELECTOR_VALIDATION.MAX_SELECTIONS) {
                warnings.push(`maxSelections (${config.maxSelections}) exceeds recommended limit (${ENTITY_SELECTOR_VALIDATION.MAX_SELECTIONS})`);
            }
        }

        // Validate callbacks
        const callbacks = ['onSelectionChange', 'onEntityLoad', 'onError', 'onSearch', 'onMetadataLoad', 'validate', 'loadEntities', 'loadEntityMetadata'];
        callbacks.forEach(callback => {
            if (config[callback as keyof EntitySelectorConfig] && 
                typeof config[callback as keyof EntitySelectorConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        // Validate entity arrays
        if (config.entities && !Array.isArray(config.entities)) {
            errors.push('entities must be an array');
        }

        if (config.filterByEntityTypes && !Array.isArray(config.filterByEntityTypes)) {
            errors.push('filterByEntityTypes must be an array');
        }

        if (config.filterByOwnership && !Array.isArray(config.filterByOwnership)) {
            errors.push('filterByOwnership must be an array');
        }

        if (config.filterByPublisher && !Array.isArray(config.filterByPublisher)) {
            errors.push('filterByPublisher must be an array');
        }

        if (config.filterBySolution && !Array.isArray(config.filterBySolution)) {
            errors.push('filterBySolution must be an array');
        }

        if (config.excludeEntities && !Array.isArray(config.excludeEntities)) {
            errors.push('excludeEntities must be an array');
        }

        if (config.includeEntities && !Array.isArray(config.includeEntities)) {
            errors.push('includeEntities must be an array');
        }

        if (config.searchFields && !Array.isArray(config.searchFields)) {
            errors.push('searchFields must be an array');
        }

        // Validate sort configuration
        const validSortFields = ['displayName', 'logicalName', 'entityType', 'modifiedOn', 'attributeCount'];
        if (config.sortBy && !validSortFields.includes(config.sortBy)) {
            errors.push(`sortBy must be one of: ${validSortFields.join(', ')}`);
        }

        const validSortDirections = ['asc', 'desc'];
        if (config.sortDirection && !validSortDirections.includes(config.sortDirection)) {
            errors.push(`sortDirection must be one of: ${validSortDirections.join(', ')}`);
        }

        // Validate entity type filters
        if (config.filterByEntityTypes) {
            const validTypes = Object.values(ENTITY_TYPES);
            const invalidTypes = config.filterByEntityTypes.filter(type => !validTypes.includes(type));
            if (invalidTypes.length > 0) {
                errors.push(`Invalid entity types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
            }
        }

        // Validate ownership filters
        if (config.filterByOwnership) {
            const validOwnerships = Object.values(OWNERSHIP_TYPES);
            const invalidOwnerships = config.filterByOwnership.filter(ownership => !validOwnerships.includes(ownership));
            if (invalidOwnerships.length > 0) {
                errors.push(`Invalid ownership types: ${invalidOwnerships.join(', ')}. Valid types: ${validOwnerships.join(', ')}`);
            }
        }

        // Warnings for conflicting settings
        if (config.includeEntities && config.excludeEntities) {
            warnings.push('Both includeEntities and excludeEntities are specified. includeEntities takes precedence.');
        }

        if (!config.showSystemEntities && !config.showCustomEntities && !config.showVirtualEntities) {
            warnings.push('All entity types are hidden. No entities will be displayed.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: EntitySelectorConfig): EntitySelectorConfig {
        return {
            ...config,
            id: config.id?.trim(),
            label: config.label?.trim(),
            placeholder: config.placeholder?.trim(),
            searchPlaceholder: config.searchPlaceholder?.trim(),
            maxSelections: config.allowMultiSelect 
                ? Math.max(1, Math.min(config.maxSelections || 1, ENTITY_SELECTOR_VALIDATION.MAX_SELECTIONS))
                : 1
        };
    }

    static isSystemEntity(entity: EntityMetadata): boolean {
        return entity.isSystemEntity || 
               COMMON_SYSTEM_ENTITIES.includes(entity.logicalName.toLowerCase()) ||
               entity.logicalName.startsWith('msdyn_') ||
               entity.logicalName.startsWith('mscrm_');
    }

    static filterEntities(entities: EntityMetadata[], config: EntitySelectorConfig): EntityMetadata[] {
        let filtered = [...entities];

        // Filter by entity types
        filtered = filtered.filter(entity => {
            if (entity.entityType === 'System' && !config.showSystemEntities) return false;
            if (entity.entityType === 'Custom' && !config.showCustomEntities) return false;
            if (entity.entityType === 'Virtual' && !config.showVirtualEntities) return false;
            if (entity.entityType === 'Activity' && !config.showActivityEntities) return false;
            if (entity.entityType === 'Intersect' && !config.showIntersectEntities) return false;
            if (entity.isPrivate && !config.showPrivateEntities) return false;
            return true;
        });

        // Filter by specific entity types
        if (config.filterByEntityTypes && config.filterByEntityTypes.length > 0) {
            filtered = filtered.filter(entity => 
                config.filterByEntityTypes!.includes(entity.entityType)
            );
        }

        // Filter by ownership
        if (config.filterByOwnership && config.filterByOwnership.length > 0) {
            filtered = filtered.filter(entity => 
                config.filterByOwnership!.includes(entity.ownershipType)
            );
        }

        // Include/exclude lists
        if (config.includeEntities && config.includeEntities.length > 0) {
            filtered = filtered.filter(entity => 
                config.includeEntities!.includes(entity.logicalName)
            );
        } else if (config.excludeEntities && config.excludeEntities.length > 0) {
            filtered = filtered.filter(entity => 
                !config.excludeEntities!.includes(entity.logicalName)
            );
        }

        // Filter by publisher
        if (config.filterByPublisher && config.filterByPublisher.length > 0) {
            filtered = filtered.filter(entity => 
                entity.publisher && 
                (config.filterByPublisher!.includes(entity.publisher.uniqueName) ||
                 config.filterByPublisher!.includes(entity.publisher.friendlyName))
            );
        }

        // Filter by solution
        if (config.filterBySolution && config.filterBySolution.length > 0) {
            filtered = filtered.filter(entity => 
                entity.solution && 
                (config.filterBySolution!.includes(entity.solution.uniqueName) ||
                 config.filterBySolution!.includes(entity.solution.friendlyName))
            );
        }

        // Advanced filters
        if (config.requirePrimaryName) {
            filtered = filtered.filter(entity => entity.primaryNameAttribute);
        }

        if (config.requireValidForAdvancedFind) {
            filtered = filtered.filter(entity => entity.isValidForAdvancedFind);
        }

        if (config.requireQuickCreateEnabled) {
            filtered = filtered.filter(entity => entity.isQuickCreateEnabled);
        }

        if (config.requireAuditEnabled) {
            filtered = filtered.filter(entity => entity.isAuditEnabled);
        }

        if (config.requireBusinessProcessEnabled) {
            filtered = filtered.filter(entity => entity.isBusinessProcessEnabled);
        }

        if (config.requireDocumentManagement) {
            filtered = filtered.filter(entity => entity.isDocumentManagementEnabled);
        }

        if (config.requireDuplicateDetection) {
            filtered = filtered.filter(entity => entity.isDuplicateDetectionEnabled);
        }

        // Attribute count filters
        if (config.minAttributeCount !== undefined) {
            filtered = filtered.filter(entity => 
                entity.attributeCount !== undefined && entity.attributeCount >= config.minAttributeCount!
            );
        }

        if (config.maxAttributeCount !== undefined) {
            filtered = filtered.filter(entity => 
                entity.attributeCount !== undefined && entity.attributeCount <= config.maxAttributeCount!
            );
        }

        return filtered;
    }

    static sortEntities(entities: EntityMetadata[], config: EntitySelectorConfig): EntityMetadata[] {
        const sortBy = config.sortBy || 'displayName';
        const sortDirection = config.sortDirection || 'asc';
        
        return [...entities].sort((a, b) => {
            let aVal: any = a[sortBy as keyof EntityMetadata];
            let bVal: any = b[sortBy as keyof EntityMetadata];
            
            // Handle null/undefined values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            
            // Handle different data types
            if (sortBy === 'modifiedOn') {
                // Date comparison
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (sortBy === 'attributeCount') {
                // Numeric comparison
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            } else {
                // String comparison
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            else if (aVal > bVal) comparison = 1;
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    static searchEntities(entities: EntityMetadata[], query: string, searchFields: string[]): EntityMetadata[] {
        if (!query.trim()) {
            return entities;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const fields = searchFields || ['displayName', 'logicalName', 'description'];

        return entities.filter(entity => {
            return fields.some(field => {
                let value = '';
                
                switch (field) {
                    case 'displayName':
                        value = entity.displayName || '';
                        break;
                    case 'logicalName':
                        value = entity.logicalName || '';
                        break;
                    case 'description':
                        value = entity.description || '';
                        break;
                    case 'publisher':
                        value = entity.publisher?.friendlyName || entity.publisher?.uniqueName || '';
                        break;
                    case 'solution':
                        value = entity.solution?.friendlyName || entity.solution?.uniqueName || '';
                        break;
                    default:
                        value = (entity as any)[field]?.toString() || '';
                }
                
                return value.toLowerCase().includes(normalizedQuery);
            });
        });
    }
}