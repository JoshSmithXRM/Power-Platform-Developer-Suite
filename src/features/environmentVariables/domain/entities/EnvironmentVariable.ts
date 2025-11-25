import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Environment variable type codes from Dataverse
 */
export enum EnvironmentVariableType {
	String = 100000000,
	Number = 100000001,
	Boolean = 100000002,
	JSON = 100000003,
	Secret = 100000004,
	DataSource = 100000005
}

/**
 * EnvironmentVariable entity representing a Power Platform environment variable
 * with its definition and value combined.
 *
 * Responsibilities:
 * - Combine definition and value data
 * - Calculate effective value (CurrentValue ?? DefaultValue)
 * - Provide friendly type names for display
 * - Validate type codes
 */
export class EnvironmentVariable {
	/**
	 * @throws {ValidationError} When type code is invalid
	 */
	constructor(
		public readonly definitionId: string,
		public readonly schemaName: string,
		public readonly displayName: string,
		public readonly type: EnvironmentVariableType,
		public readonly defaultValue: string | null,
		public readonly currentValue: string | null,
		public readonly isManaged: boolean,
		public readonly description: string,
		public readonly modifiedOn: Date,
		public readonly valueId: string | null
	) {
		// Validate type code is a known value
		if (!Object.values(EnvironmentVariableType).includes(type)) {
			throw new ValidationError(
				'EnvironmentVariable',
				'type',
				type,
				'Must be a valid EnvironmentVariableType enum value'
			);
		}
	}

	/**
	 * Gets the effective value for this environment variable.
	 * Current value takes precedence over default value per Power Platform behavior.
	 */
	getEffectiveValue(): string | null {
		return this.currentValue ?? this.defaultValue;
	}

	/**
	 * Determines if this environment variable has any value set.
	 */
	hasValue(): boolean {
		return this.getEffectiveValue() !== null;
	}

	/**
	 * Determines if current value differs from default value.
	 * Environment-specific overrides indicate configuration that varies by environment.
	 */
	hasOverride(): boolean {
		return this.currentValue !== null && this.currentValue !== this.defaultValue;
	}

	/**
	 * Determines if this environment variable is a secret type.
	 * Secrets require special handling in UI (masked display, secure storage).
	 */
	isSecret(): boolean {
		return this.type === EnvironmentVariableType.Secret;
	}

	/**
	 * Checks if this environment variable exists in the specified solution.
	 * @param solutionComponentIds - Set of component IDs from solution
	 */
	isInSolution(solutionComponentIds: Set<string>): boolean {
		return solutionComponentIds.has(this.definitionId);
	}
}
