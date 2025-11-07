/**
 * View Model: Filter Condition (Single Row)
 */
export interface FilterConditionViewModel {
	readonly id: string; // Unique ID for row management
	readonly enabled: boolean;
	readonly field: string; // FilterField display name
	readonly operator: string; // FilterOperator display name
	readonly value: string;
}

/**
 * View Model: Filter Criteria (Query Builder)
 *
 * DTO for filter panel state.
 * Supports dynamic query builder with multiple conditions.
 */
export interface FilterCriteriaViewModel {
	readonly conditions: readonly FilterConditionViewModel[];
	readonly logicalOperator: 'and' | 'or';
	readonly top: number;
}
