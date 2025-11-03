import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an Azure AD tenant ID.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Business Rules:
 * - Optional for Interactive, DeviceCode, UsernamePassword (uses "organizations" authority)
 * - Required for Service Principal authentication (MSAL limitation)
 * - Must be valid GUID format when provided
 * - Empty/undefined is valid (falls back to "organizations" authority)
 *
 * WHY Optional: MSAL supports multi-tenant authentication using the "organizations"
 * authority. Service Principal requires specific tenant due to MSAL limitations.
 *
 * @example
 * ```typescript
 * const specificTenant = new TenantId('12345678-1234-1234-1234-123456789abc');
 * const defaultAuth = new TenantId(); // Uses "organizations" authority
 * ```
 */
export class TenantId {
	private readonly value?: string;
	private static readonly GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	constructor(value?: string) {
		// Allow empty/undefined - will use "organizations" authority for MSAL
		if (!value || value.trim() === '') {
			this.value = undefined;
			return;
		}

		const normalized = value.trim().toLowerCase();
		if (!TenantId.GUID_PATTERN.test(normalized)) {
			throw new DomainError('Invalid Tenant ID format. Expected GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
		}

		this.value = normalized;
	}

	public getValue(): string | undefined {
		return this.value;
	}

	public isValid(): boolean {
		// If no value provided, it's valid (will use default authority)
		if (!this.value) {
			return true;
		}
		return TenantId.GUID_PATTERN.test(this.value);
	}

	/**
	 * Checks if a specific tenant ID was provided.
	 *
	 * Distinguishes between explicit tenant ID and fallback to "organizations".
	 * Used for validation (Service Principal requires explicit tenant).
	 *
	 * @returns {boolean} True if explicit tenant ID provided, false if using default
	 */
	public isProvided(): boolean {
		return this.value !== undefined;
	}
}
