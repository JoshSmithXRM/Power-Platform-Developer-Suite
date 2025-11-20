/**
 * Value Object: Filter Operator
 * Represents comparison operators for filter conditions.
 */
export class FilterOperator {
	private constructor(
		public readonly displayName: string,
		public readonly odataOperator: string,
		public readonly applicableTypes: readonly ('text' | 'enum' | 'date' | 'number' | 'boolean' | 'guid')[]
	) {}

	// Text operators
	static readonly Equals = new FilterOperator('Equals', 'eq', ['text', 'enum', 'number', 'boolean', 'guid']);
	static readonly Contains = new FilterOperator('Contains', 'contains', ['text']);
	static readonly StartsWith = new FilterOperator('Starts With', 'startswith', ['text']);
	static readonly EndsWith = new FilterOperator('Ends With', 'endswith', ['text']);
	static readonly NotEquals = new FilterOperator('Not Equals', 'ne', ['text', 'enum', 'number', 'boolean', 'guid']);

	// Numeric/Date operators
	static readonly GreaterThan = new FilterOperator('Greater Than', 'gt', ['number', 'date']);
	static readonly LessThan = new FilterOperator('Less Than', 'lt', ['number', 'date']);
	static readonly GreaterThanOrEqual = new FilterOperator('Greater Than or Equal', 'ge', ['number', 'date']);
	static readonly LessThanOrEqual = new FilterOperator('Less Than or Equal', 'le', ['number', 'date']);

	// Null operators (applicable to all nullable fields)
	static readonly IsNull = new FilterOperator('Is Null', 'null', ['text', 'enum', 'date', 'number', 'boolean', 'guid']);
	static readonly IsNotNull = new FilterOperator('Is Not Null', 'notnull', ['text', 'enum', 'date', 'number', 'boolean', 'guid']);

	/**
	 * All available operators.
	 */
	static readonly All = [
		FilterOperator.Equals,
		FilterOperator.Contains,
		FilterOperator.StartsWith,
		FilterOperator.EndsWith,
		FilterOperator.NotEquals,
		FilterOperator.GreaterThan,
		FilterOperator.LessThan,
		FilterOperator.GreaterThanOrEqual,
		FilterOperator.LessThanOrEqual,
		FilterOperator.IsNull,
		FilterOperator.IsNotNull
	];

	/**
	 * Gets operators applicable to a field type.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Lookup method for value object collection
	static forFieldType(fieldType: 'text' | 'enum' | 'date' | 'number' | 'boolean' | 'guid'): FilterOperator[] {
		return FilterOperator.All.filter(op => op.applicableTypes.includes(fieldType));
	}

	/**
	 * Gets operator by display name.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Lookup method for value object collection
	static fromDisplayName(displayName: string): FilterOperator | undefined {
		return FilterOperator.All.find(op => op.displayName === displayName);
	}

	/**
	 * Gets operator by OData operator string.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Lookup method for value object collection
	static fromODataOperator(odataOperator: string): FilterOperator | undefined {
		return FilterOperator.All.find(op => op.odataOperator === odataOperator);
	}

	equals(other: FilterOperator | null): boolean {
		return other !== null && this.odataOperator === other.odataOperator;
	}
}
