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

class SolutionSelectorBehavior extends BaseBehavior {
    static instances = new Map();
    static searchTimers = new Map();
    static SEARCH_DEBOUNCE_DELAY = 300;

    /**
     * Get the component type this behavior handles
     */
    static getComponentType() {
        return 'SolutionSelector';
    }

    /**
     * Handle component data updates from Extension Host
     */
    static onComponentUpdate(instance, data) {
        console.log('SolutionSelector: Received componentUpdate with data:', {
            componentId: instance.id,
            hasData: !!data,
            hasSolutions: !!data.solutions,
            solutionsCount: data.solutions?.length || 0,
            hasDefaultSolution: data.solutions?.find(s => s.uniqueName === 'Default'),
            sampleSolutions: data.solutions?.slice(0, 3)?.map(s => s.displayName) || [],
            requiresHtmlUpdate: !!data.requiresHtmlUpdate,
            hasHtml: !!data.html
        });

        // Check if this update requires HTML replacement (for components with dynamic content)
        if (data.requiresHtmlUpdate && data.html) {
            console.log('SolutionSelector: Performing HTML replacement for component');
            if (instance && instance.element) {
                // Replace the entire component HTML
                instance.element.outerHTML = data.html;

                // Re-find the element (since outerHTML replaced it)
                const newElement = document.querySelector(`[data-component-id="${instance.id}"]`);
                if (newElement) {
                    instance.element = newElement;
                    // Re-find DOM elements and re-bind events for the new element
                    this.findDOMElements(instance);
                    this.setupEventListeners(instance);
                    console.log('SolutionSelector: Component HTML updated and events re-bound');
                } else {
                    console.error('SolutionSelector: Could not find component element after HTML update');
                }
            } else {
                console.warn('SolutionSelector: Instance not found for HTML update');
            }
        }
        // Handle standard data-only updates
        else if (data.solutions && data.solutions.length > 0) {
            console.log('SolutionSelector: Calling loadSolutions with', data.solutions.length, 'solutions');
            this.loadSolutions(instance.id, data.solutions);
        } else {
            console.warn('SolutionSelector: No solutions data to load', data);
        }
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        // Handle direct solutions loaded (legacy)
        if (message.action === 'solutionsLoaded' && message.data) {
            console.log('SolutionSelector: Received legacy solutionsLoaded');
            this.loadSolutions(instance.id, message.data);
        } else {
            super.handleCustomAction(instance, message);
        }
    }

    /**
     * Create the instance object structure
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,
            boundHandlers: {},
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
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        instance.trigger = instance.element.querySelector('.solution-selector-trigger');
        instance.searchInput = instance.element.querySelector('.solution-selector-search-input');
        instance.searchClear = instance.element.querySelector('.solution-selector-search-clear');
        instance.dropdown = instance.element.querySelector('.solution-selector-dropdown');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        // Dropdown trigger
        if (instance.trigger) {
            instance.boundHandlers.triggerClick = (e) => this.toggleDropdown(instance.id, e);
            instance.boundHandlers.triggerKeyDown = (e) => this.handleTriggerKeyDown(instance.id, e);
            instance.trigger.addEventListener('click', instance.boundHandlers.triggerClick);
            instance.trigger.addEventListener('keydown', instance.boundHandlers.triggerKeyDown);
        }

        // Search input
        if (instance.searchInput) {
            instance.boundHandlers.searchInput = (e) => this.handleSearch(instance.id, e);
            instance.boundHandlers.searchKeyDown = (e) => this.handleSearchKeyDown(instance.id, e);
            instance.searchInput.addEventListener('input', instance.boundHandlers.searchInput);
            instance.searchInput.addEventListener('keydown', instance.boundHandlers.searchKeyDown);
        }

        // Search clear button
        if (instance.searchClear) {
            instance.boundHandlers.searchClear = () => this.clearSearch(instance.id);
            instance.searchClear.addEventListener('click', instance.boundHandlers.searchClear);
        }

        // Quick filter buttons
        const filterButtons = instance.element.querySelectorAll('.solution-selector-filter-button');
        filterButtons.forEach(button => {
            const handler = (e) => this.handleQuickFilter(instance.id, e);
            button.addEventListener('click', handler);
            if (!instance.boundHandlers.filterButtons) {
                instance.boundHandlers.filterButtons = [];
            }
            instance.boundHandlers.filterButtons.push({ button, handler });
        });

        // Solution options
        this.bindOptionEvents(instance);

        // Group headers (for collapsing)
        const groupHeaders = instance.element.querySelectorAll('.solution-selector-group-header');
        groupHeaders.forEach(header => {
            const handler = (e) => this.toggleGroup(instance.id, e);
            header.addEventListener('click', handler);
            if (!instance.boundHandlers.groupHeaders) {
                instance.boundHandlers.groupHeaders = [];
            }
            instance.boundHandlers.groupHeaders.push({ header, handler });
        });

        // Selection tag remove buttons (multi-select)
        const tagRemoveButtons = instance.element.querySelectorAll('.solution-selector-tag-remove');
        tagRemoveButtons.forEach(button => {
            const handler = (e) => this.removeSelection(instance.id, e);
            button.addEventListener('click', handler);
            if (!instance.boundHandlers.tagRemoveButtons) {
                instance.boundHandlers.tagRemoveButtons = [];
            }
            instance.boundHandlers.tagRemoveButtons.push({ button, handler });
        });

        // Click outside to close
        instance.boundHandlers.outsideClick = (e) => this.handleOutsideClick(instance.id, e);
        document.addEventListener('click', instance.boundHandlers.outsideClick);

        // Escape key to close
        instance.boundHandlers.escapeKey = (e) => {
            if (e.key === 'Escape' && instance.isOpen) {
                this.closeDropdown(instance.id);
            }
        };
        document.addEventListener('keydown', instance.boundHandlers.escapeKey);
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Remove event listeners
        if (instance.trigger) {
            if (instance.boundHandlers.triggerClick) {
                instance.trigger.removeEventListener('click', instance.boundHandlers.triggerClick);
            }
            if (instance.boundHandlers.triggerKeyDown) {
                instance.trigger.removeEventListener('keydown', instance.boundHandlers.triggerKeyDown);
            }
        }

        if (instance.searchInput) {
            if (instance.boundHandlers.searchInput) {
                instance.searchInput.removeEventListener('input', instance.boundHandlers.searchInput);
            }
            if (instance.boundHandlers.searchKeyDown) {
                instance.searchInput.removeEventListener('keydown', instance.boundHandlers.searchKeyDown);
            }
        }

        if (instance.searchClear && instance.boundHandlers.searchClear) {
            instance.searchClear.removeEventListener('click', instance.boundHandlers.searchClear);
        }

        if (instance.boundHandlers.filterButtons) {
            instance.boundHandlers.filterButtons.forEach(({ button, handler }) => {
                button.removeEventListener('click', handler);
            });
        }

        if (instance.boundHandlers.groupHeaders) {
            instance.boundHandlers.groupHeaders.forEach(({ header, handler }) => {
                header.removeEventListener('click', handler);
            });
        }

        if (instance.boundHandlers.tagRemoveButtons) {
            instance.boundHandlers.tagRemoveButtons.forEach(({ button, handler }) => {
                button.removeEventListener('click', handler);
            });
        }

        if (instance.boundHandlers.outsideClick) {
            document.removeEventListener('click', instance.boundHandlers.outsideClick);
        }

        if (instance.boundHandlers.escapeKey) {
            document.removeEventListener('keydown', instance.boundHandlers.escapeKey);
        }

        // Clear any pending search timers
        if (this.searchTimers.has(instance.id)) {
            clearTimeout(this.searchTimers.get(instance.id));
            this.searchTimers.delete(instance.id);
        }
    }

    static bindOptionEvents(instance) {
        const options = instance.element.querySelectorAll('.solution-selector-option');

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

    static toggleDropdown(componentId, event) {
        event?.stopPropagation();
        const instance = this.instances.get(componentId);
        if (!instance) return;

        if (instance.isOpen) {
            this.closeDropdown(componentId);
        } else {
            this.openDropdown(componentId);
        }
    }

    static openDropdown(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Close other dropdowns first
        this.closeAllDropdowns();

        instance.isOpen = true;
        instance.element.classList.add('solution-selector-dropdown--open');

        // Focus search input if available
        if (instance.searchInput) {
            setTimeout(() => instance.searchInput.focus(), 100);
        }

        // Reset focused option
        instance.focusedIndex = -1;
        this.updateFocusedOption(instance);

        // Emit event
        this.emitEvent(componentId, 'dropdownOpened', {});
    }

    static closeDropdown(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        instance.isOpen = false;
        instance.element.classList.remove('solution-selector-dropdown--open');
        instance.focusedIndex = -1;
        this.updateFocusedOption(instance);

        // Emit event
        this.emitEvent(componentId, 'dropdownClosed', {});
    }

    static closeAllDropdowns() {
        this.instances.forEach((instance, id) => {
            if (instance.isOpen) {
                this.closeDropdown(id);
            }
        });
    }

    static handleSearch(componentId, event) {
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

    static performSearch(componentId, query) {
        console.log(`SolutionSelector: Performing search for "${query}"`);

        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Filter options based on search query
        this.filterOptions(instance, query);

        // Emit search event to Extension Host
        this.emitEvent(componentId, 'search', { query });
    }

    static filterOptions(instance, query) {
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

    static updateGroupVisibility(instance) {
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

    static updateNoResultsMessage(instance, visibleCount, query) {
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

    static clearSearch(componentId) {
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

    static updateSearchClearButton(instance) {
        const clearButton = instance.element.querySelector('.solution-selector-search-clear');
        if (clearButton) {
            clearButton.style.display = instance.searchQuery ? 'block' : 'none';
        }
    }

    static handleQuickFilter(componentId, event) {
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

    static handleOptionClick(componentId, event) {
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

    static selectSingle(componentId, solutionId, optionElement) {
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

    static toggleMultiSelection(componentId, solutionId, optionElement) {
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

    static removeSelection(componentId, event) {
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

    static getSolutionDataFromOption(optionElement) {
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

    static updateTriggerDisplay(instance) {
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

    static updateSelectionTags(instance) {
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

    static showMaxSelectionsWarning(instance, maxSelections) {
        // You could implement a toast notification here
        console.warn(`Maximum ${maxSelections} solutions can be selected`);

        // Or emit an event for the Extension Host to handle
        this.emitEvent(instance.id, 'maxSelectionsReached', {
            maxSelections,
            currentCount: instance.selectedSolutions.length
        });
    }

    // Keyboard Navigation
    static handleTriggerKeyDown(componentId, event) {
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

    static handleSearchKeyDown(componentId, event) {
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

    static handleOptionKeyDown(componentId, event) {
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

    static focusFirstOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length > 0) {
            this.setFocusedOption(componentId, 0);
            options[0].focus();
        }
    }

    static focusLastOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length > 0) {
            this.setFocusedOption(componentId, options.length - 1);
            options[options.length - 1].focus();
        }
    }

    static focusNextOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length === 0) return;

        const nextIndex = Math.min(instance.focusedIndex + 1, options.length - 1);
        this.setFocusedOption(componentId, nextIndex);
        options[nextIndex].focus();
    }

    static focusPreviousOption(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const options = this.getVisibleOptions(instance);
        if (options.length === 0) return;

        const prevIndex = Math.max(instance.focusedIndex - 1, 0);
        this.setFocusedOption(componentId, prevIndex);
        options[prevIndex].focus();
    }

    static setFocusedOption(componentId, index) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        instance.focusedIndex = index;
        this.updateFocusedOption(instance);
    }

    static updateFocusedOption(instance) {
        // Remove previous focus
        instance.element.querySelectorAll('.solution-selector-option--focused')
            .forEach(el => el.classList.remove('solution-selector-option--focused'));

        // Add new focus
        const options = this.getVisibleOptions(instance);
        if (instance.focusedIndex >= 0 && instance.focusedIndex < options.length) {
            options[instance.focusedIndex].classList.add('solution-selector-option--focused');
        }
    }

    static selectFocusedOption(componentId) {
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

    static getVisibleOptions(instance) {
        return Array.from(instance.element.querySelectorAll('.solution-selector-option'))
            .filter(option => option.style.display !== 'none');
    }

    // Group Management
    static toggleGroup(componentId, event) {
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
    static handleOutsideClick(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.isOpen) return;

        if (!instance.element.contains(event.target)) {
            this.closeDropdown(componentId);
        }
    }

    // Event Emission
    static emitSelectionChange(componentId, selectedSolutions, addedSolutions, removedSolutions) {
        this.emitEvent(componentId, 'selectionChanged', {
            selectedSolutions,
            addedSolutions,
            removedSolutions,
            timestamp: Date.now()
        });
    }

    static emitEvent(componentId, eventType, data) {
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
    static updateInstance(componentId, config) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Update instance configuration
        Object.assign(instance, config);

        // Update display
        this.updateDisplay(instance);
    }

    static updateDisplay(instance) {
        this.updateTriggerDisplay(instance);
        this.updateSelectionTags(instance);
        this.updateSearchClearButton(instance);
    }

    // Load solutions into a specific selector
    static loadSolutions(componentId, solutions) {
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
}

// Register the behavior with ComponentUtils
SolutionSelectorBehavior.register();
