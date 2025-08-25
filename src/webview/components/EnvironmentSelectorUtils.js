/**
 * Environment Selector utilities for enhanced environment selector components
 * Supports multiple instances, event handling, and connection status
 */

class EnvironmentSelectorUtils {
    static selectors = new Map();
    
    /**
     * Initialize environment selector with configuration
     */
    static initializeSelector(selectorId, config = {}) {
        const selector = document.getElementById(selectorId);
        if (!selector) return;
        
        const selectorConfig = {
            id: selectorId,
            statusId: config.statusId || (selectorId === 'environmentSelect' ? 'environmentStatus' : `${selectorId}Status`),
            label: config.label || 'Environment:',
            placeholder: config.placeholder || 'Loading environments...',
            showStatus: config.showStatus !== false,
            onSelectionChange: config.onSelectionChange,
            currentEnvironmentId: null,
            environments: [],
            isLoading: false,
            ...config
        };
        
        this.selectors.set(selectorId, selectorConfig);
        
        // Set up event listeners
        selector.addEventListener('change', (e) => {
            this.handleSelectionChange(selectorId, e.target.value);
        });
        
        // Initialize with loading state
        this.setLoadingState(selectorId, true);
        
        return selectorConfig;
    }
    
    /**
     * Load environments into selector
     */
    static loadEnvironments(selectorId, environments) {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        config.environments = environments;
        config.isLoading = false;
        
        const selector = document.getElementById(selectorId);
        if (!selector) return;
        
        // Re-enable the selector
        selector.disabled = false;
        
        // Clear existing options
        selector.innerHTML = '';
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = environments.length === 0 ? 'No environments available' : 'Select an environment...';
        placeholderOption.disabled = true;
        placeholderOption.selected = !config.currentEnvironmentId;
        selector.appendChild(placeholderOption);
        
        // Add environment options
        environments.forEach(env => {
            const option = document.createElement('option');
            option.value = env.id;
            option.textContent = `${env.name} (${env.settings.dataverseUrl})`;
            option.selected = env.id === config.currentEnvironmentId;
            selector.appendChild(option);
        });
        
        // Update status
        this.updateConnectionStatus(selectorId);
    }
    
    /**
     * Set selected environment
     */
    static setSelectedEnvironment(selectorId, environmentId) {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        config.currentEnvironmentId = environmentId;
        
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.value = environmentId || '';
        }
        
        this.updateConnectionStatus(selectorId);
    }
    
    /**
     * Get selected environment
     */
    static getSelectedEnvironment(selectorId) {
        const config = this.selectors.get(selectorId);
        if (!config || !config.currentEnvironmentId) return null;
        
        return config.environments.find(env => env.id === config.currentEnvironmentId);
    }
    
    /**
     * Handle selection change
     */
    static handleSelectionChange(selectorId, environmentId) {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        const previousEnvironmentId = config.currentEnvironmentId;
        config.currentEnvironmentId = environmentId;
        
        // Update connection status
        this.updateConnectionStatus(selectorId);
        
        // Call custom handler if provided
        if (config.onSelectionChange) {
            if (typeof window[config.onSelectionChange] === 'function') {
                window[config.onSelectionChange](selectorId, environmentId, previousEnvironmentId);
            }
        }
        
        // Send message to extension
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'environmentSelectionChanged',
                selectorId: selectorId,
                environmentId: environmentId,
                previousEnvironmentId: previousEnvironmentId
            });
        }
    }
    
    /**
     * Set loading state
     */
    static setLoadingState(selectorId, isLoading) {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        config.isLoading = isLoading;
        
        const selector = document.getElementById(selectorId);
        if (!selector) return;
        
        selector.disabled = isLoading;
        
        if (isLoading) {
            selector.innerHTML = `<option value="">${config.placeholder}</option>`;
            this.updateConnectionStatus(selectorId, 'connecting');
        }
    }
    
    /**
     * Update connection status indicator
     */
    static updateConnectionStatus(selectorId, forceStatus = null) {
        const config = this.selectors.get(selectorId);
        if (!config || !config.showStatus) return;
        
        const statusElement = document.getElementById(config.statusId);
        if (!statusElement) return;
        
        let status, text, className;
        
        if (forceStatus) {
            status = forceStatus;
        } else if (config.isLoading) {
            status = 'connecting';
        } else if (config.currentEnvironmentId) {
            status = 'connected';
        } else {
            status = 'disconnected';
        }
        
        switch (status) {
            case 'connected':
                text = 'Connected';
                className = 'environment-status environment-connected';
                break;
            case 'connecting':
                text = 'Connecting...';
                className = 'environment-status environment-connecting';
                break;
            case 'error':
                text = 'Connection Error';
                className = 'environment-status environment-error';
                break;
            case 'disconnected':
            default:
                text = 'Disconnected';
                className = 'environment-status environment-disconnected';
                break;
        }
        
        statusElement.textContent = text;
        statusElement.className = className;
    }
    
    /**
     * Set connection error state
     */
    static setConnectionError(selectorId, errorMessage = 'Connection Error') {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        this.updateConnectionStatus(selectorId, 'error');
        
        // Optionally show error message
        if (config.showStatus) {
            const statusElement = document.getElementById(config.statusId);
            if (statusElement) {
                statusElement.title = errorMessage;
            }
        }
    }
    
    /**
     * Refresh environments for a selector
     */
    static refreshEnvironments(selectorId) {
        this.setLoadingState(selectorId, true);
        
        // Send message to extension to reload environments
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'refreshEnvironments',
                selectorId: selectorId
            });
        }
    }
    
    /**
     * Get all selector configurations
     */
    static getAllSelectors() {
        return Array.from(this.selectors.entries()).map(([id, config]) => ({
            id,
            ...config
        }));
    }
    
    /**
     * Clear all selectors
     */
    static clearAllSelectors() {
        this.selectors.clear();
    }
    
    /**
     * Enable/disable selector
     */
    static setEnabled(selectorId, enabled) {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.disabled = !enabled;
        }
    }
    
    /**
     * Show/hide selector
     */
    static setVisible(selectorId, visible) {
        const container = document.querySelector(`#${selectorId}`).closest('.environment-selector');
        if (container) {
            container.style.display = visible ? 'flex' : 'none';
        }
    }
    
    /**
     * Update selector label
     */
    static updateLabel(selectorId, newLabel) {
        const config = this.selectors.get(selectorId);
        if (!config) return;
        
        config.label = newLabel;
        
        const container = document.querySelector(`#${selectorId}`).closest('.environment-selector');
        if (container) {
            const labelElement = container.querySelector('.environment-label');
            if (labelElement) {
                labelElement.textContent = newLabel;
            }
        }
    }
    
    /**
     * Validate selector configuration
     */
    static validateSelector(selectorId) {
        const config = this.selectors.get(selectorId);
        if (!config) {
            console.warn(`Environment selector '${selectorId}' not found`);
            return false;
        }
        
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Environment selector element '${selectorId}' not found in DOM`);
            return false;
        }
        
        if (config.showStatus) {
            const statusElement = document.getElementById(config.statusId);
            if (!statusElement) {
                console.warn(`Environment status element '${config.statusId}' not found in DOM`);
                return false;
            }
        }
        
        return true;
    }
}

// Global convenience functions for HTML onclick handlers
function refreshEnvironments(selectorId) {
    EnvironmentSelectorUtils.refreshEnvironments(selectorId);
}

function selectEnvironment(selectorId, environmentId) {
    EnvironmentSelectorUtils.setSelectedEnvironment(selectorId, environmentId);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentSelectorUtils;
}
