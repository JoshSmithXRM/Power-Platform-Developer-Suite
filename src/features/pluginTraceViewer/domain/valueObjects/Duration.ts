import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Domain value object: Duration
 *
 * Represents a time duration in milliseconds with business logic for formatting.
 * Immutable value object that encapsulates duration formatting rules.
 */
export class Duration {
	private constructor(public readonly milliseconds: number) {
		if (milliseconds < 0) {
			throw new ValidationError(
				'Duration',
				'milliseconds',
				milliseconds,
				'Cannot be negative'
			);
		}
	}

	static fromMilliseconds(ms: number): Duration {
		return new Duration(ms);
	}

	isSlowerThan(other: Duration): boolean {
		return this.milliseconds > other.milliseconds;
	}

	/**
	 * Returns a new Duration (immutable).
	 */
	add(other: Duration): Duration {
		return new Duration(this.milliseconds + other.milliseconds);
	}
}
