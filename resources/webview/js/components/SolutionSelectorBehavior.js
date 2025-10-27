/**
 * SolutionSelectorBehavior.js
 * 
 * Webview-side behavior for SolutionSelectorComponent
 * Handles DOM interactions, events, and UI state management
 * 
 * This file runs in the webview context and provides:
 * - Dropdown open/close behavior
 * - Search functionality with debouncing
 * - Solution selection and multi-selection
 * - Keyboard navigation
 * - Quick filters
 * - Group expand/collapse
 */

class SolutionSelectorBehavior {
    constructor() {
        this.instances = new Map();
        this.searchTimers = new Map();
        this.SEARCH_DEBOUNCE_DELAY = 300;
        this.init();
    }

    init() {
        // Initialize all solution selectors on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeAllSelectors();
        });

        // Handle dynamic selectors added after page load
        this.observeNewSelectors();
    }

    initializeAllSelectors() {
        const selectors = document.querySelectorAll('.solution-selector');
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
            selectedSolutions: [],
            searchQuery: '',
            quickFilters: {
                managed: false,
                unmanaged: false,
                hasComponents: false
            },
            focusedIndex: -1
        };

        this.instances.set(componentId, instance);
        this.bindEvents(instance);
        this.updateDisplay(instance);
    }

    bindEvents(instance) {
        const { element, id } = instance;
        
        // Dropdown trigger
        const trigger = element.querySelector('.solution-selector-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => this.toggleDropdown(id, e));
            trigger.addEventListener('keydown', (e) => this.handleTriggerKeyDown(id, e));
        }

        // Search input
        const searchInput = element.querySelector('.solution-selector-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(id, e));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeyDown(id, e));
        }

        // Search clear button
        const searchClear = element.querySelector('.solution-selector-search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => this.clearSearch(id));
        }

        // Quick filter buttons
        const filterButtons = element.querySelectorAll('.solution-selector-filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleQuickFilter(id, e));
        });

        // Solution options
        this.bindOptionEvents(instance);

        // Group headers (for collapsing)
        const groupHeaders = element.querySelectorAll('.solution-selector-group-header');
        groupHeaders.forEach(header => {
            header.addEventListener('click', (e) => this.toggleGroup(id, e));
        });

        // Selection tag remove buttons (multi-select)
        const tagRemoveButtons = element.querySelectorAll('.solution-selector-tag-remove');
        tagRemoveButtons.forEach(button => {
            button.addEventListener('click', (e) => this.removeSelection(id, e));
        });

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
        const options = element.querySelectorAll('.solution-selector-option');
        
        options.forEach((option, index) => {
            // Click selection
            option.addEventListener('click', (e) => this.handleOptionClick(instance.id, e));
            
            // Keyboard navigation
            option.addEventListener('keydown', (e) => this.handleOptionKeyDown(instance.id, e));
            
            // Mouse hover for focus
            option.addEventListener('mouseenter', () => {
                this.setFocusedOption(instance.id, index);
            });
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
        instance.element.classList.add('solution-selector-dropdown--open');
        
        // Focus search input if available
        const searchInput = instance.element.querySelector('.solution-selector-search-input');
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
        instance.element.classList.remove('solution-selector-dropdown--open');
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
        console.log(`SolutionSelector: Performing search for "${query}"`);
        
        const instance = this.instances.get(componentId);
        if (!instance) return;
        
        // Filter options based on search query
        this.filterOptions(instance, query);
        
        // Emit search event to Extension Host
        this.emitEvent(componentId, 'search', { query });
    }
    
    filterOptions(instance, query) {
        const options = instance.element.querySelectorAll('.solution-selector-option');
        const lowerQuery = query.toLowerCase().trim();
        let visibleCount = 0;
        
        options.forEach(option => {
            const displayName = option.getAttribute('data-solution-display-name')?.toLowerCase() || '';
            const uniqueName = option.getAttribute('data-solution-unique-name')?.toLowerCase() || '';
            const friendlyName = option.getAttribute('data-solution-friendly-name')?.toLowerCase() || '';
            const publisherName = option.getAttribute('data-solution-publisher-name')?.toLowerCase() || '';
            
            // Check if any of the solution attributes match the query
            const matches = !lowerQuery || 
                           displayName.includes(lowerQuery) ||
                           uniqueName.includes(lowerQuery) ||
                           friendlyName.includes(lowerQuery) ||
                           publisherName.includes(lowerQuery);
            
            if (matches) {
                option.style.display = 'block';
                visibleCount++;
            } else {
                option.style.display = 'none';
            }
        });
        
        // Update groups visibility based on whether they have visible options
        this.updateGroupVisibility(instance);
        
        // Show/hide no results message
        this.updateNoResultsMessage(instance, visibleCount, query);
        
        console.log(`SolutionSelector: Filtered to ${visibleCount} visible options for query "${query}"`);
    }
    
    updateGroupVisibility(instance) {
        const groups = instance.element.querySelectorAll('.solution-selector-group');
        
        groups.forEach(group => {
            const visibleOptions = group.querySelectorAll('.solution-selector-option[style*="display: block"], .solution-selector-option:not([style*="display: none"])');
            
            if (visibleOptions.length === 0) {
                group.style.display = 'none';
            } else {
                group.style.display = 'block';
            }
        });
    }
    
    updateNoResultsMessage(instance, visibleCount, query) {
        let noResultsMessage = instance.element.querySelector('.solution-selector-no-results');
        
        if (visibleCount === 0 && query.trim()) {
            // Create no results message if it doesn't exist
            if (!noResultsMessage) {
                noResultsMessage = document.createElement('div');
                noResultsMessage.className = 'solution-selector-no-results';
                noResultsMessage.innerHTML = `
                    <div class="solution-selector-no-results-content">
                        <span class="solution-selector-no-results-text">No solutions found matching "${query}"</span>
                    </div>
                `;
                
                // Insert after search container or at beginning of dropdown
                const searchContainer = instance.element.querySelector('.solution-selector-search');
                const dropdown = instance.element.querySelector('.solution-selector-dropdown');
                
                if (searchContainer && dropdown) {
                    searchContainer.insertAdjacentElement('afterend', noResultsMessage);
                } else if (dropdown) {
                    dropdown.insertAdjacentElement('afterbegin', noResultsMessage);
                }
            } else {
                // Update existing message
                const textElement = noResultsMessage.querySelector('.solution-selector-no-results-text');
                if (textElement) {
                    textElement.textContent = `No solutions found matching "${query}"`;
                }
            }
            
            noResultsMessage.style.display = 'block';
        } else if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }
    }

    clearSearch(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const searchInput = instance.element.querySelector('.solution-selector-search-input');
        if (searchInput) {
            searchInput.value = '';
            instance.searchQuery = '';
            this.updateSearchClearButton(instance);
            
            // Reset all options to visible
            const options = instance.element.querySelectorAll('.solution-selector-option');
            options.forEach(option => {
                option.style.display = 'block';
            });
            
            // Reset all groups to visible
            const groups = instance.element.querySelectorAll('.solution-selector-group');
            groups.forEach(group => {
                group.style.display = 'block';
            });
            
            // Hide no results message
            const noResultsMessage = instance.element.querySelector('.solution-selector-no-results');
            if (noResultsMessage) {
                noResultsMessage.style.display = 'none';
            }
            
            // Also emit the search event for consistency
            this.emitEvent(componentId, 'search', { query: '' });
            searchInput.focus();
        }
    }

    updateSearchClearButton(instance) {
        const clearButton = instance.element.querySelector('.solution-selector-search-clear');
        if (clearButton) {
            clearButton.style.display = instance.searchQuery ? 'block' : 'none';
        }
    }

    handleQuickFilter(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const button = event.target.closest('.solution-selector-filter-button');
        const filterType = button.getAttribute('data-filter');
        
        if (!filterType) return;

        // Toggle filter state
        instance.quickFilters[filterType] = !instance.quickFilters[filterType];
        
        // Update button appearance
        button.classList.toggle('solution-selector-filter--active', instance.quickFilters[filterType]);

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

        const option = event.target.closest('.solution-selector-option');
        if (!option || option.classList.contains('solution-selector-option--disabled')) {
            return;
        }

        const solutionId = option.getAttribute('data-solution-id');
        if (!solutionId) return;

        const isMultiSelect = instance.element.classList.contains('solution-selector--multi-select');
        
        if (isMultiSelect) {
            this.toggleMultiSelection(componentId, solutionId, option);
        } else {
            this.selectSingle(componentId, solutionId, option);
            this.closeDropdown(componentId);
        }
    }

    selectSingle(componentId, solutionId, optionElement) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Clear previous selections
        instance.element.querySelectorAll('.solution-selector-option--selected')
            .forEach(el => el.classList.remove('solution-selector-option--selected'));

        // Select new option
        optionElement.classList.add('solution-selector-option--selected');
        
        // Update instance state
        const solutionData = this.getSolutionDataFromOption(optionElement);
        instance.selectedSolutions = [solutionData];

        // Update trigger display
        this.updateTriggerDisplay(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedSolutions, [solutionData], []);
    }

    toggleMultiSelection(componentId, solutionId, optionElement) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const isSelected = optionElement.classList.contains('solution-selector-option--selected');
        const solutionData = this.getSolutionDataFromOption(optionElement);
        
        let addedSolutions = [];
        let removedSolutions = [];

        if (isSelected) {
            // Deselect
            optionElement.classList.remove('solution-selector-option--selected');
            instance.selectedSolutions = instance.selectedSolutions.filter(s => s.id !== solutionId);
            removedSolutions = [solutionData];
        } else {
            // Select (check max selections limit)
            const maxSelections = parseInt(instance.element.getAttribute('data-max-selections') || '50');
            if (instance.selectedSolutions.length >= maxSelections) {
                this.showMaxSelectionsWarning(instance, maxSelections);
                return;
            }

            optionElement.classList.add('solution-selector-option--selected');
            instance.selectedSolutions.push(solutionData);
            addedSolutions = [solutionData];
        }

        // Update trigger display
        this.updateTriggerDisplay(instance);
        
        // Update selection tags
        this.updateSelectionTags(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedSolutions, addedSolutions, removedSolutions);
    }

    removeSelection(componentId, event) {
        event.stopPropagation();
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const tagElement = event.target.closest('.solution-selector-selection-tag');
        const solutionId = tagElement?.getAttribute('data-solution-id');
        
        if (!solutionId) return;

        // Remove from selections
        const removedSolution = instance.selectedSolutions.find(s => s.id === solutionId);
        instance.selectedSolutions = instance.selectedSolutions.filter(s => s.id !== solutionId);

        // Update option visual state
        const option = instance.element.querySelector(`[data-solution-id="${solutionId}"]`);
        if (option) {
            option.classList.remove('solution-selector-option--selected');
        }

        // Update displays
        this.updateTriggerDisplay(instance);
        this.updateSelectionTags(instance);

        // Emit selection event
        this.emitSelectionChange(componentId, instance.selectedSolutions, [], [removedSolution]);
    }

    getSolutionDataFromOption(optionElement) {
        return {
            id: optionElement.getAttribute('data-solution-id'),
            uniqueName: optionElement.getAttribute('data-solution-unique-name'),
            displayName: optionElement.getAttribute('data-solution-display-name'),
            friendlyName: optionElement.getAttribute('data-solution-friendly-name'),
            version: optionElement.getAttribute('data-solution-version'),
            isManaged: optionElement.getAttribute('data-solution-managed') === 'true',
            publisherId: optionElement.getAttribute('data-solution-publisher-id'),
            publisherName: optionElement.getAttribute('data-solution-publisher-name')
        };
    }

    updateTriggerDisplay(instance) {
        const trigger = instance.element.querySelector('.solution-selector-trigger');
        const selectedCount = instance.element.querySelector('.solution-selector-selected-count');
        
        if (!trigger) return;

        if (instance.selectedSolutions.length === 0) {
            const placeholder = instance.element.getAttribute('data-placeholder') || 'Select solution...';
            trigger.textContent = placeholder;
            trigger.classList.add('solution-selector-trigger--placeholder');
        } else if (instance.selectedSolutions.length === 1) {
            trigger.textContent = instance.selectedSolutions[0].displayName;
            trigger.classList.remove('solution-selector-trigger--placeholder');
        } else {
            trigger.textContent = `${instance.selectedSolutions.length} solutions selected`;
            trigger.classList.remove('solution-selector-trigger--placeholder');
        }

        // Update selected count badge
        if (selectedCount) {
            if (instance.selectedSolutions.length > 1) {
                selectedCount.textContent = instance.selectedSolutions.length.toString();
                selectedCount.style.display = 'inline';
            } else {
                selectedCount.style.display = 'none';
            }
        }
    }

    updateSelectionTags(instance) {
        const tagsContainer = instance.element.querySelector('.solution-selector-selection-tags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // Add tags for each selection
        instance.selectedSolutions.forEach(solution => {
            const tag = document.createElement('div');
            tag.className = 'solution-selector-selection-tag';
            tag.setAttribute('data-solution-id', solution.id);
            
            tag.innerHTML = `
                <span class="solution-selector-tag-text">${solution.displayName}</span>
                <button type="button" class="solution-selector-tag-remove" title="Remove">×</button>
            `;

            // Bind remove event
            const removeButton = tag.querySelector('.solution-selector-tag-remove');
            removeButton.addEventListener('click', (e) => this.removeSelection(instance.id, e));

            tagsContainer.appendChild(tag);
        });
    }

    showMaxSelectionsWarning(instance, maxSelections) {
        // You could implement a toast notification here
        console.warn(`Maximum ${maxSelections} solutions can be selected`);
        
        // Or emit an event for the Extension Host to handle
        this.emitEvent(instance.id, 'maxSelectionsReached', { 
            maxSelections,
            currentCount: instance.selectedSolutions.length 
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
        instance.element.querySelectorAll('.solution-selector-option--focused')
            .forEach(el => el.classList.remove('solution-selector-option--focused'));

        // Add new focus
        const options = this.getVisibleOptions(instance);
        if (instance.focusedIndex >= 0 && instance.focusedIndex < options.length) {
            options[instance.focusedIndex].classList.add('solution-selector-option--focused');
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
        return Array.from(instance.element.querySelectorAll('.solution-selector-option'))
            .filter(option => option.style.display !== 'none');
    }

    // Group Management
    toggleGroup(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const header = event.target.closest('.solution-selector-group-header');
        const group = header.closest('.solution-selector-group');
        const optionsContainer = group.querySelector('.solution-selector-group-options');
        
        if (!optionsContainer) return;

        const isCollapsed = group.classList.toggle('solution-selector-group--collapsed');
        
        // Update header icon/indicator
        const indicator = header.querySelector('.solution-selector-group-indicator');
        if (indicator) {
            indicator.textContent = isCollapsed ? '▶' : '▼';
        }

        // Emit event
        this.emitEvent(componentId, 'groupToggled', {
            groupName: header.textContent.trim(),
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
    emitSelectionChange(componentId, selectedSolutions, addedSolutions, removedSolutions) {
        this.emitEvent(componentId, 'selectionChanged', {
            selectedSolutions,
            addedSolutions,
            removedSolutions,
            timestamp: Date.now()
        });
    }

    emitEvent(componentId, eventType, data) {
        if (typeof ComponentUtils !== 'undefined' && ComponentUtils.sendMessage) {
            ComponentUtils.sendMessage('component-event', {
                componentId: componentId,
                eventType: eventType,
                data: data
            });
        } else if (typeof vscode !== 'undefined') {
            // Fallback to direct vscode.postMessage if ComponentUtils not available
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

    // Load solutions into a specific selector
    loadSolutions(componentId, solutions) {
        console.log(`SolutionSelector: Loading ${solutions?.length || 0} solutions for ${componentId}`);
        const instance = this.instances.get(componentId);
        if (!instance) {
            console.warn(`SolutionSelector: Cannot load solutions for ${componentId} - instance not found`);
            return;
        }
        
        // Update instance with new solutions
        instance.solutions = solutions || [];
        this.updateDisplay(instance);
        
        console.log(`SolutionSelector: Solutions loaded for ${componentId}`);
    }

    // Observer for dynamically added selectors
    observeNewSelectors() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself is a selector
                        if (node.classList && node.classList.contains('solution-selector')) {
                            this.initializeSelector(node);
                        }
                        
                        // Check for selectors within the added node
                        const selectors = node.querySelectorAll && node.querySelectorAll('.solution-selector');
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
const solutionSelectorBehavior = new SolutionSelectorBehavior();

// Export for potential external access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolutionSelectorBehavior;
}

// Make available globally and register with ComponentUtils
if (typeof window !== 'undefined') {
    window.SolutionSelectorBehavior = SolutionSelectorBehavior;
    
    // Add static initialize method for ComponentUtils compatibility
    SolutionSelectorBehavior.initialize = function(componentId, config, element) {
        if (!componentId || !element) {
            console.error('SolutionSelectorBehavior: componentId and element are required');
            return null;
        }
        
        // Use existing instance behavior to initialize
        solutionSelectorBehavior.initializeSelector(element);
        
        // Return instance info for ComponentUtils compatibility
        const instance = solutionSelectorBehavior.instances.get(componentId);
        return instance || {
            id: componentId,
            config: { ...config },
            element: element
        };
    };
    
    // Add static handleMessage method for ComponentUtils compatibility
    SolutionSelectorBehavior.handleMessage = function(message) {
        
        if (!message || !message.componentId) {
            console.warn('SolutionSelector handleMessage: Invalid message format', message);
            return;
        }
        
        // Handle component updates from event bridge
        if (message.action === 'componentUpdate' && message.data) {
            console.log('SolutionSelector: Received componentUpdate with data:', {
                componentId: message.componentId,
                hasData: !!message.data,
                hasSolutions: !!message.data.solutions,
                solutionsCount: message.data.solutions?.length || 0,
                hasDefaultSolution: message.data.solutions?.find(s => s.uniqueName === 'Default'),
                sampleSolutions: message.data.solutions?.slice(0, 3)?.map(s => s.displayName) || [],
                requiresHtmlUpdate: !!message.data.requiresHtmlUpdate,
                hasHtml: !!message.data.html
            });
            
            // Check if this update requires HTML replacement (for components with dynamic content)
            if (message.data.requiresHtmlUpdate && message.data.html) {
                console.log('SolutionSelector: Performing HTML replacement for component');
                const instance = solutionSelectorBehavior.instances.get(message.componentId);
                if (instance && instance.element) {
                    // Replace the entire component HTML
                    instance.element.outerHTML = message.data.html;
                    
                    // Re-find the element (since outerHTML replaced it)
                    const newElement = document.querySelector(`[data-component-id="${message.componentId}"]`);
                    if (newElement) {
                        instance.element = newElement;
                        // Re-bind events for the new element
                        solutionSelectorBehavior.bindEvents(instance);
                        console.log('SolutionSelector: Component HTML updated and events re-bound');
                    } else {
                        console.error('SolutionSelector: Could not find component element after HTML update');
                    }
                } else {
                    console.warn('SolutionSelector: Instance not found for HTML update');
                }
            } 
            // Handle standard data-only updates
            else if (message.data.solutions && message.data.solutions.length > 0) {
                console.log('SolutionSelector: Calling loadSolutions with', message.data.solutions.length, 'solutions');
                solutionSelectorBehavior.loadSolutions(message.componentId, message.data.solutions);
            } else {
                console.warn('SolutionSelector: No solutions data to load', message.data);
            }
        }
        
        // Handle direct solutions loaded (legacy)
        if (message.action === 'solutionsLoaded' && message.data) {
            console.log('SolutionSelector: Received legacy solutionsLoaded');
            solutionSelectorBehavior.loadSolutions(message.componentId, message.data);
        }
    };
    
    // Register with ComponentUtils if available
    if (window.ComponentUtils && window.ComponentUtils.registerBehavior) {
        window.ComponentUtils.registerBehavior('SolutionSelector', SolutionSelectorBehavior);
        console.log('SolutionSelectorBehavior registered with ComponentUtils');
    } else {
        console.log('SolutionSelectorBehavior loaded, ComponentUtils not available yet');
    }
}