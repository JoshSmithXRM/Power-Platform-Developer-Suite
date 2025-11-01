import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an immutable environment identifier.
 *
 * Value objects are immutable, validated on construction, and compared by value.
 *
 * WHY: Provides type-safe identifier for environments instead of raw strings.
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
	 * Generates a new unique environment ID.
	 *
	 * Format: `env-{timestamp}-{random}`
	 *
	 * WHY: Provides collision-resistant IDs without external dependencies.
	 * Timestamp ensures chronological ordering; random suffix prevents collisions.
	 *
	 * @returns {EnvironmentId} New unique environment ID
	 */
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
