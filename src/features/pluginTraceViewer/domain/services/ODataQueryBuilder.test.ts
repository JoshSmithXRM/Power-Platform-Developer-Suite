import { ODataQueryBuilder } from './ODataQueryBuilder';
import { FilterCondition } from './../entities/FilterCondition';
import { FilterField } from './../valueObjects/FilterField';
import { FilterOperator } from './../valueObjects/FilterOperator';

describe('ODataQueryBuilder', () => {
	let builder: ODataQueryBuilder;

	beforeEach(() => {
		builder = new ODataQueryBuilder();
	});

	describe('buildFromConditions', () => {
		describe('empty and undefined cases', () => {
			it('should return undefined for empty conditions array', () => {
				const result = builder.buildFromConditions([]);

				expect(result).toBeUndefined();
			});

			it('should return undefined when all conditions are disabled', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'test1', false),
					new FilterCondition(FilterField.EntityName, FilterOperator.Contains, 'test2', false)
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBeUndefined();
			});

			it('should handle null operators correctly', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true)
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe('(exceptiondetails ne null)');
			});
		});

		describe('single condition', () => {
			it('should wrap single condition in parentheses', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true)
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'MyPlugin'))");
			});

			it('should handle single enabled condition with disabled conditions', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'test1', false),
					new FilterCondition(FilterField.EntityName, FilterOperator.Contains, 'account', true),
					new FilterCondition(FilterField.MessageName, FilterOperator.Contains, 'test3', false)
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(primaryentity, 'account'))");
			});
		});

		describe('multiple conditions with AND', () => {
			it('should combine two conditions with AND', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'MyPlugin')) and (primaryentity eq 'account')");
			});

			it('should combine three conditions with AND', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.StartsWith, 'Create', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(contains(typename, 'MyPlugin')) and (primaryentity eq 'account') and (startswith(messagename, 'Create'))"
				);
			});
		});

		describe('multiple conditions with OR', () => {
			it('should combine two conditions with OR', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin2', true, 'or')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'Plugin1')) or (contains(typename, 'Plugin2'))");
			});

			it('should combine three conditions with OR', () => {
				const conditions = [
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'contact', true, 'or'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'lead', true, 'or')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(primaryentity eq 'account') or (primaryentity eq 'contact') or (primaryentity eq 'lead')"
				);
			});
		});

		describe('mixed AND/OR operators', () => {
			it('should handle mixed AND and OR operators', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.StartsWith, 'Create', true, 'or')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(contains(typename, 'MyPlugin')) and (primaryentity eq 'account') or (startswith(messagename, 'Create'))"
				);
			});

			it('should respect OData operator precedence with parentheses', () => {
				// Query: (A) and (B) or (C) and (D)
				// Note: Each condition is wrapped in parens, so precedence is clear
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', true, 'or'),
					new FilterCondition(FilterField.Duration, FilterOperator.GreaterThan, '1000', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(contains(typename, 'Plugin1')) and (primaryentity eq 'account') or (messagename eq 'Create') and (performanceexecutionduration gt 1000)"
				);
			});
		});

		describe('disabled conditions handling', () => {
			it('should skip disabled conditions in the middle', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', false, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'Plugin1')) and (messagename eq 'Create')");
			});

			it('should skip disabled conditions at the beginning', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', false, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(primaryentity eq 'account') and (messagename eq 'Create')");
			});

			it('should skip disabled conditions at the end', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', false, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'Plugin1')) and (primaryentity eq 'account')");
			});

			it('should handle multiple consecutive disabled conditions', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', false, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Update', false, 'and'),
					new FilterCondition(FilterField.Duration, FilterOperator.GreaterThan, '1000', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'Plugin1')) and (performanceexecutionduration gt 1000)");
			});
		});

		describe('Null operators', () => {
			it('should build IsNotNull filter correctly', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe('(exceptiondetails ne null)');
			});

			it('should build IsNull filter correctly', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNull, '', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe('(exceptiondetails eq null)');
			});

			it('should combine IsNotNull filter with other filters using AND', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true, 'and'),
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(exceptiondetails ne null) and (contains(typename, 'MyPlugin'))");
			});

			it('should combine IsNotNull filter with other filters using OR', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true, 'and'),
					new FilterCondition(FilterField.Duration, FilterOperator.GreaterThan, '5000', true, 'or')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe('(exceptiondetails ne null) or (performanceexecutionduration gt 5000)');
			});
		});

		describe('conditions that return undefined expressions', () => {
			it('should handle disabled conditions correctly', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', false, 'and'), // Disabled condition
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'Plugin1')) and (primaryentity eq 'account')");
			});

			it('should return undefined when all conditions are disabled', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', false, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBeUndefined();
			});
		});

		describe('real-world scenarios', () => {
			it('should build complex filter: exceptions from specific plugin in last hour', () => {
				const conditions = [
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true, 'and'),
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and'),
					new FilterCondition(FilterField.CreatedOn, FilterOperator.GreaterThanOrEqual, '2024-01-01T12:00:00Z', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(exceptiondetails ne null) and (contains(typename, 'MyPlugin')) and (createdon ge 2024-01-01T12:00:00Z)"
				);
			});

			it('should build complex filter: multiple plugins OR long duration', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and'),
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin2', true, 'or'),
					new FilterCondition(FilterField.Duration, FilterOperator.GreaterThan, '5000', true, 'or')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(contains(typename, 'Plugin1')) or (contains(typename, 'Plugin2')) or (performanceexecutionduration gt 5000)"
				);
			});

			it('should build filter with some enabled and some disabled conditions', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'MyPlugin', true, 'and'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', false, 'and'),
					new FilterCondition(FilterField.ExceptionDetails, FilterOperator.IsNotNull, '', true, 'and'),
					new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', false, 'or'),
					new FilterCondition(FilterField.Duration, FilterOperator.GreaterThan, '1000', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe(
					"(contains(typename, 'MyPlugin')) and (exceptiondetails ne null) and (performanceexecutionduration gt 1000)"
				);
			});
		});

		describe('edge cases', () => {

			it('should handle single quote in value correctly', () => {
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, "O'Brien", true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				expect(result).toBe("(contains(typename, 'O''Brien'))");
			});

			it('should handle first condition OR (though semantically odd)', () => {
				// First condition has 'or' operator - should still work
				const conditions = [
					new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'or'),
					new FilterCondition(FilterField.EntityName, FilterOperator.Equals, 'account', true, 'and')
				];

				const result = builder.buildFromConditions(conditions);

				// First condition operator is used for second condition
				expect(result).toBe("(contains(typename, 'Plugin1')) and (primaryentity eq 'account')");
			});
		});
	});
});
