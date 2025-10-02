// EnvironmentSetup.js - Environment setup form component

class EnvironmentSetup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Initialize VS Code API once for the entire webview
        this.initializeVsCodeApi();
        
        // Initialize state manager with panel-specific ID and shared API
        const panelId = this.getAttribute('data-panel-id') || null;
        this.stateManager = new WebviewStateManager(panelId, this.vscode);
        
        // Track credential states
        this.hasStoredCredentials = { hasSecret: false, hasPassword: false };
        this.isEditing = false;
        
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: var(--vscode-font-family, 'Segoe UI', Arial, sans-serif);
                    background: var(--vscode-editor-background, #fff);
                    color: var(--vscode-editor-foreground, #323130);
                    padding: 20px;
                    max-width: 800px;
                }
                
                .form-container {
                    background: var(--vscode-editorWidget-background, #fff);
                    border: 1px solid var(--vscode-editorWidget-border, #e1e4e8);
                    border-radius: 8px;
                    padding: 32px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                
                .form-header {
                    margin-bottom: 32px;
                }
                
                .form-title {
                    font-size: 1.5em;
                    margin: 0 0 8px 0;
                    color: var(--vscode-textLink-foreground, #0078d4);
                }
                
                .form-subtitle {
                    color: var(--vscode-descriptionForeground, #6b6b6b);
                    margin: 0;
                }
                
                .form-group {
                    margin-bottom: 24px;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: var(--vscode-input-foreground, #323130);
                }
                
                .form-input, .form-select, .form-textarea {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--vscode-input-border, #ccc);
                    border-radius: 4px;
                    background: var(--vscode-input-background, #fff);
                    color: var(--vscode-input-foreground, #323130);
                    font-family: inherit;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                
                .form-input:focus, .form-select:focus, .form-textarea:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder, #0078d4);
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder, #0078d4);
                }
                
                .form-help {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground, #6b6b6b);
                    margin-top: 4px;
                }
                
                .auth-method-section {
                    border: 1px solid var(--vscode-editorWidget-border, #e1e4e8);
                    border-radius: 6px;
                    padding: 20px;
                    margin-top: 16px;
                    background: var(--vscode-editor-background, #fafafa);
                }
                
                .auth-method-title {
                    font-weight: 600;
                    margin-bottom: 16px;
                    color: var(--vscode-textLink-foreground, #0078d4);
                }
                
                .button-group {
                    display: flex;
                    gap: 12px;
                    margin-top: 32px;
                }
                
                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .btn-primary {
                    background: var(--vscode-button-background, #0078d4);
                    color: var(--vscode-button-foreground, #fff);
                }
                
                .btn-primary:hover {
                    background: var(--vscode-button-hoverBackground, #106ebe);
                }
                
                .btn-secondary {
                    background: var(--vscode-button-secondaryBackground, #e5f1fb);
                    color: var(--vscode-button-secondaryForeground, #0078d4);
                    border: 1px solid var(--vscode-button-border, transparent);
                }
                
                .btn-secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground, #d0e7fa);
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .error-message {
                    background: var(--vscode-inputValidation-errorBackground, #f2dede);
                    border: 1px solid var(--vscode-inputValidation-errorBorder, #d9534f);
                    color: var(--vscode-inputValidation-errorForeground, #d9534f);
                    padding: 12px;
                    border-radius: 4px;
                    margin: 16px 0;
                }
                
                .success-message {
                    background: var(--vscode-inputValidation-infoBackground, #28a745);
                    border: 1px solid var(--vscode-inputValidation-infoBorder, #1e7e34);
                    color: var(--vscode-button-foreground, #ffffff);
                    padding: 12px;
                    border-radius: 4px;
                    margin: 16px 0;
                }
                
                .info-message {
                    background: var(--vscode-button-background, #0078d4);
                    border: 1px solid var(--vscode-button-background, #106ebe);
                    color: var(--vscode-button-foreground, #ffffff);
                    padding: 12px;
                    border-radius: 4px;
                    margin: 16px 0;
                }
                
                .conditional-fields {
                    display: none;
                }
                
                .conditional-fields.show {
                    display: block;
                }
                
                .info-box {
                    background: var(--vscode-textBlockQuote-background, #f8f9fa);
                    border-left: 4px solid var(--vscode-textLink-foreground, #0078d4);
                    padding: 16px;
                    margin: 16px 0;
                    border-radius: 0 4px 4px 0;
                }
                
                .info-box h4 {
                    margin: 0 0 8px 0;
                    color: var(--vscode-textLink-foreground, #0078d4);
                }
                
                .info-box p {
                    margin: 0;
                    font-size: 14px;
                    line-height: 1.4;
                }
            </style>
            
            <div class="form-container">
                <div class="form-header">
                    <h1 class="form-title">Add Dynamics 365 Environment</h1>
                    <p class="form-subtitle">Connect to your Dynamics 365/Dataverse environment</p>
                </div>
                
                <form id="environmentForm">
                    <div class="form-group">
                        <label class="form-label" for="envName">Environment Name *</label>
                        <input type="text" id="envName" class="form-input" placeholder="e.g., Production, Development, UAT" required>
                        <div class="form-help">A friendly name to identify this environment</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="dataverseUrl">Dataverse URL *</label>
                        <input type="url" id="dataverseUrl" class="form-input" placeholder="https://yourorg.crm.dynamics.com" required>
                        <div class="form-help">Your Dynamics 365 environment URL (without /api/data)</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="tenantId">Azure AD Tenant ID *</label>
                        <input type="text" id="tenantId" class="form-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required>
                        <div class="form-help">Your Azure Active Directory tenant GUID</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="environmentId">Environment ID (Optional)</label>
                        <input type="text" id="environmentId" class="form-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        <div class="form-help">Power Platform Environment GUID - Get this from the URL when you visit <strong>make.powerapps.com</strong> (e.g., make.powerapps.com/environments/<strong>your-env-id-here</strong>)</div>
                    </div>
                    
                    <div class="info-box">
                        <h4>How to find your Environment ID:</h4>
                        <p>1. Go to <strong><a href="https://make.powerapps.com" target="_blank">make.powerapps.com</a></strong><br>
                        2. Select your environment from the environment picker<br>
                        3. Look at the URL - it will show: <code>make.powerapps.com/environments/<strong>your-environment-id</strong></code><br>
                        4. Copy the GUID after "/environments/" and paste it above<br>
                        <br><strong>Note:</strong> Environment ID is optional but recommended for direct links to Power Platform maker portal.</p>
                    </div>
                    
                    <div class="info-box">
                        <h4>How to find your Tenant ID:</h4>
                        <p>1. Go to <strong>Azure Portal → Azure Active Directory → Properties</strong><br>
                        2. Or use PowerShell: <code>Get-AzureADTenantDetail | Select ObjectId</code><br>
                        3. Or visit <code>https://login.microsoftonline.com/yourorg.onmicrosoft.com/.well-known/openid_configuration</code></p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="authMethod">Authentication Method *</label>
                        <select id="authMethod" class="form-select" required>
                            <option value="">Select authentication method...</option>
                            <option value="ServicePrincipal">Service Principal (Recommended for automation)</option>
                            <option value="DeviceCode">Device Code (Recommended for development)</option>
                            <option value="Interactive">Interactive (Browser-based)</option>
                            <option value="UsernamePassword">Username/Password (Legacy - No MFA)</option>
                        </select>
                    </div>
                    
                    <!-- Service Principal Fields -->
                    <div id="servicePrincipalFields" class="conditional-fields">
                        <div class="auth-method-section">
                            <div class="auth-method-title">Service Principal Configuration</div>
                            <div class="form-group">
                                <label class="form-label" for="clientId">Application (Client) ID *</label>
                                <input type="text" id="clientId" class="form-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                                <div class="form-help">The Application ID from your Azure AD App Registration</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="clientSecret">Client Secret *</label>
                                <input type="password" id="clientSecret" class="form-input" placeholder="Enter client secret">
                                <div class="form-help">Client secret from your App Registration (securely stored in VS Code)</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Username/Password Fields -->
                    <div id="usernamePasswordFields" class="conditional-fields">
                        <div class="auth-method-section">
                            <div class="auth-method-title">Username/Password Configuration</div>
                            <div class="form-group">
                                <label class="form-label" for="username">Username *</label>
                                <input type="email" id="username" class="form-input" placeholder="user@yourdomain.com">
                                <div class="form-help">Your user principal name (UPN)</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="password">Password *</label>
                                <input type="password" id="password" class="form-input" placeholder="Enter password">
                                <div class="form-help">Password (securely stored in VS Code). Note: Does not support MFA.</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Device Code Info -->
                    <div id="deviceCodeFields" class="conditional-fields">
                        <div class="auth-method-section">
                            <div class="auth-method-title">Device Code Authentication</div>
                            <div class="info-box">
                                <h4>Device Code Flow</h4>
                                <p>This method will show you a code to enter on another device/browser. Perfect for development and supports MFA.</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Interactive Info -->
                    <div id="interactiveFields" class="conditional-fields">
                        <div class="auth-method-section">
                            <div class="auth-method-title">Interactive Authentication</div>
                            <div class="info-box">
                                <h4>Browser Authentication</h4>
                                <p>Opens your default browser for secure authentication. Supports MFA and is user-friendly. 
                                You'll get a device code to enter in your browser for authentication.</p>
                                <p><strong>Best for:</strong> Individual users with MFA enabled or when you want the most secure authentication flow.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="messageContainer"></div>
                    
                    <div class="button-group">
                        <button type="submit" class="btn btn-primary" id="saveBtn">Save Environment</button>
                        <button type="button" class="btn btn-secondary" id="testBtn">Test Connection</button>
                        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        this.setupEvents();
        this.setupFormStatePersistence();
    }
    
    /**
     * Initialize VS Code API - only called once per webview
     */
    initializeVsCodeApi() {
        try {
            // Check if already initialized globally
            if (window.vscodeApi) {
                this.vscode = window.vscodeApi;
            } else {
                this.vscode = acquireVsCodeApi();
                // Store globally to prevent multiple acquisitions
                window.vscodeApi = this.vscode;
            }
        } catch (error) {
            console.warn('Failed to acquire VS Code API:', error);
            // Try to use existing global instance
            if (window.vscodeApi) {
                this.vscode = window.vscodeApi;
            }
        }
    }
    
    setupEvents() {
        const form = this.shadowRoot.getElementById('environmentForm');
        const authMethodSelect = this.shadowRoot.getElementById('authMethod');
        const saveBtn = this.shadowRoot.getElementById('saveBtn');
        const testBtn = this.shadowRoot.getElementById('testBtn');
        const cancelBtn = this.shadowRoot.getElementById('cancelBtn');
        
        // Handle authentication method change
        authMethodSelect.addEventListener('change', (e) => {
            this.showAuthMethodFields(e.target.value);
        });
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEnvironment();
        });
        
        // Handle test connection
        testBtn.addEventListener('click', () => {
            this.testConnection();
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            this.sendMessage('cancel');
        });
        
        // Set up message listener for extension responses
        this.setupMessageListener();
    }
    
    setupFormStatePersistence() {
        const form = this.shadowRoot.getElementById('environmentForm');
        if (!form) return;
        
        // Bind form to state manager with specific options
        this.stateManager.bindForm(form, {
            includePasswords: false, // Never persist passwords
            excludeFields: ['clientSecret'], // Never persist client secrets
            onStateChange: (formData) => {
                console.log('Form state saved:', Object.keys(formData));
            }
        });
        
        // Auto-save form data more frequently for better UX
        form.addEventListener('input', () => {
            this.stateManager.saveFormData(form, {
                includePasswords: false,
                excludeFields: ['clientSecret']
            });
        });
    }
    
    showAuthMethodFields(method) {
        // Hide all conditional fields
        const allFields = this.shadowRoot.querySelectorAll('.conditional-fields');
        allFields.forEach(field => field.classList.remove('show'));
        
        // Show specific fields based on method
        switch(method) {
            case 'ServicePrincipal':
                this.shadowRoot.getElementById('servicePrincipalFields').classList.add('show');
                break;
            case 'UsernamePassword':
                this.shadowRoot.getElementById('usernamePasswordFields').classList.add('show');
                break;
            case 'DeviceCode':
                this.shadowRoot.getElementById('deviceCodeFields').classList.add('show');
                break;
            case 'Interactive':
                this.shadowRoot.getElementById('interactiveFields').classList.add('show');
                break;
        }
    }
    
    async saveEnvironment() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }
        
        // Save current form state before submitting
        this.stateManager.saveFormData(this.shadowRoot.getElementById('environmentForm'), {
            includePasswords: false,
            excludeFields: ['clientSecret']
        });
        
        this.showMessage('Saving environment...', 'info');
        this.disableButtons(true);
        
        this.sendMessage('saveEnvironment', formData);
    }
    
    testConnection() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }
        
        this.showMessage('Testing connection...', 'info');
        this.disableButtons(true);
        
        this.sendMessage('testConnection', formData);
    }
    
    getFormData() {
        const form = this.shadowRoot.getElementById('environmentForm');
        
        const formData = {
            name: this.shadowRoot.getElementById('envName').value,
            dataverseUrl: this.shadowRoot.getElementById('dataverseUrl').value,
            tenantId: this.shadowRoot.getElementById('tenantId').value,
            environmentId: this.shadowRoot.getElementById('environmentId').value,
            authenticationMethod: this.shadowRoot.getElementById('authMethod').value,
            clientId: this.shadowRoot.getElementById('clientId')?.value || '',
            clientSecret: this.shadowRoot.getElementById('clientSecret')?.value || '',
            username: this.shadowRoot.getElementById('username')?.value || '',
            password: this.shadowRoot.getElementById('password')?.value || '',
            publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d' // Power Platform CLI client ID
        };
        
        // If editing and credential fields are empty, don't send them (preserve existing)
        if (this.isEditing) {
            if (!formData.clientSecret && this.hasStoredCredentials.hasSecret) {
                delete formData.clientSecret; // Don't send empty credential - preserve existing
            }
            
            if (!formData.password && this.hasStoredCredentials.hasPassword) {
                delete formData.password; // Don't send empty password - preserve existing
            }
        }
        
        return formData;
    }
    
    validateForm(data) {
        // Define validation rules
        const validationRules = {
            name: {
                required: true,
                label: 'Environment name'
            },
            dataverseUrl: {
                required: true,
                dataverseUrl: true,
                label: 'Dataverse URL'
            },
            tenantId: {
                required: true,
                guid: true,
                label: 'Tenant ID'
            },
            environmentId: {
                required: false,
                guid: true,
                label: 'Environment ID'
            },
            authenticationMethod: {
                required: true,
                label: 'Authentication method'
            }
        };

        // Add conditional validation rules based on auth method
        switch(data.authenticationMethod) {
            case 'ServicePrincipal':
                validationRules.clientId = {
                    required: true,
                    guid: true,
                    label: 'Client ID'
                };
                // Only require client secret if we're not editing or if we don't have stored credentials
                validationRules.clientSecret = {
                    required: !this.isEditing || !this.hasStoredCredentials.hasSecret,
                    label: 'Client Secret'
                };
                break;
            case 'UsernamePassword':
                validationRules.username = {
                    required: true,
                    email: true,
                    label: 'Username'
                };
                // Only require password if we're not editing or if we don't have stored credentials
                validationRules.password = {
                    required: !this.isEditing || !this.hasStoredCredentials.hasPassword,
                    label: 'Password'
                };
                break;
        }

        // Validate using shared utility
        const errors = ValidationUtils.validateFields(data, validationRules);
        
        if (errors.length > 0) {
            this.showMessage(errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    showMessage(message, type = 'info') {
        const container = this.shadowRoot.getElementById('messageContainer');
        let className;
        
        switch(type) {
            case 'error':
                className = 'error-message';
                break;
            case 'success':
                className = 'success-message';
                break;
            case 'info':
            default:
                className = 'info-message';
                break;
        }
        
        container.innerHTML = `<div class="${className}">${message}</div>`;
    }
    
    disableButtons(disabled) {
        this.shadowRoot.getElementById('saveBtn').disabled = disabled;
        this.shadowRoot.getElementById('testBtn').disabled = disabled;
    }
    
    sendMessage(action, data = null) {
        try {
            // Use the shared VS Code API instance
            if (!this.vscode) {
                throw new Error('VS Code API not available');
            }
            
            // Send message to extension
            this.vscode.postMessage({ action, data });
            
            console.log('Sent message:', action, data);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showMessage('Failed to communicate with extension: ' + error.message, 'error');
        }
    }

    // Set up message listener for responses from extension
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            console.log('Received message:', message);
            
            switch (message.action) {
                case 'populateForm':
                    this.isEditing = true;
                    this.hasStoredCredentials = message.hasStoredCredentials || { hasSecret: false, hasPassword: false };
                    this.populateFormWithEnvironment(message.environment);
                    break;
                case 'saveEnvironmentResponse':
                    this.disableButtons(false);
                    if (message.success) {
                        this.showMessage(message.data.message || 'Environment saved successfully!', 'success');
                        // Clear form state on successful save
                        this.stateManager.clearState();
                    } else {
                        this.showMessage('Error: ' + (message.error || 'Unknown error occurred'), 'error');
                    }
                    break;
                    
                case 'testConnectionResponse':
                    this.disableButtons(false);
                    if (message.success) {
                        this.showMessage(message.data.message || 'Connection test successful!', 'success');
                    } else {
                        this.showMessage('Connection failed: ' + (message.error || 'Unknown error'), 'error');
                    }
                    break;
            }
        });
    }

    populateFormWithEnvironment(environment) {
        if (!environment) return;
        
        // Update form title
        const formTitle = this.shadowRoot.querySelector('.form-title');
        if (formTitle) {
            formTitle.textContent = 'Edit Dynamics 365 Environment';
        }
        
        const formSubtitle = this.shadowRoot.querySelector('.form-subtitle');
        if (formSubtitle) {
            formSubtitle.textContent = 'Update your Dynamics 365/Dataverse environment settings';
        }
        
        // Update button text
        const saveBtn = this.shadowRoot.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Update Environment';
        }
        
        // Clear any persisted state since we're populating from server data
        this.stateManager.clearState();
        
        // Populate basic fields
        this.shadowRoot.getElementById('envName').value = environment.name || '';
        this.shadowRoot.getElementById('dataverseUrl').value = environment.settings.dataverseUrl || '';
        this.shadowRoot.getElementById('tenantId').value = environment.settings.tenantId || '';
        this.shadowRoot.getElementById('environmentId').value = environment.environmentId || '';
        
        // Set authentication method
        const authMethodSelect = this.shadowRoot.getElementById('authMethod');
        authMethodSelect.value = environment.settings.authenticationMethod || '';
        
        // Trigger the change event to show the right fields
        authMethodSelect.dispatchEvent(new Event('change'));
        
        // Wait a bit for the conditional fields to be shown, then populate them
        setTimeout(() => {
            if (environment.settings.clientId) {
                const clientIdField = this.shadowRoot.getElementById('clientId');
                if (clientIdField) clientIdField.value = environment.settings.clientId;
            }
            
            if (environment.settings.username) {
                const usernameField = this.shadowRoot.getElementById('username');
                if (usernameField) usernameField.value = environment.settings.username;
            }
            
            // Handle credential fields with placeholder text if credentials exist
            this.updateCredentialFields();
        }, 50);
    }
    
    updateCredentialFields() {
        // Update client secret field
        const clientSecretField = this.shadowRoot.getElementById('clientSecret');
        if (clientSecretField && this.hasStoredCredentials.hasSecret) {
            clientSecretField.placeholder = '••••••••••••••• (stored securely - leave blank to keep existing)';
            clientSecretField.title = 'Current client secret is stored securely. Leave blank to keep the existing secret.';
        }
        
        // Update password field
        const passwordField = this.shadowRoot.getElementById('password');
        if (passwordField && this.hasStoredCredentials.hasPassword) {
            passwordField.placeholder = '••••••••••••••• (stored securely - leave blank to keep existing)';
            passwordField.title = 'Current password is stored securely. Leave blank to keep the existing password.';
        }
    }
}

customElements.define('environment-setup', EnvironmentSetup);
