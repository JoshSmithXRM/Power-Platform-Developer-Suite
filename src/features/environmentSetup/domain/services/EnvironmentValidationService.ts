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
	 * - Warn about Microsoft example client ID
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

		// Warn about Microsoft example client ID
		const publicClientId = environment.getPublicClientId();
		if (publicClientId.isMicrosoftExampleClientId()) {
			warnings.push('Using Microsoft example client ID. Create your own Azure AD app registration for production use.');
		}

		return new ValidationResult(errors.length === 0, errors, warnings);
	}
}
