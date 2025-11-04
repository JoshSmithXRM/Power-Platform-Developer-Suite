/**
 * View Model: Plugin Trace Table Row
 *
 * DTO for displaying a plugin trace in a table view.
 * All properties are formatted strings ready for display.
 */
export interface PluginTraceTableRowViewModel {
	readonly id: string;
	readonly createdOn: string;
	readonly pluginName: string;
	readonly entityName: string;
	readonly messageName: string;
	readonly operationType: string;
	readonly mode: string;
	readonly duration: string;
	readonly status: string;
	readonly statusBadgeClass: string;
}

/**
 * View Model: Plugin Trace Detail
 *
 * DTO for displaying detailed information about a plugin trace.
 * All properties are formatted strings ready for display.
 */
export interface PluginTraceDetailViewModel {
	readonly id: string;
	readonly createdOn: string;
	readonly pluginName: string;
	readonly entityName: string;
	readonly messageName: string;
	readonly operationType: string;
	readonly mode: string;
	readonly stage: string;
	readonly depth: string;
	readonly duration: string;
	readonly constructorDuration: string;
	readonly status: string;
	readonly statusBadgeClass: string;
	readonly exceptionDetails: string;
	readonly messageBlock: string;
	readonly configuration: string;
	readonly secureConfiguration: string;
	readonly correlationId: string;
	readonly requestId: string;
	readonly pluginStepId: string;
	readonly persistenceKey: string;
}
