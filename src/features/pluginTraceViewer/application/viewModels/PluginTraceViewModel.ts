/**
 * View Model: Plugin Trace Table Row
 *
 * DTO for displaying a plugin trace in a table view.
 * All properties are formatted strings ready for display.
 */
export interface PluginTraceTableRowViewModel {
	readonly [key: string]: unknown;
	readonly createdOn: string;
	readonly pluginName: string;
	readonly pluginNameHtml: string; // Clickable link
	readonly entityName: string;
	readonly messageName: string;
	readonly operationType: string;
	readonly mode: string;
	readonly depth: string;
	readonly duration: string;
	readonly status: string;
	readonly statusClass: string; // CSS class for status coloring
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
	readonly executionStartTime: string;
	readonly constructorStartTime: string;
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
	readonly organizationId: string;
	readonly profile: string;
	readonly isSystemCreated: string;
	readonly createdBy: string;
	readonly createdOnBehalfBy: string;
}
