/**
 * Value Object: Filter Field
 * Represents a filterable field in plugin traces.
 * Maps display names to OData field names.
 */
export class FilterField {
	private constructor(
		public readonly displayName: string,
		public readonly odataName: string,
		public readonly fieldType: 'text' | 'enum' | 'date' | 'number' | 'boolean' | 'guid'
	) {}

	// Core fields
	static readonly Id = new FilterField('Trace ID', 'plugintracelogid', 'guid');
	static readonly CreatedOn = new FilterField('Created On', 'createdon', 'date');
	static readonly PluginName = new FilterField('Plugin Name', 'typename', 'text');
	static readonly EntityName = new FilterField('Entity Name', 'primaryentity', 'text');
	static readonly MessageName = new FilterField('Message Name', 'messagename', 'text');
	static readonly OperationType = new FilterField('Operation Type', 'operationtype', 'enum');
	static readonly Mode = new FilterField('Mode', 'mode', 'enum');
	static readonly Stage = new FilterField('Stage', 'stage', 'number');
	static readonly Depth = new FilterField('Depth', 'depth', 'number');

	// Performance fields
	static readonly Duration = new FilterField('Duration (ms)', 'performanceexecutionduration', 'number');
	static readonly ConstructorDuration = new FilterField('Constructor Duration (ms)', 'performanceconstructorduration', 'number');
	static readonly ExecutionStartTime = new FilterField('Execution Start Time', 'performanceexecutionstarttime', 'date');
	static readonly ConstructorStartTime = new FilterField('Constructor Start Time', 'performanceconstructorstarttime', 'date');

	// Execution details
	static readonly ExceptionDetails = new FilterField('Exception Details', 'exceptiondetails', 'text');
	static readonly MessageBlock = new FilterField('Message Block', 'messageblock', 'text');
	static readonly Configuration = new FilterField('Configuration', 'configuration', 'text');
	static readonly SecureConfiguration = new FilterField('Secure Configuration', 'secureconfiguration', 'text');
	static readonly Profile = new FilterField('Profile', 'profile', 'text');

	// Correlation & tracking (GUIDs)
	static readonly CorrelationId = new FilterField('Correlation ID', 'correlationid', 'guid');
	static readonly RequestId = new FilterField('Request ID', 'requestid', 'guid');
	static readonly PluginStepId = new FilterField('Plugin Step ID', 'pluginstepid', 'guid');
	static readonly PersistenceKey = new FilterField('Persistence Key', 'persistencekey', 'text');
	static readonly OrganizationId = new FilterField('Organization ID', 'organizationid', 'guid');

	// Audit fields (GUID lookups)
	static readonly IsSystemCreated = new FilterField('System Created', 'issystemcreated', 'boolean');
	static readonly CreatedBy = new FilterField('Created By', '_createdby_value', 'guid');
	static readonly CreatedOnBehalfBy = new FilterField('Created On Behalf By', '_createdonbehalfby_value', 'guid');

	/**
	 * All available filter fields, sorted by OData name for consistency.
	 * Display name shown in UI, sorted by logical/OData name.
	 */
	static readonly All = [
		FilterField.CreatedBy,              // _createdby_value
		FilterField.CreatedOnBehalfBy,      // _createdonbehalfby_value
		FilterField.Configuration,          // configuration
		FilterField.CorrelationId,          // correlationid
		FilterField.CreatedOn,              // createdon
		FilterField.Depth,                  // depth
		FilterField.ExceptionDetails,       // exceptiondetails
		FilterField.IsSystemCreated,        // issystemcreated
		FilterField.MessageBlock,           // messageblock
		FilterField.MessageName,            // messagename
		FilterField.Mode,                   // mode
		FilterField.OperationType,          // operationtype
		FilterField.OrganizationId,         // organizationid
		FilterField.ConstructorDuration,    // performanceconstructorduration
		FilterField.ConstructorStartTime,   // performanceconstructorstarttime
		FilterField.Duration,               // performanceexecutionduration
		FilterField.ExecutionStartTime,     // performanceexecutionstarttime
		FilterField.PersistenceKey,         // persistencekey
		FilterField.PluginStepId,           // pluginstepid
		FilterField.Id,                     // plugintracelogid
		FilterField.EntityName,             // primaryentity
		FilterField.Profile,                // profile
		FilterField.RequestId,              // requestid
		FilterField.SecureConfiguration,    // secureconfiguration
		FilterField.Stage,                  // stage
		FilterField.PluginName,             // typename
	];

	/**
	 * Gets field by OData name.
	 */
	static fromODataName(odataName: string): FilterField | undefined {
		return FilterField.All.find(f => f.odataName === odataName);
	}

	/**
	 * Gets field by display name.
	 */
	static fromDisplayName(displayName: string): FilterField | undefined {
		return FilterField.All.find(f => f.displayName === displayName);
	}

	equals(other: FilterField | null): boolean {
		return other !== null && this.odataName === other.odataName;
	}
}
