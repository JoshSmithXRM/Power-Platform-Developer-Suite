import type { FetchXmlConditionOperator, AttributeTypeHint } from '../../application/types';
import { FETCHXML_OPERATOR_METADATA } from '../../application/types';

/**
 * Operator option for display in the filter dropdown.
 */
export interface OperatorOption {
	readonly operator: FetchXmlConditionOperator;
	readonly displayName: string;
	readonly requiresValue: boolean;
}

/**
 * Maps attribute types to their applicable FetchXML operators.
 * Each type has a curated list of operators that make sense for that data type.
 */
const ATTRIBUTE_TYPE_OPERATORS: Record<AttributeTypeHint, readonly FetchXmlConditionOperator[]> = {
	// Text types - full text matching
	'String': ['eq', 'ne', 'like', 'not-like', 'begins-with', 'not-begin-with', 'ends-with', 'not-end-with', 'null', 'not-null'],
	'Memo': ['eq', 'ne', 'like', 'not-like', 'begins-with', 'ends-with', 'null', 'not-null'],

	// Numeric types - comparison operators
	'Integer': ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'null', 'not-null'],
	'Decimal': ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'null', 'not-null'],
	'Money': ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'null', 'not-null'],

	// DateTime - comparison operators
	'DateTime': ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'null', 'not-null'],

	// Boolean - simple equality
	'Boolean': ['eq', 'ne', 'null', 'not-null'],

	// Lookup - equality and null checks
	'Lookup': ['eq', 'ne', 'null', 'not-null'],

	// Picklist (optionset) - equality, set membership, null checks
	'Picklist': ['eq', 'ne', 'in', 'not-in', 'null', 'not-null'],

	// GUID - equality only
	'UniqueIdentifier': ['eq', 'ne', 'null', 'not-null'],

	// Other/unknown - basic equality
	'Other': ['eq', 'ne', 'null', 'not-null'],
};

/**
 * Gets the list of operator options for a given attribute type.
 *
 * @param attributeType - The attribute type hint
 * @returns Array of operator options with display names
 */
export function getOperatorsForAttributeType(attributeType: AttributeTypeHint): readonly OperatorOption[] {
	const operators = ATTRIBUTE_TYPE_OPERATORS[attributeType] || ATTRIBUTE_TYPE_OPERATORS['Other'];

	return operators.map((op): OperatorOption => {
		const metadata = FETCHXML_OPERATOR_METADATA.get(op);
		if (metadata === undefined) {
			// Fallback for safety
			return {
				operator: op,
				displayName: op,
				requiresValue: true,
			};
		}
		return {
			operator: metadata.operator,
			displayName: metadata.displayName,
			requiresValue: metadata.requiresValue,
		};
	});
}

/**
 * Gets the default operator for an attribute type.
 * Returns 'eq' for most types.
 */
export function getDefaultOperator(_attributeType: AttributeTypeHint): FetchXmlConditionOperator {
	return 'eq';
}
