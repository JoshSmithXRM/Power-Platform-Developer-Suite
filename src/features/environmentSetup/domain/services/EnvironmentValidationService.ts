import { Environment } from '../entities/Environment';
import { ValidationResult } from '../valueObjects/ValidationResult';

/**
 * Domain service for complex environment validation logic.
 *
 * Domain services are stateless and contain pure business logic with
 * ZERO infrastructure dependencies. This service coordinates validation
 * that spans multiple entities or requires external data (like name uniqueness).
 *
 * WHY Domain Service: Validation logic that requires external data (name uniqueness,
 * existing secrets) doesn't belong in the Entity. This service coordinates validation
 * while keeping the Entity pure.
 *
 * Responsibilities:
 * - Validate environment for save operations
 * - Check credential requirements based on auth method
 * - Coordinate with external data (name uniqueness, secret existence)
 *
 * Business Rules Enforced:
 * - Configuration must be valid (delegated to Environment entity)
 * - Name must be unique across all environments
 * - Required credentials must be provided or already exist
 * - Tenant ID required for Service Principal (MSAL limitation)
 * - Client Secret required for Service Principal
 * - Password required for Username/Password
 */
export class EnvironmentValidationService {
	/**
	 * Validates environment configuration for save operation.
	 *
	 * This validation requires external context (name uniqueness, existing secrets)
	 * that the Environment entity cannot access (Clean Architecture dependency rules).
	 *
	 * Business Rules:
	 * - Basic configuration must be valid
	 * - Name must be unique (checked via use case)
	 * - Service Principal: Client Secret required (new or existing)
	 * - Username/Password: Password required (new or existing)
	 * - Tenant ID required for Service Principal (MSAL limitation)
	 *
	 * WHY: Separates validation that requires external data from entity self-validation.
	 * Entity validates its own invariants; this service validates business rules
	 * requiring external context.
	 *
	 * @param {Environment} environment - Environment to validate
	 * @param {boolean} isNameUnique - Whether name is unique (provided by use case)
	 * @param {boolean} hasExistingClientSecret - Whether client secret exists in storage
	 * @param {boolean} hasExistingPassword - Whether password exists in storage
	 * @param {string} [clientSecret] - New client secret being provided
	 * @param {string} [password] - New password being provided
	 * @returns {ValidationResult} Result with errors and warnings
	 */
	public validateForSave(
		environment: Environment,
		isNameUnique: boolean,
		hasExistingClientSecret: boolean,
		hasExistingPassword: boolean,
		clientSecret?: string,
		password?: string
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Basic configuration validation
		const configResult = environment.validateConfiguration();
		if (!configResult.isValid) {
			errors.push(...configResult.errors);
		}

		// Check name uniqueness (data provided by use case)
		if (!isNameUnique) {
			errors.push('Environment name must be unique');
		}

		// Validate credentials if required
		const authMethod = environment.getAuthenticationMethod();
		if (authMethod.requiresClientCredentials()) {
			if (!clientSecret && !hasExistingClientSecret) {
				errors.push('Client secret is required for Service Principal authentication');
			}
		}

		if (authMethod.requiresUsernamePassword()) {
			if (!password && !hasExistingPassword) {
				errors.push('Password is required for Username/Password authentication');
			}
		}

		// Validate tenant ID for Service Principal (MSAL limitation)
		// Other auth methods (Interactive, DeviceCode, UsernamePassword) can use "organizations" authority
		if (authMethod.requiresClientCredentials()) {
			const tenantId = environment.getTenantId();
			if (!tenantId.getValue()) {
				errors.push('Tenant ID is required for Service Principal authentication');
			}
		}

		return new ValidationResult(errors.length === 0, errors, warnings);
	}
}
