/**
 * WebviewStateManager - Handles persistent state management for VS Code webview panels
 * Provides automatic form data persistence with support for multiple panel instances
 */
class WebviewStateManager {
    constructor(panelId = null, vsCodeApi = null) {
        this.panelId = panelId || this.generatePanelId();
        this.vscode = vsCodeApi; // Accept existing VS Code API instance
        this.saveDebounceTimer = null;
        this.saveDelay = 500; // Debounce delay in milliseconds
        this.stateKey = `panelState_${this.panelId}`;
        
        // Only acquire API if not provided
        if (!this.vscode) {
            this.initializeVsCodeApi();
        }
        this.setupBeforeUnloadHandler();
    }

    /**
     * Initialize VS Code API connection
     */
    initializeVsCodeApi() {
        try {
            // Check if API is already available globally
            if (window.vscodeApi) {
                this.vscode = window.vscodeApi;
            } else {
                this.vscode = acquireVsCodeApi();
                // Store globally for reuse
                window.vscodeApi = this.vscode;
            }
        } catch (error) {
            console.warn('VS Code API not available:', error);
            // Try to use existing global instance
            if (window.vscodeApi) {
                this.vscode = window.vscodeApi;
            }
        }
    }

    /**
     * Generate a unique panel ID for this instance
     */
    generatePanelId() {
        return `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get the current state from VS Code webview state
     */
    getState() {
        if (!this.vscode) return {};
        
        try {
            const state = this.vscode.getState() || {};
            return state[this.stateKey] || {};
        } catch (error) {
            console.warn('Error getting webview state:', error);
            return {};
        }
    }

    /**
     * Save state to VS Code webview state (debounced)
     */
    setState(newState, immediate = false) {
        if (!this.vscode) return;

        // Clear existing timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }

        const saveFunction = () => {
            try {
                const currentFullState = this.vscode.getState() || {};
                currentFullState[this.stateKey] = { ...currentFullState[this.stateKey], ...newState };
                this.vscode.setState(currentFullState);
            } catch (error) {
                console.warn('Error setting webview state:', error);
            }
        };

        if (immediate) {
            saveFunction();
        } else {
            this.saveDebounceTimer = setTimeout(saveFunction, this.saveDelay);
        }
    }

    /**
     * Auto-bind form fields for state persistence
     */
    bindForm(formElement, options = {}) {
        if (!formElement) {
            console.warn('Form element not provided to bindForm');
            return;
        }

        const {
            includePasswords = false,
            excludeFields = [],
            onStateChange = null
        } = options;

        // Find all form inputs
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Skip excluded fields
            if (excludeFields.includes(input.id) || excludeFields.includes(input.name)) {
                return;
            }

            // Skip password fields unless explicitly included
            if (!includePasswords && input.type === 'password') {
                return;
            }

            // Add event listeners for state persistence
            const saveCurrentState = () => {
                const formData = this.getFormData(formElement, { includePasswords, excludeFields });
                this.setState({ formData });
                
                if (onStateChange) {
                    onStateChange(formData);
                }
            };

            input.addEventListener('input', saveCurrentState);
            input.addEventListener('change', saveCurrentState);
        });

        // Restore state on form bind
        this.restoreFormData(formElement, { includePasswords, excludeFields });
    }

    /**
     * Get all form data as an object
     */
    getFormData(formElement, options = {}) {
        const {
            includePasswords = false,
            excludeFields = []
        } = options;

        const formData = {};
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const fieldName = input.id || input.name;
            if (!fieldName) return;

            // Skip excluded fields
            if (excludeFields.includes(fieldName)) return;

            // Skip password fields unless explicitly included
            if (!includePasswords && input.type === 'password') return;

            // Get value based on input type
            if (input.type === 'checkbox') {
                formData[fieldName] = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    formData[fieldName] = input.value;
                }
            } else {
                formData[fieldName] = input.value;
            }
        });

        return formData;
    }

    /**
     * Restore form data from saved state
     */
    restoreFormData(formElement, options = {}) {
        const {
            includePasswords = false,
            excludeFields = []
        } = options;

        const state = this.getState();
        const formData = state.formData;
        
        if (!formData) return;

        Object.keys(formData).forEach(fieldName => {
            // Skip excluded fields
            if (excludeFields.includes(fieldName)) return;

            const input = formElement.querySelector(`#${fieldName}, [name="${fieldName}"]`);
            if (!input) return;

            // Skip password fields unless explicitly included
            if (!includePasswords && input.type === 'password') return;

            const value = formData[fieldName];

            // Set value based on input type
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else if (input.type === 'radio') {
                if (input.value === value) {
                    input.checked = true;
                }
            } else {
                input.value = value || '';
            }

            // Trigger change event to update any dependent UI
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    /**
     * Save form data immediately (useful before form submission)
     */
    saveFormData(formElement, options = {}) {
        const formData = this.getFormData(formElement, options);
        this.setState({ formData }, true); // immediate save
        return formData;
    }

    /**
     * Clear saved state for this panel
     */
    clearState() {
        if (!this.vscode) return;

        try {
            const currentFullState = this.vscode.getState() || {};
            delete currentFullState[this.stateKey];
            this.vscode.setState(currentFullState);
        } catch (error) {
            console.warn('Error clearing webview state:', error);
        }
    }

    /**
     * Set up handler to save state before the webview is disposed
     */
    setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            // Trigger immediate save before unload
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
                // Force immediate save
                this.setState({}, true);
            }
        });
    }

    /**
     * Add custom data to state (non-form data)
     */
    setCustomData(key, value) {
        this.setState({ [key]: value });
    }

    /**
     * Get custom data from state
     */
    getCustomData(key, defaultValue = null) {
        const state = this.getState();
        return state[key] !== undefined ? state[key] : defaultValue;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebviewStateManager;
}

// Global availability for script tag usage
if (typeof window !== 'undefined') {
    window.WebviewStateManager = WebviewStateManager;
}