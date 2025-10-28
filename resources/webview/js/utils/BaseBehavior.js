/**
 * BaseBehavior - Abstract base class for all webview component behaviors
 *
 * PURPOSE:
 * - Enforces componentUpdate pattern (prevents silent failures)
 * - Provides consistent initialization and cleanup
 * - Enables registry-based routing (no hardcoded switches)
 * - Validates required method implementations at runtime
 *
 * USAGE:
 * class MyComponentBehavior extends BaseBehavior {
 *     static getComponentType() { return 'MyComponent'; }
 *
 *     static onComponentUpdate(instance, data) {
 *         // Handle component data updates from Extension Host
 *     }
 * }
 */
class BaseBehavior {
    static instances = new Map();

    /**
     * Get the component type this behavior handles (MUST be implemented)
     */
    static getComponentType() {
        throw new Error(`${this.name}.getComponentType() must be implemented`);
    }

    /**
     * Handle component data updates from Extension Host (MUST be implemented)
     * This is called when the event bridge sends updated component data
     *
     * @param {object} instance - The component instance
     * @param {any} data - The updated component data
     */
    static onComponentUpdate(instance, data) {
        throw new Error(`${this.name}.onComponentUpdate() must be implemented`);
    }

    /**
     * Initialize a component instance
     * Subclasses can override createInstance() to customize the instance structure
     */
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error(`${this.name}: componentId and element are required`);
            return null;
        }

        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }

        try {
            const instance = this.createInstance(componentId, config, element);

            // Find DOM elements
            this.findDOMElements(instance);

            // Setup event listeners
            this.setupEventListeners(instance);

            // Register instance
            this.instances.set(componentId, instance);

            console.log(`${this.name}: Initialized ${componentId}`);
            return instance;

        } catch (error) {
            console.error(`${this.name}: Failed to initialize ${componentId}:`, error);
            return null;
        }
    }

    /**
     * Create the instance object structure
     * Subclasses can override to customize the instance
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,
            boundHandlers: {}
        };
    }

    /**
     * Find and cache DOM elements
     * Subclasses should override to find component-specific elements
     */
    static findDOMElements(instance) {
        // Override in subclass
    }

    /**
     * Setup event listeners
     * Subclasses should override to setup component-specific listeners
     */
    static setupEventListeners(instance) {
        // Override in subclass
    }

    /**
     * Handle messages from Extension Host
     * Routes to appropriate handlers based on action
     */
    static handleMessage(message) {
        if (!message?.componentId || message.componentType !== this.getComponentType()) {
            return;
        }

        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`${this.name}: Instance ${message.componentId} not found`);
            return;
        }

        // Route to specific action handlers
        switch (message.action) {
            case 'componentUpdate':
                // CRITICAL: Event bridge updates ALWAYS go through onComponentUpdate
                if (message.data) {
                    console.log(`${this.name}: componentUpdate received`, {
                        componentId: message.componentId,
                        dataKeys: Object.keys(message.data)
                    });
                    this.onComponentUpdate(instance, message.data);
                }
                break;

            default:
                // Allow subclasses to handle additional actions
                this.handleCustomAction(instance, message);
                break;
        }
    }

    /**
     * Handle custom actions beyond componentUpdate
     * Subclasses can override to handle component-specific actions
     */
    static handleCustomAction(instance, message) {
        console.warn(`${this.name}: Unhandled action '${message.action}'`);
    }

    /**
     * Send message to Extension Host
     */
    static sendMessage(instance, action, data) {
        if (typeof window.ComponentUtils !== 'undefined' && window.ComponentUtils.sendMessage) {
            window.ComponentUtils.sendMessage(action, {
                componentId: instance.id,
                componentType: this.getComponentType(),
                ...data
            });
        }
    }

    /**
     * Cleanup instance
     */
    static cleanup(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Allow subclass to perform custom cleanup
        this.cleanupInstance(instance);

        // Remove from instances
        this.instances.delete(componentId);
    }

    /**
     * Cleanup instance resources
     * Subclasses should override to cleanup component-specific resources
     */
    static cleanupInstance(instance) {
        // Override in subclass to remove event listeners, etc.
    }

    /**
     * Register this behavior with ComponentUtils
     * Called automatically when behavior is loaded
     */
    static register() {
        if (typeof window !== 'undefined') {
            // Validate required methods are implemented
            try {
                this.getComponentType();
            } catch (error) {
                console.error(`${this.name}: Cannot register - getComponentType() not implemented`);
                return;
            }

            // Make behavior globally available
            window[this.name] = this;

            // Register with ComponentUtils if available
            if (window.ComponentUtils?.registerBehavior) {
                const componentType = this.getComponentType();
                window.ComponentUtils.registerBehavior(componentType, this);
                console.log(`${this.name}: Registered for component type '${componentType}'`);
            }
        }
    }
}

// Make BaseBehavior globally available
if (typeof window !== 'undefined') {
    window.BaseBehavior = BaseBehavior;
}
