import { EnvironmentVariableType } from '../../../../features/environmentVariables/domain/entities/EnvironmentVariable';

/**
 * Formats environment variable types for display in the UI layer.
 * Uses EnvironmentVariableType enum from domain for type safety.
 */
export class EnvironmentVariableTypeFormatter {
	/**
	 * Formats environment variable type code as friendly display name.
	 * @param type - Environment variable type code from Dataverse
	 * @returns Friendly type name for display
	 */
	static formatTypeName(type: number): string {
		switch (type) {
			case EnvironmentVariableType.String:
				return 'String';
			case EnvironmentVariableType.Number:
				return 'Number';
			case EnvironmentVariableType.Boolean:
				return 'Boolean';
			case EnvironmentVariableType.JSON:
				return 'JSON';
			case EnvironmentVariableType.Secret:
				return 'Secret';
			case EnvironmentVariableType.DataSource:
				return 'Data Source';
			default:
				return 'Unknown';
		}
	}
}
