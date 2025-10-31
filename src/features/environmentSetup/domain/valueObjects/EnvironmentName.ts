import { DomainError } from '../errors/DomainError';

/**
 * EnvironmentName value object
 * Business rule: Names must be non-empty and unique (case-sensitive)
 */
export class EnvironmentName {
	private readonly value: string;

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Environment name cannot be empty');
		}
		if (value.length > 100) {
			throw new DomainError('Environment name cannot exceed 100 characters');
		}
		this.value = value.trim();
	}

	public getValue(): string {
		return this.value;
	}

	public isValid(): boolean {
		return this.value.length > 0 && this.value.length <= 100;
	}

	public equals(other: string | EnvironmentName): boolean {
		const otherValue = typeof other === 'string' ? other : other.getValue();
		return this.value === otherValue; // Case-sensitive
	}
}
