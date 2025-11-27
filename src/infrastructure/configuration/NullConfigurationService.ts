import { IConfigurationService } from '../../shared/domain/services/IConfigurationService';

/**
 * Null implementation of configuration service for testing.
 *
 * Always returns the provided default value, ignoring the key.
 * Use in unit tests to avoid VS Code API dependencies.
 *
 * @example
 * ```typescript
 * const config = new NullConfigurationService();
 * const limit = config.get('pluginTrace.defaultLimit', 100); // Returns 100
 * ```
 */
export class NullConfigurationService implements IConfigurationService {
	/**
	 * Returns the default value, ignoring the key.
	 *
	 * @param _key - Ignored setting key
	 * @param defaultValue - Value to return
	 * @returns The provided default value
	 */
	public get<T>(_key: string, defaultValue: T): T {
		return defaultValue;
	}
}
