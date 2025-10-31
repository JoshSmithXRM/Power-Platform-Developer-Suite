import { DomainError } from '../errors/DomainError';

/**
 * EnvironmentId value object - Immutable identifier
 */
export class EnvironmentId {
	private readonly value: string;

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Environment ID cannot be empty');
		}
		this.value = value;
	}

	public static generate(): EnvironmentId {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 11);
		return new EnvironmentId(`env-${timestamp}-${random}`);
	}

	public getValue(): string {
		return this.value;
	}

	public equals(other: EnvironmentId): boolean {
		return this.value === other.value;
	}
}
