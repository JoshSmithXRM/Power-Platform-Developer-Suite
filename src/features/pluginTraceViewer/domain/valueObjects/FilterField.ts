/**
 * Value Object: Filter Field
 * Represents a filterable field in plugin traces.
 * Maps display names to OData field names.
 */
export class FilterField {
	private constructor(
		public readonly displayName: string,
		public readonly odataName: string,
		public readonly fieldType: 'text' | 'enum' | 'date' | 'number'
	) {}

	static readonly PluginName = new FilterField('Plugin Name', 'typename', 'text');
	static readonly EntityName = new FilterField('Entity Name', 'primaryentity', 'text');
	static readonly MessageName = new FilterField('Message Name', 'messagename', 'text');
	static readonly OperationType = new FilterField('Operation Type', 'operationtype', 'enum');
	static readonly Mode = new FilterField('Mode', 'mode', 'enum');
	static readonly CorrelationId = new FilterField('Correlation ID', 'correlationid', 'text');
	static readonly CreatedOn = new FilterField('Created On', 'createdon', 'date');
	static readonly Duration = new FilterField('Duration (ms)', 'performanceexecutionduration', 'number');

	/**
	 * All available filter fields.
	 */
	static readonly All = [
		FilterField.PluginName,
		FilterField.EntityName,
		FilterField.MessageName,
		FilterField.OperationType,
		FilterField.Mode,
		FilterField.CorrelationId,
		FilterField.CreatedOn,
		FilterField.Duration
	];

	/**
	 * Gets field by OData name.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Lookup method for value object collection
	static fromODataName(odataName: string): FilterField | undefined {
		return FilterField.All.find(f => f.odataName === odataName);
	}

	/**
	 * Gets field by display name.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Lookup method for value object collection
	static fromDisplayName(displayName: string): FilterField | undefined {
		return FilterField.All.find(f => f.displayName === displayName);
	}

	equals(other: FilterField | null): boolean {
		return other !== null && this.odataName === other.odataName;
	}
}
