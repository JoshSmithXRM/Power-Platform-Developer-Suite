import { DomainError } from '../errors/DomainError';

/**
 * TenantId value object
 * Business rule: Must be valid GUID format when provided
 * Optional for Interactive, DeviceCode, and UsernamePassword auth (uses "organizations" authority)
 * Required for ServicePrincipal auth (MSAL limitation)
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
	 * Check if a specific tenant ID was provided
	 * Returns false if using default "organizations" authority
	 */
	public isProvided(): boolean {
		return this.value !== undefined;
	}
}
