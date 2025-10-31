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
}
