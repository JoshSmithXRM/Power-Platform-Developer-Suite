/**
 * Environment Setup Panel Behavior
 * Handles form interactions, validation, and communication with Extension Host
 */

class EnvironmentSetupBehavior extends BaseBehavior {
    /**
     * Get the component type this behavior handles
     */
    static getComponentType() {
        return 'EnvironmentSetupPanel';
    }

    /**
     * Create instance with panel-specific state
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,
            boundHandlers: {},
            vscode: acquireVsCodeApi(),
            currentEnvironmentId: null
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        instance.authMethodSelect = document.getElementById('authenticationMethod');
        instance.form = document.getElementById('environmentForm');
        instance.titleElement = document.getElementById('pageTitle');
        instance.subtitleElement = document.getElementById('pageSubtitle');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        // Handle authentication method changes
        if (instance.authMethodSelect) {
            instance.boundHandlers.authMethodChange = (e) => {
                this.updateConditionalFields(instance, e.target.value);
            };
            instance.authMethodSelect.addEventListener('change', instance.boundHandlers.authMethodChange);
        }

        // Handle messages from extension
        instance.boundHandlers.messageHandler = (event) => {
            this.handleMessage(event.data);
        };
        window.addEventListener('message', instance.boundHandlers.messageHandler);

        // Intercept action bar button clicks and collect form data
        instance.boundHandlers.clickHandler = (e) => {
            const actionBtn = e.target.closest('[data-action-id]');
            if (!actionBtn) return;

            const actionId = actionBtn.getAttribute('data-action-id');

            if (actionId === 'save') {
                e.stopPropagation();
                this.saveEnvironment(instance);
            } else if (actionId === 'test') {
                e.stopPropagation();
                this.testConnection(instance);
            } else if (actionId === 'delete') {
                e.stopPropagation();
                this.deleteEnvironment(instance);
            } else if (actionId === 'new') {
                e.stopPropagation();
                instance.vscode.postMessage({ command: 'new-environment' });
            }
        };
        document.addEventListener('click', instance.boundHandlers.clickHandler);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        // Set initial conditional fields state
        if (instance.authMethodSelect) {
            this.updateConditionalFields(instance, instance.authMethodSelect.value || 'Interactive');
        }
    }

    /**
     * Handle component data updates from Extension Host
     */
    static onComponentUpdate(instance, data) {
        // This panel doesn't use standard component-update pattern
        // Updates come through custom messages (environment-loaded, environment-saved)
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.command) {
            case 'environment-loaded':
                this.loadEnvironmentData(instance, message.data);
                break;

            case 'environment-saved':
                instance.currentEnvironmentId = message.data?.id;
                this.updatePageTitle(instance, message.data?.name);
                break;

            default:
                super.handleCustomAction(instance, message);
                break;
        }
    }

    /**
     * Update conditional fields visibility based on auth method
     */
    static updateConditionalFields(instance, authMethod) {
        // Hide all conditional fields
        document.querySelectorAll('.conditional-field').forEach(field => {
            field.classList.remove('visible');
        });

        // Show fields for selected auth method
        document.querySelectorAll(`[data-auth-method="${authMethod}"]`).forEach(field => {
            field.classList.add('visible');
        });
    }

    /**
     * Load environment data into form
     */
    static loadEnvironmentData(instance, env) {
        if (!env) {
            // Clear form for new environment
            if (instance.form) {
                instance.form.reset();
            }
            instance.currentEnvironmentId = null;
            this.updateConditionalFields(instance, 'Interactive');
            this.updatePageTitle(instance, null);
            return;
        }

        // Load environment data into form
        instance.currentEnvironmentId = env.id;

        this.setFieldValue('name', env.name || '');
        this.setFieldValue('dataverseUrl', env.settings.dataverseUrl || '');
        this.setFieldValue('environmentId', env.environmentId || '');
        this.setFieldValue('tenantId', env.settings.tenantId || '');
        this.setFieldValue('publicClientId', env.settings.publicClientId || '');
        this.setFieldValue('authenticationMethod', env.settings.authenticationMethod || 'Interactive');
        this.setFieldValue('clientId', env.settings.clientId || '');
        this.setFieldValue('username', env.settings.username || '');

        this.updateConditionalFields(instance, env.settings.authenticationMethod || 'Interactive');
        this.updatePageTitle(instance, env.name);
    }

    /**
     * Set form field value
     */
    static setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    /**
     * Get form field value
     */
    static getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : '';
    }

    /**
     * Update page title based on environment name
     */
    static updatePageTitle(instance, environmentName) {
        if (instance.titleElement && instance.subtitleElement) {
            if (environmentName) {
                instance.titleElement.textContent = `Edit Environment: ${environmentName}`;
                instance.subtitleElement.textContent = 'Update authentication and connection settings';
            } else {
                instance.titleElement.textContent = 'New Environment';
                instance.subtitleElement.textContent = 'Configure authentication and connection settings';
            }
        }
    }

    /**
     * Save environment data
     */
    static saveEnvironment(instance) {
        const formData = {
            name: this.getFieldValue('name'),
            dataverseUrl: this.getFieldValue('dataverseUrl'),
            environmentId: this.getFieldValue('environmentId'),
            tenantId: this.getFieldValue('tenantId'),
            publicClientId: this.getFieldValue('publicClientId'),
            authenticationMethod: this.getFieldValue('authenticationMethod'),
            clientId: this.getFieldValue('clientId'),
            clientSecret: this.getFieldValue('clientSecret'),
            username: this.getFieldValue('username'),
            password: this.getFieldValue('password')
        };

        instance.vscode.postMessage({ command: 'save-environment', data: formData });
    }

    /**
     * Test connection with current form data
     */
    static testConnection(instance) {
        const formData = {
            dataverseUrl: this.getFieldValue('dataverseUrl'),
            tenantId: this.getFieldValue('tenantId'),
            publicClientId: this.getFieldValue('publicClientId'),
            authenticationMethod: this.getFieldValue('authenticationMethod'),
            clientId: this.getFieldValue('clientId'),
            clientSecret: this.getFieldValue('clientSecret'),
            username: this.getFieldValue('username'),
            password: this.getFieldValue('password')
        };

        instance.vscode.postMessage({ command: 'test-connection', data: formData });
    }

    /**
     * Delete current environment
     */
    static deleteEnvironment(instance) {
        if (instance.currentEnvironmentId) {
            instance.vscode.postMessage({
                command: 'delete-environment',
                data: { environmentId: instance.currentEnvironmentId }
            });
        }
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Remove event listeners
        if (instance.authMethodSelect && instance.boundHandlers.authMethodChange) {
            instance.authMethodSelect.removeEventListener('change', instance.boundHandlers.authMethodChange);
        }
        if (instance.boundHandlers.messageHandler) {
            window.removeEventListener('message', instance.boundHandlers.messageHandler);
        }
        if (instance.boundHandlers.clickHandler) {
            document.removeEventListener('click', instance.boundHandlers.clickHandler);
        }
    }
}

// Register behavior
EnvironmentSetupBehavior.register();

// Initialize panel instance when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        EnvironmentSetupBehavior.initialize('environmentSetupPanel', {}, document.body);
    });
} else {
    EnvironmentSetupBehavior.initialize('environmentSetupPanel', {}, document.body);
}
