import { EventEmitter } from 'events';

import { ServiceFactory } from '../../services/ServiceFactory';

export interface BaseComponentConfig {
    id: string;
    className?: string;
}

/**
 * Interface for components that can be rendered.
 * Uses Interface Segregation Principle to separate rendering concerns from data concerns.
 * PanelComposer and ComponentFactory depend on this interface, not on BaseComponent<any>.
 *
 * This allows factories to work with components without caring about their specific TData type,
 * while still maintaining type safety for getData() in the concrete implementations.
 */
export interface IRenderable {
    getId(): string;
    getType(): string;
    getClassName(): string;
    generateHTML(): string;
    getCSSFile(): string;
    getBehaviorScript(): string;
    dispose(): void;

    // EventEmitter methods used by ComponentFactory
    // Note: any is required here to match EventEmitter's signature - this is standard practice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    once(event: string | symbol, listener: (...args: any[]) => void): this;
}

/**
 * Base component class that all UI components extend.
 * Provides common functionality for component lifecycle, state management, and events.
 *
 * Implements IRenderable to provide rendering capabilities without exposing TData type.
 *
 * @template TData - The type of data returned by getData() for type-safe event bridge updates
 */
export abstract class BaseComponent<TData = Record<string, never>> extends EventEmitter implements IRenderable {
    protected config: BaseComponentConfig;
    protected isInitialized: boolean = false;
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    protected get componentLogger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            // Use the actual component class name for component-specific logging
            const componentName = this.constructor.name;
            this._logger = ServiceFactory.getLoggerService().createComponentLogger(componentName);
        }
        return this._logger;
    }

    constructor(config: BaseComponentConfig) {
        super();
        this.config = { ...config };
        
        if (!config.id) {
            throw new Error('Component must have a unique id');
        }
    }

    /**
     * Get the component's unique identifier
     */
    public getId(): string {
        return this.config.id;
    }

    /**
     * Get the component type identifier
     * Used for event routing and debugging
     */
    public abstract getType(): string;

    /**
     * Get component data for event bridge updates
     * Must return the current state/data that should be sent to the webview
     * The return type is enforced by the generic parameter TData
     */
    public abstract getData(): TData;

    /**
     * Get the component's CSS class name
     */
    public getClassName(): string {
        return this.config.className || this.getDefaultClassName();
    }

    /**
     * Generate HTML for this component (called in Extension Host context)
     */
    public abstract generateHTML(): string;

    /**
     * Get the CSS file path for this component
     */
    public abstract getCSSFile(): string;

    /**
     * Get the behavior script file path for this component
     */
    public abstract getBehaviorScript(): string;

    /**
     * Get the default CSS class name for this component type
     */
    protected abstract getDefaultClassName(): string;

    /**
     * Notify that the component needs to be updated
     */
    protected notifyUpdate(): void {
        this.componentLogger.info('notifyUpdate called', {
            componentId: this.config.id,
            componentType: this.getType()
        });
        this.emit('update', {
            componentId: this.config.id,
            timestamp: Date.now()
        });
    }

    /**
     * Notify that the component's state has changed
     * Automatically triggers event bridge update via notifyUpdate()
     */
    protected notifyStateChange(state: unknown): void {
        this.emit('stateChange', {
            componentId: this.config.id,
            state,
            timestamp: Date.now()
        });

        // Automatically trigger event bridge update
        // Every state change should update the UI in the webview
        this.notifyUpdate();
    }

    /**
     * Notify that an error occurred in the component
     */
    protected notifyError(error: Error, context?: string): void {
        this.emit('error', {
            componentId: this.config.id,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context,
            timestamp: Date.now()
        });
    }

    /**
     * Mark the component as initialized
     */
    public markInitialized(): void {
        this.isInitialized = true;
        this.emit('initialized', { 
            componentId: this.config.id,
            timestamp: Date.now()
        });
    }

    /**
     * Check if the component is initialized
     */
    public getIsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Clean up the component (remove event listeners, etc.)
     */
    public dispose(): void {
        this.removeAllListeners();
        this.isInitialized = false;
        this.emit('disposed', { 
            componentId: this.config.id,
            timestamp: Date.now()
        });
    }

    /**
     * Update the component's configuration
     */
    public updateConfig(newConfig: Partial<BaseComponentConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Ensure id cannot be changed
        if (newConfig.id && newConfig.id !== oldConfig.id) {
            this.config.id = oldConfig.id;
        }

        this.emit('configChanged', {
            componentId: this.config.id,
            oldConfig,
            newConfig: this.config,
            timestamp: Date.now()
        });
    }

    /**
     * Get a copy of the current configuration
     */
    public getConfig(): BaseComponentConfig {
        return { ...this.config };
    }

    /**
     * Validate the component's configuration
     */
    protected validateConfig(): void {
        if (!this.config.id || typeof this.config.id !== 'string') {
            throw new Error('Component must have a valid string id');
        }

        if (this.config.className && typeof this.config.className !== 'string') {
            throw new Error('Component className must be a string');
        }
    }
}