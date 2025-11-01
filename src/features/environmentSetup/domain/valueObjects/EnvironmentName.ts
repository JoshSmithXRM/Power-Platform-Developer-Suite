import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an environment name.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Business Rules:
 * - Must be non-empty (trimmed)
 * - Maximum 100 characters
 * - Uniqueness is case-sensitive
 * - Leading/trailing whitespace is trimmed
 *
 * WHY Case-Sensitive: Environment names are user-visible identifiers.
 * Case-sensitive comparison respects user intent and avoids confusion
 * between "DEV" and "dev" environments.
 *
 * @throws {DomainError} If name is empty or exceeds 100 characters
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
