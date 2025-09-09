import { EventEmitter } from 'events';

export interface BaseComponentConfig {
    id: string;
    className?: string;
}

/**
 * Base component class that all UI components extend.
 * Provides common functionality for component lifecycle, state management, and events.
 */
export abstract class BaseComponent extends EventEmitter {
    protected config: BaseComponentConfig;
    protected isInitialized: boolean = false;

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
        this.emit('update', { 
            componentId: this.config.id,
            timestamp: Date.now()
        });
    }

    /**
     * Notify that the component's state has changed
     */
    protected notifyStateChange(state: any): void {
        this.emit('stateChange', { 
            componentId: this.config.id,
            state,
            timestamp: Date.now()
        });
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