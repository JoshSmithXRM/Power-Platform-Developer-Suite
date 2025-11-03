import * as http from 'http';

import * as msal from '@azure/msal-node';

import { Environment } from '../../domain/entities/Environment';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Authentication service using MSAL (Microsoft Authentication Library)
 * Handles token acquisition for different authentication methods with token caching
 */
export class MsalAuthenticationService implements IAuthenticationService {
	private clientAppCache: Map<string, msal.PublicClientApplication> = new Map();

	constructor(private readonly logger: ILogger) {}

	/**
	 * Get MSAL authority URL based on tenant ID and auth method
	 * - ServicePrincipal: Requires specific tenant (MSAL limitation)
	 * - Interactive/DeviceCode/UsernamePassword: Can use "organizations" if tenant not provided
	 */
	private getAuthority(environment: Environment): string {
		const tenantId = environment.getTenantId().getValue();
		const authMethod = environment.getAuthenticationMethod();

		// ServicePrincipal REQUIRES specific tenant (MSAL limitation discovered via testing)
		if (authMethod.requiresClientCredentials()) {
			if (!tenantId) {
				throw new Error('Tenant ID is required for Service Principal authentication');
			}
			return `https://login.microsoftonline.com/${tenantId}`;
		}

		// Interactive, DeviceCode, UsernamePassword: use "organizations" if no tenant provided
		// This allows users to authenticate without knowing their tenant ID
		return tenantId
			? `https://login.microsoftonline.com/${tenantId}`
			: 'https://login.microsoftonline.com/organizations';
	}

	private getClientApp(environment: Environment): msal.PublicClientApplication {
		// Cache by environment ID (isolates credentials per environment)
		const cacheKey = environment.getId().getValue();

		if (!this.clientAppCache.has(cacheKey)) {
			const clientConfig: msal.Configuration = {
				auth: {
					clientId: environment.getPublicClientId().getValue(),
					authority: this.getAuthority(environment)
				}
			};
			this.clientAppCache.set(cacheKey, new msal.PublicClientApplication(clientConfig));
		}

		const clientApp = this.clientAppCache.get(cacheKey);
		if (!clientApp) {
			throw new Error(`Failed to retrieve MSAL client app for environment ${cacheKey}`);
		}

		return clientApp;
	}

	/**
	 * Acquires an access token for the specified environment using the configured authentication method
	 * Supports Service Principal, Username/Password, Interactive, and Device Code flows
	 * @param environment - Environment containing authentication configuration
	 * @param clientSecret - Client secret for Service Principal authentication (optional)
	 * @param password - Password for Username/Password authentication (optional)
	 * @param customScope - Custom scope to request (optional, defaults to Dataverse scope)
	 * @param cancellationToken - Token for cancelling long-running auth flows (optional)
	 * @returns Access token for the specified scope
	 */
	public async getAccessTokenForEnvironment(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		customScope?: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Check for cancellation before starting
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}

		const authMethod = environment.getAuthenticationMethod().getType();
		// Use custom scope if provided, otherwise default to Dataverse
		const scopes = customScope
			? [customScope]
			: [`${environment.getDataverseUrl().getValue()}/.default`];

		this.logger.debug('Acquiring access token', {
			tenantId: environment.getTenantId().getValue(),
			authMethod,
			hasClientSecret: !!clientSecret,
			hasPassword: !!password,
			scope: customScope || 'dataverse'
		});

		try {
			let token: string;

			switch (authMethod) {
				case AuthenticationMethodType.ServicePrincipal:
					token = await this.authenticateServicePrincipal(environment, clientSecret, scopes, cancellationToken);
					break;

				case AuthenticationMethodType.UsernamePassword:
					token = await this.authenticateUsernamePassword(environment, password, scopes, cancellationToken);
					break;

				case AuthenticationMethodType.Interactive:
					token = await this.authenticateInteractive(environment, scopes, cancellationToken);
					break;

				case AuthenticationMethodType.DeviceCode:
					token = await this.authenticateDeviceCode(environment, scopes, cancellationToken);
					break;

				default:
					throw new Error(`Unsupported authentication method: ${authMethod}`);
			}

			this.logger.info('Access token acquired successfully', {
				authMethod,
				tokenPreview: token.substring(0, 10) + '...'
			});

			return token;
		} catch (error) {
			this.logger.error('Failed to acquire access token', error);
			throw error;
		}
	}

	/**
	 * Converts unknown error to Error instance with contextual message
	 */
	private createAuthenticationError(error: unknown, context: string): Error {
		const err = error instanceof Error ? error : new Error(String(error));
		return new Error(`${context}: ${err.message}`);
	}

	/**
	 * Executes a promise with cancellation support using Promise.race pattern
	 * If cancellation token is provided, races the promise against cancellation
	 * @param promise - The promise to execute
	 * @param cancellationToken - Optional cancellation token
	 * @returns The result of the promise, or throws if cancelled
	 */
	private async executeWithCancellation<T>(
		promise: Promise<T>,
		cancellationToken?: ICancellationToken
	): Promise<T> {
		if (!cancellationToken) {
			return promise;
		}

		const cancellationPromise = new Promise<never>((_, reject) => {
			cancellationToken.onCancellationRequested(() => {
				reject(new Error('Authentication cancelled by user'));
			});
		});

		return Promise.race([promise, cancellationPromise]);
	}

	/**
	 * Authenticates using Service Principal (client credentials flow)
	 * Requires client ID and client secret
	 */
	private async authenticateServicePrincipal(
		environment: Environment,
		clientSecret: string | undefined,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Check for cancellation
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}
		if (!clientSecret) {
			throw new Error('Client secret is required for Service Principal authentication');
		}

		const clientId = environment.getClientId()?.getValue();
		if (!clientId) {
			throw new Error('Client ID is required for Service Principal authentication');
		}

		this.logger.debug('Initiating Service Principal authentication', {
			clientId,
			tenantId: environment.getTenantId().getValue()
		});

		const clientConfig: msal.Configuration = {
			auth: {
				clientId: clientId,
				clientSecret: clientSecret,
				authority: this.getAuthority(environment) // Uses tenant-specific authority
			}
		};

		const clientApp = new msal.ConfidentialClientApplication(clientConfig);

		try {
			const clientCredentialRequest: msal.ClientCredentialRequest = {
				scopes: scopes
			};

			const response = await this.executeWithCancellation(
				clientApp.acquireTokenByClientCredential(clientCredentialRequest),
				cancellationToken
			);

			if (!response) {
				throw new Error('Failed to acquire token');
			}

			this.logger.debug('Service Principal authentication successful');
			return response.accessToken;
		} catch (error: unknown) {
			// Check if this is a cancellation error
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Service Principal authentication cancelled by user');
				throw error; // Re-throw cancellation errors as-is
			}
			this.logger.error('Service Principal authentication failed', error);
			throw this.createAuthenticationError(error, 'Service Principal authentication failed');
		}
	}

	/**
	 * Authenticates using username and password flow
	 * Does not support MFA - use Interactive or DeviceCode for MFA scenarios
	 */
	private async authenticateUsernamePassword(
		environment: Environment,
		password: string | undefined,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Check for cancellation
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}
		if (!password) {
			throw new Error('Password is required for Username/Password authentication');
		}

		const username = environment.getUsername();
		if (!username) {
			throw new Error('Username is required for Username/Password authentication');
		}

		this.logger.debug('Initiating Username/Password authentication', {
			username,
			tenantId: environment.getTenantId().getValue()
		});

		const clientConfig: msal.Configuration = {
			auth: {
				clientId: environment.getPublicClientId().getValue(),
				authority: this.getAuthority(environment) // Uses "organizations" if tenant not provided
			}
		};

		const clientApp = new msal.PublicClientApplication(clientConfig);

		try {
			const usernamePasswordRequest: msal.UsernamePasswordRequest = {
				scopes: scopes,
				username: username,
				password: password
			};

			const response = await this.executeWithCancellation(
				clientApp.acquireTokenByUsernamePassword(usernamePasswordRequest),
				cancellationToken
			);

			if (!response) {
				throw new Error('Failed to acquire token');
			}

			this.logger.debug('Username/Password authentication successful', { username });
			return response.accessToken;
		} catch (error: unknown) {
			// Check if this is a cancellation error
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Username/Password authentication cancelled by user');
				throw error; // Re-throw cancellation errors as-is
			}
			this.logger.error('Username/Password authentication failed', error);
			throw this.createAuthenticationError(error, 'Username/Password authentication failed. Note: This method does not support MFA');
		}
	}

	/**
	 * Authenticates using interactive browser flow
	 * Opens browser window for user authentication, supports MFA
	 * Uses local HTTP server on port 3000 to capture auth code redirect
	 */
	private async authenticateInteractive(
		environment: Environment,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Check for cancellation before starting
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}

		this.logger.debug('Initiating interactive authentication');

		const clientApp = this.getClientApp(environment);

		try {
			// Try silent token acquisition first
			const accounts = await clientApp.getTokenCache().getAllAccounts();
			if (accounts.length > 0) {
				this.logger.debug('Attempting silent token acquisition from cache', {
					accountCount: accounts.length
				});

				try {
					const silentRequest: msal.SilentFlowRequest = {
						account: accounts[0],
						scopes: scopes
					};

					const response = await this.executeWithCancellation(
						clientApp.acquireTokenSilent(silentRequest),
						cancellationToken
					);

					if (response) {
						this.logger.debug('Silent token acquisition successful');
						return response.accessToken;
					}
				} catch (error: unknown) {
					// Check if this is a cancellation error
					if (error instanceof Error && error.message.includes('cancelled')) {
						this.logger.debug('Silent token acquisition cancelled by user');
						throw error; // Re-throw cancellation errors
					}
					// Silent acquisition failed, proceed with interactive flow
					this.logger.debug('Silent token acquisition failed, proceeding with interactive flow');
				}
			}

			const vscode = await import('vscode');

			// Create a promise that resolves when we get the auth code
			const authCodePromise = new Promise<string>((resolve, reject) => {
				// eslint-disable-next-line prefer-const -- Reassigned on line 446 when registering cancellation handler
				let cancelListener: IDisposable | undefined;
				// eslint-disable-next-line prefer-const -- Reassigned on line 453 when setting up timeout
				let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
				let isCancelled = false;

				// Cleanup function
				const cleanup = (): void => {
					if (timeoutHandle) {
						clearTimeout(timeoutHandle);
					}
					if (cancelListener) {
						cancelListener.dispose();
					}
				};

				// Wrapped resolve/reject that clean up
				const resolveWithCleanup = (code: string): void => {
					if (isCancelled) {
						return; // Ignore success after cancellation
					}
					try {
						cleanup();
					} finally {
						resolve(code);
					}
				};

				const rejectWithCleanup = (error: Error): void => {
					try {
						cleanup();
					} finally {
						reject(error);
					}
				};

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
						resolveWithCleanup(code);
					} else {
						res.writeHead(400, { 'Content-Type': 'text/html' });
						res.end('<html><body><h1>Error: No authorization code received</h1></body></html>');
						server.close();
						rejectWithCleanup(new Error('No authorization code in redirect'));
					}
				});

				// Start server on port 3000
				server.listen(3000);

				// Handle server errors (e.g., port already in use)
				server.on('error', (err: Error) => {
					server.close();
					rejectWithCleanup(new Error(`Failed to start authentication server: ${err.message}`));
				});

				// Register cancellation handler
				cancelListener = cancellationToken?.onCancellationRequested(() => {
					isCancelled = true;
					server.close();
					rejectWithCleanup(new Error('Authentication cancelled by user'));
				});

				// Timeout after 90 seconds
				timeoutHandle = setTimeout(() => {
					server.close();
					rejectWithCleanup(new Error('Authentication timeout - no response received within 90 seconds. If you opened the wrong browser, click Cancel and try again.'));
				}, 90000);
			});

			// Build auth URL and open browser
			const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
				scopes: scopes,
				redirectUri: 'http://localhost:3000',
				prompt: 'select_account' // Force account picker - user MUST choose which account
			};

			const authUrl = await clientApp.getAuthCodeUrl(authCodeUrlParameters);

			this.logger.debug('Opening browser for authentication');
			vscode.window.showInformationMessage('Opening browser for authentication. You will be asked to select an account.');
			await vscode.env.openExternal(vscode.Uri.parse(authUrl));

			// Wait for auth code from local server
			const code = await authCodePromise;
			this.logger.debug('Authorization code received, exchanging for token');

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
				this.logger.debug('Interactive authentication successful', { username });
				vscode.window.showInformationMessage(`Authenticated as: ${username}`);
			}

			return response.accessToken;
		} catch (error: unknown) {
			this.logger.error('Interactive authentication failed', error);
			throw this.createAuthenticationError(error, 'Interactive authentication failed');
		}
	}

	/**
	 * Authenticates using device code flow
	 * Displays code for user to enter on another device, supports MFA
	 * Useful for environments without browser access or SSH sessions
	 */
	private async authenticateDeviceCode(
		environment: Environment,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		// Check for cancellation
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}

		this.logger.debug('Initiating device code authentication');

		const clientApp = this.getClientApp(environment);

		try {
			const vscode = await import('vscode');

			// Try silent token acquisition first
			const accounts = await clientApp.getTokenCache().getAllAccounts();
			if (accounts.length > 0) {
				this.logger.debug('Attempting silent token acquisition from cache', {
					accountCount: accounts.length
				});

				try {
					const silentRequest: msal.SilentFlowRequest = {
						account: accounts[0],
						scopes: scopes
					};

					const response = await this.executeWithCancellation(
						clientApp.acquireTokenSilent(silentRequest),
						cancellationToken
					);

					if (response) {
						this.logger.debug('Silent token acquisition successful');
						return response.accessToken;
					}
				} catch (error: unknown) {
					// Check if this is a cancellation error
					if (error instanceof Error && error.message.includes('cancelled')) {
						this.logger.debug('Silent token acquisition cancelled by user');
						throw error; // Re-throw cancellation errors
					}
					// Silent acquisition failed, proceed with device code flow
					this.logger.debug('Silent token acquisition failed, proceeding with device code flow');
				}
			}

			const deviceCodeRequest: msal.DeviceCodeRequest = {
				scopes: scopes,
				deviceCodeCallback: (deviceCodeResponse) => {
					void (async (): Promise<void> => {
						this.logger.debug('Device code generated', {
						userCode: deviceCodeResponse.userCode,
						verificationUri: deviceCodeResponse.verificationUri
					});

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
					})();
				}
			};

			this.logger.debug('Waiting for user to complete device code authentication');

			const response = await this.executeWithCancellation(
				clientApp.acquireTokenByDeviceCode(deviceCodeRequest),
				cancellationToken
			);

			if (!response) {
				throw new Error('Failed to acquire token');
			}

			// Show who signed in
			if (response.account) {
				const username = response.account.username || response.account.name || 'Unknown';
				this.logger.debug('Device code authentication successful', { username });
				vscode.window.showInformationMessage(`Authenticated as: ${username}`);
			}

			return response.accessToken;
		} catch (error: unknown) {
			// Check if this is a cancellation error
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Device code authentication cancelled by user');
				throw error; // Re-throw cancellation errors as-is
			}
			this.logger.error('Device code authentication failed', error);
			throw this.createAuthenticationError(error, 'Device Code authentication failed');
		}
	}

	/**
	 * Clears authentication cache for a specific environment
	 * Forces fresh authentication on next token acquisition
	 * @param environmentId - ID of environment to clear cache for
	 */
	public clearCacheForEnvironment(environmentId: EnvironmentId): void {
		const cacheKey = environmentId.getValue();
		const clientApp = this.clientAppCache.get(cacheKey);

		if (clientApp) {
			this.logger.debug('Clearing authentication cache for environment', {
				environmentId: cacheKey
			});

			// Clear MSAL's internal token cache
			void clientApp.getTokenCache().getAllAccounts().then(async accounts => {
				await Promise.all(accounts.map(async account =>
					clientApp.getTokenCache().removeAccount(account)
				));
				this.logger.debug('MSAL token cache cleared', {
					environmentId: cacheKey,
					accountsCleared: accounts.length
				});
			}).catch((error) => {
				this.logger.warn('Error clearing MSAL token cache', error);
			});

			// Remove from application cache
			this.clientAppCache.delete(cacheKey);
			this.logger.debug('Environment removed from application cache', {
				environmentId: cacheKey
			});
		}
	}

	/**
	 * Clears all authentication caches for all environments
	 * Forces fresh authentication for all environments on next token acquisition
	 */
	public clearAllCache(): void {
		this.logger.info('Clearing all authentication caches', {
			environmentCount: this.clientAppCache.size
		});

		// Clear all MSAL token caches
		this.clientAppCache.forEach((clientApp) => {
			void clientApp.getTokenCache().getAllAccounts().then(async accounts => {
				await Promise.all(accounts.map(async account =>
					clientApp.getTokenCache().removeAccount(account)
				));
			}).catch((error) => {
				this.logger.warn('Error clearing MSAL token cache', error);
			});
		});

		// Clear application cache
		this.clientAppCache.clear();
		this.logger.debug('All authentication caches cleared');
	}
}
