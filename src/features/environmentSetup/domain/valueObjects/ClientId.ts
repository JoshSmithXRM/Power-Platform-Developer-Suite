import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an Azure AD application (client) ID.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Business Rules:
 * - Must be valid GUID format
 * - Cannot be empty
 * - Case-insensitive (normalized to lowercase)
 *
 * Used For:
 * - Public Client ID (for Interactive/DeviceCode flows)
 * - Confidential Client ID (for Service Principal flow)
 *
 * WHY: Type-safe wrapper around client ID with validation. Prevents
 * invalid GUIDs from being used in authentication flows.
 *
 * @throws {DomainError} If value is empty or not a valid GUID
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

	/**
	 * Checks if this is Microsoft's example public client ID.
	 *
	 * WHY: Microsoft provides a sample public client ID for testing.
	 * This method helps identify if the default/example ID is being used.
	 *
	 * @returns {boolean} True if this is the Microsoft example client ID
	 */
	public isMicrosoftExampleClientId(): boolean {
		return this.value === ClientId.MICROSOFT_EXAMPLE_CLIENT_ID;
	}
}
