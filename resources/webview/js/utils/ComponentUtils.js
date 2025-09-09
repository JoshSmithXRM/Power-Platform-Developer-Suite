/**
 * ComponentUtils - Base utilities for component management in webview context
 * This runs in the webview (browser) context and provides common functionality
 * for all components including initialization, messaging, and lifecycle management.
 */

class ComponentUtils {
    static components = new Map();
    static messageHandlers = new Map();
    static isInitialized = false;
    static vscode = null;

    /**
     * Initialize the component system
     * Call this after DOM is ready
     */
    static initialize() {
        if (this.isInitialized) {
            console.warn('ComponentUtils already initialized');
            return;
        }

        // Get VS Code API
        if (typeof acquireVsCodeApi !== 'undefined') {
            this.vscode = acquireVsCodeApi();
        } else {
            console.error('VS Code API not available');
            return;
        }

        // Setup global message handler
        window.addEventListener('message', this.handleMessage.bind(this));

        // Setup global error handler
        window.addEventListener('error', this.handleGlobalError.bind(this));

        // Mark as initialized
        this.isInitialized = true;
        console.log('ComponentUtils initialized');

        // Auto-initialize all components found in DOM
        this.initializeAllComponents();
    }

    /**
     * Register a component instance
     */
    static registerComponent(componentId, componentType, config, element) {
        if (!componentId || !componentType) {
            console.error('Component ID and type are required');
            return null;
        }

        if (this.components.has(componentId)) {
            console.warn(`Component ${componentId} already registered`);
            return this.components.get(componentId);
        }

        const component = {
            id: componentId,
            type: componentType,
            config: { ...config },
            element: element,
            initialized: false,
            lastUpdate: Date.now(),
            eventListeners: new Map(),
            state: {}
        };

        this.components.set(componentId, component);
        console.log(`Registered component: ${componentId} (${componentType})`);
        
        return component;
    }

    /**
     * Get a registered component by ID
     */
    static getComponent(componentId) {
        return this.components.get(componentId);
    }

    /**
     * Get all components of a specific type
     */
    static getComponentsByType(componentType) {
        const components = [];
        for (const [id, component] of this.components) {
            if (component.type === componentType) {
                components.push(component);
            }
        }
        return components;
    }

    /**
     * Unregister a component
     */
    static unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (!component) {
            return false;
        }

        // Remove all event listeners
        if (component.eventListeners) {
            for (const [event, listener] of component.eventListeners) {
                component.element?.removeEventListener(event, listener);
            }
        }

        // Remove from registry
        this.components.delete(componentId);
        console.log(`Unregistered component: ${componentId}`);
        
        return true;
    }

    /**
     * Initialize all components found in the DOM
     */
    static initializeAllComponents() {
        // Look for elements with data-component-id attribute
        const componentElements = document.querySelectorAll('[data-component-id]');
        
        componentElements.forEach(element => {
            const componentId = element.getAttribute('data-component-id');
            const componentType = element.getAttribute('data-component-type');
            
            if (componentId && componentType) {
                this.initializeComponent(componentId, componentType, element);
            }
        });

        console.log(`Initialized ${componentElements.length} components`);
    }

    /**
     * Initialize a specific component
     */
    static initializeComponent(componentId, componentType, element) {
        try {
            // Get component-specific initializer
            const initializerName = `${componentType}Behavior`;
            if (window[initializerName] && typeof window[initializerName].initialize === 'function') {
                // Parse config from data attributes
                const config = this.parseConfigFromElement(element);
                
                // Initialize the component behavior
                const result = window[initializerName].initialize(componentId, config, element);
                
                if (result) {
                    // Register the component
                    const component = this.registerComponent(componentId, componentType, config, element);
                    if (component) {
                        component.initialized = true;
                        component.behaviorInstance = result;
                        
                        // Emit initialized event
                        this.emitComponentEvent(componentId, 'initialized');
                    }
                }
            } else {
                console.warn(`No behavior initializer found for ${componentType} (${initializerName})`);
            }
        } catch (error) {
            console.error(`Failed to initialize component ${componentId}:`, error);
            this.emitComponentEvent(componentId, 'error', { error: error.message });
        }
    }

    /**
     * Parse component configuration from element data attributes
     */
    static parseConfigFromElement(element) {
        const config = {};
        
        // Get all data attributes
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-config-')) {
                const key = attr.name.replace('data-config-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                let value = attr.value;
                
                // Try to parse as JSON first, fallback to string
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string
                }
                
                config[key] = value;
            }
        }
        
        return config;
    }

    /**
     * Send message to Extension Host
     */
    static sendMessage(action, data = {}) {
        if (!this.vscode) {
            console.error('VS Code API not available');
            return;
        }

        const message = {
            action,
            data,
            timestamp: Date.now()
        };

        console.log('Sending message to Extension Host:', message);
        this.vscode.postMessage(message);
    }

    /**
     * Setup message handler for specific actions
     */
    static setupMessageHandler(handlers) {
        if (typeof handlers !== 'object') {
            console.error('Message handlers must be an object');
            return;
        }

        for (const [action, handler] of Object.entries(handlers)) {
            if (typeof handler === 'function') {
                this.messageHandlers.set(action, handler);
            }
        }

        console.log(`Registered ${Object.keys(handlers).length} message handlers`);
    }

    /**
     * Handle incoming messages from Extension Host
     */
    static handleMessage(event) {
        try {
            const message = event.data;
            
            if (!message || !message.action) {
                return;
            }

            console.log('Received message from Extension Host:', message);

            // Try component-specific handler first
            if (message.componentId) {
                const component = this.getComponent(message.componentId);
                if (component && component.behaviorInstance && component.behaviorInstance.handleMessage) {
                    component.behaviorInstance.handleMessage(message);
                    return;
                }
            }

            // Try global handler
            const handler = this.messageHandlers.get(message.action);
            if (handler) {
                handler(message);
            } else {
                console.warn(`No handler found for action: ${message.action}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Emit a component event
     */
    static emitComponentEvent(componentId, eventType, data = {}) {
        const event = new CustomEvent('componentEvent', {
            detail: {
                componentId,
                eventType,
                data,
                timestamp: Date.now()
            }
        });

        document.dispatchEvent(event);

        // Also send to Extension Host
        this.sendMessage('componentEvent', {
            componentId,
            eventType,
            data
        });
    }

    /**
     * Update component state
     */
    static updateComponentState(componentId, newState) {
        const component = this.getComponent(componentId);
        if (!component) {
            console.warn(`Component ${componentId} not found`);
            return;
        }

        const oldState = { ...component.state };
        component.state = { ...component.state, ...newState };
        component.lastUpdate = Date.now();

        // Emit state change event
        this.emitComponentEvent(componentId, 'stateChange', {
            oldState,
            newState: component.state
        });
    }

    /**
     * Get component state
     */
    static getComponentState(componentId) {
        const component = this.getComponent(componentId);
        return component ? { ...component.state } : null;
    }

    /**
     * Show loading state for component
     */
    static showLoading(componentId, message = 'Loading...') {
        const component = this.getComponent(componentId);
        if (!component || !component.element) {
            return;
        }

        // Add loading class
        component.element.classList.add('component-loading');
        
        // Show loading message if container exists
        const loadingContainer = component.element.querySelector('.component-loading-container');
        if (loadingContainer) {
            loadingContainer.textContent = message;
            loadingContainer.style.display = 'block';
        }

        this.updateComponentState(componentId, { loading: true, loadingMessage: message });
    }

    /**
     * Hide loading state for component
     */
    static hideLoading(componentId) {
        const component = this.getComponent(componentId);
        if (!component || !component.element) {
            return;
        }

        // Remove loading class
        component.element.classList.remove('component-loading');
        
        // Hide loading message
        const loadingContainer = component.element.querySelector('.component-loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }

        this.updateComponentState(componentId, { loading: false, loadingMessage: null });
    }

    /**
     * Show error state for component
     */
    static showError(componentId, error, context = '') {
        const component = this.getComponent(componentId);
        if (!component || !component.element) {
            return;
        }

        // Add error class
        component.element.classList.add('component-error');
        
        // Show error message if container exists
        const errorContainer = component.element.querySelector('.component-error-container');
        if (errorContainer) {
            errorContainer.textContent = error;
            errorContainer.style.display = 'block';
        }

        const errorState = {
            hasError: true,
            error: error,
            errorContext: context,
            errorTimestamp: Date.now()
        };

        this.updateComponentState(componentId, errorState);
        this.emitComponentEvent(componentId, 'error', errorState);
    }

    /**
     * Clear error state for component
     */
    static clearError(componentId) {
        const component = this.getComponent(componentId);
        if (!component || !component.element) {
            return;
        }

        // Remove error class
        component.element.classList.remove('component-error');
        
        // Hide error message
        const errorContainer = component.element.querySelector('.component-error-container');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }

        this.updateComponentState(componentId, { 
            hasError: false, 
            error: null, 
            errorContext: null,
            errorTimestamp: null
        });
    }

    /**
     * Handle global errors
     */
    static handleGlobalError(event) {
        console.error('Global error:', event.error);
        
        // Try to find which component caused the error
        let componentId = null;
        if (event.target && event.target.getAttribute) {
            componentId = event.target.getAttribute('data-component-id') || 
                         event.target.closest('[data-component-id]')?.getAttribute('data-component-id');
        }

        if (componentId) {
            this.showError(componentId, event.error.message, 'Global error handler');
        } else {
            // Send global error to Extension Host
            this.sendMessage('globalError', {
                message: event.error.message,
                stack: event.error.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        }
    }

    /**
     * Dispose all components and cleanup
     */
    static dispose() {
        // Unregister all components
        for (const [componentId] of this.components) {
            this.unregisterComponent(componentId);
        }

        // Remove message handlers
        this.messageHandlers.clear();

        // Remove event listeners
        window.removeEventListener('message', this.handleMessage.bind(this));
        window.removeEventListener('error', this.handleGlobalError.bind(this));

        this.isInitialized = false;
        console.log('ComponentUtils disposed');
    }

    /**
     * Get debug information about all components
     */
    static getDebugInfo() {
        const info = {
            initialized: this.isInitialized,
            componentCount: this.components.size,
            messageHandlerCount: this.messageHandlers.size,
            components: {}
        };

        for (const [id, component] of this.components) {
            info.components[id] = {
                type: component.type,
                initialized: component.initialized,
                lastUpdate: component.lastUpdate,
                hasElement: !!component.element,
                stateKeys: Object.keys(component.state)
            };
        }

        return info;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ComponentUtils.initialize());
} else {
    ComponentUtils.initialize();
}

// Make available globally
window.ComponentUtils = ComponentUtils;