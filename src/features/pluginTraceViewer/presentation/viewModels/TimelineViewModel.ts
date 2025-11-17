/**
 * View model representing a timeline for display in the UI.
 * Contains formatted timeline metadata and hierarchical nodes.
 */
export interface TimelineViewModel {
	/** Correlation ID grouping these traces (truncated for display) */
	correlationId: string;
	/** Total execution duration formatted (e.g., "1.5s", "250ms") */
	totalDuration: string;
	/** Number of traces in timeline */
	traceCount: number;
	/** Root timeline nodes with children */
	nodes: readonly TimelineNodeViewModel[];
}

/**
 * View model representing a single node in the timeline hierarchy.
 * Contains all data needed for rendering a timeline item.
 */
export interface TimelineNodeViewModel {
	/** Trace ID for linking/selection */
	id: string;
	/** Plugin type name */
	pluginName: string;
	/** Message name (Create, Update, etc.) */
	messageName: string;
	/** Entity logical name */
	entityName: string;
	/** Nesting depth (0 = root) */
	depth: number;
	/** Horizontal position in timeline (0-100%) */
	offsetPercent: number;
	/** Width of execution bar (0-100%) */
	widthPercent: number;
	/** Whether trace has exception */
	hasException: boolean;
	/** Execution duration formatted (e.g., "150ms", "1.2s") */
	duration: string;
	/** Start time formatted (e.g., "14:30:15.123") */
	time: string;
	/** Execution mode (Sync/Async) */
	mode: string;
	/** Child nodes (recursive) */
	children: readonly TimelineNodeViewModel[];
}
