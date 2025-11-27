/**
 * Configuration service for reading user settings.
 *
 * Abstraction over VS Code workspace configuration.
 * Domain defines contract, infrastructure implements.
 *
 * @example
 * ```typescript
 * // In use case or panel
 * const limit = config.get('pluginTrace.defaultLimit', 100);
 * ```
 */
export interface IConfigurationService {
	/**
	 * Gets configuration value with type-safe default.
	 *
	 * @param key - Setting key relative to 'ppds' namespace (e.g., 'pluginTrace.defaultLimit')
	 * @param defaultValue - Value returned if setting not configured
	 * @returns Configured value or default
	 */
	get<T>(key: string, defaultValue: T): T;
}
