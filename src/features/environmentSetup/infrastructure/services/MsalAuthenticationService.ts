import * as http from 'http';

import * as msal from '@azure/msal-node';

import { Environment } from '../../domain/entities/Environment';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';

import { IAuthenticationService } from './IAuthenticationService';

/**
 * Authentication service using MSAL (Microsoft Authentication Library)
 * Handles token acquisition for different authentication methods with token caching
 */
export class MsalAuthenticationService implements IAuthenticationService {
	private clientAppCache: Map<string, msal.PublicClientApplication> = new Map();

	private getClientApp(environment: Environment): msal.PublicClientApplication {
		// Cache by environment ID (isolates credentials per environment)
		const cacheKey = environment.getId().getValue();

		if (!this.clientAppCache.has(cacheKey)) {
			const clientConfig: msal.Configuration = {
				auth: {
					clientId: environment.getPublicClientId().getValue(),
					authority: `https://login.microsoftonline.com/${environment.getTenantId().getValue()}`
				}
			};
			this.clientAppCache.set(cacheKey, new msal.PublicClientApplication(clientConfig));
		}

		return this.clientAppCache.get(cacheKey)!;
	}

	public async getAccessTokenForEnvironment(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		customScope?: string
	): Promise<string> {
		const authMethod = environment.getAuthenticationMethod().getType();
		// Use custom scope if provided, otherwise default to Dataverse
		const scopes = customScope
			? [customScope]
			: [`${environment.getDataverseUrl().getValue()}/.default`];

		switch (authMethod) {
			case AuthenticationMethodType.ServicePrincipal:
				return await this.authenticateServicePrincipal(environment, clientSecret, scopes);

			case AuthenticationMethodType.UsernamePassword:
				return await this.authenticateUsernamePassword(environment, password, scopes);

			case AuthenticationMethodType.Interactive:
				return await this.authenticateInteractive(environment, scopes);

			case AuthenticationMethodType.DeviceCode:
				return await this.authenticateDeviceCode(environment, scopes);

			default:
				throw new Error(`Unsupported authentication method: ${authMethod}`);
		}
	}

	private async authenticateServicePrincipal(
		environment: Environment,
		clientSecret: string | undefined,
		scopes: string[]
	): Promise<string> {
		if (!clientSecret) {
			throw new Error('Client secret is required for Service Principal authentication');
		}

		const clientId = environment.getClientId()?.getValue();
		if (!clientId) {
			throw new Error('Client ID is required for Service Principal authentication');
		}

		const clientConfig: msal.Configuration = {
			auth: {
				clientId: clientId,
				clientSecret: clientSecret,
				authority: `https://login.microsoftonline.com/${environment.getTenantId().getValue()}`
			}
		};

		const clientApp = new msal.ConfidentialClientApplication(clientConfig);

		try {
			const clientCredentialRequest: msal.ClientCredentialRequest = {
				scopes: scopes
			};

			const response = await clientApp.acquireTokenByClientCredential(clientCredentialRequest);
			if (!response) {
				throw new Error('Failed to acquire token');
			}

			return response.accessToken;
		} catch (error: unknown) {
			const err = error instanceof Error ? error : new Error(String(error));
			throw new Error(`Service Principal authentication failed: ${err.message}`);
		}
	}

	private async authenticateUsernamePassword(
		environment: Environment,
		password: string | undefined,
		scopes: string[]
	): Promise<string> {
		if (!password) {
			throw new Error('Password is required for Username/Password authentication');
		}

		const username = environment.getUsername();
		if (!username) {
			throw new Error('Username is required for Username/Password authentication');
		}

		const clientConfig: msal.Configuration = {
			auth: {
				clientId: environment.getPublicClientId().getValue(),
				authority: `https://login.microsoftonline.com/${environment.getTenantId().getValue()}`
			}
		};

		const clientApp = new msal.PublicClientApplication(clientConfig);

		try {
			const usernamePasswordRequest: msal.UsernamePasswordRequest = {
				scopes: scopes,
				username: username,
				password: password
			};

			const response = await clientApp.acquireTokenByUsernamePassword(usernamePasswordRequest);
			if (!response) {
				throw new Error('Failed to acquire token');
			}

			return response.accessToken;
		} catch (error: unknown) {
			const err = error instanceof Error ? error : new Error(String(error));
			throw new Error(`Username/Password authentication failed: ${err.message}. Note: This method does not support MFA.`);
		}
	}

	private async authenticateInteractive(
		environment: Environment,
		scopes: string[]
	): Promise<string> {
		const clientApp = this.getClientApp(environment);

		try {
			// Try silent token acquisition first
			const accounts = await clientApp.getTokenCache().getAllAccounts();
			if (accounts.length > 0) {
				try {
					const silentRequest: msal.SilentFlowRequest = {
						account: accounts[0],
						scopes: scopes
					};
					const response = await clientApp.acquireTokenSilent(silentRequest);
					if (response) {
						return response.accessToken;
					}
				} catch (_silentError) {
					// Silent acquisition failed, proceed with interactive flow
				}
			}

			const vscode = await import('vscode');

			// Create a promise that resolves when we get the auth code
			const authCodePromise = new Promise<string>((resolve, reject) => {
				// Create local HTTP server to capture redirect
				const server = http.createServer((req, res) => {
					const url = new URL(req.url || '', 'http://localhost:3000');
					const code = url.searchParams.get('code');

					if (code) {
						// Show success page
						res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
						res.end(`
							<!DOCTYPE html>
							<html>
								<head>
									<meta charset="UTF-8">
									<title>Authentication Successful</title>
									<style>
										body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
										.card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
										.success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
										h1 { margin: 0 0 10px 0; color: #333; }
										p { color: #666; margin: 0; }
									</style>
								</head>
								<body>
									<div class="card">
										<div class="success">✓</div>
										<h1>Authentication Successful</h1>
										<p>You can close this window and return to VS Code.</p>
									</div>
								</body>
							</html>
						`);
						server.close();
						resolve(code);
					} else {
						res.writeHead(400, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Error: No authorization code received</h1></body></html>');
						server.close();
						reject(new Error('No authorization code in redirect'));
					}
				});

				// Start server on port 3000
				server.listen(3000, () => {
					// Server started successfully
				});

				// Timeout after 5 minutes
				setTimeout(() => {
					server.close();
					reject(new Error('Authentication timeout - no response received within 5 minutes'));
				}, 300000);
			});

			// Build auth URL and open browser
			const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
				scopes: scopes,
				redirectUri: 'http://localhost:3000',
				prompt: 'select_account' // Force account picker - user MUST choose which account
			};

			const authUrl = await clientApp.getAuthCodeUrl(authCodeUrlParameters);

			vscode.window.showInformationMessage('Opening browser for authentication. You will be asked to select an account.');
			await vscode.env.openExternal(vscode.Uri.parse(authUrl));

			// Wait for auth code from local server
			const code = await authCodePromise;

			// Exchange code for token
			const tokenRequest: msal.AuthorizationCodeRequest = {
				code: code,
				scopes: scopes,
				redirectUri: 'http://localhost:3000'
			};

			const response = await clientApp.acquireTokenByCode(tokenRequest);
			if (!response) {
				throw new Error('Failed to acquire token');
			}

			// Show who signed in
			if (response.account) {
				const username = response.account.username || response.account.name || 'Unknown';
				vscode.window.showInformationMessage(`Authenticated as: ${username}`);
			}

			return response.accessToken;
		} catch (error: unknown) {
			const err = error instanceof Error ? error : new Error(String(error));
			throw new Error(`Interactive authentication failed: ${err.message}`);
		}
	}

	private async authenticateDeviceCode(
		environment: Environment,
		scopes: string[]
	): Promise<string> {
		const clientApp = this.getClientApp(environment);

		try {
			const vscode = await import('vscode');

			// Try silent token acquisition first
			const accounts = await clientApp.getTokenCache().getAllAccounts();
			if (accounts.length > 0) {
				try {
					const silentRequest: msal.SilentFlowRequest = {
						account: accounts[0],
						scopes: scopes
					};
					const response = await clientApp.acquireTokenSilent(silentRequest);
					if (response) {
						return response.accessToken;
					}
				} catch (_silentError) {
					// Silent acquisition failed, proceed with device code flow
				}
			}

			const deviceCodeRequest: msal.DeviceCodeRequest = {
				scopes: scopes,
				deviceCodeCallback: async (deviceCodeResponse) => {
					// Show device code to user with modal dialog
					const message = `Device Code Authentication\n\nCode: ${deviceCodeResponse.userCode}\n\n1. Click "Open Browser" to go to ${deviceCodeResponse.verificationUri}\n2. Enter the code shown above\n3. Complete sign-in\n\nThis dialog will close automatically after you authenticate.`;

					// Copy code to clipboard automatically
					await vscode.env.clipboard.writeText(deviceCodeResponse.userCode);

					const selection = await vscode.window.showInformationMessage(
						message,
						{ modal: false },
						'Open Browser',
						'Copy Code Again'
					);

					if (selection === 'Open Browser') {
						await vscode.env.openExternal(vscode.Uri.parse(deviceCodeResponse.verificationUri));
					} else if (selection === 'Copy Code Again') {
						await vscode.env.clipboard.writeText(deviceCodeResponse.userCode);
						vscode.window.showInformationMessage('Device code copied to clipboard');
					}
				}
			};

			const response = await clientApp.acquireTokenByDeviceCode(deviceCodeRequest);
			if (!response) {
				throw new Error('Failed to acquire token');
			}

			// Show who signed in
			if (response.account) {
				const username = response.account.username || response.account.name || 'Unknown';
				vscode.window.showInformationMessage(`Authenticated as: ${username}`);
			}

			return response.accessToken;
		} catch (error: unknown) {
			const err = error instanceof Error ? error : new Error(String(error));
			throw new Error(`Device Code authentication failed: ${err.message}`);
		}
	}

	public clearCacheForEnvironment(environmentId: EnvironmentId): void {
		const cacheKey = environmentId.getValue();
		const clientApp = this.clientAppCache.get(cacheKey);

		if (clientApp) {
			// Clear MSAL's internal token cache
			clientApp.getTokenCache().getAllAccounts().then(accounts => {
				accounts.forEach(account => {
					clientApp.getTokenCache().removeAccount(account);
				});
			}).catch(() => {
				// Ignore errors during cache cleanup
			});

			// Remove from application cache
			this.clientAppCache.delete(cacheKey);
		}
	}

	public clearAllCache(): void {
		// Clear all MSAL token caches
		this.clientAppCache.forEach((clientApp) => {
			clientApp.getTokenCache().getAllAccounts().then(accounts => {
				accounts.forEach(account => {
					clientApp.getTokenCache().removeAccount(account);
				});
			}).catch(() => {
				// Ignore errors during cache cleanup
			});
		});

		// Clear application cache
		this.clientAppCache.clear();
	}
}
