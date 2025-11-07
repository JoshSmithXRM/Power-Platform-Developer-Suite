import type { FilterCondition } from '../entities/FilterCondition';

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

		// Special handling for Status field (Exception vs Success)
		if (condition.field.displayName === 'Status') {
			return this.buildStatusExpression(condition);
		}

		const fieldName = condition.field.odataName;
		const operator = condition.operator.odataOperator;
		const value = this.formatValue(condition.value, condition.field.fieldType);

		// Function-style operators (contains, startswith, endswith)
		if (this.isFunctionOperator(operator)) {
			return `${operator}(${fieldName}, ${value})`;
		}

		// Comparison operators (eq, ne, gt, lt, ge, le)
		return `${fieldName} ${operator} ${value}`;
	}

	/**
	 * Builds OData expression for Status field.
	 * Status is virtual - maps to exceptiondetails null check:
	 * - "Exception" → exceptiondetails ne null
	 * - "Success" → exceptiondetails eq null
	 */
	private buildStatusExpression(condition: FilterCondition): string | undefined {
		const value = condition.value.trim();
		const operator = condition.operator.odataOperator;

		// Only "Equals" operator makes sense for Status enum
		if (operator !== 'eq') {
			return undefined;
		}

		if (value === 'Exception') {
			return 'exceptiondetails ne null';
		} else if (value === 'Success') {
			return 'exceptiondetails eq null';
		}

		return undefined;
	}

	/**
	 * Formats value based on field type for OData syntax.
	 */
	private formatValue(value: string, fieldType: 'text' | 'enum' | 'date' | 'number'): string {
		if (fieldType === 'text' || fieldType === 'enum') {
			return `'${this.escapeODataString(value)}'`;
		} else if (fieldType === 'number') {
			return value;
		} else if (fieldType === 'date') {
			// Dates use ISO format without quotes in OData v4
			return value;
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
