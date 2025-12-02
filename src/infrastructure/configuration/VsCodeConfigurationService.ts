import * as vscode from 'vscode';

import { IConfigurationService } from '../../shared/domain/services/IConfigurationService';

/**
 * Validation rules for numeric settings.
 * Values are clamped to [min, max] range to prevent invalid configuration.
 */
interface NumericValidationRule {
	readonly min: number;
	readonly max: number;
}

/**
 * VS Code implementation of configuration service.
 *
 * Reads from VS Code user/workspace settings under 'powerPlatformDevSuite' namespace.
 * Settings defined in package.json contributes.configuration section.
 *
 * Numeric settings are automatically validated and clamped to their defined ranges.
 * This protects against users manually editing settings.json with invalid values.
 */
export class VsCodeConfigurationService implements IConfigurationService {
	/**
	 * Configuration namespace prefix.
	 * Settings are accessed as 'powerPlatformDevSuite.{key}' in VS Code settings.
	 */
	private static readonly NAMESPACE = 'powerPlatformDevSuite';

	/**
	 * Validation rules for numeric settings.
	 * Mirrors minimum/maximum from package.json contributes.configuration.
	 * Values outside these ranges are clamped to prevent unexpected behavior.
	 */
	private static readonly NUMERIC_VALIDATION_RULES: Readonly<Record<string, NumericValidationRule>> = {
		'pluginTrace.defaultLimit': { min: 1, max: 5000 },
		'pluginTrace.batchDeleteSize': { min: 50, max: 1000 },
		'pluginTrace.defaultDeleteOldDays': { min: 1, max: 365 },
		'virtualTable.initialPageSize': { min: 10, max: 500 },
		'virtualTable.backgroundPageSize': { min: 100, max: 2000 },
		'virtualTable.maxCachedRecords': { min: 100, max: 100000 },
		'webResources.cacheTTL': { min: 10, max: 600 },
		'metadata.cacheDuration': { min: 60, max: 3600 },
		'api.maxRetries': { min: 0, max: 10 }
	};

	/**
	 * Gets configuration value from VS Code settings.
	 * Falls back to default if not configured.
	 * Numeric values with validation rules are clamped to valid ranges.
	 *
	 * @param key - Dot-notation key relative to namespace (e.g., 'pluginTrace.defaultLimit')
	 * @param defaultValue - Fallback value if setting not configured
	 * @returns Configured value or default (clamped if numeric with validation rules)
	 */
	public get<T>(key: string, defaultValue: T): T {
		const config = vscode.workspace.getConfiguration(VsCodeConfigurationService.NAMESPACE);
		const value = config.get<T>(key, defaultValue);

		return this.validateNumeric(key, value);
	}

	/**
	 * Validates and clamps numeric values to their defined ranges.
	 * Non-numeric values or values without validation rules pass through unchanged.
	 */
	private validateNumeric<T>(key: string, value: T): T {
		if (typeof value !== 'number') {
			return value;
		}

		const rules = VsCodeConfigurationService.NUMERIC_VALIDATION_RULES[key];
		if (rules === undefined) {
			return value;
		}

		const clamped = Math.max(rules.min, Math.min(value, rules.max));
		return clamped as T;
	}
}
