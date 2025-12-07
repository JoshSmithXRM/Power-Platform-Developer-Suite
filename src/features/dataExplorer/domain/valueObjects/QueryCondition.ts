/**
 * Value Object: Query Condition
 *
 * Represents a single filter condition in a visual query.
 * Maps to a FetchXML `<condition>` element.
 *
 * Validates that value matches operator requirements:
 * - null/not-null: no value
 * - in/not-in: array of values
 * - all others: single string value
 */

import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

import {
	type FetchXmlConditionOperator,
	isValidOperator,
	operatorRequiresValue,
	operatorAllowsMultipleValues,
} from './FetchXmlOperator';

/**
 * Represents a filter condition in a visual query.
 */
export class QueryCondition {
	/**
	 * Creates a QueryCondition with validation.
	 *
	 * @param attribute - Attribute name (required, cannot be empty)
	 * @param operator - FetchXML operator
	 * @param value - Value(s) matching operator requirements
	 * @throws ValidationError if attribute is empty or value doesn't match operator
	 */
	constructor(
		/** Attribute name to filter on */
		public readonly attribute: string,
		/** Comparison operator */
		public readonly operator: FetchXmlConditionOperator,
		/** Value(s) - null for null operators, array for IN operators, string for others */
		public readonly value: string | string[] | null
	) {
		const trimmedAttribute = attribute.trim();
		if (trimmedAttribute === '') {
			throw new ValidationError('QueryCondition', 'attribute', attribute, 'cannot be empty');
		}

		if (!isValidOperator(operator)) {
			throw new ValidationError('QueryCondition', 'operator', operator, 'is not a valid operator');
		}

		// Validate value matches operator requirements
		this.validateValue(operator, value);

		// Store the trimmed attribute
		this.attribute = trimmedAttribute;
	}

	/**
	 * Checks if this condition requires a value.
	 */
	public requiresValue(): boolean {
		return operatorRequiresValue(this.operator);
	}

	/**
	 * Checks if this condition has multiple values.
	 */
	public hasMultipleValues(): boolean {
		return Array.isArray(this.value);
	}

	/**
	 * Gets the single value (throws if multiple values).
	 */
	public getSingleValue(): string | null {
		if (Array.isArray(this.value)) {
			throw new ValidationError('QueryCondition', 'value', this.value, 'has multiple values, use getValues() instead');
		}
		return this.value;
	}

	/**
	 * Gets the values as an array.
	 * Returns empty array for null operators, single-element array for single values.
	 */
	public getValues(): string[] {
		if (this.value === null) {
			return [];
		}
		if (Array.isArray(this.value)) {
			return [...this.value];
		}
		return [this.value];
	}

	/**
	 * Checks equality by value.
	 */
	public equals(other: QueryCondition): boolean {
		if (this.attribute !== other.attribute || this.operator !== other.operator) {
			return false;
		}

		// Compare values
		if (this.value === null && other.value === null) {
			return true;
		}
		if (this.value === null || other.value === null) {
			return false;
		}
		if (Array.isArray(this.value) && Array.isArray(other.value)) {
			const otherValues = other.value;
			return (
				this.value.length === otherValues.length &&
				this.value.every((v, i) => v === otherValues[i])
			);
		}
		return this.value === other.value;
	}

	/**
	 * Creates a string representation for debugging.
	 */
	public toString(): string {
		if (this.value === null) {
			return `${this.attribute} ${this.operator}`;
		}
		if (Array.isArray(this.value)) {
			return `${this.attribute} ${this.operator} (${this.value.join(', ')})`;
		}
		return `${this.attribute} ${this.operator} '${this.value}'`;
	}

	/**
	 * Validates that value matches operator requirements.
	 */
	private validateValue(
		operator: FetchXmlConditionOperator,
		value: string | string[] | null
	): void {
		const requiresValue = operatorRequiresValue(operator);
		const allowsMultiple = operatorAllowsMultipleValues(operator);

		if (!requiresValue) {
			// Null operators (null, not-null) should have null value
			if (value !== null) {
				throw new ValidationError(
					'QueryCondition', 'value', value,
					`operator '${operator}' does not accept a value`
				);
			}
			return;
		}

		// Operator requires value
		if (value === null) {
			throw new ValidationError(
				'QueryCondition', 'value', value,
				`operator '${operator}' requires a value`
			);
		}

		if (allowsMultiple) {
			// IN/NOT IN operators require array
			if (!Array.isArray(value)) {
				throw new ValidationError(
					'QueryCondition', 'value', value,
					`operator '${operator}' requires an array of values`
				);
			}
			if (value.length === 0) {
				throw new ValidationError(
					'QueryCondition', 'value', value,
					`operator '${operator}' requires at least one value`
				);
			}
		} else {
			// Other operators require single string
			if (Array.isArray(value)) {
				throw new ValidationError(
					'QueryCondition', 'value', value,
					`operator '${operator}' requires a single value, not an array`
				);
			}
		}
	}
}
