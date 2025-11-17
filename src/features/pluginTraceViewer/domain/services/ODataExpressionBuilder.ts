import type { FilterCondition } from '../entities/FilterCondition';
import { DateTimeFilter } from '../../../../shared/domain/valueObjects/DateTimeFilter';

/**
 * Domain Service: OData Expression Builder
 *
 * Handles translation of filter conditions to OData query expressions.
 * Encapsulates OData v4 syntax knowledge, keeping domain entities pure.
 *
 * Business Rules:
 * - Function operators (contains, startswith, endswith) use function syntax
 * - Comparison operators use infix notation (field operator value)
 * - Text/enum values are quoted, numbers/dates are not
 * - Single quotes in values are escaped as ''
 * - Date values use DateTimeFilter for proper OData formatting
 */
export class ODataExpressionBuilder {
	/**
	 * Builds OData filter expression from a filter condition.
	 * Returns undefined if condition is disabled.
	 */
	public buildExpression(condition: FilterCondition): string | undefined {
		if (!condition.enabled) {
			return undefined;
		}

		const fieldName = condition.field.odataName;
		const operator = condition.operator.odataOperator;
		const fieldType = condition.field.fieldType;

		// Null operators (don't need a value)
		if (operator === 'null') {
			return `${fieldName} eq null`;
		}
		if (operator === 'notnull') {
			return `${fieldName} ne null`;
		}

		const value = this.formatValue(condition.value, fieldType);

		// Function-style operators (contains, startswith, endswith)
		if (this.isFunctionOperator(operator)) {
			return `${operator}(${fieldName}, ${value})`;
		}

		// Comparison operators (eq, ne, gt, lt, ge, le)
		return `${fieldName} ${operator} ${value}`;
	}

	/**
	 * Formats value based on field type for OData syntax.
	 */
	private formatValue(value: string, fieldType: 'text' | 'enum' | 'date' | 'number' | 'boolean'): string {
		if (fieldType === 'text' || fieldType === 'enum') {
			return `'${this.escapeODataString(value)}'`;
		} else if (fieldType === 'number') {
			return value;
		} else if (fieldType === 'boolean') {
			// OData boolean values are lowercase true/false
			return value.toLowerCase();
		} else if (fieldType === 'date') {
			// Value is already in UTC ISO format (converted by presentation layer)
			// Use DateTimeFilter to format for Dataverse OData API
			const dateFilter = DateTimeFilter.fromUtcIso(value);
			return dateFilter.getODataFormat();
		}

		return value;
	}

	/**
	 * Checks if operator uses function syntax.
	 */
	private isFunctionOperator(operator: string): boolean {
		return ['contains', 'startswith', 'endswith'].includes(operator);
	}

	/**
	 * Escapes single quotes in OData string literals.
	 * Business rule: OData string literals escape ' as ''
	 */
	private escapeODataString(value: string): string {
		return value.replace(/'/g, "''");
	}
}
