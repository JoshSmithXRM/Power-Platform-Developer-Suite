/**
 * EnvironmentSelectorBehavior - Webview behavior for EnvironmentSelector component
 * Handles all user interactions and DOM manipulation in the browser context
 */

class EnvironmentSelectorBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'EnvironmentSelector';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        console.log(`[EnvironmentSelector] onComponentUpdate called`, {
            hasEnvironments: !!(data && data.environments),
            hasSelectedEnvironmentId: !!(data && data.selectedEnvironmentId),
            selectedEnvironmentId: data?.selectedEnvironmentId,
            environmentCount: data?.environments?.length
        });

        if (data && data.environments) {
            this.loadEnvironments(instance.id, data.environments);
        }
        if (data && data.selectedEnvironmentId) {
            console.log(`[EnvironmentSelector] Calling setSelectedEnvironment with: ${data.selectedEnvironmentId}`);
            this.setSelectedEnvironment(instance.id, data.selectedEnvironmentId);
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

            // DOM elements
            selector: null,
            statusElement: null,
            refreshButton: null,
            loadingContainer: null,
            errorContainer: null,

            // State
            environments: [],
            selectedEnvironmentId: null,
            loading: false,
            connectionStatus: 'disconnected',

            // Event handlers
            boundHandlers: {}
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element, id } = instance;

        instance.selector = element.querySelector(`#${id}_select`) ||
                           element.querySelector('[data-component-element="selector"]');

        instance.statusElement = element.querySelector('[data-component-element="status"]');

        instance.refreshButton = element.querySelector(`#${id}_refresh`) ||
                                element.querySelector('[data-component-element="refresh"]');

        instance.loadingContainer = element.querySelector('[data-component-element="loading"]');

        instance.errorContainer = element.querySelector('[data-component-element="error"]');

        if (!instance.selector) {
            throw new Error('Selector element not found');
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { selector, refreshButton } = instance;

        // Selector change event
        if (selector) {
            instance.boundHandlers.selectorChange = (e) => this.handleSelectorChange(instance, e);
            selector.addEventListener('change', instance.boundHandlers.selectorChange);

            // Focus/blur events for auto-refresh
            if (instance.config.autoRefreshOnFocus) {
                instance.boundHandlers.selectorFocus = (e) => this.handleSelectorFocus(instance, e);
                selector.addEventListener('focus', instance.boundHandlers.selectorFocus);
            }
        }

        // Refresh button click
        if (refreshButton) {
            instance.boundHandlers.refreshClick = (e) => this.handleRefreshClick(instance, e);
            refreshButton.addEventListener('click', instance.boundHandlers.refreshClick);
        }

        // Keyboard shortcuts
        instance.boundHandlers.keyDown = (e) => this.handleKeyDown(instance, e);
        instance.element.addEventListener('keydown', instance.boundHandlers.keyDown);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        const { selector, config } = instance;

        if (selector) {
            // Get initial selected value
            instance.selectedEnvironmentId = selector.value || null;

            // Parse environments from options
            instance.environments = this.parseEnvironmentsFromOptions(selector);

            // Set initial connection status
            instance.connectionStatus = instance.selectedEnvironmentId ? 'connected' : 'disconnected';

            // Update status display
            this.updateStatusDisplay(instance);
        }
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        const { action, data } = message;

        switch (action) {
            case 'environments-loaded':
                if (data && data.environments) {
                    this.loadEnvironments(message.componentId, data.environments);
                }
                if (data && data.selectedEnvironmentId) {
                    this.setSelectedEnvironment(message.componentId, data.selectedEnvironmentId);
                }
                break;

            case 'component-state-change':
                // Handle state change messages from Extension Host
                if (data && typeof data === 'object') {
                    // Update internal state without triggering events
                    Object.assign(instance, data);
                    this.updateStatusDisplay(instance);
                }
                break;

            case 'environment-selected':
                if (data && data.environmentId) {
                    this.setSelectedEnvironment(message.componentId, data.environmentId);
                }
                break;

            case 'loading-state-changed':
                this.setLoading(message.componentId, data.loading, data.message);
                break;

            case 'error-occurred':
                this.showError(message.componentId, data.error, data.context);
                break;

            case 'clear-error':
                this.clearError(instance);
                break;

            default:
                console.warn(`EnvironmentSelectorBehavior: Unknown message action: ${action}`);
        }
    }

    /**
     * Handle selector change events
     */
    static handleSelectorChange(instance, event) {
        const newEnvironmentId = event.target.value;
        const oldEnvironmentId = instance.selectedEnvironmentId;

        // Update instance state
        instance.selectedEnvironmentId = newEnvironmentId || null;
        instance.connectionStatus = newEnvironmentId ? 'connected' : 'disconnected';

        // Update visual status
        this.updateStatusDisplay(instance);

        // Clear any existing errors
        this.clearError(instance);

        // Find the selected environment object
        const selectedEnvironment = instance.environments.find(env => env.id === newEnvironmentId) || null;

        // Send message to Extension Host
        ComponentUtils.sendMessage('environment-changed', {
            componentId: instance.id,
            environmentId: newEnvironmentId || '',
            environment: selectedEnvironment,
            previousEnvironmentId: oldEnvironmentId
        });

        // Update component state in ComponentUtils
        ComponentUtils.updateComponentState(instance.id, {
            selectedEnvironmentId: instance.selectedEnvironmentId,
            connectionStatus: instance.connectionStatus
        });

        // Trigger validation if component is required
        if (instance.config.required) {
            this.validateSelection(instance);
        }
    }

    /**
     * Handle refresh button clicks
     */
    static handleRefreshClick(instance, event) {
        event.preventDefault();

        // Set loading state
        this.setLoading(instance, true, 'Refreshing environments...');

        // Send refresh message to Extension Host
        ComponentUtils.sendMessage('refresh-environments', {
            componentId: instance.id,
            reason: 'user'
        });
    }

    /**
     * Handle selector focus for auto-refresh
     */
    static handleSelectorFocus(instance, event) {
        if (instance.config.autoRefreshOnFocus && !instance.loading) {
            // Send refresh message to Extension Host
            ComponentUtils.sendMessage('refresh-environments', {
                componentId: instance.id,
                reason: 'focus'
            });
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    static handleKeyDown(instance, event) {
        // F5 or Ctrl+R - Refresh
        if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
            event.preventDefault();
            if (instance.refreshButton && !instance.refreshButton.disabled) {
                this.handleRefreshClick(instance, event);
            }
        }

        // Escape - Clear selection
        if (event.key === 'Escape') {
            if (instance.selector && instance.selectedEnvironmentId) {
                instance.selector.value = '';
                this.handleSelectorChange(instance, { target: instance.selector });
            }
        }
    }

    /**
     * Load environments into the selector
     */
    static loadEnvironments(componentId, environments) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.selector) {
            console.warn(`EnvironmentSelectorBehavior: Cannot load environments for ${componentId}`);
            return;
        }

        // Store environments in instance
        instance.environments = environments || [];

        // CRITICAL: Preserve current selection before rebuilding dropdown
        const currentValue = instance.selector.value || instance.selectedEnvironmentId;
        console.log(`[EnvironmentSelector] loadEnvironments - preserving selection: ${currentValue}`);

        // Clear existing options except placeholder
        const placeholder = instance.selector.options[0];
        instance.selector.innerHTML = '';
        if (placeholder) {
            instance.selector.appendChild(placeholder);
        }

        // Add environment options
        environments.forEach(env => {
            const option = document.createElement('option');
            option.value = env.id;
            option.textContent = env.displayName || env.name;
            option.title = env.settings?.dataverseUrl || '';
            instance.selector.appendChild(option);
        });

        // Restore previous selection if it still exists in the new list
        if (currentValue && environments.some(env => env.id === currentValue)) {
            console.log(`[EnvironmentSelector] Restoring previous selection: ${currentValue}`);
            instance.selector.value = currentValue;
            instance.selectedEnvironmentId = currentValue;
        }
        // Otherwise, auto-select first environment if configured
        else if (instance.config.autoSelectFirst && environments.length > 0 && !instance.selectedEnvironmentId) {
            console.log(`[EnvironmentSelector] Auto-selecting first environment`);
            instance.selector.value = environments[0].id;
            this.handleSelectorChange(instance, { target: instance.selector });
        }

        // Clear loading state
        this.setLoading(instance, false);
    }

    /**
     * Set selected environment
     */
    static setSelectedEnvironment(componentId, environmentId) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.selector) {
            console.warn(`EnvironmentSelectorBehavior: Cannot set selection for ${componentId}`);
            return;
        }

        // Update selector value
        instance.selector.value = environmentId || '';

        // Update instance state
        instance.selectedEnvironmentId = environmentId || null;
        instance.connectionStatus = environmentId ? 'connected' : 'disconnected';

        // Update status display
        this.updateStatusDisplay(instance);

        // Update component state
        ComponentUtils.updateComponentState(componentId, {
            selectedEnvironmentId: instance.selectedEnvironmentId,
            connectionStatus: instance.connectionStatus
        });
    }

    /**
     * Set loading state
     */
    static setLoading(componentId, loading, message = 'Loading...') {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return;
        }

        instance.loading = loading;

        // Update element class
        if (loading) {
            instance.element.classList.add('component-loading');
        } else {
            instance.element.classList.remove('component-loading');
        }

        // Update loading container
        if (instance.loadingContainer) {
            instance.loadingContainer.textContent = message;
            instance.loadingContainer.style.display = loading ? 'block' : 'none';
        }

        // Disable/enable controls
        if (instance.selector) {
            instance.selector.disabled = loading;
        }
        if (instance.refreshButton) {
            instance.refreshButton.disabled = loading;
            instance.refreshButton.innerHTML = loading ? '⏳' : '🔄';
        }

        // Update status if loading
        if (loading && instance.statusElement) {
            instance.statusElement.innerHTML = '⏳ Loading...';
            instance.statusElement.className = 'component-status component-loading';
        } else if (!loading) {
            this.updateStatusDisplay(instance);
        }
    }

    /**
     * Show error state
     */
    static showError(componentId, error, context = '') {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return;
        }

        console.error(`EnvironmentSelectorBehavior: Error for ${componentId}:`, error);

        // Update element class
        instance.element.classList.add('component-error');

        // Show error container
        if (instance.errorContainer) {
            const errorMessage = instance.errorContainer.querySelector('[data-component-element="error-message"]');
            if (errorMessage) {
                errorMessage.textContent = error;
            } else {
                instance.errorContainer.textContent = `❌ ${error}`;
            }
            instance.errorContainer.style.display = 'block';
        }

        // Update status to error
        instance.connectionStatus = 'error';
        this.updateStatusDisplay(instance);

        // Clear loading state
        this.setLoading(componentId, false);
    }

    /**
     * Clear error state
     */
    static clearError(instance) {
        if (!instance) {
            return;
        }

        // Remove error class
        instance.element.classList.remove('component-error');

        // Hide error container
        if (instance.errorContainer) {
            instance.errorContainer.style.display = 'none';
        }
    }

    /**
     * Update status display
     */
    static updateStatusDisplay(instance) {
        if (!instance.statusElement) {
            return;
        }

        const { connectionStatus } = instance;

        // Update status text and icon
        let statusText = connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1);
        let statusIcon = '🔴';

        switch (connectionStatus) {
            case 'connected':
                statusIcon = '🟢';
                break;
            case 'disconnected':
                statusIcon = '🔴';
                break;
            case 'error':
                statusIcon = '❌';
                statusText = 'Error';
                break;
        }

        instance.statusElement.innerHTML = `${statusIcon} ${statusText}`;

        // Update status classes
        instance.statusElement.className = `component-status environment-status environment-${connectionStatus}`;
    }

    /**
     * Validate current selection
     */
    static validateSelection(instance) {
        if (!instance) {
            return { isValid: true };
        }

        const isValid = !instance.config.required || !!instance.selectedEnvironmentId;
        const error = !isValid ? 'Environment selection is required' : null;

        if (error) {
            this.showError(instance.id, error, 'validation');
        } else {
            this.clearError(instance);
        }

        return { isValid, error };
    }

    /**
     * Parse environments from existing option elements
     */
    static parseEnvironmentsFromOptions(selector) {
        const environments = [];

        Array.from(selector.options).forEach(option => {
            if (option.value) {
                environments.push({
                    id: option.value,
                    name: option.textContent,
                    displayName: option.textContent,
                    settings: {
                        dataverseUrl: option.title || ''
                    }
                });
            }
        });

        return environments;
    }

    /**
     * Get instance state
     */
    static getState(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return null;
        }

        return {
            selectedEnvironmentId: instance.selectedEnvironmentId,
            environmentCount: instance.environments.length,
            connectionStatus: instance.connectionStatus,
            loading: instance.loading,
            isValid: this.validateSelection(instance).isValid
        };
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Remove event listeners
        Object.entries(instance.boundHandlers).forEach(([event, handler]) => {
            const element = event === 'selectorChange' || event === 'selectorFocus' ? instance.selector :
                           event === 'refreshClick' ? instance.refreshButton :
                           instance.element;

            if (element && handler) {
                element.removeEventListener(event.replace(/[A-Z]/g, m => m.toLowerCase()), handler);
            }
        });
    }

    /**
     * Get debug information
     */
    static getDebugInfo(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return null;
        }

        return {
            id: instance.id,
            config: instance.config,
            state: this.getState(componentId),
            hasSelector: !!instance.selector,
            hasStatus: !!instance.statusElement,
            hasRefresh: !!instance.refreshButton,
            eventListeners: Object.keys(instance.boundHandlers)
        };
    }
}

// Register behavior
EnvironmentSelectorBehavior.register();
