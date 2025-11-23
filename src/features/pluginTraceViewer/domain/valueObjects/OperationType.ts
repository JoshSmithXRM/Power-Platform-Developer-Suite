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
	 * Factory method to create OperationType from numeric value.
	 * Maps Dataverse operation type codes to value objects.
	 *
	 * @param value - Numeric operation type (1 = Plugin, 2 = Workflow)
	 * @returns OperationType instance
	 * @throws Error if value is not a valid operation type
	 */
	static fromNumber(value: number): OperationType {
		switch (value) {
			case 1:
				return OperationType.Plugin;
			case 2:
				return OperationType.Workflow;
			default:
				throw new Error(`Invalid OperationType: unknown numeric value ${value}`);
		}
	}

	/**
	 * Creates OperationType from string value.
	 * Useful for deserializing from JSON or parsing user input.
	 *
	 * @param value - String operation type ('Plugin' or 'Workflow')
	 * @returns OperationType instance
	 * @throws Error if value is not valid
	 *
	 * NOTE: Factory method for value object - standard pattern, to be reviewed by code-guardian
	 */
	static fromString(value: string): OperationType {
		switch (value) {
			case 'Plugin':
				return OperationType.Plugin;
			case 'Workflow':
				return OperationType.Workflow;
			default:
				throw new Error(`Invalid OperationType: unknown string value "${value}"`);
		}
	}

	/**
	 * Converts to number for OData queries.
	 * Required for building Dataverse API filter expressions.
	 *
	 * @returns Numeric operation type (1 or 2)
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
	 * @returns String representation ('Plugin' or 'Workflow')
	 */
	toString(): string {
		return this.value === 1 ? 'Plugin' : 'Workflow';
	}

	/**
	 * Checks equality with another OperationType.
	 *
	 * @param other - OperationType to compare with (or null)
	 * @returns True if values are equal
	 */
	equals(other: OperationType | null): boolean {
		return other !== null && this.value === other.value;
	}
}
