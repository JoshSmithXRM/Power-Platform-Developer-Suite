import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
import { TenantId } from '../valueObjects/TenantId';
import { ClientId } from '../valueObjects/ClientId';
import { AuthenticationMethod } from '../valueObjects/AuthenticationMethod';
import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { DomainError } from '../errors/DomainError';
import { ValidationResult } from '../valueObjects/ValidationResult';

/**
 * Domain entity representing a Power Platform environment connection configuration.
 * Encapsulates all environment data and business rules for environment management.
 *
 * This is a rich domain model (not anemic) - it contains behavior and enforces
 * business invariants. The entity validates itself on construction and prevents
 * invalid state.
 *
 * Responsibilities:
 * - Validate environment configuration based on authentication method
 * - Enforce authentication method requirements (credentials, tenant ID)
 * - Manage environment activation state (only one can be active)
 * - Determine which credentials are required based on auth method
 * - Track credential changes for secret cleanup (orphaned keys)
 *
 * Business Rules:
 * - Name must be unique and non-empty
 * - Dataverse URL must be valid
 * - Tenant ID required for Service Principal (MSAL limitation)
 * - Service Principal requires Client ID and Client Secret
 * - Username/Password requires Username and Password
 * - Interactive/DeviceCode flows require no stored credentials
 * - Only one environment can be active at a time
 *
 * @example
 * ```typescript
 * const env = new Environment(
 *   EnvironmentId.create(),
 *   new EnvironmentName('Dev Environment'),
 *   new DataverseUrl('https://org.crm.dynamics.com'),
 *   new TenantId('guid'),
 *   new AuthenticationMethod(AuthenticationMethodType.Interactive),
 *   new ClientId('public-client-id'),
 *   false
 * );
 * env.activate(); // Mark as active
 * ```
 */
export class Environment {
	constructor(
		public readonly id: EnvironmentId,
		private name: EnvironmentName,
		private dataverseUrl: DataverseUrl,
		private tenantId: TenantId,
		private authenticationMethod: AuthenticationMethod,
		private publicClientId: ClientId,
		private isActive: boolean,
		private lastUsed?: Date,
		private powerPlatformEnvironmentId?: string,
		private clientId?: ClientId,
		private username?: string
	) {
		this.validate();
	}

	/**
	 * Validates environment configuration on construction.
	 *
	 * Prevents creation of invalid environment entities by catching configuration
	 * errors immediately rather than at runtime (fail-fast principle).
	 *
	 * @throws {DomainError} If configuration validation fails
	 * @private
	 */
	private validate(): void {
		const result = this.validateConfiguration();
		if (!result.isValid) {
			throw new DomainError(`Environment validation failed: ${result.errors.join(', ')}`);
		}
	}

	/**
	 * Validates environment configuration based on authentication method.
	 *
	 * Business Rules Applied:
	 * - Name must be valid (non-empty, unique)
	 * - Dataverse URL must be valid
	 * - Tenant ID must be valid GUID format (when provided)
	 * - Tenant ID required for Service Principal (MSAL limitation)
	 * - Service Principal requires Client ID
	 * - Username/Password requires Username
	 * - Secrets (clientSecret, password) validated separately (not stored in entity)
	 *
	 * Different auth methods have different credential requirements: Service Principal
	 * uses Client ID + Secret, Username/Password uses Username + Password, while
	 * Interactive/DeviceCode flows use browser-based auth with no stored credentials.
	 *
	 * @returns {ValidationResult} Result containing validation errors
	 */
	public validateConfiguration(): ValidationResult {
		const errors: string[] = [];

		if (!this.name.isValid()) {
			errors.push('Environment name is required and must be unique');
		}

		if (!this.dataverseUrl.isValid()) {
			errors.push('Valid Dataverse URL is required');
		}

		if (!this.tenantId.isValid()) {
			errors.push('Invalid Tenant ID format. Expected GUID format');
		}

		if (this.authenticationMethod.requiresClientCredentials()) {
			if (!this.tenantId.isProvided()) {
				errors.push('Tenant ID is required for Service Principal authentication');
			}
		}

		if (this.authenticationMethod.requiresClientCredentials()) {
			if (!this.clientId || !this.clientId.isValid()) {
				errors.push('Client ID is required for Service Principal authentication');
			}
		}

		if (this.authenticationMethod.requiresUsernamePassword()) {
			if (!this.username || this.username.trim() === '') {
				errors.push('Username is required for Username/Password authentication');
			}
		}

		return new ValidationResult(errors.length === 0, errors);
	}

	/**
	 * Determines if environment requires stored credentials to connect.
	 *
	 * Interactive and DeviceCode flows use browser-based authentication without
	 * stored credentials. Service Principal and Username/Password require credentials
	 * stored in VS Code SecretStorage.
	 *
	 * @returns {boolean} True if credentials must be stored
	 */
	public requiresCredentials(): boolean {
		return this.authenticationMethod.requiresCredentials();
	}

	/**
	 * Checks if connection can be tested.
	 *
	 * Connection testing requires valid configuration. Validates before allowing
	 * test to prevent confusing error messages.
	 *
	 * @returns {boolean} True if configuration is valid for testing
	 */
	public canTestConnection(): boolean {
		return this.validateConfiguration().isValid;
	}

	/**
	 * Determines which secret keys should be stored for this environment.
	 *
	 * Returns secret storage keys based on authentication method:
	 * - Service Principal: `power-platform-dev-suite-secret-{clientId}`
	 * - Username/Password: `power-platform-dev-suite-password-{username}`
	 * - Interactive/DeviceCode: Empty array (no secrets)
	 *
	 * Uses the client ID or username as part of the key to allow multiple
	 * environments with different credentials for the same auth method.
	 *
	 * @returns {string[]} Array of secret storage keys required for this environment
	 */
	public getRequiredSecretKeys(): string[] {
		const keys: string[] = [];

		if (this.authenticationMethod.requiresClientCredentials() && this.clientId) {
			keys.push(`power-platform-dev-suite-secret-${this.clientId.getValue()}`);
		}

		if (this.authenticationMethod.requiresUsernamePassword() && this.username) {
			keys.push(`power-platform-dev-suite-password-${this.username}`);
		}

		return keys;
	}

	/**
	 * Identifies orphaned secret keys that should be deleted from storage.
	 *
	 * When authentication method or credentials change, old secrets become orphaned
	 * and should be cleaned up to avoid stale credentials.
	 *
	 * Scenarios:
	 * - Switching from Service Principal to Interactive → orphan client secret
	 * - Switching from Username/Password to DeviceCode → orphan password
	 * - Changing Client ID on Service Principal → orphan old client secret
	 * - Changing Username on Username/Password → orphan old password
	 *
	 * Prevents accumulation of stale secrets in VS Code SecretStorage, following
	 * security best practices to remove unused credentials.
	 *
	 * @param {AuthenticationMethod} previousAuthMethod - Previous authentication method
	 * @param {ClientId} [previousClientId] - Previous client ID (if Service Principal)
	 * @param {string} [previousUsername] - Previous username (if Username/Password)
	 * @returns {string[]} Array of secret storage keys to delete
	 */
	public getOrphanedSecretKeys(previousAuthMethod: AuthenticationMethod, previousClientId?: ClientId, previousUsername?: string): string[] {
		const orphanedKeys: string[] = [];

		if (previousAuthMethod.requiresClientCredentials() && previousClientId) {
			const oldKey = `power-platform-dev-suite-secret-${previousClientId.getValue()}`;
			if (!this.getRequiredSecretKeys().includes(oldKey)) {
				orphanedKeys.push(oldKey);
			}
		}

		if (previousAuthMethod.requiresUsernamePassword() && previousUsername) {
			const oldKey = `power-platform-dev-suite-password-${previousUsername}`;
			if (!this.getRequiredSecretKeys().includes(oldKey)) {
				orphanedKeys.push(oldKey);
			}
		}

		return orphanedKeys;
	}

	/**
	 * Activates this environment, making it the currently selected environment.
	 *
	 * Only one environment can be active at a time. The active environment is used
	 * for all Power Platform operations (plugin registration, solution deployment, etc.).
	 * Updates lastUsed timestamp for sorting.
	 *
	 * Note: Caller is responsible for deactivating other environments.
	 */
	public activate(): void {
		this.isActive = true;
		this.lastUsed = new Date();
	}

	/**
	 * Deactivates this environment.
	 *
	 * Called when another environment is activated or when explicitly
	 * deactivating current environment.
	 */
	public deactivate(): void {
		this.isActive = false;
	}

	/**
	 * Updates the last used timestamp to current time.
	 *
	 * Used for sorting environments by recency in the UI.
	 */
	public markAsUsed(): void {
		this.lastUsed = new Date();
	}

	/**
	 * Checks if environment name matches the given name (case-sensitive).
	 *
	 * @param {string} name - Name to compare
	 * @returns {boolean} True if names match exactly
	 */
	public hasName(name: string): boolean {
		return this.name.equals(name);
	}

	/**
	 * Updates environment configuration with new values.
	 *
	 * Validates the new configuration before applying changes.
	 * Used when editing an existing environment.
	 *
	 * @param {EnvironmentName} name - New environment name
	 * @param {DataverseUrl} dataverseUrl - New Dataverse URL
	 * @param {TenantId} tenantId - New tenant ID
	 * @param {AuthenticationMethod} authenticationMethod - New auth method
	 * @param {ClientId} publicClientId - New public client ID
	 * @param {string} [powerPlatformEnvironmentId] - New Power Platform environment ID
	 * @param {ClientId} [clientId] - New client ID (for Service Principal)
	 * @param {string} [username] - New username (for Username/Password)
	 * @throws {DomainError} If new configuration is invalid
	 */
	public updateConfiguration(
		name: EnvironmentName,
		dataverseUrl: DataverseUrl,
		tenantId: TenantId,
		authenticationMethod: AuthenticationMethod,
		publicClientId: ClientId,
		powerPlatformEnvironmentId?: string,
		clientId?: ClientId,
		username?: string
	): void {
		this.name = name;
		this.dataverseUrl = dataverseUrl;
		this.tenantId = tenantId;
		this.authenticationMethod = authenticationMethod;
		this.publicClientId = publicClientId;
		this.powerPlatformEnvironmentId = powerPlatformEnvironmentId;
		this.clientId = clientId;
		this.username = username;

		this.validate();
	}

	public getId(): EnvironmentId { return this.id; }
	public getName(): EnvironmentName { return this.name; }
	public getDataverseUrl(): DataverseUrl { return this.dataverseUrl; }
	public getTenantId(): TenantId { return this.tenantId; }
	public getAuthenticationMethod(): AuthenticationMethod { return this.authenticationMethod; }
	public getPublicClientId(): ClientId { return this.publicClientId; }
	public getIsActive(): boolean { return this.isActive; }
	public getLastUsed(): Date | undefined { return this.lastUsed; }
	public getPowerPlatformEnvironmentId(): string | undefined { return this.powerPlatformEnvironmentId; }
	public getClientId(): ClientId | undefined { return this.clientId; }
	public getUsername(): string | undefined { return this.username; }
}
