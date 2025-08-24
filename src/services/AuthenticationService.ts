import * as vscode from 'vscode';
import * as msal from '@azure/msal-node';
import storage from 'node-persist';
import * as path from 'path';
import * as os from 'os';
import { PowerPlatformSettings, EnvironmentConnection } from '../models/PowerPlatformSettings';
import { AuthenticationMethod } from '../models/AuthenticationMethod';
import { AuthenticationResult, TokenCacheEntry } from '../models/AuthenticationResult';

export class AuthenticationService {
    private static instance: AuthenticationService;
    private tokenStorage: any;
    private secretStorage: vscode.SecretStorage;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.secretStorage = context.secrets;
        this.initializeStorage();
    }

    public static getInstance(context: vscode.ExtensionContext): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService(context);
        }
        return AuthenticationService.instance;
    }

    private async initializeStorage(): Promise<void> {
        try {
            const cacheDir = path.join(os.homedir(), '.dynamics-devtools', 'cache');
            this.tokenStorage = storage.create({
                dir: cacheDir,
                stringify: JSON.stringify,
                parse: JSON.parse,
                encoding: 'utf8',
                logging: false,
                ttl: false,
                expiredInterval: 2 * 60 * 1000,
                forgiveParseErrors: false
            });
            
            await this.tokenStorage.init();
        } catch (error) {
            console.error('Failed to initialize token storage:', error);
        }
    }

    public async getAuthenticatedHttpHeaders(environmentId: string): Promise<{ [key: string]: string }> {
        const token = await this.getAccessToken(environmentId);
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Content-Type': 'application/json'
        };
    }

    public async getAccessToken(environmentId: string): Promise<string> {
        // Try to get cached token first
        const cachedToken = await this.getCachedToken(environmentId);
        if (cachedToken && this.isTokenValid(cachedToken.authResult)) {
            return cachedToken.authResult.accessToken;
        }

        // Get environment settings
        const environment = await this.getEnvironmentSettings(environmentId);
        if (!environment) {
            throw new Error(`Environment ${environmentId} not found`);
        }

        // Authenticate based on method
        const authResult = await this.authenticate(environment.settings);
        
        // Cache the new token
        await this.cacheToken(environmentId, authResult);
        
        return authResult.accessToken;
    }

    private async authenticate(settings: PowerPlatformSettings): Promise<AuthenticationResult> {
        const scopes = [`${settings.dataverseUrl}/.default`];

        switch (settings.authenticationMethod) {
            case AuthenticationMethod.ServicePrincipal:
                return await this.authenticateServicePrincipal(settings, scopes);
            case AuthenticationMethod.Interactive:
                return await this.authenticateInteractive(settings, scopes);
            case AuthenticationMethod.UsernamePassword:
                return await this.authenticateUsernamePassword(settings, scopes);
            case AuthenticationMethod.DeviceCode:
                return await this.authenticateDeviceCode(settings, scopes);
            default:
                throw new Error(`Authentication method ${settings.authenticationMethod} is not supported`);
        }
    }

    private async authenticateServicePrincipal(settings: PowerPlatformSettings, scopes: string[]): Promise<AuthenticationResult> {
        if (!settings.clientId) {
            throw new Error('ClientId is required for Service Principal authentication');
        }

        // Get client secret from secure storage
        const clientSecret = await this.secretStorage.get(`dynamics-devtools-secret-${settings.clientId}`);
        if (!clientSecret) {
            throw new Error('Client secret not found in secure storage. Please re-add the environment.');
        }

        const clientConfig: msal.Configuration = {
            auth: {
                clientId: settings.clientId,
                clientSecret: clientSecret,
                authority: `https://login.microsoftonline.com/${settings.tenantId}`
            }
        };

        const clientApp = new msal.ConfidentialClientApplication(clientConfig);
        
        try {
            const clientCredentialRequest: msal.ClientCredentialRequest = {
                scopes: scopes,
            };

            const response = await clientApp.acquireTokenByClientCredential(clientCredentialRequest);
            if (!response) {
                throw new Error('Failed to acquire token');
            }

            return {
                accessToken: response.accessToken,
                expiresOn: response.expiresOn || new Date(Date.now() + 3600000),
                account: {
                    username: 'Service Principal',
                    tenantId: settings.tenantId
                }
            };
        } catch (error: any) {
            throw new Error(`Service Principal authentication failed: ${error.message}`);
        }
    }

    private async authenticateInteractive(settings: PowerPlatformSettings, scopes: string[]): Promise<AuthenticationResult> {
        try {
            // Use VS Code's built-in authentication API for true interactive auth
            const session = await vscode.authentication.getSession('microsoft', scopes, {
                createIfNone: true,
                clearSessionPreference: false,
                silent: false
            });

            if (!session) {
                throw new Error('Failed to authenticate with Microsoft');
            }

            return {
                accessToken: session.accessToken,
                expiresOn: new Date(Date.now() + 3600000), // Default 1 hour
                account: {
                    username: session.account.label,
                    tenantId: settings.tenantId
                }
            };
        } catch (error: any) {
            // If VS Code auth fails, fall back to manual implementation
            console.log('VS Code authentication failed, falling back to manual auth:', error.message);
            
            // Manual interactive auth using authorization code flow
            return await this.authenticateInteractiveManual(settings, scopes);
        }
    }

    private async authenticateInteractiveManual(settings: PowerPlatformSettings, scopes: string[]): Promise<AuthenticationResult> {
        // Create the authorization URL
        const authUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/authorize?` +
            `client_id=${encodeURIComponent(settings.publicClientId)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent('http://localhost:8080/auth/callback')}&` +
            `scope=${encodeURIComponent(scopes.join(' '))}&` +
            `response_mode=query&` +
            `state=${encodeURIComponent('vscode-auth')}&` +
            `prompt=select_account`;

        // Show message and open browser
        vscode.window.showInformationMessage(
            'Complete authentication in your browser. You will be redirected back to VS Code.',
            'Open Browser'
        ).then(selection => {
            if (selection === 'Open Browser') {
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            }
        });

        // Open browser automatically
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));

        // For now, show instructions for manual completion
        const authCode = await vscode.window.showInputBox({
            prompt: 'After signing in, you\'ll be redirected to a localhost page. Copy the "code" parameter from the URL and paste it here.',
            placeHolder: 'Paste the authorization code here...',
            ignoreFocusOut: true
        });

        if (!authCode) {
            throw new Error('Authentication cancelled by user');
        }

        // Exchange the code for tokens
        const clientConfig: msal.Configuration = {
            auth: {
                clientId: settings.publicClientId,
                authority: `https://login.microsoftonline.com/${settings.tenantId}`
            }
        };

        const clientApp = new msal.PublicClientApplication(clientConfig);

        try {
            const tokenRequest = {
                scopes: scopes,
                code: authCode,
                redirectUri: 'http://localhost:8080/auth/callback'
            };

            const response = await clientApp.acquireTokenByCode(tokenRequest);
            if (!response) {
                throw new Error('Failed to acquire token');
            }

            return {
                accessToken: response.accessToken,
                expiresOn: response.expiresOn || new Date(Date.now() + 3600000),
                account: {
                    username: response.account?.username || 'interactive-user',
                    tenantId: settings.tenantId
                }
            };
        } catch (error: any) {
            throw new Error(`Interactive authentication failed: ${error.message}`);
        }
    }

    private async authenticateUsernamePassword(settings: PowerPlatformSettings, scopes: string[]): Promise<AuthenticationResult> {
        if (!settings.username) {
            throw new Error('Username is required for Username/Password authentication');
        }

        // Get password from secure storage
        const password = await this.secretStorage.get(`dynamics-devtools-password-${settings.username}`);
        if (!password) {
            throw new Error('Password not found in secure storage. Please re-add the environment.');
        }

        const clientConfig: msal.Configuration = {
            auth: {
                clientId: settings.publicClientId,
                authority: `https://login.microsoftonline.com/${settings.tenantId}`
            }
        };

        const clientApp = new msal.PublicClientApplication(clientConfig);

        try {
            const usernamePasswordRequest: msal.UsernamePasswordRequest = {
                scopes: scopes,
                username: settings.username,
                password: password,
            };

            const response = await clientApp.acquireTokenByUsernamePassword(usernamePasswordRequest);
            if (!response) {
                throw new Error('Failed to acquire token');
            }

            return {
                accessToken: response.accessToken,
                expiresOn: response.expiresOn || new Date(Date.now() + 3600000),
                account: {
                    username: response.account?.username || settings.username,
                    tenantId: settings.tenantId
                }
            };
        } catch (error: any) {
            throw new Error(`Username/Password authentication failed: ${error.message}. Note: This method does not support MFA.`);
        }
    }

    private async authenticateDeviceCode(settings: PowerPlatformSettings, scopes: string[]): Promise<AuthenticationResult> {
        const clientConfig: msal.Configuration = {
            auth: {
                clientId: settings.publicClientId,
                authority: `https://login.microsoftonline.com/${settings.tenantId}`
            }
        };

        const clientApp = new msal.PublicClientApplication(clientConfig);

        try {
            const deviceCodeRequest: msal.DeviceCodeRequest = {
                scopes: scopes,
                deviceCodeCallback: (response) => {
                    vscode.window.showInformationMessage(
                        `Device Code Authentication Required`,
                        { modal: true },
                        'Open Browser'
                    ).then(selection => {
                        if (selection === 'Open Browser') {
                            vscode.env.openExternal(vscode.Uri.parse(response.verificationUri));
                        }
                    });
                    
                    vscode.window.showInformationMessage(
                        `Go to ${response.verificationUri} and enter code: ${response.userCode}`
                    );
                }
            };

            const response = await clientApp.acquireTokenByDeviceCode(deviceCodeRequest);
            if (!response) {
                throw new Error('Failed to acquire token');
            }

            return {
                accessToken: response.accessToken,
                expiresOn: response.expiresOn || new Date(Date.now() + 3600000),
                account: {
                    username: response.account?.username || 'Unknown',
                    tenantId: settings.tenantId
                }
            };
        } catch (error: any) {
            throw new Error(`Device Code authentication failed: ${error.message}`);
        }
    }

    private async getCachedToken(environmentId: string): Promise<TokenCacheEntry | null> {
        try {
            if (!this.tokenStorage) return null;
            const cacheKey = `token-${environmentId}`;
            const cached = await this.tokenStorage.getItem(cacheKey);
            return cached as TokenCacheEntry | null;
        } catch (error) {
            console.log('Error getting cached token:', error);
            return null;
        }
    }

    private async cacheToken(environmentId: string, authResult: AuthenticationResult): Promise<void> {
        try {
            if (!this.tokenStorage) return;
            const cacheEntry: TokenCacheEntry = {
                environmentId,
                authResult,
                createdAt: new Date()
            };
            
            const cacheKey = `token-${environmentId}`;
            await this.tokenStorage.setItem(cacheKey, cacheEntry);
        } catch (error) {
            console.log('Error caching token:', error);
        }
    }

    private isTokenValid(authResult: AuthenticationResult): boolean {
        if (!authResult.expiresOn) {
            return false;
        }
        
        // Check if token expires within the next 5 minutes
        const bufferTime = 5 * 60 * 1000;
        const expiryTime = new Date(authResult.expiresOn).getTime();
        const currentTime = Date.now();
        
        return (expiryTime - currentTime) > bufferTime;
    }

    // Environment management methods
    public async saveEnvironmentSettings(environment: EnvironmentConnection): Promise<void> {
        const environments = await this.getEnvironments();
        const existingIndex = environments.findIndex(env => env.id === environment.id);
        
        if (existingIndex >= 0) {
            environments[existingIndex] = environment;
        } else {
            environments.push(environment);
        }

        // Store sensitive data in VS Code secret storage
        if (environment.settings.clientSecret) {
            await this.secretStorage.store(
                `dynamics-devtools-secret-${environment.settings.clientId}`,
                environment.settings.clientSecret
            );
            // Remove secret from settings object before storing
            const settingsToStore = { ...environment.settings };
            delete settingsToStore.clientSecret;
            environment.settings = settingsToStore;
        }

        if (environment.settings.password) {
            await this.secretStorage.store(
                `dynamics-devtools-password-${environment.settings.username}`,
                environment.settings.password
            );
            // Remove password from settings object before storing
            const settingsToStore = { ...environment.settings };
            delete settingsToStore.password;
            environment.settings = settingsToStore;
        }

        await this.context.globalState.update('dynamics-devtools-environments', environments);
    }

    public async getEnvironments(): Promise<EnvironmentConnection[]> {
        return this.context.globalState.get('dynamics-devtools-environments', []);
    }

    public async getEnvironmentSettings(environmentId: string): Promise<EnvironmentConnection | null> {
        const environments = await this.getEnvironments();
        return environments.find(env => env.id === environmentId) || null;
    }

    public async removeEnvironment(environmentId: string): Promise<void> {
        const environments = await this.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);
        
        if (environment) {
            // Remove secrets from VS Code secret storage
            if (environment.settings.clientId) {
                await this.secretStorage.delete(`dynamics-devtools-secret-${environment.settings.clientId}`);
            }
            if (environment.settings.username) {
                await this.secretStorage.delete(`dynamics-devtools-password-${environment.settings.username}`);
            }
            
            // Remove cached tokens
            if (this.tokenStorage) {
                await this.tokenStorage.removeItem(`token-${environmentId}`);
            }
        }

        const updatedEnvironments = environments.filter(env => env.id !== environmentId);
        await this.context.globalState.update('dynamics-devtools-environments', updatedEnvironments);
    }

    public async clearAllTokens(): Promise<void> {
        if (this.tokenStorage) {
            await this.tokenStorage.clear();
        }
    }
}
