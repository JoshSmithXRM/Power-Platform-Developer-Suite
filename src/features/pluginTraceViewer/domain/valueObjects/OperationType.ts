/**
 * Domain value object: Operation Type
 *
 * Represents the type of operation that was traced.
 * Plugin (1): Custom plugin assembly execution
 * Workflow (2): Custom workflow activity execution
 */
export class OperationType {
	private constructor(public readonly value: number) {}

	static readonly Plugin = new OperationType(1);
	static readonly Workflow = new OperationType(2);

	/**
	 * @throws Error if value is not a valid operation type
	 */
	static fromNumber(value: number): OperationType {
		switch (value) {
			case 1:
				return OperationType.Plugin;
			case 2:
				return OperationType.Workflow;
			default:
				throw new Error(`Invalid operation type: ${value}`);
		}
	}

	/**
	 * Creates OperationType from string value.
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods
	static fromString(value: string): OperationType {
		switch (value) {
			case 'Plugin':
				return OperationType.Plugin;
			case 'Workflow':
				return OperationType.Workflow;
			default:
				throw new Error(`Invalid operation type: ${value}`);
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
		return this.value === 1 ? 'Plugin' : 'Workflow';
	}

	equals(other: OperationType | null): boolean {
		return other !== null && this.value === other.value;
	}
}
