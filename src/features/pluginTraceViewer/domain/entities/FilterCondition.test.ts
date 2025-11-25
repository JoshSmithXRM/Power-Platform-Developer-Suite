import { ValidationError } from './../../../../shared/domain/errors/ValidationError';
import { FilterCondition } from './FilterCondition';
import { FilterField } from './../valueObjects/FilterField';
import { FilterOperator } from './../valueObjects/FilterOperator';

describe('FilterCondition', () => {
	describe('constructor and validation', () => {
		it('should create valid condition with all parameters', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			expect(condition.field).toBe(FilterField.PluginName);
			expect(condition.operator).toBe(FilterOperator.Contains);
			expect(condition.value).toBe('test');
			expect(condition.enabled).toBe(true);
		});

		it('should default enabled to true', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test'
			);

			expect(condition.enabled).toBe(true);
		});

		it('should throw ValidationError when value is empty string', () => {
			expect(() => {
				new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					''
				);
			}).toThrow(ValidationError);
		});

		it('should throw ValidationError when value is whitespace only', () => {
			expect(() => {
				new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'   '
				);
			}).toThrow(ValidationError);
		});

		it('should throw ValidationError when operator not applicable to field type', () => {
			expect(() => {
				new FilterCondition(
					FilterField.PluginName, // text field
					FilterOperator.GreaterThan, // only for number/date
					'test'
				);
			}).toThrow(ValidationError);
		});

		it('should allow Contains operator for text fields', () => {
			expect(() => {
				new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'test'
				);
			}).not.toThrow();
		});

		it('should allow Equals operator for enum fields', () => {
			expect(() => {
				new FilterCondition(
					FilterField.OperationType,
					FilterOperator.Equals,
					'Plugin'
				);
			}).not.toThrow();
		});

		it('should allow empty string value for Equals operator', () => {
			expect(() => {
				new FilterCondition(
					FilterField.ExceptionDetails,
					FilterOperator.Equals,
					'' // Empty string is valid for Equals
				);
			}).not.toThrow();
		});

		it('should allow empty string value for NotEquals operator', () => {
			expect(() => {
				new FilterCondition(
					FilterField.ExceptionDetails,
					FilterOperator.NotEquals,
					'' // Empty string is valid for NotEquals
				);
			}).not.toThrow();
		});

		it('should allow GreaterThan operator for number fields', () => {
			expect(() => {
				new FilterCondition(
					FilterField.Duration,
					FilterOperator.GreaterThan,
					'100'
				);
			}).not.toThrow();
		});

		it('should default logicalOperator to and', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			expect(condition.logicalOperator).toBe('and');
		});

		it('should accept or as logicalOperator', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true,
				'or'
			);

			expect(condition.logicalOperator).toBe('or');
		});

		it('should allow empty value for IsNull operator', () => {
			expect(() => {
				new FilterCondition(
					FilterField.ExceptionDetails,
					FilterOperator.IsNull,
					'' // Empty is allowed for null operators
				);
			}).not.toThrow();
		});

		it('should allow empty value for IsNotNull operator', () => {
			expect(() => {
				new FilterCondition(
					FilterField.CorrelationId,
					FilterOperator.IsNotNull,
					'' // Empty is allowed for null operators
				);
			}).not.toThrow();
		});
	});

	describe('getDescription', () => {
		it('should return human-readable description for enabled condition', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'MyPlugin',
				true
			);

			expect(condition.getDescription()).toBe("Plugin Name Contains 'MyPlugin'");
		});

		it('should include (disabled) suffix for disabled condition', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'MyPlugin',
				false
			);

			expect(condition.getDescription()).toBe("Plugin Name Contains 'MyPlugin' (disabled)");
		});
	});

	describe('toggleEnabled', () => {
		it('should return new condition with enabled toggled to false', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			const toggled = condition.toggleEnabled();

			expect(toggled.enabled).toBe(false);
			expect(toggled.field).toBe(condition.field);
			expect(toggled.operator).toBe(condition.operator);
			expect(toggled.value).toBe(condition.value);
		});

		it('should return new condition with enabled toggled to true', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				false
			);

			const toggled = condition.toggleEnabled();

			expect(toggled.enabled).toBe(true);
		});

		it('should not mutate original condition', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			condition.toggleEnabled();

			expect(condition.enabled).toBe(true);
		});
	});

	describe('withField', () => {
		it('should return new condition with updated field', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			const updated = condition.withField(FilterField.EntityName);

			expect(updated.field).toBe(FilterField.EntityName);
			expect(updated.operator).toBe(condition.operator);
			expect(updated.value).toBe(condition.value);
			expect(updated.enabled).toBe(condition.enabled);
		});

		it('should not mutate original condition', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			condition.withField(FilterField.EntityName);

			expect(condition.field).toBe(FilterField.PluginName);
		});
	});

	describe('withOperator', () => {
		it('should return new condition with updated operator', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			const updated = condition.withOperator(FilterOperator.Equals);

			expect(updated.operator).toBe(FilterOperator.Equals);
			expect(updated.field).toBe(condition.field);
			expect(updated.value).toBe(condition.value);
			expect(updated.enabled).toBe(condition.enabled);
		});
	});

	describe('withValue', () => {
		it('should return new condition with updated value', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true
			);

			const updated = condition.withValue('newvalue');

			expect(updated.value).toBe('newvalue');
			expect(updated.field).toBe(condition.field);
			expect(updated.operator).toBe(condition.operator);
			expect(updated.enabled).toBe(condition.enabled);
		});
	});

	describe('withLogicalOperator', () => {
		it('should return new condition with updated logical operator', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true,
				'and'
			);

			const updated = condition.withLogicalOperator('or');

			expect(updated.logicalOperator).toBe('or');
			expect(updated.field).toBe(condition.field);
			expect(updated.operator).toBe(condition.operator);
			expect(updated.value).toBe(condition.value);
			expect(updated.enabled).toBe(condition.enabled);
		});

		it('should not mutate original condition', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true,
				'and'
			);

			condition.withLogicalOperator('or');

			expect(condition.logicalOperator).toBe('and');
		});

		it('should allow changing from or to and', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				true,
				'or'
			);

			const updated = condition.withLogicalOperator('and');

			expect(updated.logicalOperator).toBe('and');
		});
	});

	describe('createDefault', () => {
		it('should create default condition with PluginName and Contains', () => {
			const condition = FilterCondition.createDefault();

			expect(condition.field).toBe(FilterField.PluginName);
			expect(condition.operator).toBe(FilterOperator.Contains);
			expect(condition.value).toBe('placeholder');
			expect(condition.enabled).toBe(false);
		});
	});

	describe('create', () => {
		it('should create condition from parameters', () => {
			const condition = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.StartsWith,
				value: 'account',
				enabled: true
			});

			expect(condition.field).toBe(FilterField.EntityName);
			expect(condition.operator).toBe(FilterOperator.StartsWith);
			expect(condition.value).toBe('account');
			expect(condition.enabled).toBe(true);
		});

		it('should default enabled to true when not provided', () => {
			const condition = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'test'
			});

			expect(condition.enabled).toBe(true);
		});

		it('should default logicalOperator to and when not provided', () => {
			const condition = FilterCondition.create({
				field: FilterField.PluginName,
				operator: FilterOperator.Contains,
				value: 'test'
			});

			expect(condition.logicalOperator).toBe('and');
		});

		it('should accept or as logicalOperator', () => {
			const condition = FilterCondition.create({
				field: FilterField.EntityName,
				operator: FilterOperator.StartsWith,
				value: 'account',
				enabled: true,
				logicalOperator: 'or'
			});

			expect(condition.logicalOperator).toBe('or');
		});
	});
});
