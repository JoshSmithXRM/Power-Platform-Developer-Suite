import { DomainError } from '../errors/DomainError';

/**
 * DataverseUrl value object
 * Business rule: Must be valid Dataverse URL format
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

	public getApiBaseUrl(): string {
		return `${this.value}/api/data/v9.2`;
	}

	/**
	 * Extract organization name from Dataverse URL
	 * Examples:
	 *   https://contoso.crm.dynamics.com -> contoso
	 *   https://contoso.crm2.dynamics.com -> contoso
	 *   https://contoso.api.crm.dynamics.com -> contoso
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
