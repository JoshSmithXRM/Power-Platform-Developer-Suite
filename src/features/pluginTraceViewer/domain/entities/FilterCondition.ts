import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { ODataExpressionBuilder } from '../services/ODataExpressionBuilder';
import { FilterField } from '../valueObjects/FilterField';
import { FilterOperator } from '../valueObjects/FilterOperator';

/**
 * Domain Entity: Filter Condition
 * Represents a single filter condition in a query builder.
 *
 * Business Rules:
 * - Value cannot be empty for most operators
 * - Operator must be applicable to the field type
 * - Conditions can be enabled/disabled without deletion
 */
export class FilterCondition {
	constructor(
		public readonly field: FilterField,
		public readonly operator: FilterOperator,
		public readonly value: string,
		public readonly enabled: boolean = true
	) {
		this.validateInvariants();
	}

	private validateInvariants(): void {
		if (!this.value.trim()) {
			throw new ValidationError(
				'FilterCondition',
				'value',
				this.value,
				'Filter value cannot be empty'
			);
		}

		if (!this.operator.applicableTypes.includes(this.field.fieldType)) {
			throw new ValidationError(
				'FilterCondition',
				'operator',
				this.operator.displayName,
				`Operator '${this.operator.displayName}' is not applicable to field type '${this.field.fieldType}'`
			);
		}
	}

	/**
	 * Builds OData filter expression for this condition.
	 * Delegates to ODataExpressionBuilder domain service.
	 * Returns undefined if condition is disabled.
	 */
	// eslint-disable-next-line local-rules/no-presentation-methods-in-domain -- OData query building is domain logic (design decision, see technical design doc)
	public toODataExpression(): string | undefined {
		const builder = new ODataExpressionBuilder();
		return builder.buildExpression(this);
	}

	/**
	 * Gets human-readable description of this condition.
	 */
	public getDescription(): string {
		const status = this.enabled ? '' : ' (disabled)';
		return `${this.field.displayName} ${this.operator.displayName} '${this.value}'${status}`;
	}

	/**
	 * Creates a new condition with enabled toggled.
	 */
	// eslint-disable-next-line local-rules/no-presentation-methods-in-domain -- Immutable builder pattern for domain entity
	public toggleEnabled(): FilterCondition {
		return new FilterCondition(this.field, this.operator, this.value, !this.enabled);
	}

	/**
	 * Creates a new condition with updated field.
	 */
	public withField(field: FilterField): FilterCondition {
		return new FilterCondition(field, this.operator, this.value, this.enabled);
	}

	/**
	 * Creates a new condition with updated operator.
	 */
	public withOperator(operator: FilterOperator): FilterCondition {
		return new FilterCondition(this.field, operator, this.value, this.enabled);
	}

	/**
	 * Creates a new condition with updated value.
	 */
	public withValue(value: string): FilterCondition {
		return new FilterCondition(this.field, this.operator, value, this.enabled);
	}

	/**
	 * Factory: Creates default condition (Plugin Name Contains empty string, disabled).
	 * Used for initializing new condition rows in UI.
	 */
	// eslint-disable-next-line local-rules/no-static-entity-methods -- Factory method for entity creation
	static createDefault(): FilterCondition {
		return new FilterCondition(
			FilterField.PluginName,
			FilterOperator.Contains,
			'placeholder',
			false
		);
	}

	/**
	 * Factory: Creates condition from parameters.
	 */
	static create(params: {
		field: FilterField;
		operator: FilterOperator;
		value: string;
		enabled?: boolean;
	}): FilterCondition {
		return new FilterCondition(
			params.field,
			params.operator,
			params.value,
			params.enabled ?? true
		);
	}
}
