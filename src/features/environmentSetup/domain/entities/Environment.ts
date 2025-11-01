import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
import { TenantId } from '../valueObjects/TenantId';
import { ClientId } from '../valueObjects/ClientId';
import { AuthenticationMethod } from '../valueObjects/AuthenticationMethod';
import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { DomainError } from '../errors/DomainError';
import { ValidationResult } from '../valueObjects/ValidationResult';

/**
 * Environment entity - Rich domain model with business logic
 * Represents a Power Platform environment connection configuration
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
	 * Business Logic: Validation
	 */
	private validate(): void {
		const result = this.validateConfiguration();
		if (!result.isValid) {
			throw new DomainError(`Environment validation failed: ${result.errors.join(', ')}`);
		}
	}

	/**
	 * Validates environment configuration based on auth method
	 * Business rule: Different auth methods require different credentials
	 */
	public validateConfiguration(): ValidationResult {
		const errors: string[] = [];

		// Basic validation
		if (!this.name.isValid()) {
			errors.push('Environment name is required and must be unique');
		}

		if (!this.dataverseUrl.isValid()) {
			errors.push('Valid Dataverse URL is required');
		}

		// Tenant ID validation - format check (when provided)
		if (!this.tenantId.isValid()) {
			errors.push('Invalid Tenant ID format. Expected GUID format');
		}

		// Tenant ID requirement - only for Service Principal (MSAL limitation)
		// Interactive, DeviceCode, and UsernamePassword can use "organizations" authority
		if (this.authenticationMethod.requiresClientCredentials()) {
			if (!this.tenantId.isProvided()) {
				errors.push('Tenant ID is required for Service Principal authentication');
			}
		}

		// Auth-specific validation
		if (this.authenticationMethod.requiresClientCredentials()) {
			if (!this.clientId || !this.clientId.isValid()) {
				errors.push('Client ID is required for Service Principal authentication');
			}
			// Note: clientSecret validated separately (not stored in entity)
		}

		if (this.authenticationMethod.requiresUsernamePassword()) {
			if (!this.username || this.username.trim() === '') {
				errors.push('Username is required for Username/Password authentication');
			}
			// Note: password validated separately (not stored in entity)
		}

		return new ValidationResult(errors.length === 0, errors);
	}

	/**
	 * Business rule: Determines if environment needs credentials to connect
	 */
	public requiresCredentials(): boolean {
		return this.authenticationMethod.requiresCredentials();
	}

	/**
	 * Business rule: Checks if connection can be tested
	 * Must have valid configuration to test
	 */
	public canTestConnection(): boolean {
		return this.validateConfiguration().isValid;
	}

	/**
	 * Business rule: Determines which secrets should be stored
	 * Returns storage keys for SecretStorage based on auth method
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
	 * Business rule: When auth method changes, old secrets become orphaned
	 * Returns secret keys that should be deleted from storage
	 */
	public getOrphanedSecretKeys(previousAuthMethod: AuthenticationMethod, previousClientId?: ClientId, previousUsername?: string): string[] {
		const orphanedKeys: string[] = [];

		// If switching FROM ServicePrincipal, orphan its secret
		if (previousAuthMethod.requiresClientCredentials() && previousClientId) {
			const oldKey = `power-platform-dev-suite-secret-${previousClientId.getValue()}`;
			if (!this.getRequiredSecretKeys().includes(oldKey)) {
				orphanedKeys.push(oldKey);
			}
		}

		// If switching FROM UsernamePassword, orphan its password
		if (previousAuthMethod.requiresUsernamePassword() && previousUsername) {
			const oldKey = `power-platform-dev-suite-password-${previousUsername}`;
			if (!this.getRequiredSecretKeys().includes(oldKey)) {
				orphanedKeys.push(oldKey);
			}
		}

		return orphanedKeys;
	}

	/**
	 * Business rule: Mark environment as active (only one can be active)
	 */
	public activate(): void {
		this.isActive = true;
		this.lastUsed = new Date();
	}

	/**
	 * Business rule: Deactivate environment
	 */
	public deactivate(): void {
		this.isActive = false;
	}

	/**
	 * Business rule: Update last used timestamp
	 */
	public markAsUsed(): void {
		this.lastUsed = new Date();
	}

	/**
	 * Business rule: Check if environment name matches (case-sensitive)
	 */
	public hasName(name: string): boolean {
		return this.name.equals(name);
	}

	/**
	 * Business rule: Update environment configuration
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

	// Getters
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
