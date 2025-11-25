import * as http from 'http';

import * as msal from '@azure/msal-node';

import { Environment } from '../../domain/entities/Environment';
import { IAuthenticationService } from '../../domain/interfaces/IAuthenticationService';
import { ICancellationToken, IDisposable } from '../../domain/interfaces/ICancellationToken';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ErrorSanitizer } from '../../../../shared/utils/ErrorSanitizer';

/**
 * Authentication service using MSAL (Microsoft Authentication Library)
 * Handles token acquisition for different authentication methods with token caching
 */
export class MsalAuthenticationService implements IAuthenticationService {
	/**
	 * Port for OAuth redirect URI in interactive authentication flow.
	 * Configurable to support future environment variable override for different deployment scenarios.
	 */
	private static readonly DEFAULT_OAUTH_REDIRECT_PORT = 3000;

	/**
	 * Timeout duration for interactive authentication in milliseconds.
	 * User must complete browser authentication within this window.
	 */
	private static readonly INTERACTIVE_AUTH_TIMEOUT_MS = 90000;

	private clientAppCache: Map<string, msal.PublicClientApplication> = new Map();

	constructor(private readonly logger: ILogger) {}

	/**
	 * Get MSAL authority URL based on tenant ID and auth method.
	 * Service Principal requires specific tenant due to MSAL limitations.
	 * Interactive flows can use "organizations" authority for multi-tenant scenarios.
	 */
	private getAuthority(environment: Environment): string {
		const tenantId = environment.getTenantId().getValue();
		const authMethod = environment.getAuthenticationMethod();

		if (authMethod.requiresClientCredentials()) {
			if (!tenantId) {
				throw new Error('Tenant ID is required for Service Principal authentication');
			}
			return `https://login.microsoftonline.com/${tenantId}`;
		}

		return tenantId
			? `https://login.microsoftonline.com/${tenantId}`
			: 'https://login.microsoftonline.com/organizations';
	}

	private getClientApp(environment: Environment): msal.PublicClientApplication {
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
	 * @param clientSecret - Optional client secret for Service Principal authentication
	 * @param password - Optional password for Username/Password authentication
	 * @param customScope - Optional custom scope to request. Defaults to Dataverse scope if not provided.
	 * @param cancellationToken - Optional token for cancelling long-running auth flows
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
		const scopes = customScope
			? [customScope]
			: [`${environment.getDataverseUrl().getValue()}/.default`];

		this.logger.debug('Acquiring access token', {
			tenantId: environment.getTenantId().getValue(),
			authMethod,
			scope: customScope || 'dataverse'
		});

		try {
			let token: string;

			switch (authMethod) {
				case AuthenticationMethodType.ServicePrincipal:
					token = await this.authenticateServicePrincipal(environment, scopes, clientSecret, cancellationToken);
					break;

				case AuthenticationMethodType.UsernamePassword:
					token = await this.authenticateUsernamePassword(environment, scopes, password, cancellationToken);
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
				tokenLength: token.length
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
		// Log full error details for developers
		this.logger.error(context, err);
		// Sanitize error message for users (may contain tenant IDs, client IDs, tokens)
		const sanitizedMessage = ErrorSanitizer.sanitize(`${context}: ${err.message}`);
		return new Error(sanitizedMessage);
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
	 * Attempts to acquire a token silently from cache
	 * @param clientApp - MSAL client application instance
	 * @param scopes - OAuth scopes to request
	 * @param cancellationToken - Optional cancellation token
	 * @param flowName - Name of the authentication flow for logging
	 * @returns Access token if successful, undefined if cache miss/expired (caller should fall back to interactive flow)
	 * @throws If authentication is cancelled by user
	 */
	private async tryAcquireTokenSilent(
		clientApp: msal.PublicClientApplication,
		scopes: string[],
		flowName: string,
		cancellationToken?: ICancellationToken
	): Promise<string | undefined> {
		const accounts = await clientApp.getTokenCache().getAllAccounts();
		if (accounts.length === 0) {
			return undefined;
		}

		this.logger.debug('Attempting silent token acquisition from cache', {
			accountCount: accounts.length
		});

		try {
			const account = accounts[0];
			if (account === undefined) {
				throw new Error('No account found in cache');
			}

			const silentRequest: msal.SilentFlowRequest = {
				account: account,
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

			return undefined;
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Silent token acquisition cancelled by user');
				throw error;
			}
			this.logger.debug('Silent token acquisition failed, proceeding with interactive flow', { flowName });
			return undefined;
		}
	}

	/**
	 * Authenticates using Service Principal (client credentials flow).
	 * Requires client ID and client secret stored in VS Code SecretStorage.
	 */
	private async authenticateServicePrincipal(
		environment: Environment,
		scopes: string[],
		clientSecret?: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
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
				authority: this.getAuthority(environment)
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
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Service Principal authentication cancelled by user');
				throw error;
			}
			this.logger.error('Service Principal authentication failed', error);
			throw this.createAuthenticationError(error, 'Service Principal authentication failed');
		}
	}

	/**
	 * Authenticates using username and password flow.
	 * Does not support MFA - use Interactive or DeviceCode for MFA scenarios.
	 */
	private async authenticateUsernamePassword(
		environment: Environment,
		scopes: string[],
		password?: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
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
				authority: this.getAuthority(environment)
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
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Username/Password authentication cancelled by user');
				throw error;
			}
			this.logger.error('Username/Password authentication failed', error);
			throw this.createAuthenticationError(error, 'Username/Password authentication failed. Note: This method does not support MFA');
		}
	}

	/**
	 * Authenticates using interactive browser flow.
	 * Opens browser window for user authentication, supports MFA.
	 * Uses local HTTP server on port 3000 to capture OAuth redirect.
	 */
	private async authenticateInteractive(
		environment: Environment,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}

		this.logger.debug('Initiating interactive authentication');

		const clientApp = this.getClientApp(environment);

		try {
			const cachedToken = await this.tryAcquireTokenSilent(
				clientApp,
				scopes,
				'interactive flow',
				cancellationToken
			);
			if (cachedToken) {
				return cachedToken;
			}

			const vscode = await import('vscode');

			const authCodePromise = new Promise<string>((resolve, reject) => {
				// Declared here for cleanup closure scope, assigned in cancellation handler below
				// eslint-disable-next-line prefer-const
				let cancelListener: IDisposable | undefined;
				// Declared here for cleanup closure scope, assigned in timeout setup below
				// eslint-disable-next-line prefer-const
				let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
				let isCancelled = false;

				const cleanup = (): void => {
					if (timeoutHandle) {
						clearTimeout(timeoutHandle);
					}
					if (cancelListener) {
						cancelListener.dispose();
					}
				};

				const resolveWithCleanup = (code: string): void => {
					if (isCancelled) {
						return;
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

				const server = http.createServer((req, res) => {
					const url = new URL(req.url || '', `http://localhost:${MsalAuthenticationService.DEFAULT_OAUTH_REDIRECT_PORT}`);
					const code = url.searchParams.get('code');

					if (code) {
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

				server.listen(MsalAuthenticationService.DEFAULT_OAUTH_REDIRECT_PORT);

				server.on('error', (err: Error) => {
					server.close();
					rejectWithCleanup(new Error(`Failed to start authentication server: ${err.message}`));
				});

				cancelListener = cancellationToken?.onCancellationRequested(() => {
					isCancelled = true;
					server.close();
					rejectWithCleanup(new Error('Authentication cancelled by user'));
				});

				timeoutHandle = setTimeout(() => {
					server.close();
					rejectWithCleanup(new Error('Authentication timeout - no response received within 90 seconds. If you opened the wrong browser, click Cancel and try again.'));
				}, MsalAuthenticationService.INTERACTIVE_AUTH_TIMEOUT_MS);
			});

			const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
				scopes: scopes,
				redirectUri: `http://localhost:${MsalAuthenticationService.DEFAULT_OAUTH_REDIRECT_PORT}`,
				prompt: 'select_account'
			};

			const authUrl = await clientApp.getAuthCodeUrl(authCodeUrlParameters);

			this.logger.debug('Opening browser for authentication');
			vscode.window.showInformationMessage('Opening browser for authentication. You will be asked to select an account.');
			await vscode.env.openExternal(vscode.Uri.parse(authUrl));

			const code = await authCodePromise;
			this.logger.debug('Authorization code received, exchanging for token');

			const tokenRequest: msal.AuthorizationCodeRequest = {
				code: code,
				scopes: scopes,
				redirectUri: `http://localhost:${MsalAuthenticationService.DEFAULT_OAUTH_REDIRECT_PORT}`
			};

			const response = await clientApp.acquireTokenByCode(tokenRequest);
			if (!response) {
				throw new Error('Failed to acquire token');
			}

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
	 * Authenticates using device code flow.
	 * Displays code for user to enter on another device, supports MFA.
	 * Useful for environments without browser access or SSH sessions.
	 */
	private async authenticateDeviceCode(
		environment: Environment,
		scopes: string[],
		cancellationToken?: ICancellationToken
	): Promise<string> {
		if (cancellationToken?.isCancellationRequested) {
			throw new Error('Authentication cancelled by user');
		}

		this.logger.debug('Initiating device code authentication');

		const clientApp = this.getClientApp(environment);

		try {
			const cachedToken = await this.tryAcquireTokenSilent(
				clientApp,
				scopes,
				'device code flow',
				cancellationToken
			);
			if (cachedToken) {
				return cachedToken;
			}

			const vscode = await import('vscode');

			const deviceCodeRequest: msal.DeviceCodeRequest = {
				scopes: scopes,
				deviceCodeCallback: (deviceCodeResponse) => {
					void (async (): Promise<void> => {
						this.logger.debug('Device code generated', {
						userCode: deviceCodeResponse.userCode,
						verificationUri: deviceCodeResponse.verificationUri
					});

					const message = `Device Code Authentication\n\nCode: ${deviceCodeResponse.userCode}\n\n1. Click "Open Browser" to go to ${deviceCodeResponse.verificationUri}\n2. Enter the code shown above\n3. Complete sign-in\n\nThis dialog will close automatically after you authenticate.`;

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

			if (response.account) {
				const username = response.account.username || response.account.name || 'Unknown';
				this.logger.debug('Device code authentication successful', { username });
				vscode.window.showInformationMessage(`Authenticated as: ${username}`);
			}

			return response.accessToken;
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('cancelled')) {
				this.logger.debug('Device code authentication cancelled by user');
				throw error;
			}
			this.logger.error('Device code authentication failed', error);
			throw this.createAuthenticationError(error, 'Device Code authentication failed');
		}
	}

	/**
	 * Clears authentication cache for a specific environment.
	 * Forces fresh authentication on next token acquisition.
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

			this.clientAppCache.delete(cacheKey);
			this.logger.debug('Environment removed from application cache', {
				environmentId: cacheKey
			});
		}
	}

	/**
	 * Clears all authentication caches for all environments.
	 * Forces fresh authentication for all environments on next token acquisition.
	 */
	public clearAllCache(): void {
		this.logger.info('Clearing all authentication caches', {
			environmentCount: this.clientAppCache.size
		});

		this.clientAppCache.forEach((clientApp) => {
			void clientApp.getTokenCache().getAllAccounts().then(async accounts => {
				await Promise.all(accounts.map(async account =>
					clientApp.getTokenCache().removeAccount(account)
				));
			}).catch((error) => {
				this.logger.warn('Error clearing MSAL token cache', error);
			});
		});

		this.clientAppCache.clear();
		this.logger.debug('All authentication caches cleared');
	}
}
