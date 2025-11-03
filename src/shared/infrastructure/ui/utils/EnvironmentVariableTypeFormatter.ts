/**
 * Formats environment variable types for display in the UI layer.
 * Handles type codes from Dataverse:
 * - 100000000: String
 * - 100000001: Number
 * - 100000002: Boolean
 * - 100000003: JSON
 * - 100000004: Secret
 * - 100000005: Data Source
 */
export class EnvironmentVariableTypeFormatter {
	/**
	 * Formats environment variable type code as friendly display name.
	 * @param type - Environment variable type code from Dataverse
	 * @returns Friendly type name for display
	 */
	static formatTypeName(type: number): string {
		switch (type) {
			case 100000000:
				return 'String';
			case 100000001:
				return 'Number';
			case 100000002:
				return 'Boolean';
			case 100000003:
				return 'JSON';
			case 100000004:
				return 'Secret';
			case 100000005:
				return 'Data Source';
			default:
				return 'Unknown';
		}
	}
}
