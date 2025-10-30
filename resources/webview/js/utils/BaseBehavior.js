/**
 * BaseBehavior - Base class for all webview component behaviors
 *
 * ARCHITECTURE PATTERN: Template Method Pattern
 * - Base class defines and orchestrates the complete lifecycle
 * - Child classes override specific hooks to customize behavior
 * - All hooks have default implementations (no-op or error)
 * - Base class ALWAYS calls ALL hooks (no conditional logic)
 *
 * LIFECYCLE HOOKS - All defined in base class with defaults:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. createInstance(componentId, config, element)                          │
 * │    → Returns: Instance object structure                                  │
 * │    → Default: Basic instance with id, config, element, boundHandlers     │
 * │    → Override: If you need custom instance structure                     │
 * │                                                                           │
 * │ 2. findDOMElements(instance)                                             │
 * │    → Returns: void                                                        │
 * │    → Default: No-op                                                       │
 * │    → Override: Query and cache DOM element references on instance        │
 * │                                                                           │
 * │ 3. setupEventListeners(instance)                                         │
 * │    → Returns: void                                                        │
 * │    → Default: No-op                                                       │
 * │    → Override: Attach event handlers using cached DOM references         │
 * │                                                                           │
 * │ 4. initializeState(instance)                                             │
 * │    → Returns: void                                                        │
 * │    → Default: No-op                                                       │
 * │    → Override: Parse initial state from DOM attributes/structure         │
 * │    → Example: ActionBar parses button configs from DOM                   │
 * │                                                                           │
 * │ 5. onComponentUpdate(instance, data)                                     │
 * │    → Returns: void                                                        │
 * │    → Default: Throws error (MUST implement)                              │
 * │    → Override: REQUIRED - Handle data updates from Extension Host        │
 * │                                                                           │
 * │ 6. cleanupInstance(instance)                                             │
 * │    → Returns: void                                                        │
 * │    → Default: No-op                                                       │
 * │    → Override: Remove event listeners, clear timers, etc.                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * INITIALIZATION FLOW (Template Method):
 * initialize()
 *   ├─→ createInstance()        [has default, usually override]
 *   ├─→ findDOMElements()       [no-op default, override if needed]
 *   ├─→ setupEventListeners()   [no-op default, override if needed]
 *   ├─→ initializeState()       [no-op default, override if needed]
 *   └─→ instances.set()         [automatic]
 *
 * CRITICAL: Base class ALWAYS calls ALL hooks. Never conditional.
 * This prevents bugs where forgetting to call a hook causes silent failures.
 *
 * USAGE:
 * class ActionBarBehavior extends BaseBehavior {
 *     static getComponentType() { return 'ActionBar'; }
 *
 *     static findDOMElements(instance) {
 *         instance.actionsContainer = instance.element.querySelector('[data-component-element="actions"]');
 *     }
 *
 *     static setupEventListeners(instance) {
 *         instance.actionsContainer.addEventListener('click', (e) => this.handleClick(instance, e));
 *     }
 *
 *     static initializeState(instance) {
 *         // Parse actions from DOM buttons
 *         instance.actions = this.parseActionsFromDOM(instance.actionsContainer);
 *     }
 *
 *     static onComponentUpdate(instance, data) {
 *         // REQUIRED - Update actions from Extension Host data
 *         if (data.actions) instance.actions = data.actions;
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

            // Call lifecycle hooks in order (all hooks have default implementations)
            this.findDOMElements(instance);
            this.setupEventListeners(instance);
            this.initializeState(instance);

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
     * Initialize component state from DOM
     * Subclasses should override to parse initial state from DOM elements
     *
     * Examples:
     * - ActionBar: Parse action buttons from DOM to build actions array
     * - DataTable: Parse column headers and initial row data
     * - TreeView: Parse initial tree structure from nested elements
     *
     * Default: No-op (most components receive state via componentUpdate)
     */
    static initializeState(instance) {
        // Override in subclass if you need to parse DOM state
        // This is called automatically by initialize() - never call manually
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
            case 'component-update':
                // CRITICAL: Event bridge updates ALWAYS go through onComponentUpdate
                if (message.data) {
                    console.log(`${this.name}: component-update received`, {
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
     * Send message to Extension Host using standardized component-event pattern
     */
    static sendMessage(instance, eventType, data) {
        if (typeof window.ComponentUtils !== 'undefined' && window.ComponentUtils.sendMessage) {
            window.ComponentUtils.sendMessage('component-event', {
                componentId: instance.id,
                eventType: eventType,
                data: data
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
