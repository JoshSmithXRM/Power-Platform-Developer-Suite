import { Environment } from '../entities/Environment';
import { ValidationResult } from '../valueObjects/ValidationResult';

/**
 * Domain service for complex validation logic
 * Domain services are stateless and contain NO infrastructure dependencies
 */
export class EnvironmentValidationService {
	/**
	 * Validate environment for save operation
	 * Business rules:
	 * - Configuration must be valid
	 * - Name must be unique
	 * - Required credentials must be provided or exist
	 * - Tenant ID required only for Service Principal
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
