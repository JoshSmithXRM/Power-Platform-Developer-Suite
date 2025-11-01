import { Environment } from '../entities/Environment';
import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Repository interface for environment persistence operations.
 *
 * Clean Architecture Principle: Domain defines the interface, infrastructure implements it.
 * This inverts the dependency: domain does NOT depend on infrastructure.
 *
 * WHY Interface in Domain: Allows domain services and use cases to declare their
 * storage needs without coupling to specific storage implementations (VS Code storage,
 * file system, database, etc.). Infrastructure layer implements this contract.
 *
 * Responsibilities:
 * - CRUD operations for environments
 * - Secret storage management (client secrets, passwords)
 * - Name uniqueness validation
 * - Orphaned secret cleanup
 *
 * Note: Methods are async because actual implementation uses VS Code storage APIs
 * which are async. Domain interface matches implementation reality.
 */
export interface IEnvironmentRepository {
	/** Retrieves all environments from storage. */
	getAll(): Promise<Environment[]>;

	/** Retrieves environment by ID. Returns null if not found. */
	getById(id: EnvironmentId): Promise<Environment | null>;

	/** Retrieves environment by name (case-sensitive). Returns null if not found. */
	getByName(name: string): Promise<Environment | null>;

	/** Retrieves currently active environment. Returns null if none active. */
	getActive(): Promise<Environment | null>;

	/**
	 * Saves environment (create or update) with optional credentials.
	 *
	 * @param environment - Environment to save
	 * @param clientSecret - Client secret (if Service Principal auth)
	 * @param password - Password (if Username/Password auth)
	 * @param preserveExistingCredentials - If true, keep existing credentials when new ones not provided
	 */
	save(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		preserveExistingCredentials?: boolean
	): Promise<void>;

	/**
	 * Deletes environment and all associated secrets.
	 *
	 * @param id - Environment ID to delete
	 */
	delete(id: EnvironmentId): Promise<void>;

	/**
	 * Checks if environment name is unique (case-sensitive).
	 *
	 * @param name - Name to check
	 * @param excludeId - Optional ID to exclude (for update scenarios)
	 * @returns {Promise<boolean>} True if name is unique
	 */
	isNameUnique(name: string, excludeId?: EnvironmentId): Promise<boolean>;

	/**
	 * Retrieves stored client secret from SecretStorage.
	 *
	 * @param clientId - Client ID (used in secret key)
	 * @returns {Promise<string | undefined>} Client secret or undefined if not found
	 */
	getClientSecret(clientId: string): Promise<string | undefined>;

	/**
	 * Retrieves stored password from SecretStorage.
	 *
	 * @param username - Username (used in secret key)
	 * @returns {Promise<string | undefined>} Password or undefined if not found
	 */
	getPassword(username: string): Promise<string | undefined>;

	/**
	 * Deletes orphaned secrets from SecretStorage.
	 *
	 * WHY: When auth method or credentials change, old secrets become orphaned
	 * and should be cleaned up.
	 *
	 * @param secretKeys - Array of secret storage keys to delete
	 */
	deleteSecrets(secretKeys: string[]): Promise<void>;
}
