// EnvironmentSetup.js - Environment setup form component

class EnvironmentSetup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
        const formData = new FormData(form);
        
        return {
            name: this.shadowRoot.getElementById('envName').value,
            dataverseUrl: this.shadowRoot.getElementById('dataverseUrl').value,
            tenantId: this.shadowRoot.getElementById('tenantId').value,
            authenticationMethod: this.shadowRoot.getElementById('authMethod').value,
            clientId: this.shadowRoot.getElementById('clientId')?.value || '',
            clientSecret: this.shadowRoot.getElementById('clientSecret')?.value || '',
            username: this.shadowRoot.getElementById('username')?.value || '',
            password: this.shadowRoot.getElementById('password')?.value || '',
            publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d' // Power Platform CLI client ID
        };
    }
    
    validateForm(data) {
        const errors = [];
        
        if (!data.name) errors.push('Environment name is required');
        if (!data.dataverseUrl) errors.push('Dataverse URL is required');
        if (!data.tenantId) errors.push('Tenant ID is required');
        if (!data.authenticationMethod) errors.push('Authentication method is required');
        
        // Validate specific auth method requirements
        switch(data.authenticationMethod) {
            case 'ServicePrincipal':
                if (!data.clientId) errors.push('Client ID is required for Service Principal');
                if (!data.clientSecret) errors.push('Client Secret is required for Service Principal');
                break;
            case 'UsernamePassword':
                if (!data.username) errors.push('Username is required for Username/Password');
                if (!data.password) errors.push('Password is required for Username/Password');
                break;
        }
        
        // Validate URL format
        try {
            new URL(data.dataverseUrl);
        } catch {
            errors.push('Invalid Dataverse URL format');
        }
        
        // Validate GUID format for tenant ID
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (data.tenantId && !guidRegex.test(data.tenantId)) {
            errors.push('Tenant ID must be a valid GUID');
        }
        
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
            // Get the VS Code API
            const vscode = acquireVsCodeApi();
            
            // Send message to extension
            vscode.postMessage({ action, data });
            
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
                case 'saveEnvironmentResponse':
                    this.disableButtons(false);
                    if (message.success) {
                        this.showMessage(message.data.message || 'Environment saved successfully!', 'success');
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
}

customElements.define('environment-setup', EnvironmentSetup);
