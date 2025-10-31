import { DomainError } from '../errors/DomainError';

/**
 * TenantId value object
 * Business rule: Must be valid GUID format
 */
export class TenantId {
	private readonly value: string;
	private static readonly GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Tenant ID cannot be empty');
		}

		const normalized = value.trim().toLowerCase();
		if (!TenantId.GUID_PATTERN.test(normalized)) {
			throw new DomainError('Invalid Tenant ID format. Expected GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
		}

		this.value = normalized;
	}

	public getValue(): string {
		return this.value;
	}

	public isValid(): boolean {
		return TenantId.GUID_PATTERN.test(this.value);
	}
}
