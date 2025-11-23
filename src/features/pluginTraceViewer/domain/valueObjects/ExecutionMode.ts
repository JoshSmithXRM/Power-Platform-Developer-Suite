/**
 * Domain value object: Execution Mode
 *
 * Represents whether a plugin executed synchronously or asynchronously.
 * Synchronous plugins block the user transaction, async plugins run in background.
 */
export class ExecutionMode {
	private constructor(public readonly value: number) {}

	static readonly Synchronous = new ExecutionMode(0);
	static readonly Asynchronous = new ExecutionMode(1);

	/**
	 * Factory method to create ExecutionMode from numeric value.
	 * Maps Dataverse execution mode codes to value objects.
	 *
	 * @param value - Numeric execution mode (0 = Synchronous, 1 = Asynchronous)
	 * @returns ExecutionMode instance
	 * @throws Error if value is not a valid execution mode
	 */
	static fromNumber(value: number): ExecutionMode {
		switch (value) {
			case 0:
				return ExecutionMode.Synchronous;
			case 1:
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid ExecutionMode: unknown numeric value ${value}`);
		}
	}

	/**
	 * Creates ExecutionMode from string value.
	 * Useful for deserializing from JSON or parsing user input.
	 *
	 * @param value - String execution mode ('Synchronous' or 'Asynchronous')
	 * @returns ExecutionMode instance
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	static fromString(value: string): ExecutionMode {
		switch (value) {
			case 'Synchronous':
				return ExecutionMode.Synchronous;
			case 'Asynchronous':
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid ExecutionMode: unknown string value "${value}"`);
		}
	}

	/**
	 * Converts to number for OData queries.
	 * Required for building Dataverse API filter expressions.
	 *
	 * @returns Numeric execution mode (0 or 1)
	 *
	 * NOTE: Conversion for OData queries is business logic, not presentation - to be reviewed by code-guardian
	 */
	// eslint-disable-next-line local-rules/no-presentation-methods-in-domain
	toNumber(): number {
		return this.value;
	}

	/**
	 * Converts to string for display.
	 *
	 * @returns String representation ('Synchronous' or 'Asynchronous')
	 */
	toString(): string {
		return this.value === 0 ? 'Synchronous' : 'Asynchronous';
	}

	/**
	 * Checks if execution mode is synchronous.
	 *
	 * @returns True if synchronous (value === 0)
	 */
	isSynchronous(): boolean {
		return this.value === 0;
	}

	/**
	 * Checks equality with another ExecutionMode.
	 *
	 * @param other - ExecutionMode to compare with (or null)
	 * @returns True if values are equal
	 */
	equals(other: ExecutionMode | null): boolean {
		return other !== null && this.value === other.value;
	}
}
