import { BaseComponent } from '../../base/BaseComponent';
import { EnvironmentSelectorConfig, Environment } from '../../base/ComponentInterface';
import { DEFAULT_ENVIRONMENT_SELECTOR_CONFIG, mergeConfig } from '../../base/ComponentConfig';

import { EnvironmentSelectorView } from './EnvironmentSelectorView';

/**
 * EnvironmentSelectorComponent - Reusable environment selector
 * Used by all panels that need environment selection functionality
 * Supports multi-instance usage with independent state management
 */
export class EnvironmentSelectorComponent extends BaseComponent {
    protected config: EnvironmentSelectorConfig;
    private environments: Environment[] = [];
    private selectedEnvironmentId: string | null = null;
    private loading: boolean = false;
    private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

    constructor(config: EnvironmentSelectorConfig) {
        // Merge with defaults
        const mergedConfig = mergeConfig(DEFAULT_ENVIRONMENT_SELECTOR_CONFIG, config);
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        
        // Set initial state
        if (config.selectedEnvironmentId) {
            this.selectedEnvironmentId = config.selectedEnvironmentId;
        }
        if (config.environments) {
            this.environments = [...config.environments];
        }
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return EnvironmentSelectorView.render(this.config, {
            environments: this.environments,
            selectedEnvironmentId: this.selectedEnvironmentId,
            loading: this.loading,
            connectionStatus: this.connectionStatus
        });
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/environment-selector.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/EnvironmentSelectorBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'environment-selector';
    }

    /**
     * Set the list of available environments
     */
    public setEnvironments(environments: Environment[]): void {
        const oldEnvironments = [...this.environments];
        this.environments = [...environments];
        
        // If currently selected environment is no longer available, clear selection
        if (this.selectedEnvironmentId && 
            !environments.find(env => env.id === this.selectedEnvironmentId)) {
            this.clearSelection();
        }
        
        this.notifyStateChange({
            environments: this.environments,
            oldEnvironments,
            selectedEnvironmentId: this.selectedEnvironmentId
        });
        
        this.notifyUpdate();
    }

    /**
     * Get the list of available environments
     */
    public getEnvironments(): Environment[] {
        return [...this.environments];
    }

    /**
     * Set the selected environment by ID
     */
    public setSelectedEnvironment(environmentId: string | null): void {
        const oldSelectedId = this.selectedEnvironmentId;
        const environment = environmentId ? this.environments.find(env => env.id === environmentId) : null;
        
        if (environmentId && !environment) {
            this.notifyError(new Error(`Environment with ID ${environmentId} not found`), 'setSelectedEnvironment');
            return;
        }
        
        this.selectedEnvironmentId = environmentId;
        
        // Update connection status based on selection
        this.connectionStatus = environmentId ? 'connected' : 'disconnected';
        
        this.notifyStateChange({
            selectedEnvironmentId: environmentId,
            oldSelectedEnvironmentId: oldSelectedId,
            selectedEnvironment: environment,
            connectionStatus: this.connectionStatus
        });
        
        // Trigger onChange callback if provided
        if (this.config.onChange) {
            try {
                this.config.onChange(environmentId || '', environment || undefined);
            } catch (error) {
                this.notifyError(error as Error, 'onChange callback');
            }
        }
        
        this.notifyUpdate();
    }

    /**
     * Get the currently selected environment
     */
    public getSelectedEnvironment(): Environment | null {
        if (!this.selectedEnvironmentId) {
            return null;
        }
        return this.environments.find(env => env.id === this.selectedEnvironmentId) || null;
    }

    /**
     * Get the currently selected environment ID
     */
    public getSelectedEnvironmentId(): string | null {
        return this.selectedEnvironmentId;
    }

    /**
     * Clear the current selection
     */
    public clearSelection(): void {
        this.setSelectedEnvironment(null);
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean, loadingMessage?: string): void {
        const oldLoading = this.loading;
        this.loading = loading;
        
        this.notifyStateChange({
            loading,
            oldLoading,
            loadingMessage
        });
        
        this.notifyUpdate();
    }

    /**
     * Get loading state
     */
    public isLoading(): boolean {
        return this.loading;
    }

    /**
     * Set connection status
     */
    public setConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
        const oldStatus = this.connectionStatus;
        this.connectionStatus = status;
        
        this.notifyStateChange({
            connectionStatus: status,
            oldConnectionStatus: oldStatus
        });
        
        this.notifyUpdate();
    }

    /**
     * Get connection status
     */
    public getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
        return this.connectionStatus;
    }

    /**
     * Refresh environments (trigger reload)
     */
    public refresh(): void {
        this.setLoading(true, 'Refreshing environments...');
        
        // Emit refresh event to notify parent panel
        this.emit('refresh', {
            componentId: this.getId(),
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Enable/disable the component
     */
    public setDisabled(disabled: boolean): void {
        this.updateConfig({ disabled });
    }

    /**
     * Check if component is disabled
     */
    public isDisabled(): boolean {
        return this.config.disabled || false;
    }

    /**
     * Set required state
     */
    public setRequired(required: boolean): void {
        this.updateConfig({ required });
    }

    /**
     * Check if component is required
     */
    public isRequired(): boolean {
        return this.config.required || false;
    }

    /**
     * Validate the current state
     */
    public validate(): { isValid: boolean; error?: string } {
        if (this.config.required && !this.selectedEnvironmentId) {
            return {
                isValid: false,
                error: 'Environment selection is required'
            };
        }
        
        if (this.selectedEnvironmentId && !this.getSelectedEnvironment()) {
            return {
                isValid: false,
                error: 'Selected environment is no longer available'
            };
        }
        
        return { isValid: true };
    }

    /**
     * Get current component state
     */
    public getState() {
        return {
            environments: this.environments,
            selectedEnvironmentId: this.selectedEnvironmentId,
            loading: this.loading,
            connectionStatus: this.connectionStatus,
            disabled: this.config.disabled,
            required: this.config.required,
            isValid: this.validate().isValid
        };
    }

    /**
     * Enhanced configuration validation
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        if (this.config.onChange && typeof this.config.onChange !== 'function') {
            throw new Error('onChange must be a function');
        }
        
        if (this.config.onError && typeof this.config.onError !== 'function') {
            throw new Error('onError must be a function');
        }
        
        if (this.config.environments && !Array.isArray(this.config.environments)) {
            throw new Error('environments must be an array');
        }
    }

    /**
     * Handle errors with optional callback
     */
    protected notifyError(error: Error, context?: string): void {
        super.notifyError(error, context);
        
        // Call onError callback if provided
        if (this.config.onError) {
            try {
                this.config.onError(error);
            } catch (callbackError) {
                this.componentLogger.error('Error in onError callback', callbackError as Error, { 
                    componentId: this.config.id,
                    originalError: error.message 
                });
            }
        }
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(newConfig: Partial<EnvironmentSelectorConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Re-validate after config update
        try {
            this.validateConfig();
        } catch (error) {
            // Revert to old config if validation fails
            this.config = oldConfig;
            throw error;
        }
        
        this.emit('configChanged', {
            componentId: this.getId(),
            oldConfig,
            newConfig: this.config,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }
}