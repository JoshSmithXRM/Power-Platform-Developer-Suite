import type * as vscode from 'vscode';
import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * MSAL cache plugin that persists tokens to VS Code's SecretStorage.
 *
 * Tokens are encrypted using the OS credential manager (Windows Credential Manager,
 * macOS Keychain, or Linux Secret Service) via VS Code's SecretStorage API.
 *
 * Each environment gets its own cache key to isolate tokens between environments.
 */
export class VsCodeSecretStorageCachePlugin implements ICachePlugin {
	private static readonly CACHE_KEY_PREFIX = 'power-platform-dev-suite-msal-cache-';

	constructor(
		private readonly secretStorage: vscode.SecretStorage,
		private readonly environmentId: string,
		private readonly logger: ILogger
	) {}

	/**
	 * Called before MSAL accesses the cache.
	 * Loads persisted tokens from SecretStorage into MSAL's in-memory cache.
	 */
	public async beforeCacheAccess(context: TokenCacheContext): Promise<void> {
		const cacheKey = this.getCacheKey();

		try {
			const cachedData = await this.secretStorage.get(cacheKey);

			if (cachedData) {
				context.tokenCache.deserialize(cachedData);
				this.logger.debug('Loaded token cache from SecretStorage', {
					environmentId: this.environmentId,
					cacheSize: cachedData.length
				});
			} else {
				this.logger.debug('No cached tokens found in SecretStorage', {
					environmentId: this.environmentId
				});
			}
		} catch (error) {
			// Don't fail authentication if cache load fails - just proceed without cache
			this.logger.warn('Failed to load token cache from SecretStorage', {
				environmentId: this.environmentId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	/**
	 * Called after MSAL accesses the cache.
	 * Persists any cache changes to SecretStorage.
	 */
	public async afterCacheAccess(context: TokenCacheContext): Promise<void> {
		if (!context.cacheHasChanged) {
			return;
		}

		const cacheKey = this.getCacheKey();

		try {
			const serializedCache = context.tokenCache.serialize();
			await this.secretStorage.store(cacheKey, serializedCache);

			this.logger.debug('Persisted token cache to SecretStorage', {
				environmentId: this.environmentId,
				cacheSize: serializedCache.length
			});
		} catch (error) {
			// Log but don't fail - tokens will still work for this session
			this.logger.warn('Failed to persist token cache to SecretStorage', {
				environmentId: this.environmentId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	/**
	 * Clears the persisted cache for this environment.
	 * Called when authentication settings change and cached tokens are invalidated.
	 */
	public async clearCache(): Promise<void> {
		const cacheKey = this.getCacheKey();

		try {
			await this.secretStorage.delete(cacheKey);
			this.logger.debug('Cleared token cache from SecretStorage', {
				environmentId: this.environmentId
			});
		} catch (error) {
			this.logger.warn('Failed to clear token cache from SecretStorage', {
				environmentId: this.environmentId,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	private getCacheKey(): string {
		return `${VsCodeSecretStorageCachePlugin.CACHE_KEY_PREFIX}${this.environmentId}`;
	}
}
