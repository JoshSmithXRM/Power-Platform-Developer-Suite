import { BaseComponentConfig, Environment } from '../../base/ComponentInterface';

/**
 * Configuration interface for EnvironmentSelectorComponent
 * Provides type-safe configuration options with comprehensive customization
 */

export interface EnvironmentSelectorConfig extends BaseComponentConfig {
    // Basic configuration
    label?: string;
    placeholder?: string;
    
    // Data configuration
    environments?: Environment[];
    selectedEnvironmentId?: string;
    
    // Event handlers
    onChange?: (environmentId: string, environment?: Environment) => void;
    onError?: (error: Error) => void;
    onRefresh?: () => void;
    onConnectionTest?: (environment: Environment) => Promise<boolean>;
    
    // Display options
    showStatus?: boolean;
    showRefreshButton?: boolean;
    showEnvironmentInfo?: boolean;
    showConnectionTest?: boolean;
    
    // Behavior options
    required?: boolean;
    disabled?: boolean;
    autoSelectFirst?: boolean;
    autoRefreshOnFocus?: boolean;
    validateConnection?: boolean;
    
    // Filtering options
    filterByStatus?: 'connected' | 'disconnected' | 'all';
    filterByAuthMethod?: string[];
    sortBy?: 'name' | 'url' | 'lastUsed' | 'custom';
    sortOrder?: 'asc' | 'desc';
    
    // Appearance options
    size?: 'small' | 'medium' | 'large';
    variant?: 'default' | 'compact' | 'detailed';
    theme?: 'auto' | 'light' | 'dark';
    
    // Advanced options
    loadingTimeout?: number;
    retryAttempts?: number;
    cacheEnabled?: boolean;
    debugMode?: boolean;
    
    // Custom rendering
    customOptionRenderer?: (environment: Environment) => string;
    customStatusRenderer?: (status: string, environment?: Environment) => string;
}

/**
 * Extended environment interface with additional metadata
 */
export interface ExtendedEnvironment extends Environment {
    // Connection status
    connectionStatus?: 'connected' | 'disconnected' | 'error' | 'testing';
    lastConnected?: Date;
    connectionError?: string;
    
    // Usage tracking
    lastUsed?: Date;
    usageCount?: number;
    isFavorite?: boolean;
    
    // Additional metadata
    description?: string;
    tags?: string[];
    color?: string;
    icon?: string;
    
    // Authentication details
    authenticationDetails?: {
        method: string;
        username?: string;
        tenantId?: string;
        lastAuth?: Date;
        tokenExpiry?: Date;
    };
    
    // Capabilities
    capabilities?: {
        canCreateSolutions?: boolean;
        canImportSolutions?: boolean;
        canExportSolutions?: boolean;
        canManageUsers?: boolean;
        canAccessDataverse?: boolean;
        canManageConnections?: boolean;
    };
    
    // Version information
    version?: {
        platform?: string;
        build?: string;
        features?: string[];
    };
}

/**
 * Event data interfaces
 */
export interface EnvironmentSelectedEvent {
    componentId: string;
    environmentId: string;
    environment: Environment;
    previousEnvironmentId?: string;
    timestamp: number;
}

export interface EnvironmentRefreshEvent {
    componentId: string;
    reason: 'user' | 'auto' | 'error' | 'focus';
    timestamp: number;
}

export interface EnvironmentConnectionTestEvent {
    componentId: string;
    environmentId: string;
    status: 'testing' | 'success' | 'failed';
    duration?: number;
    error?: string;
    timestamp: number;
}

export interface EnvironmentValidationEvent {
    componentId: string;
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_ENVIRONMENT_SELECTOR_CONFIG: Partial<EnvironmentSelectorConfig> = {
    label: 'Environment:',
    placeholder: 'Select environment...',
    showStatus: true,
    showRefreshButton: true,
    showEnvironmentInfo: false,
    showConnectionTest: false,
    required: false,
    disabled: false,
    autoSelectFirst: false,
    autoRefreshOnFocus: false,
    validateConnection: false,
    filterByStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    size: 'medium',
    variant: 'default',
    theme: 'auto',
    loadingTimeout: 10000,
    retryAttempts: 3,
    cacheEnabled: true,
    debugMode: false
};

/**
 * Validation rules for configuration
 */
export const ENVIRONMENT_SELECTOR_VALIDATION = {
    ID_MIN_LENGTH: 2,
    ID_MAX_LENGTH: 50,
    LABEL_MAX_LENGTH: 100,
    PLACEHOLDER_MAX_LENGTH: 200,
    LOADING_TIMEOUT_MIN: 1000,
    LOADING_TIMEOUT_MAX: 60000,
    RETRY_ATTEMPTS_MIN: 0,
    RETRY_ATTEMPTS_MAX: 10
};

/**
 * CSS class constants specific to EnvironmentSelector
 */
export const ENVIRONMENT_SELECTOR_CSS = {
    COMPONENT: 'environment-selector',
    CONTAINER: 'environment-selector-container',
    LABEL: 'environment-selector-label',
    SELECTOR: 'environment-selector-dropdown',
    STATUS: 'environment-selector-status',
    REFRESH: 'environment-selector-refresh',
    OPTIONS: 'environment-selector-options',
    OPTION: 'environment-selector-option',
    EMPTY: 'environment-selector-empty',
    ERROR: 'environment-selector-error',
    
    // Size variants
    SMALL: 'environment-selector--small',
    MEDIUM: 'environment-selector--medium',
    LARGE: 'environment-selector--large',
    
    // Style variants
    DEFAULT: 'environment-selector--default',
    COMPACT: 'environment-selector--compact',
    DETAILED: 'environment-selector--detailed',
    
    // State modifiers
    LOADING: 'environment-selector--loading',
    DISABLED: 'environment-selector--disabled',
    ERROR_STATE: 'environment-selector--error',
    REQUIRED: 'environment-selector--required',
    
    // Status indicators
    CONNECTED: 'environment-selector--connected',
    DISCONNECTED: 'environment-selector--disconnected',
    TESTING: 'environment-selector--testing'
};

/**
 * Helper functions for configuration validation
 */
export class EnvironmentSelectorConfigValidator {
    static validate(config: EnvironmentSelectorConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        } else if (config.id.length < ENVIRONMENT_SELECTOR_VALIDATION.ID_MIN_LENGTH || 
                   config.id.length > ENVIRONMENT_SELECTOR_VALIDATION.ID_MAX_LENGTH) {
            errors.push(`Component ID must be between ${ENVIRONMENT_SELECTOR_VALIDATION.ID_MIN_LENGTH} and ${ENVIRONMENT_SELECTOR_VALIDATION.ID_MAX_LENGTH} characters`);
        }

        // Validate label
        if (config.label && config.label.length > ENVIRONMENT_SELECTOR_VALIDATION.LABEL_MAX_LENGTH) {
            errors.push(`Label must be less than ${ENVIRONMENT_SELECTOR_VALIDATION.LABEL_MAX_LENGTH} characters`);
        }

        // Validate placeholder
        if (config.placeholder && config.placeholder.length > ENVIRONMENT_SELECTOR_VALIDATION.PLACEHOLDER_MAX_LENGTH) {
            errors.push(`Placeholder must be less than ${ENVIRONMENT_SELECTOR_VALIDATION.PLACEHOLDER_MAX_LENGTH} characters`);
        }

        // Validate callback functions
        if (config.onChange && typeof config.onChange !== 'function') {
            errors.push('onChange must be a function');
        }

        if (config.onError && typeof config.onError !== 'function') {
            errors.push('onError must be a function');
        }

        // Validate environments array
        if (config.environments && !Array.isArray(config.environments)) {
            errors.push('environments must be an array');
        }

        // Validate loading timeout
        if (config.loadingTimeout !== undefined) {
            if (typeof config.loadingTimeout !== 'number' || 
                config.loadingTimeout < ENVIRONMENT_SELECTOR_VALIDATION.LOADING_TIMEOUT_MIN ||
                config.loadingTimeout > ENVIRONMENT_SELECTOR_VALIDATION.LOADING_TIMEOUT_MAX) {
                errors.push(`Loading timeout must be between ${ENVIRONMENT_SELECTOR_VALIDATION.LOADING_TIMEOUT_MIN} and ${ENVIRONMENT_SELECTOR_VALIDATION.LOADING_TIMEOUT_MAX} milliseconds`);
            }
        }

        // Validate retry attempts
        if (config.retryAttempts !== undefined) {
            if (typeof config.retryAttempts !== 'number' ||
                config.retryAttempts < ENVIRONMENT_SELECTOR_VALIDATION.RETRY_ATTEMPTS_MIN ||
                config.retryAttempts > ENVIRONMENT_SELECTOR_VALIDATION.RETRY_ATTEMPTS_MAX) {
                errors.push(`Retry attempts must be between ${ENVIRONMENT_SELECTOR_VALIDATION.RETRY_ATTEMPTS_MIN} and ${ENVIRONMENT_SELECTOR_VALIDATION.RETRY_ATTEMPTS_MAX}`);
            }
        }

        // Validate enum values
        if (config.size && !['small', 'medium', 'large'].includes(config.size)) {
            errors.push('Size must be one of: small, medium, large');
        }

        if (config.variant && !['default', 'compact', 'detailed'].includes(config.variant)) {
            errors.push('Variant must be one of: default, compact, detailed');
        }

        if (config.theme && !['auto', 'light', 'dark'].includes(config.theme)) {
            errors.push('Theme must be one of: auto, light, dark');
        }

        // Warnings
        if (!config.environments || config.environments.length === 0) {
            warnings.push('No environments provided - component will be empty until environments are set');
        }

        if (config.required && !config.selectedEnvironmentId) {
            warnings.push('Component is required but no default environment is selected');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: EnvironmentSelectorConfig): EnvironmentSelectorConfig {
        return {
            ...config,
            id: config.id?.trim(),
            label: config.label?.trim(),
            placeholder: config.placeholder?.trim(),
            className: config.className?.trim()
        };
    }
}