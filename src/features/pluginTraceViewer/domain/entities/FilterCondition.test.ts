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
	});

	describe('toODataExpression', () => {
		it('should return undefined when condition is disabled', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'test',
				false
			);

			expect(condition.toODataExpression()).toBeUndefined();
		});

		it('should build Contains function for text fields', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				'MyPlugin',
				true
			);

			expect(condition.toODataExpression()).toBe("contains(typename, 'MyPlugin')");
		});

		it('should build StartsWith function for text fields', () => {
			const condition = new FilterCondition(
				FilterField.EntityName,
				FilterOperator.StartsWith,
				'account',
				true
			);

			expect(condition.toODataExpression()).toBe("startswith(primaryentity, 'account')");
		});

		it('should build EndsWith function for text fields', () => {
			const condition = new FilterCondition(
				FilterField.MessageName,
				FilterOperator.EndsWith,
				'Update',
				true
			);

			expect(condition.toODataExpression()).toBe("endswith(messagename, 'Update')");
		});

		it('should build Equals comparison for text fields', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Equals,
				'MyPlugin',
				true
			);

			expect(condition.toODataExpression()).toBe("typename eq 'MyPlugin'");
		});

		it('should build NotEquals comparison for text fields', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.NotEquals,
				'MyPlugin',
				true
			);

			expect(condition.toODataExpression()).toBe("typename ne 'MyPlugin'");
		});

		it('should build Equals comparison for enum fields with quotes', () => {
			const condition = new FilterCondition(
				FilterField.OperationType,
				FilterOperator.Equals,
				'Plugin',
				true
			);

			expect(condition.toODataExpression()).toBe("operationtype eq 'Plugin'");
		});

		it('should build GreaterThan comparison for number fields without quotes', () => {
			const condition = new FilterCondition(
				FilterField.Duration,
				FilterOperator.GreaterThan,
				'1000',
				true
			);

			expect(condition.toODataExpression()).toBe('performanceexecutionduration gt 1000');
		});

		it('should build LessThan comparison for number fields without quotes', () => {
			const condition = new FilterCondition(
				FilterField.Duration,
				FilterOperator.LessThan,
				'5000',
				true
			);

			expect(condition.toODataExpression()).toBe('performanceexecutionduration lt 5000');
		});

		it('should build GreaterThanOrEqual comparison for date fields', () => {
			const condition = new FilterCondition(
				FilterField.CreatedOn,
				FilterOperator.GreaterThanOrEqual,
				'2024-01-01T00:00:00Z',
				true
			);

			expect(condition.toODataExpression()).toBe('createdon ge 2024-01-01T00:00:00Z');
		});

		it('should build LessThanOrEqual comparison for date fields', () => {
			const condition = new FilterCondition(
				FilterField.CreatedOn,
				FilterOperator.LessThanOrEqual,
				'2024-12-31T23:59:59Z',
				true
			);

			expect(condition.toODataExpression()).toBe('createdon le 2024-12-31T23:59:59Z');
		});

		it('should escape single quotes in values', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Contains,
				"O'Brien",
				true
			);

			expect(condition.toODataExpression()).toBe("contains(typename, 'O''Brien')");
		});

		it('should escape multiple single quotes in values', () => {
			const condition = new FilterCondition(
				FilterField.PluginName,
				FilterOperator.Equals,
				"It's a test's value",
				true
			);

			expect(condition.toODataExpression()).toBe("typename eq 'It''s a test''s value'");
		});

		it('should build IsNull filter for exceptiondetails', () => {
			const condition = new FilterCondition(
				FilterField.ExceptionDetails,
				FilterOperator.IsNull,
				'',
				true
			);

			expect(condition.toODataExpression()).toBe('exceptiondetails eq null');
		});

		it('should build IsNotNull filter for exceptiondetails', () => {
			const condition = new FilterCondition(
				FilterField.ExceptionDetails,
				FilterOperator.IsNotNull,
				'',
				true
			);

			expect(condition.toODataExpression()).toBe('exceptiondetails ne null');
		});

		it('should build Equals filter with empty string for exceptiondetails', () => {
			const condition = new FilterCondition(
				FilterField.ExceptionDetails,
				FilterOperator.Equals,
				'',
				true
			);

			// Dataverse stores empty text fields as empty string '', not null
			expect(condition.toODataExpression()).toBe("exceptiondetails eq ''");
		});

		it('should build NotEquals filter with empty string for exceptiondetails', () => {
			const condition = new FilterCondition(
				FilterField.ExceptionDetails,
				FilterOperator.NotEquals,
				'',
				true
			);

			// Dataverse stores empty text fields as empty string '', not null
			expect(condition.toODataExpression()).toBe("exceptiondetails ne ''");
		});

		it('should build IsNull filter for nullable field', () => {
			const condition = new FilterCondition(
				FilterField.EntityName,
				FilterOperator.IsNull,
				'',
				true
			);

			expect(condition.toODataExpression()).toBe('primaryentity eq null');
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
	});
});
