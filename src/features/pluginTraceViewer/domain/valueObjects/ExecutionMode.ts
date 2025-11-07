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
	 * @throws Error if value is not a valid execution mode
	 */
	static fromNumber(value: number): ExecutionMode {
		switch (value) {
			case 0:
				return ExecutionMode.Synchronous;
			case 1:
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid execution mode: ${value}`);
		}
	}

	/**
	 * Creates ExecutionMode from string value.
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods
	static fromString(value: string): ExecutionMode {
		switch (value) {
			case 'Synchronous':
				return ExecutionMode.Synchronous;
			case 'Asynchronous':
				return ExecutionMode.Asynchronous;
			default:
				throw new Error(`Invalid execution mode: ${value}`);
		}
	}

	/**
	 * Converts to number for OData queries.
	 *
	 * NOTE: Conversion for OData queries is business logic, not presentation - to be reviewed by code-guardian
	 */
	// eslint-disable-next-line local-rules/no-presentation-methods-in-domain
	toNumber(): number {
		return this.value;
	}

	/**
	 * Converts to string for display.
	 */
	toString(): string {
		return this.value === 0 ? 'Synchronous' : 'Asynchronous';
	}

	isSynchronous(): boolean {
		return this.value === 0;
	}

	equals(other: ExecutionMode | null): boolean {
		return other !== null && this.value === other.value;
	}
}
