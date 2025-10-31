import { DomainError } from '../errors/DomainError';

/**
 * ClientId value object (for app registrations)
 */
export class ClientId {
	private readonly value: string;
	private static readonly GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	private static readonly MICROSOFT_EXAMPLE_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Client ID cannot be empty');
		}

		const normalized = value.trim().toLowerCase();
		if (!ClientId.GUID_PATTERN.test(normalized)) {
			throw new DomainError('Invalid Client ID format. Expected GUID format');
		}

		this.value = normalized;
	}

	public getValue(): string {
		return this.value;
	}

	public isValid(): boolean {
		return ClientId.GUID_PATTERN.test(this.value);
	}

	public isMicrosoftExampleClientId(): boolean {
		return this.value === ClientId.MICROSOFT_EXAMPLE_CLIENT_ID;
	}
}
