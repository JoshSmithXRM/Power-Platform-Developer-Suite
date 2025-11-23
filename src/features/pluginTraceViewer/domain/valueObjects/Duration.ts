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

	/**
	 * Factory method to create a Duration from milliseconds.
	 *
	 * @param ms - Duration in milliseconds (must be non-negative)
	 * @returns New Duration instance
	 * @throws {ValidationError} If milliseconds is negative
	 */
	static fromMilliseconds(ms: number): Duration {
		return new Duration(ms);
	}

	/**
	 * Compares this duration to another to determine if it's slower (longer).
	 * Useful for performance analysis and identifying slow operations.
	 *
	 * @param other - Duration to compare against
	 * @returns True if this duration is longer than the other
	 */
	isSlowerThan(other: Duration): boolean {
		return this.milliseconds > other.milliseconds;
	}

	/**
	 * Adds another duration to this one.
	 * Returns a new Duration (immutable value object pattern).
	 *
	 * @param other - Duration to add
	 * @returns New Duration representing the sum
	 */
	add(other: Duration): Duration {
		return new Duration(this.milliseconds + other.milliseconds);
	}
}
