import { Environment } from '../entities/Environment';
import { ValidationResult } from '../valueObjects/ValidationResult';
import { IEnvironmentRepository } from '../interfaces/IEnvironmentRepository';

/**
 * Domain service for complex validation logic
 */
export class EnvironmentValidationService {
	constructor(
		private readonly repository: IEnvironmentRepository
	) {}

	/**
	 * Validate environment for save operation
	 * Business rule: Name must be unique
	 */
	public async validateForSave(environment: Environment, clientSecret?: string, password?: string): Promise<ValidationResult> {
		const errors: string[] = [];

		// Basic configuration validation
		const configResult = environment.validateConfiguration();
		if (!configResult.isValid) {
			errors.push(...configResult.errors);
		}

		// Check name uniqueness
		const isUnique = await this.repository.isNameUnique(
			environment.getName().getValue(),
			environment.getId()
		);
		if (!isUnique) {
			errors.push('Environment name must be unique');
		}

		// Validate credentials if required
		const authMethod = environment.getAuthenticationMethod();
		if (authMethod.requiresClientCredentials()) {
			const existingSecret = await this.repository.getClientSecret(
				environment.getClientId()?.getValue() || ''
			);
			if (!clientSecret && !existingSecret) {
				errors.push('Client secret is required for Service Principal authentication');
			}
		}

		if (authMethod.requiresUsernamePassword()) {
			const existingPassword = await this.repository.getPassword(
				environment.getUsername() || ''
			);
			if (!password && !existingPassword) {
				errors.push('Password is required for Username/Password authentication');
			}
		}

		return new ValidationResult(errors.length === 0, errors);
	}
}
