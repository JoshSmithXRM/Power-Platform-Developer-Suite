import { Environment } from '../entities/Environment';
import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Repository interface defined in domain layer
 * Infrastructure layer must implement this contract
 */
export interface IEnvironmentRepository {
	/**
	 * Get all environments
	 */
	getAll(): Promise<Environment[]>;

	/**
	 * Get environment by ID
	 */
	getById(id: EnvironmentId): Promise<Environment | null>;

	/**
	 * Get environment by name (case-sensitive)
	 */
	getByName(name: string): Promise<Environment | null>;

	/**
	 * Get currently active environment
	 */
	getActive(): Promise<Environment | null>;

	/**
	 * Save environment (create or update)
	 * @param environment The environment to save
	 * @param clientSecret Optional client secret (if auth method requires it)
	 * @param password Optional password (if auth method requires it)
	 * @param preserveExistingCredentials If true, preserve existing credentials when not provided
	 */
	save(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		preserveExistingCredentials?: boolean
	): Promise<void>;

	/**
	 * Delete environment and its secrets
	 */
	delete(id: EnvironmentId): Promise<void>;

	/**
	 * Check if name is unique (case-sensitive)
	 * @param name The name to check
	 * @param excludeId Optional ID to exclude from check (for updates)
	 */
	isNameUnique(name: string, excludeId?: EnvironmentId): Promise<boolean>;

	/**
	 * Get stored client secret for environment
	 */
	getClientSecret(clientId: string): Promise<string | undefined>;

	/**
	 * Get stored password for environment
	 */
	getPassword(username: string): Promise<string | undefined>;

	/**
	 * Delete orphaned secrets (cleanup after auth method change)
	 */
	deleteSecrets(secretKeys: string[]): Promise<void>;
}
