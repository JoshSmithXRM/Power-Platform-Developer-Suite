/**
 * Filter field enum options configuration.
 * Defines dropdown options for enum-type filter fields.
 *
 * Values sourced from domain value objects:
 * - OperationType: Plugin (1), Workflow (2)
 * - ExecutionMode: Synchronous (0), Asynchronous (1)
 */
export const FILTER_ENUM_OPTIONS: Record<string, string[]> = {
	'Operation Type': ['Plugin', 'Workflow'],
	'Mode': ['Synchronous', 'Asynchronous']
};
