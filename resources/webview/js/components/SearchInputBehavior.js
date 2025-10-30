/**
 * SearchInputBehavior - Webview behavior for SearchInput component
 * Handles input debouncing, validation, and search event triggering
 *
 * Features:
 * - Configurable debounce delay (default: 300ms)
 * - Minimum character validation
 * - Enter key for immediate search
 * - Clean lifecycle with proper event listener cleanup
 */

class SearchInputBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'SearchInput';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        if (data) {
            // Update query value if provided
            if (data.query !== undefined && instance.searchInput) {
                instance.searchInput.value = data.query;
                instance.currentQuery = data.query;
            }

            // Update disabled state if provided
            if (data.disabled !== undefined && instance.searchInput) {
                instance.searchInput.disabled = data.disabled;
            }
        }
    }

    /**
     * Create the instance object structure
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: {
                debounceMs: config.debounceMs || 300,
                minChars: config.minChars || 0,
                placeholder: config.placeholder || 'Search...',
                disabled: config.disabled || false
            },
            element: element,

            // DOM elements
            searchInput: null,

            // State
            currentQuery: config.initialQuery || '',
            debounceTimeoutId: null,

            // Event handlers
            boundHandlers: {}
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;

        // Find the actual input element (id has '-input' suffix)
        instance.searchInput = element.querySelector(`#${instance.id}-input`);

        if (!instance.searchInput) {
            console.error(`SearchInputBehavior: Input element not found for ${instance.id}`);
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { searchInput, config } = instance;

        if (!searchInput) {
            console.warn(`SearchInputBehavior: Cannot setup listeners - input element missing for ${instance.id}`);
            return;
        }

        // Debounced input handler
        instance.boundHandlers.input = () => {
            // Clear existing timeout
            clearTimeout(instance.debounceTimeoutId);

            // Set new debounced search
            instance.debounceTimeoutId = setTimeout(() => {
                this.handleSearch(instance, searchInput.value);
            }, config.debounceMs);
        };

        // Enter key handler for immediate search (bypasses debounce)
        instance.boundHandlers.keypress = (event) => {
            if (event.key === 'Enter') {
                clearTimeout(instance.debounceTimeoutId);
                this.handleSearch(instance, searchInput.value);
            }
        };

        // Escape key handler to clear search
        instance.boundHandlers.keydown = (event) => {
            if (event.key === 'Escape' && searchInput.value) {
                searchInput.value = '';
                clearTimeout(instance.debounceTimeoutId);
                this.handleSearch(instance, '');
            }
        };

        searchInput.addEventListener('input', instance.boundHandlers.input);
        searchInput.addEventListener('keypress', instance.boundHandlers.keypress);
        searchInput.addEventListener('keydown', instance.boundHandlers.keydown);
    }

    /**
     * Handle search event
     */
    static handleSearch(instance, query) {
        const { config } = instance;
        const trimmedQuery = query.trim();

        // Skip if query hasn't changed
        if (trimmedQuery === instance.currentQuery) {
            return;
        }

        // Minimum character validation
        if (config.minChars > 0 && trimmedQuery.length > 0 && trimmedQuery.length < config.minChars) {
            // Query too short - don't trigger search yet
            return;
        }

        // Update current query
        instance.currentQuery = trimmedQuery;

        // Dispatch custom event for webview-local components (like TreeView)
        const searchEvent = new CustomEvent('component-message', {
            bubbles: true,
            detail: {
                source: 'component',
                command: 'search',
                data: {
                    query: trimmedQuery,
                    componentId: instance.id
                }
            }
        });
        instance.element.dispatchEvent(searchEvent);

        // Also send to Extension Host for server-side handling (like DataTable)
        this.sendMessage(instance, 'search', {
            query: trimmedQuery,
            componentId: instance.id
        });
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'clear':
                if (instance.searchInput) {
                    instance.searchInput.value = '';
                    instance.currentQuery = '';
                    clearTimeout(instance.debounceTimeoutId);
                    this.sendMessage(instance, 'search', {
                        query: '',
                        componentId: instance.id
                    });
                }
                break;

            case 'focus':
                if (instance.searchInput) {
                    instance.searchInput.focus();
                }
                break;

            case 'set-query':
                if (instance.searchInput && message.query !== undefined) {
                    instance.searchInput.value = message.query;
                    instance.currentQuery = message.query;
                }
                break;

            default:
                console.warn(`SearchInputBehavior: Unhandled action '${message.action}'`);
                break;
        }
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Clear any pending debounce timeout
        if (instance.debounceTimeoutId) {
            clearTimeout(instance.debounceTimeoutId);
            instance.debounceTimeoutId = null;
        }

        // Remove event listeners
        if (instance.searchInput) {
            if (instance.boundHandlers.input) {
                instance.searchInput.removeEventListener('input', instance.boundHandlers.input);
            }
            if (instance.boundHandlers.keypress) {
                instance.searchInput.removeEventListener('keypress', instance.boundHandlers.keypress);
            }
            if (instance.boundHandlers.keydown) {
                instance.searchInput.removeEventListener('keydown', instance.boundHandlers.keydown);
            }
        }
    }
}

// Register behavior
SearchInputBehavior.register();
