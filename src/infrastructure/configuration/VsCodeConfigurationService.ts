import * as vscode from 'vscode';

import { IConfigurationService } from '../../shared/domain/services/IConfigurationService';

/**
 * VS Code implementation of configuration service.
 *
 * Reads from VS Code user/workspace settings under 'powerPlatformDevSuite' namespace.
 * Settings defined in package.json contributes.configuration section.
 */
export class VsCodeConfigurationService implements IConfigurationService {
	/**
	 * Configuration namespace prefix.
	 * Settings are accessed as 'powerPlatformDevSuite.{key}' in VS Code settings.
	 */
	private static readonly NAMESPACE = 'powerPlatformDevSuite';

	/**
	 * Gets configuration value from VS Code settings.
	 * Falls back to default if not configured.
	 *
	 * @param key - Dot-notation key relative to namespace (e.g., 'pluginTrace.defaultLimit')
	 * @param defaultValue - Fallback value if setting not configured
	 * @returns Configured value or default
	 */
	public get<T>(key: string, defaultValue: T): T {
		const config = vscode.workspace.getConfiguration(VsCodeConfigurationService.NAMESPACE);
		return config.get<T>(key, defaultValue);
	}
}
