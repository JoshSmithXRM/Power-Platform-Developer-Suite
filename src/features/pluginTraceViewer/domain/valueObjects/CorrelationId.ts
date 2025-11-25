import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Domain value object: Correlation ID
 *
 * Represents a GUID that links related plugin executions together.
 * When a plugin calls another plugin, they share the same correlation ID.
 * Used for tracing execution chains and understanding plugin dependencies.
 */
export class CorrelationId {
	private constructor(public readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new ValidationError(
				'CorrelationId',
				'value',
				value,
				'Cannot be empty'
			);
		}
	}

	static create(value: string): CorrelationId {
		return new CorrelationId(value);
	}

	equals(other: CorrelationId | null): boolean {
		return other !== null && this.value === other.value;
	}

	getValue(): string {
		return this.value;
	}

	toString(): string {
		return this.value;
	}

	/**
	 * Should never be true due to constructor validation, but kept for defensive programming.
	 */
	isEmpty(): boolean {
		return this.value.trim().length === 0;
	}
}
