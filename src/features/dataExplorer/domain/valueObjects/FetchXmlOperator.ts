/**
 * Value Object: FetchXML Operator Types
 *
 * Type definitions and metadata for FetchXML condition operators.
 * Provides compile-time type safety and runtime lookup for display names.
 *
 * Phase 1 supports core operators. Additional operators (date, user, hierarchy)
 * can be added in future phases.
 */

// =============================================================================
// Operator Type Definitions
// =============================================================================

/**
 * Comparison operators for numeric and simple equality checks.
 */
export type FetchXmlComparisonOperator = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge';

/**
 * String pattern matching operators.
 */
export type FetchXmlStringOperator =
	| 'like'
	| 'not-like'
	| 'begins-with'
	| 'not-begin-with'
	| 'ends-with'
	| 'not-end-with';

/**
 * Null check operators.
 */
export type FetchXmlNullOperator = 'null' | 'not-null';

/**
 * Set membership operators.
 */
export type FetchXmlSetOperator = 'in' | 'not-in';

/**
 * Union of all supported FetchXML condition operators.
 */
export type FetchXmlConditionOperator =
	| FetchXmlComparisonOperator
	| FetchXmlStringOperator
	| FetchXmlNullOperator
	| FetchXmlSetOperator;

// =============================================================================
// Operator Metadata
// =============================================================================

/**
 * Operator category for UI grouping.
 */
export type FetchXmlOperatorCategory = 'comparison' | 'string' | 'null' | 'set';

/**
 * Metadata for a FetchXML operator.
 */
export interface FetchXmlOperatorMetadata {
	/** The operator name */
	readonly operator: FetchXmlConditionOperator;
	/** Human-readable display name */
	readonly displayName: string;
	/** Description for tooltips/help */
	readonly description: string;
	/** Category for grouping */
	readonly category: FetchXmlOperatorCategory;
	/** Whether this operator requires a value */
	readonly requiresValue: boolean;
	/** Whether this operator accepts multiple values (IN/NOT IN) */
	readonly allowsMultipleValues: boolean;
}

/**
 * All valid FetchXML operators (for validation).
 */
const VALID_OPERATORS: ReadonlySet<string> = new Set<FetchXmlConditionOperator>([
	// Comparison
	'eq', 'ne', 'lt', 'le', 'gt', 'ge',
	// String
	'like', 'not-like', 'begins-with', 'not-begin-with', 'ends-with', 'not-end-with',
	// Null
	'null', 'not-null',
	// Set
	'in', 'not-in',
]);

/**
 * Operator metadata lookup table.
 */
const OPERATOR_METADATA_MAP: ReadonlyMap<FetchXmlConditionOperator, FetchXmlOperatorMetadata> = new Map([
	// Comparison operators
	['eq', {
		operator: 'eq',
		displayName: 'Equals',
		description: 'Equal to',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['ne', {
		operator: 'ne',
		displayName: 'Does Not Equal',
		description: 'Not equal to',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['lt', {
		operator: 'lt',
		displayName: 'Less Than',
		description: 'Less than',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['le', {
		operator: 'le',
		displayName: 'Less Than or Equal',
		description: 'Less than or equal to',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['gt', {
		operator: 'gt',
		displayName: 'Greater Than',
		description: 'Greater than',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['ge', {
		operator: 'ge',
		displayName: 'Greater Than or Equal',
		description: 'Greater than or equal to',
		category: 'comparison',
		requiresValue: true,
		allowsMultipleValues: false,
	}],

	// String operators
	['like', {
		operator: 'like',
		displayName: 'Contains',
		description: 'Matches pattern (use % wildcard)',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['not-like', {
		operator: 'not-like',
		displayName: 'Does Not Contain',
		description: 'Does not match pattern',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['begins-with', {
		operator: 'begins-with',
		displayName: 'Begins With',
		description: 'Starts with value',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['not-begin-with', {
		operator: 'not-begin-with',
		displayName: 'Does Not Begin With',
		description: 'Does not start with value',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['ends-with', {
		operator: 'ends-with',
		displayName: 'Ends With',
		description: 'Ends with value',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],
	['not-end-with', {
		operator: 'not-end-with',
		displayName: 'Does Not End With',
		description: 'Does not end with value',
		category: 'string',
		requiresValue: true,
		allowsMultipleValues: false,
	}],

	// Null operators
	['null', {
		operator: 'null',
		displayName: 'Is Null',
		description: 'Value is null',
		category: 'null',
		requiresValue: false,
		allowsMultipleValues: false,
	}],
	['not-null', {
		operator: 'not-null',
		displayName: 'Is Not Null',
		description: 'Value is not null',
		category: 'null',
		requiresValue: false,
		allowsMultipleValues: false,
	}],

	// Set operators
	['in', {
		operator: 'in',
		displayName: 'In',
		description: 'Value is in list',
		category: 'set',
		requiresValue: true,
		allowsMultipleValues: true,
	}],
	['not-in', {
		operator: 'not-in',
		displayName: 'Not In',
		description: 'Value is not in list',
		category: 'set',
		requiresValue: true,
		allowsMultipleValues: true,
	}],
]);

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * Checks if a string is a valid FetchXML condition operator.
 *
 * @param value - The string to check
 * @returns Type guard indicating if value is a valid operator
 */
export function isValidOperator(value: string): value is FetchXmlConditionOperator {
	return VALID_OPERATORS.has(value);
}

/**
 * Gets metadata for an operator.
 *
 * @param operator - The operator to get metadata for
 * @returns Operator metadata
 */
export function getOperatorMetadata(operator: FetchXmlConditionOperator): FetchXmlOperatorMetadata {
	const metadata = OPERATOR_METADATA_MAP.get(operator);
	if (metadata === undefined) {
		// This should never happen with proper typing, but provides runtime safety
		throw new Error(`Unknown operator: ${operator}`);
	}
	return metadata;
}

/**
 * Checks if an operator requires a value.
 *
 * @param operator - The operator to check
 * @returns True if the operator requires a value
 */
export function operatorRequiresValue(operator: FetchXmlConditionOperator): boolean {
	return getOperatorMetadata(operator).requiresValue;
}

/**
 * Checks if an operator allows multiple values (IN/NOT IN).
 *
 * @param operator - The operator to check
 * @returns True if the operator allows multiple values
 */
export function operatorAllowsMultipleValues(operator: FetchXmlConditionOperator): boolean {
	return getOperatorMetadata(operator).allowsMultipleValues;
}

/**
 * Gets all operators in a category.
 *
 * @param category - The category to filter by
 * @returns Array of operators in the category
 */
export function getOperatorsByCategory(category: FetchXmlOperatorCategory): FetchXmlConditionOperator[] {
	const result: FetchXmlConditionOperator[] = [];
	for (const [op, meta] of OPERATOR_METADATA_MAP) {
		if (meta.category === category) {
			result.push(op);
		}
	}
	return result;
}

/**
 * Gets all supported operators.
 *
 * @returns Array of all supported operators
 */
export function getAllOperators(): FetchXmlConditionOperator[] {
	return Array.from(OPERATOR_METADATA_MAP.keys());
}

/**
 * Exported metadata map for direct access if needed.
 */
export const FETCHXML_OPERATOR_METADATA: ReadonlyMap<FetchXmlConditionOperator, FetchXmlOperatorMetadata> = OPERATOR_METADATA_MAP;
