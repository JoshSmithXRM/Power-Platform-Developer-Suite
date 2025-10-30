/**
 * Environment Setup Panel Behavior
 * Handles form interactions, validation, and communication with Extension Host
 */

class EnvironmentSetupBehavior {
    constructor() {
        this.vscode = acquireVsCodeApi();
        this.currentEnvironmentId = null;

        this.initializeEventListeners();
        this.initializeConditionalFields();
    }

    initializeEventListeners() {
        // Handle authentication method changes
        const authMethodSelect = document.getElementById('authenticationMethod');
        if (authMethodSelect) {
            authMethodSelect.addEventListener('change', (e) => {
                this.updateConditionalFields(e.target.value);
            });
        }

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });

        // Intercept action bar button clicks and collect form data
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action-id]');
            if (!actionBtn) return;

            const actionId = actionBtn.getAttribute('data-action-id');

            if (actionId === 'save') {
                e.stopPropagation();
                this.saveEnvironment();
            } else if (actionId === 'test') {
                e.stopPropagation();
                this.testConnection();
            } else if (actionId === 'delete') {
                e.stopPropagation();
                this.deleteEnvironment();
            } else if (actionId === 'new') {
                e.stopPropagation();
                this.vscode.postMessage({ command: 'new-environment' });
            }
        });
    }

    initializeConditionalFields() {
        // Set initial state
        const authMethodSelect = document.getElementById('authenticationMethod');
        if (authMethodSelect) {
            this.updateConditionalFields(authMethodSelect.value || 'Interactive');
        }
    }

    updateConditionalFields(authMethod) {
        // Hide all conditional fields
        document.querySelectorAll('.conditional-field').forEach(field => {
            field.classList.remove('visible');
        });

        // Show fields for selected auth method
        document.querySelectorAll(`[data-auth-method="${authMethod}"]`).forEach(field => {
            field.classList.add('visible');
        });
    }

    handleMessage(message) {
        if (!message) return;

        switch (message.action) {
            case 'component-update':
                // Action bar events handled via component-event
                break;

            case 'environment-loaded':
                this.loadEnvironmentData(message.data);
                break;

            case 'environment-saved':
                this.currentEnvironmentId = message.data?.id;
                this.updatePageTitle(message.data?.name);
                break;
        }
    }

    loadEnvironmentData(env) {
        const form = document.getElementById('environmentForm');

        if (!env) {
            // Clear form for new environment
            if (form) {
                form.reset();
            }
            this.currentEnvironmentId = null;
            this.updateConditionalFields('Interactive');
            this.updatePageTitle(null);
            return;
        }

        // Load environment data into form
        this.currentEnvironmentId = env.id;

        this.setFieldValue('name', env.name || '');
        this.setFieldValue('dataverseUrl', env.settings.dataverseUrl || '');
        this.setFieldValue('environmentId', env.environmentId || '');
        this.setFieldValue('tenantId', env.settings.tenantId || '');
        this.setFieldValue('publicClientId', env.settings.publicClientId || '');
        this.setFieldValue('authenticationMethod', env.settings.authenticationMethod || 'Interactive');
        this.setFieldValue('clientId', env.settings.clientId || '');
        this.setFieldValue('username', env.settings.username || '');

        this.updateConditionalFields(env.settings.authenticationMethod || 'Interactive');
        this.updatePageTitle(env.name);
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    updatePageTitle(environmentName) {
        const titleElement = document.getElementById('pageTitle');
        const subtitleElement = document.getElementById('pageSubtitle');

        if (titleElement && subtitleElement) {
            if (environmentName) {
                titleElement.textContent = `Edit Environment: ${environmentName}`;
                subtitleElement.textContent = 'Update authentication and connection settings';
            } else {
                titleElement.textContent = 'New Environment';
                subtitleElement.textContent = 'Configure authentication and connection settings';
            }
        }
    }

    saveEnvironment() {
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

        this.vscode.postMessage({ command: 'save-environment', data: formData });
    }

    testConnection() {
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

        this.vscode.postMessage({ command: 'test-connection', data: formData });
    }

    deleteEnvironment() {
        if (this.currentEnvironmentId) {
            this.vscode.postMessage({
                command: 'delete-environment',
                data: { environmentId: this.currentEnvironmentId }
            });
        }
    }

    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : '';
    }
}

// Initialize behavior when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new EnvironmentSetupBehavior();
    });
} else {
    new EnvironmentSetupBehavior();
}
