/**
 * EntitySelectorBehavior.js
 * 
 * Webview-side behavior for EntitySelectorComponent
 * Handles DOM interactions, events, and UI state management
 * 
 * This file runs in the webview context and provides:
 * - Dropdown open/close behavior
 * - Search functionality with debouncing
 * - Entity selection and multi-selection
 * - Keyboard navigation
 * - Quick filters
 * - Group expand/collapse
 * - Metadata loading on demand
 */

class EntitySelectorBehavior {
    constructor() {
        this.instances = new Map();
        this.searchTimers = new Map();
        this.SEARCH_DEBOUNCE_DELAY = 300;
        this.init();
    }

    init() {
        // Initialize all entity selectors on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeAllSelectors();
        });

        // Handle dynamic selectors added after page load
        this.observeNewSelectors();
    }

    initializeAllSelectors() {
        const selectors = document.querySelectorAll('.entity-selector');
        selectors.forEach(selector => {
            this.initializeSelector(selector);
        });
    }

    initializeSelector(selectorElement) {
        const componentId = selectorElement.getAttribute('data-component-id');
        if (!componentId || this.instances.has(componentId)) {
            return; // Already initialized or no ID
        }

        const instance = {
            id: componentId,
            element: selectorElement,
            isOpen: false,
            selectedEntities: [],
            searchQuery: '',
            quickFilters: {
                system: false,
                custom: false,
                virtual: false,
                activity: false,
                userOwned: false,
                teamOwned: false,
                validForAdvancedFind: false,
                quickCreateEnabled: false,
                auditEnabled: false
            },
            focusedIndex: -1,
            collapsedGroups: new Set()
        };

        this.instances.set(componentId, instance);
        this.bindEvents(instance);
        this.updateDisplay(instance);
    }

    bindEvents(instance) {
        const { element, id } = instance;
        
        // Dropdown trigger
        const trigger = element.querySelector('.entity-selector-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => this.toggleDropdown(id, e));
            trigger.addEventListener('keydown', (e) => this.handleTriggerKeyDown(id, e));
        }

        // Search input
        const searchInput = element.querySelector('.entity-selector-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(id, e));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeyDown(id, e));
        }

        // Search clear button
        const searchClear = element.querySelector('.entity-selector-search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => this.clearSearch(id));
        }

        // Quick filter buttons
        const filterButtons = element.querySelectorAll('.entity-selector-filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleQuickFilter(id, e));
        });

        // Entity options
        this.bindOptionEvents(instance);

        // Group headers (for collapsing)
        const groupHeaders = element.querySelectorAll('.entity-selector-group-header');
        groupHeaders.forEach(header => {
            header.addEventListener('click', (e) => this.toggleGroup(id, e));
        });

        // Selection tag remove buttons (multi-select)
        const tagRemoveButtons = element.querySelectorAll('.entity-selector-tag-remove');
        tagRemoveButtons.forEach(button => {
            button.addEventListener('click', (e) => this.removeSelection(id, e));
        });

        // Action buttons
        const retryButton = element.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.emitEvent(id, 'retry', {}));
        }

        const clearSearchButton = element.querySelector('.clear-search-button');
        if (clearSearchButton) {
            clearSearchButton.addEventListener('click', () => this.emitEvent(id, 'clear-search', {}));
        }

        // Click outside to close
        document.addEventListener('click', (e) => this.handleOutsideClick(id, e));

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && instance.isOpen) {
                this.closeDropdown(id);
            }
        });
    }

    bindOptionEvents(instance) {
        const { element } = instance;
        const options = element.querySelectorAll('.entity-selector-option');
        
        options.forEach((option, index) => {
            // Click selection
            option.addEventListener('click', (e) => this.handleOptionClick(instance.id, e));
            
            // Keyboard navigation
            option.addEventListener('keydown', (e) => this.handleOptionKeyDown(instance.id, e));
            
            // Mouse hover for focus
            option.addEventListener('mouseenter', () => {
                this.setFocusedOption(instance.id, index);
            });

            // Double click for metadata loading
            option.addEventListener('dblclick', (e) => this.handleOptionDoubleClick(instance.id, e));
        });
    }

    toggleDropdown(componentId, event) {
        event?.stopPropagation();
        const instance = this.instances.get(componentId);
        if (!instance) return;

        if (instance.isOpen) {
            this.closeDropdown(componentId);
        } else {
            this.openDropdown(componentId);
        }
    }

    openDropdown(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Close other dropdowns first
        this.closeAllDropdowns();

        instance.isOpen = true;
        instance.element.classList.add('entity-selector-dropdown--open');
        
        // Focus search input if available
        const searchInput = instance.element.querySelector('.entity-selector-search-input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }

        // Reset focused option
        instance.focusedIndex = -1;
        this.updateFocusedOption(instance);

        // Emit event
        this.emitEvent(componentId, 'dropdownOpened', {});
    }

    closeDropdown(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        instance.isOpen = false;
        instance.element.classList.remove('entity-selector-dropdown--open');
        instance.focusedIndex = -1;
        this.updateFocusedOption(instance);

        // Emit event
        this.emitEvent(componentId, 'dropdownClosed', {});
    }

    closeAllDropdowns() {
        this.instances.forEach((instance, id) => {
            if (instance.isOpen) {
                this.closeDropdown(id);
            }
        });
    }

    handleSearch(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const query = event.target.value;
        instance.searchQuery = query;

        // Clear existing timer
        if (this.searchTimers.has(componentId)) {
            clearTimeout(this.searchTimers.get(componentId));
        }

        // Set new debounced search
        const timer = setTimeout(() => {
            this.performSearch(componentId, query);
            this.searchTimers.delete(componentId);
        }, this.SEARCH_DEBOUNCE_DELAY);

        this.searchTimers.set(componentId, timer);

        // Update clear button visibility
        this.updateSearchClearButton(instance);
    }

    performSearch(componentId, query) {
        // Emit search event to Extension Host
        this.emitEvent(componentId, 'search', { query });
    }

    clearSearch(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const searchInput = instance.element.querySelector('.entity-selector-search-input');
        if (searchInput) {
            searchInput.value = '';
            instance.searchQuery = '';
            this.updateSearchClearButton(instance);
            this.performSearch(componentId, '');
            searchInput.focus();
        }
    }

    updateSearchClearButton(instance) {
        const clearButton = instance.element.querySelector('.entity-selector-search-clear');
        if (clearButton) {
            clearButton.style.display = instance.searchQuery ? 'block' : 'none';
        }
    }

    handleQuickFilter(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const button = event.target.closest('.entity-selector-filter-button');
        const filterType = button.getAttribute('data-filter');
        
        if (!filterType) return;

        // Toggle filter state
        instance.quickFilters[filterType] = !instance.quickFilters[filterType];
        
        // Update button appearance
        button.classList.toggle('entity-selector-filter--active', instance.quickFilters[filterType]);

        // Emit filter change event
        this.emitEvent(componentId, 'quickFilterChanged', {
            filterType,
            active: instance.quickFilters[filterType],
            allFilters: { ...instance.quickFilters }
        });
    }

    handleOptionClick(componentId, event) {
        event.stopPropagation();
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const option = event.target.closest('.entity-selector-option');
        if (!option || option.classList.contains('entity-selector-option--disabled')) {
            return;
        }

        const logicalName = option.getAttribute('data-entity-logical-name');
        if (!logicalName) return;

        const isMultiSelect = instance.element.classList.contains('entity-selector--multi-select');
        
        if (isMultiSelect) {
            this.toggleMultiSelection(componentId, logicalName, option);
        } else {
            this.selectSingle(componentId, logicalName, option);
            this.closeDropdown(componentId);
        }
    }

    handleOptionDoubleClick(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const option = event.target.closest('.entity-selector-option');
        const logicalName = option?.getAttribute('data-entity-logical-name');
        
        if (logicalName) {
            // Request metadata loading
            this.emitEvent(componentId, 'entityMetadataRequested', { logicalName });
        }
    }

    selectSingle(componentId, logicalName, optionElement) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Clear previous selections
        instance.element.querySelectorAll('.entity-selector-option--selected')
            .forEach(el => el.classList.remove('entity-selector-option--selected'));

        // Select new option
        optionElement.classList.add('entity-selector-option--selected');
        
        // Update instance state
        const entityData = this.getEntityDataFromOption(optionElement);
        instance.selectedEntities = [entityData];

        // Update trigger display
        this.updateTriggerDisplay(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedEntities, [entityData], []);
    }

    toggleMultiSelection(componentId, logicalName, optionElement) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const isSelected = optionElement.classList.contains('entity-selector-option--selected');
        const entityData = this.getEntityDataFromOption(optionElement);
        
        let addedEntities = [];
        let removedEntities = [];

        if (isSelected) {
            // Deselect
            optionElement.classList.remove('entity-selector-option--selected');
            instance.selectedEntities = instance.selectedEntities.filter(e => e.logicalName !== logicalName);
            removedEntities = [entityData];
        } else {
            // Select (check max selections limit)
            const maxSelections = parseInt(instance.element.getAttribute('data-max-selections') || '100');
            if (instance.selectedEntities.length >= maxSelections) {
                this.showMaxSelectionsWarning(instance, maxSelections);
                return;
            }

            optionElement.classList.add('entity-selector-option--selected');
            instance.selectedEntities.push(entityData);
            addedEntities = [entityData];
        }

        // Update trigger display
        this.updateTriggerDisplay(instance);
        
        // Update selection tags
        this.updateSelectionTags(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedEntities, addedEntities, removedEntities);
    }

    removeSelection(componentId, event) {
        event.stopPropagation();
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const tagElement = event.target.closest('.entity-selector-selection-tag');
        const logicalName = tagElement?.getAttribute('data-entity-logical-name');
        
        if (!logicalName) return;

        // Remove from selections
        const removedEntity = instance.selectedEntities.find(e => e.logicalName === logicalName);
        instance.selectedEntities = instance.selectedEntities.filter(e => e.logicalName !== logicalName);

        // Update option visual state
        const option = instance.element.querySelector(`[data-entity-logical-name="${logicalName}"]`);
        if (option) {
            option.classList.remove('entity-selector-option--selected');
        }

        // Update displays
        this.updateTriggerDisplay(instance);
        this.updateSelectionTags(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedEntities, [], [removedEntity]);
    }

    getEntityDataFromOption(optionElement) {
        return {
            logicalName: optionElement.getAttribute('data-entity-logical-name'),
            displayName: optionElement.getAttribute('data-entity-display-name'),
            entityType: optionElement.getAttribute('data-entity-type'),
            ownershipType: optionElement.getAttribute('data-entity-ownership'),
            isSystemEntity: optionElement.getAttribute('data-entity-system') === 'true',
            isCustomEntity: optionElement.getAttribute('data-entity-custom') === 'true',
            isVirtualEntity: optionElement.getAttribute('data-entity-virtual') === 'true',
            publisher: {
                id: optionElement.getAttribute('data-entity-publisher-id'),
                friendlyName: optionElement.getAttribute('data-entity-publisher-name')
            },
            solution: {
                id: optionElement.getAttribute('data-entity-solution-id'),
                friendlyName: optionElement.getAttribute('data-entity-solution-name')
            }
        };
    }

    updateTriggerDisplay(instance) {
        const trigger = instance.element.querySelector('.entity-selector-trigger .trigger-text');
        const selectedCount = instance.element.querySelector('.entity-selector-selected-count');
        const triggerButton = instance.element.querySelector('.entity-selector-trigger');
        
        if (!trigger) return;

        if (instance.selectedEntities.length === 0) {
            const placeholder = instance.element.getAttribute('data-placeholder') || 'Select entity...';
            trigger.textContent = placeholder;
            triggerButton?.classList.add('entity-selector-trigger--placeholder');
        } else if (instance.selectedEntities.length === 1) {
            trigger.textContent = instance.selectedEntities[0].displayName;
            triggerButton?.classList.remove('entity-selector-trigger--placeholder');
        } else {
            trigger.textContent = `${instance.selectedEntities.length} entities selected`;
            triggerButton?.classList.remove('entity-selector-trigger--placeholder');
        }

        // Update selected count badge
        if (selectedCount) {
            if (instance.selectedEntities.length > 1) {
                selectedCount.textContent = instance.selectedEntities.length.toString();
                selectedCount.style.display = 'inline';
            } else {
                selectedCount.style.display = 'none';
            }
        }
    }

    updateSelectionTags(instance) {
        const tagsContainer = instance.element.querySelector('.entity-selector-selection-tags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // Add tags for each selection
        instance.selectedEntities.forEach(entity => {
            const tag = document.createElement('div');
            tag.className = 'entity-selector-selection-tag';
            tag.setAttribute('data-entity-logical-name', entity.logicalName);
            
            // Get type icon
            const typeIcon = this.getEntityTypeIcon(entity.entityType);
            
            tag.innerHTML = `
                <span class="entity-icon entity-icon--${entity.entityType?.toLowerCase() || 'system'}">${typeIcon}</span>
                <span class="entity-selector-tag-text">${entity.displayName}</span>
                <button type="button" class="entity-selector-tag-remove" title="Remove">×</button>
            `;

            // Bind remove event
            const removeButton = tag.querySelector('.entity-selector-tag-remove');
            removeButton.addEventListener('click', (e) => this.removeSelection(instance.id, e));

            tagsContainer.appendChild(tag);
        });
    }

    getEntityTypeIcon(entityType) {
        switch (entityType) {
            case 'System': return '🏛️';
            case 'Custom': return '🔧';
            case 'Virtual': return '☁️';
            case 'Activity': return '📅';
            case 'Intersect': return '🔗';
            default: return '📊';
        }
    }

    showMaxSelectionsWarning(instance, maxSelections) {
        // You could implement a toast notification here
        console.warn(`Maximum ${maxSelections} entities can be selected`);
        
        // Or emit an event for the Extension Host to handle
        this.emitEvent(instance.id, 'maxSelectionsReached', { 
            maxSelections,
            currentCount: instance.selectedEntities.length 
        });
    }

    // Keyboard Navigation
    handleTriggerKeyDown(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
            case 'ArrowDown':
                event.preventDefault();
                if (!instance.isOpen) {
                    this.openDropdown(componentId);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!instance.isOpen) {
                    this.openDropdown(componentId);
                }
                break;
        }
    }

    handleSearchKeyDown(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.focusFirstOption(componentId);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.focusLastOption(componentId);
                break;
            case 'Enter':
                event.preventDefault();
                this.selectFocusedOption(componentId);
                break;
        }
    }

    handleOptionKeyDown(componentId, event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.handleOptionClick(componentId, event);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.focusNextOption(componentId);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.focusPreviousOption(componentId);
                break;
        }
    }

    focusFirstOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length > 0) {
            this.setFocusedOption(componentId, 0);
            options[0].focus();
        }
    }

    focusLastOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length > 0) {
            this.setFocusedOption(componentId, options.length - 1);
            options[options.length - 1].focus();
        }
    }

    focusNextOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length === 0) return;

        const nextIndex = Math.min(instance.focusedIndex + 1, options.length - 1);
        this.setFocusedOption(componentId, nextIndex);
        options[nextIndex].focus();
    }

    focusPreviousOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length === 0) return;

        const prevIndex = Math.max(instance.focusedIndex - 1, 0);
        this.setFocusedOption(componentId, prevIndex);
        options[prevIndex].focus();
    }

    setFocusedOption(componentId, index) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        instance.focusedIndex = index;
        this.updateFocusedOption(instance);
    }

    updateFocusedOption(instance) {
        // Remove previous focus
        instance.element.querySelectorAll('.entity-selector-option--focused')
            .forEach(el => el.classList.remove('entity-selector-option--focused'));

        // Add new focus
        const options = this.getVisibleOptions(instance);
        if (instance.focusedIndex >= 0 && instance.focusedIndex < options.length) {
            options[instance.focusedIndex].classList.add('entity-selector-option--focused');
        }
    }

    selectFocusedOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (instance.focusedIndex >= 0 && instance.focusedIndex < options.length) {
            const focusedOption = options[instance.focusedIndex];
            this.handleOptionClick(componentId, { 
                target: focusedOption, 
                stopPropagation: () => {} 
            });
        }
    }

    getVisibleOptions(instance) {
        return Array.from(instance.element.querySelectorAll('.entity-selector-option'))
            .filter(option => option.style.display !== 'none');
    }

    // Group Management
    toggleGroup(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const header = event.target.closest('.entity-selector-group-header');
        const group = header.closest('.entity-selector-group');
        const groupName = header.getAttribute('data-group') || header.textContent.trim();
        
        if (!group) return;

        const isCollapsed = group.classList.toggle('entity-selector-group--collapsed');
        
        // Update collapsed groups tracking
        if (isCollapsed) {
            instance.collapsedGroups.add(groupName);
        } else {
            instance.collapsedGroups.delete(groupName);
        }
        
        // Update header icon/indicator
        const indicator = header.querySelector('.entity-selector-group-indicator');
        if (indicator) {
            indicator.textContent = isCollapsed ? '▶' : '▼';
        }

        // Emit event
        this.emitEvent(componentId, 'groupToggled', {
            groupName,
            collapsed: isCollapsed
        });
    }

    // Outside Click Handler
    handleOutsideClick(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.isOpen) return;

        if (!instance.element.contains(event.target)) {
            this.closeDropdown(componentId);
        }
    }

    // Event Emission
    emitSelectionChange(componentId, selectedEntities, addedEntities, removedEntities) {
        this.emitEvent(componentId, 'selectionChanged', {
            selectedEntities,
            addedEntities,
            removedEntities,
            timestamp: Date.now()
        });
    }

    emitEvent(componentId, eventType, data) {
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'component-event',
                componentId: componentId,
                eventType: eventType,
                data: data
            });
        }
    }

    // Public API for external updates
    updateInstance(componentId, config) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Update instance configuration
        Object.assign(instance, config);
        
        // Update display
        this.updateDisplay(instance);
    }

    updateDisplay(instance) {
        this.updateTriggerDisplay(instance);
        this.updateSelectionTags(instance);
        this.updateSearchClearButton(instance);
    }

    // Observer for dynamically added selectors
    observeNewSelectors() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself is a selector
                        if (node.classList && node.classList.contains('entity-selector')) {
                            this.initializeSelector(node);
                        }
                        
                        // Check for selectors within the added node
                        const selectors = node.querySelectorAll && node.querySelectorAll('.entity-selector');
                        if (selectors) {
                            selectors.forEach(selector => this.initializeSelector(selector));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize the behavior system
const entitySelectorBehavior = new EntitySelectorBehavior();

// Export for potential external access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EntitySelectorBehavior;
}