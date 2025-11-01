import { DomainError } from '../errors/DomainError';

/**
 * Value object representing a Dataverse environment URL.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Business Rules:
 * - Must match Dataverse URL pattern: `https://<org>.crm[N].dynamics.com`
 * - Automatically normalizes URLs (adds https, removes trailing slash)
 * - Provides derived values (API base URL, organization name)
 *
 * Supported Formats:
 * - `https://contoso.crm.dynamics.com` (US)
 * - `https://contoso.crm2.dynamics.com` (South America)
 * - `https://contoso.crm4.dynamics.com` (Europe)
 * - Regional variants with country codes (e.g., crm11.de)
 *
 * WHY: Type-safe URL wrapper with validation and normalization. Ensures
 * only valid Dataverse URLs are used throughout the application.
 *
 * @throws {DomainError} If URL format is invalid
 */
export class DataverseUrl {
	private readonly value: string;
	private static readonly URL_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.(crm\d*|crm\d*\.[a-z]{2})\.dynamics\.com\/?$/;

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Dataverse URL cannot be empty');
		}

		const normalized = this.normalizeUrl(value);
		if (!DataverseUrl.URL_PATTERN.test(normalized)) {
			throw new DomainError('Invalid Dataverse URL format. Expected format: https://<org>.crm.dynamics.com');
		}

		this.value = normalized;
	}

	private normalizeUrl(url: string): string {
		// Remove trailing slash
		let normalized = url.trim().replace(/\/$/, '');

		// Ensure https
		if (normalized.startsWith('http://')) {
			normalized = normalized.replace('http://', 'https://');
		}

		return normalized;
	}

	public getValue(): string {
		return this.value;
	}

	public isValid(): boolean {
		return DataverseUrl.URL_PATTERN.test(this.value);
	}

	/**
	 * Gets the Web API base URL for this Dataverse environment.
	 *
	 * WHY: Dataverse Web API requires /api/data/v9.2 path. This method
	 * provides the complete base URL for API calls.
	 *
	 * @returns {string} Web API base URL (e.g., `https://org.crm.dynamics.com/api/data/v9.2`)
	 */
	public getApiBaseUrl(): string {
		return `${this.value}/api/data/v9.2`;
	}

	/**
	 * Extracts organization name from Dataverse URL.
	 *
	 * WHY: Organization name is used for display and identification purposes.
	 * Extracted from the hostname's first segment.
	 *
	 * @returns {string} Organization name (e.g., "contoso")
	 * @throws {DomainError} If organization name cannot be extracted
	 * @example
	 * ```typescript
	 * new DataverseUrl('https://contoso.crm.dynamics.com').getOrganizationName(); // "contoso"
	 * new DataverseUrl('https://contoso.crm2.dynamics.com').getOrganizationName(); // "contoso"
	 * ```
	 */
	public getOrganizationName(): string {
		try {
			const urlObj = new URL(this.value);
			const hostname = urlObj.hostname;

			// Extract first part before .crm or .api
			const parts = hostname.split('.');
			if (parts.length > 0 && parts[0]) {
				return parts[0];
			}

			throw new DomainError('Unable to extract organization name from Dataverse URL');
		} catch (error) {
			if (error instanceof DomainError) {
				throw error;
			}
			throw new DomainError(`Invalid Dataverse URL format: ${this.value}`);
		}
	}
}
