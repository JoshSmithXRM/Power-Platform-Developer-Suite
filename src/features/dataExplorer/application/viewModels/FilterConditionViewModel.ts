/**
 * ViewModel for a filter condition row in the Visual Query Builder.
 * Simple DTO for webview rendering.
 */
export interface FilterConditionViewModel {
	/** Unique ID for this condition (used for DOM binding) */
	readonly id: string;
	/** Attribute logical name */
	readonly attribute: string;
	/** Display name for the attribute */
	readonly attributeDisplayName: string;
	/** Attribute type (for operator selection) */
	readonly attributeType: string;
	/** Selected operator */
	readonly operator: string;
	/** Operator display name */
	readonly operatorDisplayName: string;
	/** Condition value (null for null operators) */
	readonly value: string | null;
	/** Whether this condition is enabled */
	readonly enabled: boolean;
}
