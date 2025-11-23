import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an immutable environment identifier.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * Provides type-safe identifier for environments instead of raw strings.
 * Ensures non-empty values and provides factory method for generation.
 *
 * @example
 * ```typescript
 * const id = EnvironmentId.generate(); // env-1699564800000-abc123def
 * const existing = new EnvironmentId('env-123');
 * ```
 */
export class EnvironmentId {
	private readonly value: string;

	constructor(value: string) {
		if (!value || value.trim() === '') {
			throw new DomainError('Environment ID cannot be empty');
		}
		this.value = value;
	}

	/**
	 * Radix (base) for generating alphanumeric random strings.
	 * Base 36 includes digits 0-9 and letters a-z.
	 */
	private static readonly RANDOM_STRING_RADIX = 36;

	/**
	 * Start index for extracting random substring (skip "0." prefix from Math.random).
	 */
	private static readonly RANDOM_SUBSTRING_START = 2;

	/**
	 * End index for extracting random substring (9 characters for uniqueness).
	 */
	private static readonly RANDOM_SUBSTRING_END = 11;

	/**
	 * Generates a new unique environment ID.
	 *
	 * Format: `env-{timestamp}-{random}`
	 *
	 * Provides collision-resistant IDs without external dependencies.
	 * Timestamp ensures chronological ordering; random suffix prevents collisions.
	 *
	 * @returns {EnvironmentId} New unique environment ID
	 */
	public static generate(): EnvironmentId {
		const timestamp = Date.now();
		const random = Math.random()
			.toString(EnvironmentId.RANDOM_STRING_RADIX)
			.substring(
				EnvironmentId.RANDOM_SUBSTRING_START,
				EnvironmentId.RANDOM_SUBSTRING_END
			);
		return new EnvironmentId(`env-${timestamp}-${random}`);
	}

	public getValue(): string {
		return this.value;
	}

	public equals(other: EnvironmentId): boolean {
		return this.value === other.value;
	}
}
