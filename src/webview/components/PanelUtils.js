/**
 * Common panel utilities for webview panels
 * Provides shared functionality for loading states, error handling, and messaging
 */

class PanelUtils {
    /**
     * Show loading state in content area
     */
    static showLoading(containerId = 'content', message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="loading"><p>${message}</p></div>`;
        }
    }

    /**
     * Show error message in content area
     */
    static showError(message, containerId = 'content') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }

    /**
     * Show no data message in content area
     */
    static showNoData(message = 'No data available', containerId = 'content') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="no-data"><p>${message}</p></div>`;
        }
    }

    /**
     * Clear content area
     */
    static clearContent(containerId = 'content', message = 'Select an option to continue...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="loading"><p>${message}</p></div>`;
        }
    }

    /**
     * Send message to VS Code extension
     */
    static sendMessage(action, data = {}) {
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({ action, ...data });
        }
    }

    /**
     * Setup common message handling patterns
     */
    static setupMessageHandler(handlers) {
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (handlers[message.action]) {
                handlers[message.action](message);
            } else if (message.action === 'error') {
                PanelUtils.showError(message.message);
            } else {
                console.log('Unhandled message action:', message.action);
            }
        });
    }

    /**
     * Initialize common panel functionality
     */
    static initializePanel(config = {}) {
        const {
            environmentSelectorId = 'environmentSelect',
            onEnvironmentChange = null,
            loadDataFunction = null,
            clearMessage = 'Select an environment to continue...'
        } = config;

        // Setup environment selector if present
        if (document.getElementById(environmentSelectorId)) {
            EnvironmentSelectorUtils.initializeSelector(environmentSelectorId, {
                onSelectionChange: onEnvironmentChange || 'onEnvironmentChange'
            });
        }

        // Set initial state
        PanelUtils.clearContent('content', clearMessage);

        return {
            loadEnvironments: () => {
                if (document.getElementById(environmentSelectorId)) {
                    EnvironmentSelectorUtils.setLoadingState(environmentSelectorId, true);
                }
                PanelUtils.sendMessage('loadEnvironments');
            },
            
            showLoading: (message) => PanelUtils.showLoading('content', message),
            showError: (message) => PanelUtils.showError(message),
            showNoData: (message) => PanelUtils.showNoData(message),
            clearContent: (message) => PanelUtils.clearContent('content', message)
        };
    }

    /**
     * Common environment change handler
     */
    static createEnvironmentChangeHandler(loadDataFunction, clearMessage = 'Select an environment to continue...') {
        return function(selectorId, environmentId, previousEnvironmentId) {
            window.currentEnvironmentId = environmentId;
            
            if (environmentId) {
                if (typeof loadDataFunction === 'function') {
                    loadDataFunction(environmentId);
                } else if (typeof loadDataFunction === 'string') {
                    window[loadDataFunction](environmentId);
                }
            } else {
                PanelUtils.clearContent('content', clearMessage);
            }
        };
    }

    /**
     * Format date for display
     */
    static formatDate(dateString, options = {}) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        });
    }

    /**
     * Debounce function for search/filter inputs
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
