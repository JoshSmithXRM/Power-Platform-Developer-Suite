/**
 * ComponentUtils - Base utilities for component management in webview context
 * This runs in the webview (browser) context and provides common functionality
 * for all components including initialization, messaging, and lifecycle management.
 */

// CRITICAL: Save stub's pending registrations before class definition replaces window.ComponentUtils
const savedStubRegistrations = window.ComponentUtils?.pendingBehaviorRegistrations || [];
console.log(`ComponentUtils.js: Saved ${savedStubRegistrations.length} pending registrations from stub:`,
    savedStubRegistrations.map(r => r.name));

class ComponentUtils {
    static components = new Map();
    static messageHandlers = new Map();
    static isInitialized = false;
    static vscode = null;
    static messageQueue = [];
    static registeredBehaviors = new Map();
    static expectedBehaviors = new Set();
    static pendingBehaviorRegistrations = [];

    /**
     * Register a behavior class when it loads
     * Called by each behavior script when it loads
     */
    static registerBehavior(name, behaviorClass) {
        console.log(`ComponentUtils: Registering behavior ${name}`);
        this.registeredBehaviors.set(name, behaviorClass);

        // Don't auto-check readiness here - let initialize() control the flow
        // This prevents reactive triggers and recursion issues
    }

    /**
     * Auto-register behaviors that are available in global scope
     */
    static registerAvailableBehaviors() {
        const behaviorTypes = ['EnvironmentSelector', 'SolutionSelector', 'ActionBar', 'DataTable', 'SearchForm', 'EntitySelector', 'FilterPanel', 'SplitPanel', 'TreeView'];

        console.log('ComponentUtils: registerAvailableBehaviors() called');
        console.log('ComponentUtils: window object keys:', Object.keys(window).filter(k => k.includes('Behavior')));
        
        behaviorTypes.forEach(type => {
            const behaviorName = `${type}Behavior`;
            const behaviorExists = !!window[behaviorName];
            const alreadyRegistered = this.registeredBehaviors.has(type);
            
            console.log(`ComponentUtils: Checking ${behaviorName} - exists: ${behaviorExists}, already registered: ${alreadyRegistered}`);
            
            if (window[behaviorName] && !this.registeredBehaviors.has(type)) {
                console.log(`ComponentUtils: Auto-registering ${behaviorName}`);
                this.registerBehavior(type, window[behaviorName]);
            }
        });
        
        console.log('ComponentUtils: Final registered behaviors:', Array.from(this.registeredBehaviors.keys()));
    }

    /**
     * Process pending behavior registrations from stub or deferred registrations
     */
    static processPendingRegistrations() {
        // Use savedStubRegistrations captured before class replaced window.ComponentUtils
        console.log(`ComponentUtils: Processing ${savedStubRegistrations.length} pending registrations from stub`);

        savedStubRegistrations.forEach(({ name, behaviorClass }) => {
            console.log(`ComponentUtils: Registering pending behavior ${name}`);
            this.registerBehavior(name, behaviorClass);
        });
        
        // Also process our own pending registrations
        if (this.pendingBehaviorRegistrations.length > 0) {
            console.log(`ComponentUtils: Processing ${this.pendingBehaviorRegistrations.length} internal pending registrations`);
            this.pendingBehaviorRegistrations.forEach(({ name, behaviorClass }) => {
                console.log(`ComponentUtils: Registering internal pending behavior ${name}`);
                this.registerBehavior(name, behaviorClass);
            });
        }
        
        // Clear all pending registrations
        this.pendingBehaviorRegistrations = [];
    }

    /**
     * Check if all expected behaviors are registered and we're ready to initialize
     */
    static checkReadyToInitialize() {
        // Get all components in DOM that need behaviors
        const componentElements = document.querySelectorAll('[data-component-type]');
        const neededBehaviors = new Set();
        
        componentElements.forEach(element => {
            const componentType = element.getAttribute('data-component-type');
            if (componentType) {
                neededBehaviors.add(componentType);
            }
        });
        
        console.log('ComponentUtils: Needed behaviors:', Array.from(neededBehaviors));
        console.log('ComponentUtils: Registered behaviors:', Array.from(this.registeredBehaviors.keys()));

        // Check if all needed behaviors are in the REGISTRY (single source of truth)
        let allReady = true;
        neededBehaviors.forEach(behaviorType => {
            if (!this.registeredBehaviors.has(behaviorType)) {
                console.log(`ComponentUtils: Still waiting for ${behaviorType}`);
                allReady = false;
            }
        });
        
        if (allReady && !this.isInitialized && window.vscode) {
            console.log('ComponentUtils: All behaviors ready, initializing components');
            this.completeInitialization();
        }
    }

    /**
     * Initialize the component system
     * Call this after DOM is ready and all behaviors are loaded
     */
    static initialize() {
        console.log('ComponentUtils: initialize() method called');

        if (this.isInitialized) {
            console.warn('ComponentUtils already initialized');
            return;
        }

        // Store VS Code API reference - use getter function if not immediately available
        if (window.vscode) {
            this.vscode = window.vscode;
            console.log('ComponentUtils: VS Code API available');
        } else {
            console.warn('ComponentUtils: VS Code API not immediately available, will use window.vscode getter');
            // Don't return - continue initialization
            // The sendMessage method will check for window.vscode dynamically
        }

        console.log('ComponentUtils: About to call registerAvailableBehaviors()');
        // Auto-register any behaviors that loaded before ComponentUtils
        this.registerAvailableBehaviors();

        // Process any pending registrations from the stub
        this.processPendingRegistrations();

        console.log('ComponentUtils: About to call checkReadyToInitialize()');
        // Check if we're ready to initialize
        this.checkReadyToInitialize();
    }

    /**
     * Complete initialization after all behaviors are registered
     */
    static completeInitialization() {
        // Setup global message handler
        window.addEventListener('message', this.handleMessage.bind(this));

        // Setup global error handler
        window.addEventListener('error', this.handleGlobalError.bind(this));

        // Flush any queued messages
        this.flushMessageQueue();

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
    static sendMessage(command, data = {}) {
        const message = {
            command,
            data,
            timestamp: Date.now()
        };

        // Use stored vscode reference or fall back to window.vscode
        const vscode = this.vscode || window.vscode;

        if (!vscode) {
            // Queue the message until VS Code API is available
            console.log('Queueing message (VS Code API not ready):', message);
            this.messageQueue.push(message);
            return;
        }

        console.log('Sending message to Extension Host:', message);
        vscode.postMessage(message);
    }

    /**
     * Flush queued messages when VS Code API becomes available
     */
    static flushMessageQueue() {
        const vscode = this.vscode || window.vscode;
        if (!vscode || this.messageQueue.length === 0) {
            return;
        }

        // Update stored reference if we didn't have it before
        if (!this.vscode && window.vscode) {
            this.vscode = window.vscode;
        }

        console.log(`Flushing ${this.messageQueue.length} queued messages`);
        const queuedMessages = [...this.messageQueue];
        this.messageQueue = [];

        queuedMessages.forEach(message => {
            console.log('Sending queued message to Extension Host:', message);
            this.vscode.postMessage(message);
        });
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
     * Register a component-specific message handler
     */
    static registerComponentHandler(componentId, handler) {
        if (!componentId || typeof handler !== 'function') {
            console.error('Invalid componentId or handler for component registration');
            return;
        }
        
        this.componentHandlers = this.componentHandlers || new Map();
        this.componentHandlers.set(componentId, handler);
        console.log(`Registered component handler for: ${componentId}`);
    }

    /**
     * Unregister a component-specific message handler
     */
    static unregisterComponentHandler(componentId) {
        if (this.componentHandlers) {
            this.componentHandlers.delete(componentId);
            console.log(`Unregistered component handler for: ${componentId}`);
        }
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


            // First priority: Try component-specific handlers (new system)
            if (message.componentId && this.componentHandlers && this.componentHandlers.has(message.componentId)) {
                const handler = this.componentHandlers.get(message.componentId);
                handler(message);
                return;
            }

            // Second priority: Try component-specific behavior handlers (existing system)
            if (message.componentId) {
                const component = this.getComponent(message.componentId);
                if (component && component.behaviorInstance && component.behaviorInstance.handleMessage) {
                    component.behaviorInstance.handleMessage(message);
                    return;
                }
            }

            // Third priority: Route to specific behavior static handlers
            if (message.action === 'componentUpdate' ||
                message.action === 'componentStateChange' ||
                message.action === 'setQuickFilters' ||
                message.action === 'setAdvancedFilters' ||
                message.action === 'clearFilters') {
                this.routeToComponentBehavior(message);
                return;
            }

            // Fourth priority: Try global action handlers
            const handler = this.messageHandlers.get(message.action);
            if (handler) {
                handler(message);
            } else {
                // Only warn about truly unexpected actions (not informational messages)
                const informationalActions = ['traceLevelLoaded', 'tracesLoaded', 'solutionsLoaded', 'jobsLoaded', 'exportTraces'];
                if (!informationalActions.includes(message.action)) {
                    console.warn(`No handler found for action: ${message.action}`);
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Route messages to appropriate component behavior static handlers
     */
    static routeToComponentBehavior(message) {
        if (!message.componentId) {
            console.warn('Component message missing componentId:', message);
            return;
        }

        // Determine component type from element or message
        const element = document.getElementById(message.componentId);
        let componentType = message.componentType;
        
        if (!componentType && element) {
            // Infer component type from element attributes or structure
            componentType = element.getAttribute('data-component-type') || 
                          this.inferComponentTypeFromElement(element);
        }


        // Route to appropriate behavior handler using registry pattern
        // This replaces the hardcoded switch statement with dynamic lookup
        const behaviorClass = this.registeredBehaviors.get(componentType);

        if (behaviorClass && behaviorClass.handleMessage) {
            console.log(`ComponentUtils: Routing ${message.action} to ${componentType} behavior`);
            behaviorClass.handleMessage(message);
        } else if (componentType) {
            console.warn(`ComponentUtils: No behavior registered for component type '${componentType}'`);
            // Fallback: try to find behavior based on componentId pattern
            this.routeByIdPattern(message);
        } else {
            console.warn('ComponentUtils: Cannot determine component type for message:', message);
            // Fallback: try to find behavior based on componentId pattern
            this.routeByIdPattern(message);
        }
    }

    /**
     * Infer component type from DOM element structure
     */
    static inferComponentTypeFromElement(element) {
        if (!element) return null;
        
        // Check for data table structure
        if (element.tagName === 'TABLE' || element.closest('.data-table')) {
            return 'DataTable';
        }
        
        // Check for environment selector structure
        if (element.classList.contains('environment-selector') || 
            element.closest('.environment-selector')) {
            return 'EnvironmentSelector';
        }
        
        // Check for solution selector structure
        if (element.classList.contains('solution-selector') || 
            element.closest('.solution-selector')) {
            return 'SolutionSelector';
        }
        
        // Check for action bar structure
        if (element.classList.contains('action-bar') || 
            element.closest('.action-bar')) {
            return 'ActionBar';
        }
        
        return null;
    }

    /**
     * Route messages based on component ID patterns (fallback)
     */
    static routeByIdPattern(message) {
        const componentId = message.componentId;
        
        // DataTable patterns
        if (componentId.includes('table') || componentId.includes('Table')) {
            if (window.DataTableBehaviorStatic) {
                window.DataTableBehaviorStatic.handleMessage(message);
                return;
            }
        }
        
        // Environment selector patterns
        if (componentId.includes('env') || componentId.includes('Env') || 
            componentId.includes('environment') || componentId.includes('Environment')) {
            if (window.EnvironmentSelectorBehavior) {
                window.EnvironmentSelectorBehavior.handleMessage(message);
                return;
            }
        }
        
        // Solution selector patterns
        if (componentId.includes('solution') || componentId.includes('Solution')) {
            if (window.SolutionSelectorBehavior) {
                window.SolutionSelectorBehavior.handleMessage(message);
                return;
            }
        }
        
        // Only warn if this is an actionable message type
        const action = message.action || message.command;
        const silentActions = ['componentStateChange', 'componentUpdate'];
        if (!silentActions.includes(action)) {
            console.warn(`Could not route message to component behavior: ${componentId}`, message);
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
        this.sendMessage('component-event', {
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
            this.sendMessage('global-error', {
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

// CRITICAL: Replace stub with real ComponentUtils class BEFORE initialization
// This ensures any behaviors that load after this point register to the real class, not the stub
window.ComponentUtils = ComponentUtils;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ComponentUtils.initialize());
} else {
    ComponentUtils.initialize();
}