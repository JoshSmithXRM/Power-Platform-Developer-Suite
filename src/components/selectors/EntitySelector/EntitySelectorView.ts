import { 
    EntitySelectorConfig, 
    EntityMetadata, 
    ENTITY_SELECTOR_CSS, 
    DEFAULT_ENTITY_SELECTOR_CONFIG,
    ENTITY_TYPES,
    OWNERSHIP_TYPES
} from './EntitySelectorConfig';

/**
 * EntitySelectorView.ts
 * 
 * HTML generation for EntitySelectorComponent
 * Renders the complete UI structure including dropdown, search, filtering, and entity display
 */

export interface EntitySelectorViewState {
    selectedEntities: EntityMetadata[];
    filteredEntities: EntityMetadata[];
    searchQuery: string;
    isOpen: boolean;
    isLoading: boolean;
    error?: string;
    quickFilters: {
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
    groups?: { [key: string]: EntityMetadata[] };
}

export class EntitySelectorView {
    static render(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const mergedConfig = { ...DEFAULT_ENTITY_SELECTOR_CONFIG, ...config };
        const cssClasses = this.buildCssClasses(mergedConfig, state);

        return `
            <div class="${cssClasses.container}" 
                 data-component-id="${config.id}"
                 data-placeholder="${mergedConfig.placeholder}"
                 data-max-selections="${mergedConfig.maxSelections}"
                 ${config.environmentId ? `data-environment-id="${config.environmentId}"` : ''}
                 ${mergedConfig.required ? 'data-required="true"' : ''}
                 ${mergedConfig.disabled ? 'data-disabled="true"' : ''}
                 role="combobox"
                 aria-haspopup="listbox"
                 aria-expanded="${state.isOpen}"
                 ${config.ariaLabel ? `aria-label="${config.ariaLabel}"` : ''}
                 ${config.ariaDescribedBy ? `aria-describedby="${config.ariaDescribedBy}"` : ''}>
                
                ${this.renderLabel(mergedConfig)}
                ${this.renderDropdown(mergedConfig, state)}
                ${this.renderValidationMessage(mergedConfig)}
            </div>
        `;
    }

    private static buildCssClasses(config: EntitySelectorConfig, state: EntitySelectorViewState): any {
        const base = ENTITY_SELECTOR_CSS.COMPONENT;
        const classes = [base];
        
        if (state.isLoading) classes.push(ENTITY_SELECTOR_CSS.LOADING);
        if (state.error) classes.push(ENTITY_SELECTOR_CSS.ERROR);
        if (config.disabled) classes.push(ENTITY_SELECTOR_CSS.DISABLED);
        if (config.required) classes.push(ENTITY_SELECTOR_CSS.REQUIRED);
        if (config.allowMultiSelect) classes.push(ENTITY_SELECTOR_CSS.MULTI_SELECT);
        if (state.filteredEntities.length === 0 && !state.isLoading) classes.push(ENTITY_SELECTOR_CSS.EMPTY);

        return {
            container: classes.join(' '),
            wrapper: ENTITY_SELECTOR_CSS.WRAPPER,
            dropdown: state.isOpen ? 
                `${ENTITY_SELECTOR_CSS.DROPDOWN} ${ENTITY_SELECTOR_CSS.DROPDOWN_OPEN}` : 
                ENTITY_SELECTOR_CSS.DROPDOWN
        };
    }

    private static renderLabel(config: EntitySelectorConfig): string {
        if (!config.label) return '';
        
        const requiredIndicator = config.required ? '<span class="required-indicator">*</span>' : '';
        
        return `
            <label class="component-label" for="${config.id}-trigger">
                ${config.label}${requiredIndicator}
            </label>
        `;
    }

    private static renderDropdown(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        return `
            <div class="${ENTITY_SELECTOR_CSS.DROPDOWN}">
                ${this.renderTrigger(config, state)}
                ${this.renderMenu(config, state)}
            </div>
        `;
    }

    private static renderTrigger(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const triggerText = this.getTriggerText(config, state);
        const isPlaceholder = state.selectedEntities.length === 0;
        
        return `
            <button type="button" 
                    class="${ENTITY_SELECTOR_CSS.DROPDOWN_TRIGGER} ${isPlaceholder ? 'entity-selector-trigger--placeholder' : ''}"
                    id="${config.id}-trigger"
                    aria-controls="${config.id}-menu"
                    aria-expanded="${state.isOpen}"
                    ${config.disabled ? 'disabled' : ''}
                    tabindex="0">
                <span class="trigger-content">
                    ${this.renderTriggerIcon(config, state)}
                    <span class="trigger-text">${triggerText}</span>
                    ${this.renderSelectedCount(config, state)}
                </span>
                <span class="dropdown-arrow" aria-hidden="true">▼</span>
            </button>
            ${this.renderSelectionTags(config, state)}
        `;
    }

    private static getTriggerText(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        if (state.selectedEntities.length === 0) {
            return config.placeholder || DEFAULT_ENTITY_SELECTOR_CONFIG.placeholder || '';
        } else if (state.selectedEntities.length === 1) {
            return state.selectedEntities[0].displayName;
        } else {
            return `${state.selectedEntities.length} entities selected`;
        }
    }

    private static renderTriggerIcon(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        if (!config.showIcon || state.selectedEntities.length !== 1) {
            return '';
        }

        const entity = state.selectedEntities[0];
        if (entity.iconVectorName) {
            return `<span class="${ENTITY_SELECTOR_CSS.ENTITY_ICON}" data-icon="${entity.iconVectorName}"></span>`;
        }

        // Fallback icon based on entity type
        const typeIcon = this.getTypeIcon(entity.entityType);
        return `<span class="${ENTITY_SELECTOR_CSS.ENTITY_ICON} entity-icon--${entity.entityType.toLowerCase()}">${typeIcon}</span>`;
    }

    private static getTypeIcon(entityType: string): string {
        switch (entityType) {
            case ENTITY_TYPES.SYSTEM: return '🏛️';
            case ENTITY_TYPES.CUSTOM: return '🔧';
            case ENTITY_TYPES.VIRTUAL: return '☁️';
            case ENTITY_TYPES.ACTIVITY: return '📅';
            case ENTITY_TYPES.INTERSECT: return '🔗';
            default: return '📊';
        }
    }

    private static renderSelectedCount(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        if (!config.allowMultiSelect || state.selectedEntities.length <= 1) {
            return '';
        }

        return `<span class="${ENTITY_SELECTOR_CSS.SELECTED_COUNT}">${state.selectedEntities.length}</span>`;
    }

    private static renderSelectionTags(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        if (!config.allowMultiSelect || state.selectedEntities.length === 0) {
            return '';
        }

        const tags = state.selectedEntities.map(entity => `
            <div class="${ENTITY_SELECTOR_CSS.SELECTION_TAG}" data-entity-logical-name="${entity.logicalName}">
                ${config.showIcon ? this.renderTriggerIcon({ ...config, showIcon: true }, { ...state, selectedEntities: [entity] }) : ''}
                <span class="entity-selector-tag-text">${entity.displayName}</span>
                <button type="button" 
                        class="${ENTITY_SELECTOR_CSS.TAG_REMOVE}" 
                        title="Remove ${entity.displayName}"
                        aria-label="Remove ${entity.displayName}">×</button>
            </div>
        `).join('');

        return `<div class="${ENTITY_SELECTOR_CSS.SELECTION_TAGS}">${tags}</div>`;
    }

    private static renderMenu(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        return `
            <div class="${ENTITY_SELECTOR_CSS.DROPDOWN_MENU}" 
                 id="${config.id}-menu"
                 role="listbox" 
                 aria-multiselectable="${config.allowMultiSelect}"
                 ${!state.isOpen ? 'style="display: none;"' : ''}>
                
                ${this.renderMenuHeader(config, state)}
                ${this.renderMenuContent(config, state)}
            </div>
        `;
    }

    private static renderMenuHeader(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const parts = [];
        
        if (config.searchable) {
            parts.push(this.renderSearch(config, state));
        }
        
        if (config.quickFilters && Object.keys(config.quickFilters).length > 0) {
            parts.push(this.renderQuickFilters(config, state));
        }
        
        return parts.length > 0 ? `<div class="menu-header">${parts.join('')}</div>` : '';
    }

    private static renderSearch(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const showClear = state.searchQuery.length > 0;
        
        return `
            <div class="${ENTITY_SELECTOR_CSS.SEARCH}">
                <input type="text" 
                       class="${ENTITY_SELECTOR_CSS.SEARCH_INPUT}"
                       id="${config.id}-search"
                       placeholder="${config.searchPlaceholder || DEFAULT_ENTITY_SELECTOR_CONFIG.searchPlaceholder}"
                       value="${state.searchQuery}"
                       autocomplete="off"
                       role="searchbox"
                       aria-label="Search entities">
                <button type="button" 
                        class="${ENTITY_SELECTOR_CSS.SEARCH_CLEAR}"
                        title="Clear search"
                        aria-label="Clear search"
                        ${showClear ? '' : 'style="display: none;"'}>×</button>
            </div>
        `;
    }

    private static renderQuickFilters(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const filters = [];
        
        if (config.quickFilters?.system) {
            filters.push(this.renderQuickFilter('system', 'System', state.quickFilters.system));
        }
        
        if (config.quickFilters?.custom) {
            filters.push(this.renderQuickFilter('custom', 'Custom', state.quickFilters.custom));
        }
        
        if (config.quickFilters?.virtual) {
            filters.push(this.renderQuickFilter('virtual', 'Virtual', state.quickFilters.virtual));
        }
        
        if (config.quickFilters?.activity) {
            filters.push(this.renderQuickFilter('activity', 'Activity', state.quickFilters.activity));
        }
        
        if (config.quickFilters?.userOwned) {
            filters.push(this.renderQuickFilter('userOwned', 'User Owned', state.quickFilters.userOwned));
        }
        
        if (config.quickFilters?.teamOwned) {
            filters.push(this.renderQuickFilter('teamOwned', 'Team Owned', state.quickFilters.teamOwned));
        }
        
        if (config.quickFilters?.validForAdvancedFind) {
            filters.push(this.renderQuickFilter('validForAdvancedFind', 'Advanced Find', state.quickFilters.validForAdvancedFind));
        }
        
        if (config.quickFilters?.quickCreateEnabled) {
            filters.push(this.renderQuickFilter('quickCreateEnabled', 'Quick Create', state.quickFilters.quickCreateEnabled));
        }
        
        if (config.quickFilters?.auditEnabled) {
            filters.push(this.renderQuickFilter('auditEnabled', 'Auditable', state.quickFilters.auditEnabled));
        }
        
        if (filters.length === 0) {
            return '';
        }
        
        return `<div class="${ENTITY_SELECTOR_CSS.QUICK_FILTERS}">${filters.join('')}</div>`;
    }

    private static renderQuickFilter(filterType: string, label: string, active: boolean = false): string {
        const activeClass = active ? ` ${ENTITY_SELECTOR_CSS.FILTER_ACTIVE}` : '';
        
        return `
            <button type="button" 
                    class="${ENTITY_SELECTOR_CSS.FILTER_BUTTON}${activeClass}"
                    data-filter="${filterType}"
                    title="Filter ${label} entities"
                    aria-pressed="${active}">
                ${label}
            </button>
        `;
    }

    private static renderMenuContent(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        if (state.isLoading) {
            return this.renderLoadingState(config);
        }
        
        if (state.error) {
            return this.renderErrorState(config, state.error);
        }
        
        if (state.filteredEntities.length === 0) {
            return this.renderEmptyState(config, state);
        }
        
        if (config.groupByType || config.groupByOwnership || config.groupByPublisher || config.groupBySolution) {
            return this.renderGroupedOptions(config, state);
        }
        
        return this.renderOptions(config, state.filteredEntities, state);
    }

    private static renderLoadingState(config: EntitySelectorConfig): string {
        return `
            <div class="menu-loading">
                <div class="loading-spinner"></div>
                <span class="loading-text">${config.loadingText || DEFAULT_ENTITY_SELECTOR_CONFIG.loadingText}</span>
            </div>
        `;
    }

    private static renderErrorState(config: EntitySelectorConfig, error: string): string {
        return `
            <div class="menu-error">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${error}</span>
                <button type="button" class="retry-button" data-action="retry">Retry</button>
            </div>
        `;
    }

    private static renderEmptyState(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const message = state.searchQuery ? 
            `No entities found matching "${state.searchQuery}"` : 
            (config.emptyText || DEFAULT_ENTITY_SELECTOR_CONFIG.emptyText);
        
        return `
            <div class="menu-empty">
                <span class="empty-icon">📋</span>
                <span class="empty-text">${message}</span>
                ${state.searchQuery ? '<button type="button" class="clear-search-button" data-action="clear-search">Clear search</button>' : ''}
            </div>
        `;
    }

    private static renderGroupedOptions(config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const groups = this.groupEntities(state.filteredEntities, config);
        
        return Object.entries(groups)
            .map(([groupName, entities]) => this.renderGroup(groupName, entities, config, state))
            .join('');
    }

    private static groupEntities(entities: EntityMetadata[], config: EntitySelectorConfig): { [key: string]: EntityMetadata[] } {
        const groups: { [key: string]: EntityMetadata[] } = {};
        
        entities.forEach(entity => {
            let groupKey = 'Other';
            
            if (config.groupByType) {
                groupKey = entity.entityType || 'Unknown';
            } else if (config.groupByOwnership) {
                groupKey = entity.ownershipType || 'Unknown';
            } else if (config.groupByPublisher) {
                groupKey = entity.publisher?.friendlyName || 'Unknown Publisher';
            } else if (config.groupBySolution) {
                groupKey = entity.solution?.friendlyName || 'Unknown Solution';
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(entity);
        });
        
        // Sort groups by name
        const sortedGroups: { [key: string]: EntityMetadata[] } = {};
        Object.keys(groups).sort().forEach(key => {
            sortedGroups[key] = groups[key];
        });
        
        return sortedGroups;
    }

    private static renderGroup(groupName: string, entities: EntityMetadata[], config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        return `
            <div class="${ENTITY_SELECTOR_CSS.GROUP}" data-group="${groupName}">
                <div class="${ENTITY_SELECTOR_CSS.GROUP_HEADER}" role="button" tabindex="0" aria-expanded="true">
                    <span class="entity-selector-group-indicator">▼</span>
                    <span class="group-name">${groupName}</span>
                    <span class="group-count">(${entities.length})</span>
                </div>
                <div class="${ENTITY_SELECTOR_CSS.GROUP_OPTIONS}">
                    ${this.renderOptions(config, entities, state)}
                </div>
            </div>
        `;
    }

    private static renderOptions(config: EntitySelectorConfig, entities: EntityMetadata[], state: EntitySelectorViewState): string {
        return entities
            .map(entity => this.renderOption(entity, config, state))
            .join('');
    }

    private static renderOption(entity: EntityMetadata, config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        const isSelected = state.selectedEntities.some(selected => selected.logicalName === entity.logicalName);
        const isDisabled = config.disabled || false; // Add more disable logic as needed
        
        const cssClasses = [
            ENTITY_SELECTOR_CSS.OPTION,
            isSelected ? ENTITY_SELECTOR_CSS.OPTION_SELECTED : '',
            isDisabled ? ENTITY_SELECTOR_CSS.OPTION_DISABLED : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${cssClasses}"
                 data-entity-logical-name="${entity.logicalName}"
                 data-entity-display-name="${entity.displayName}"
                 data-entity-type="${entity.entityType}"
                 data-entity-ownership="${entity.ownershipType}"
                 data-entity-system="${entity.isSystemEntity}"
                 data-entity-custom="${entity.isCustomEntity}"
                 data-entity-virtual="${entity.isVirtualEntity}"
                 data-entity-publisher-id="${entity.publisher?.id || ''}"
                 data-entity-publisher-name="${entity.publisher?.friendlyName || ''}"
                 data-entity-solution-id="${entity.solution?.id || ''}"
                 data-entity-solution-name="${entity.solution?.friendlyName || ''}"
                 role="option"
                 aria-selected="${isSelected}"
                 tabindex="-1"
                 ${config.showTooltips ? `title="${this.buildTooltip(entity, config)}"` : ''}>
                
                ${this.renderOptionContent(entity, config, state)}
            </div>
        `;
    }

    private static renderOptionContent(entity: EntityMetadata, config: EntitySelectorConfig, state: EntitySelectorViewState): string {
        return `
            <div class="${ENTITY_SELECTOR_CSS.ENTITY_INFO}">
                <div class="entity-primary-info">
                    ${config.showIcon ? this.renderEntityIcon(entity) : ''}
                    <div class="entity-names">
                        <div class="${ENTITY_SELECTOR_CSS.ENTITY_NAME}">${entity.displayName}</div>
                        <div class="${ENTITY_SELECTOR_CSS.ENTITY_LOGICAL_NAME}">${entity.logicalName}</div>
                    </div>
                    ${this.renderEntityBadges(entity, config)}
                </div>
                ${this.renderEntityDetails(entity, config)}
            </div>
        `;
    }

    private static renderEntityIcon(entity: EntityMetadata): string {
        const typeIcon = this.getTypeIcon(entity.entityType);
        const color = entity.color ? `style="color: ${entity.color}"` : '';
        
        return `
            <div class="${ENTITY_SELECTOR_CSS.ENTITY_ICON} entity-icon--${entity.entityType.toLowerCase()}" ${color}>
                ${entity.iconVectorName ? `<span data-icon="${entity.iconVectorName}"></span>` : typeIcon}
            </div>
        `;
    }

    private static renderEntityBadges(entity: EntityMetadata, config: EntitySelectorConfig): string {
        const badges = [];
        
        if (config.showEntityType) {
            badges.push(this.renderTypeBadge(entity.entityType));
        }
        
        if (config.showOwnership && entity.ownershipType !== 'None') {
            badges.push(this.renderOwnershipBadge(entity.ownershipType));
        }
        
        return badges.length > 0 ? `<div class="entity-badges">${badges.join('')}</div>` : '';
    }

    private static renderTypeBadge(entityType: string): string {
        const cssClass = `entity-type-badge ${ENTITY_SELECTOR_CSS.ENTITY_TYPE} ${ENTITY_SELECTOR_CSS[`TYPE_${entityType.toUpperCase()}` as keyof typeof ENTITY_SELECTOR_CSS] || ''}`;
        return `<span class="${cssClass}">${entityType}</span>`;
    }

    private static renderOwnershipBadge(ownershipType: string): string {
        const displayText = ownershipType.replace('Owned', '');
        const cssClass = `entity-ownership-badge ${ENTITY_SELECTOR_CSS.ENTITY_OWNERSHIP} ${ENTITY_SELECTOR_CSS[`OWNERSHIP_${ownershipType.toUpperCase().replace('OWNED', '')}` as keyof typeof ENTITY_SELECTOR_CSS] || ''}`;
        return `<span class="${cssClass}">${displayText}</span>`;
    }

    private static renderEntityDetails(entity: EntityMetadata, config: EntitySelectorConfig): string {
        const details = [];
        
        if (config.showDescription && entity.description) {
            details.push(`<div class="${ENTITY_SELECTOR_CSS.ENTITY_DESCRIPTION}">${entity.description}</div>`);
        }
        
        if (config.showPublisher && entity.publisher) {
            details.push(`<div class="${ENTITY_SELECTOR_CSS.ENTITY_PUBLISHER}">Publisher: ${entity.publisher.friendlyName}</div>`);
        }
        
        if (config.showSolution && entity.solution) {
            const managedText = entity.solution.isManaged ? ' (Managed)' : ' (Unmanaged)';
            details.push(`<div class="${ENTITY_SELECTOR_CSS.ENTITY_SOLUTION}">Solution: ${entity.solution.friendlyName}${managedText}</div>`);
        }
        
        if (config.showAttributeCount && entity.attributeCount !== undefined) {
            details.push(`<div class="entity-attribute-count">Attributes: ${entity.attributeCount}</div>`);
        }
        
        if (config.showRelationshipCount && entity.relationshipCount !== undefined) {
            details.push(`<div class="entity-relationship-count">Relationships: ${entity.relationshipCount}</div>`);
        }
        
        if (config.showPrivilegeCount && entity.privilegeCount !== undefined) {
            details.push(`<div class="entity-privilege-count">Privileges: ${entity.privilegeCount}</div>`);
        }
        
        if (config.showModifiedDate && entity.modifiedOn) {
            const date = new Date(entity.modifiedOn).toLocaleDateString();
            details.push(`<div class="entity-modified-date">Modified: ${date}</div>`);
        }
        
        const stats = this.renderEntityStats(entity, config);
        if (stats) {
            details.push(stats);
        }
        
        return details.length > 0 ? `<div class="entity-details">${details.join('')}</div>` : '';
    }

    private static renderEntityStats(entity: EntityMetadata, config: EntitySelectorConfig): string {
        const stats = [];
        
        // Add capability indicators
        if (entity.isValidForAdvancedFind) stats.push('🔍 Advanced Find');
        if (entity.isQuickCreateEnabled) stats.push('⚡ Quick Create');
        if (entity.isAuditEnabled) stats.push('📋 Auditable');
        if (entity.isBusinessProcessEnabled) stats.push('🔄 BPF');
        if (entity.isDuplicateDetectionEnabled) stats.push('🔍 Duplicate Detection');
        if (entity.isDocumentManagementEnabled) stats.push('📁 Document Management');
        if (entity.isMailMergeEnabled) stats.push('✉️ Mail Merge');
        
        if (stats.length === 0) {
            return '';
        }
        
        return `<div class="${ENTITY_SELECTOR_CSS.ENTITY_STATS}">${stats.join(' • ')}</div>`;
    }

    private static buildTooltip(entity: EntityMetadata, config: EntitySelectorConfig): string {
        const parts = [
            `${entity.displayName} (${entity.logicalName})`,
            `Type: ${entity.entityType}`,
            `Ownership: ${entity.ownershipType}`
        ];
        
        if (entity.description) {
            parts.push(`Description: ${entity.description}`);
        }
        
        if (entity.publisher) {
            parts.push(`Publisher: ${entity.publisher.friendlyName}`);
        }
        
        if (entity.solution) {
            parts.push(`Solution: ${entity.solution.friendlyName} ${entity.solution.isManaged ? '(Managed)' : '(Unmanaged)'}`);
        }
        
        if (entity.attributeCount !== undefined) {
            parts.push(`Attributes: ${entity.attributeCount}`);
        }
        
        return parts.join('\\n');
    }

    private static renderValidationMessage(config: EntitySelectorConfig): string {
        return `
            <div class="validation-message" id="${config.id}-validation" role="alert" aria-live="polite" style="display: none;">
                <!-- Validation messages will be inserted here -->
            </div>
        `;
    }
}