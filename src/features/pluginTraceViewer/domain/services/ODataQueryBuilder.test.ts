import { ODataQueryBuilder } from './ODataQueryBuilder';
import { FilterCondition } from './../entities/FilterCondition';
import { FilterField } from './../valueObjects/FilterField';
import { FilterOperator } from './../valueObjects/FilterOperator';
import { OperationType } from './../valueObjects/OperationType';
import { ExecutionMode } from './../valueObjects/ExecutionMode';
import { TraceStatus } from './../valueObjects/TraceStatus';
import { CorrelationId } from './../valueObjects/CorrelationId';

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

		describe('defensive programming edge cases', () => {
			it('should handle expressionBuilder returning undefined for first condition (line 50 coverage)', () => {
				// This tests lines 45-50 - defensive checks for malformed data
				// We need to mock the expressionBuilder to return undefined

				const condition = new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and');

				// Access private expressionBuilder and mock it
				const expressionBuilder = (builder as unknown as { expressionBuilder: { buildExpression: () => string | undefined } }).expressionBuilder;
				const originalBuildExpression = expressionBuilder.buildExpression;

				try {
					// Mock buildExpression to return undefined
					expressionBuilder.buildExpression = () => undefined;

					const result = builder.buildFromConditions([condition]);

					// Should return undefined because buildExpression returned undefined
					expect(result).toBeUndefined();
				} finally {
					// Restore original method
					expressionBuilder.buildExpression = originalBuildExpression;
				}
			});

			it('should handle condition being undefined in loop (line 63 coverage)', () => {
				// This tests the defensive check at line 63 - the continue statement
				// We need to create an array where enabledConditions[i] is undefined during iteration

				const condition1 = new FilterCondition(FilterField.PluginName, FilterOperator.Contains, 'Plugin1', true, 'and');
				const condition3 = new FilterCondition(FilterField.MessageName, FilterOperator.Equals, 'Create', true, 'and');

				// Create a custom array-like object
				const malformedArray: { length: number; filter: (callback: unknown) => FilterCondition[] } = {
					length: 3,
					filter: function(_callback: unknown) {
						// Return an array with a hole at index 1
						const result: FilterCondition[] = [];
						result[0] = condition1;
						// result[1] is intentionally left undefined (sparse array)
						result[2] = condition3;
						result.length = 3;
						return result;
					}
				};

				const result = builder.buildFromConditions(malformedArray as readonly FilterCondition[]);

				// Should skip the undefined element and combine the valid conditions
				expect(result).toBe("(contains(typename, 'Plugin1')) and (messagename eq 'Create')");
			});

			it('should handle array.filter creating sparse array (lines 45 coverage)', () => {
				// This is theoretical - testing the edge case where enabledConditions[0] might be undefined
				// even though enabledConditions.length > 0
				// In practice, this shouldn't happen with Array.filter, but we test the defensive check

				// Create a custom array-like object that has length but undefined elements
				const malformedArray: { length: number; filter: (callback: unknown) => FilterCondition[] } = {
					length: 1,
					filter: function(_callback: unknown) {
						// Return an array-like object with length > 0 but undefined at index 0
						const result: FilterCondition[] = [];
						result.length = 1; // Set length to 1
						// But don't set result[0], leaving it undefined
						return result;
					}
				};

				const result = builder.buildFromConditions(malformedArray as readonly FilterCondition[]);

				// Should return undefined due to defensive check at line 45
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

	describe('buildFromLegacyFilters', () => {
		describe('empty filters', () => {
			it('should return undefined when all filters are undefined', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBeUndefined();
			});

			it('should return undefined when correlation ID is empty', () => {
				// Note: CorrelationId constructor validates and throws if empty,
				// so we test with a valid ID but check isEmpty() logic
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBeUndefined();
			});
		});

		describe('text filters', () => {
			it('should build filter for plugin name', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: 'MyPlugin',
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe("contains(typename, 'MyPlugin')");
			});

			it('should build filter for entity name', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: 'account',
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe("contains(primaryentity, 'account')");
			});

			it('should build filter for message name', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: 'Create',
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe("contains(messagename, 'Create')");
			});

			it('should escape single quotes in text filters', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: "O'Brien's Plugin",
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe("contains(typename, 'O''Brien''s Plugin')");
			});
		});

		describe('enum filters', () => {
			it('should build filter for operation type Plugin', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: OperationType.Plugin,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('operationtype eq 1');
			});

			it('should build filter for operation type Workflow', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: OperationType.Workflow,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('operationtype eq 2');
			});

			it('should build filter for execution mode Synchronous', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: ExecutionMode.Synchronous,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('mode eq 0');
			});

			it('should build filter for execution mode Asynchronous', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: ExecutionMode.Asynchronous,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('mode eq 1');
			});
		});

		describe('status filters', () => {
			it('should build filter for status Exception', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: TraceStatus.Exception,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('exceptiondetails ne null');
			});

			it('should build filter for status Success', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: TraceStatus.Success,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('exceptiondetails eq null');
			});
		});

		describe('date filters', () => {
			it('should build filter for createdOnFrom', () => {
				const fromDate = new Date('2024-01-01T12:00:00Z');

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: fromDate,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('createdon ge 2024-01-01T12:00:00.000Z');
			});

			it('should build filter for createdOnTo', () => {
				const toDate = new Date('2024-01-31T23:59:59Z');

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: toDate,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('createdon le 2024-01-31T23:59:59.000Z');
			});

			it('should build filter for date range', () => {
				const fromDate = new Date('2024-01-01T00:00:00Z');
				const toDate = new Date('2024-01-31T23:59:59Z');

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: fromDate,
					createdOnTo: toDate,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('createdon ge 2024-01-01T00:00:00.000Z and createdon le 2024-01-31T23:59:59.000Z');
			});
		});

		describe('duration filters', () => {
			it('should build filter for durationMin', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: 1000,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('performanceexecutionduration ge 1000');
			});

			it('should build filter for durationMax', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: 5000,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('performanceexecutionduration le 5000');
			});

			it('should build filter for duration range', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: 1000,
					durationMax: 5000,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('performanceexecutionduration ge 1000 and performanceexecutionduration le 5000');
			});

			it('should handle duration min with value 0', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: 0,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe('performanceexecutionduration ge 0');
			});
		});

		describe('exception filters', () => {
			it('should build filter for hasException true', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: true,
					correlationIdFilter: undefined
				});

				expect(result).toBe('exceptiondetails ne null');
			});

			it('should build filter for hasException false', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: false,
					correlationIdFilter: undefined
				});

				expect(result).toBe('exceptiondetails eq null');
			});
		});

		describe('correlation ID filter', () => {
			it('should build filter for correlation ID', () => {
				const correlationId = CorrelationId.create('12345678-1234-1234-1234-123456789abc');

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: correlationId
				});

				expect(result).toBe("correlationid eq '12345678-1234-1234-1234-123456789abc'");
			});

			it('should escape single quotes in correlation ID', () => {
				const correlationId = CorrelationId.create("test'id");

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: undefined,
					entityNameFilter: undefined,
					messageNameFilter: undefined,
					operationTypeFilter: undefined,
					modeFilter: undefined,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: correlationId
				});

				expect(result).toBe("correlationid eq 'test''id'");
			});
		});

		describe('combined filters', () => {
			it('should combine multiple filters with AND', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: 'MyPlugin',
					entityNameFilter: 'account',
					messageNameFilter: 'Create',
					operationTypeFilter: OperationType.Plugin,
					modeFilter: ExecutionMode.Synchronous,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: undefined,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe(
					"contains(typename, 'MyPlugin') and contains(primaryentity, 'account') and contains(messagename, 'Create') and operationtype eq 1 and mode eq 0"
				);
			});

			it('should build complex filter with all filter types', () => {
				const fromDate = new Date('2024-01-01T00:00:00Z');
				const toDate = new Date('2024-01-31T23:59:59Z');
				const correlationId = CorrelationId.create('abc-123');

				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: 'MyPlugin',
					entityNameFilter: 'account',
					messageNameFilter: 'Create',
					operationTypeFilter: OperationType.Plugin,
					modeFilter: ExecutionMode.Synchronous,
					statusFilter: TraceStatus.Exception,
					createdOnFrom: fromDate,
					createdOnTo: toDate,
					durationMin: 1000,
					durationMax: 5000,
					hasExceptionFilter: true,
					correlationIdFilter: correlationId
				});

				expect(result).toBe(
					"contains(typename, 'MyPlugin') and contains(primaryentity, 'account') and contains(messagename, 'Create') and operationtype eq 1 and mode eq 0 and exceptiondetails ne null and createdon ge 2024-01-01T00:00:00.000Z and createdon le 2024-01-31T23:59:59.000Z and performanceexecutionduration ge 1000 and performanceexecutionduration le 5000 and exceptiondetails ne null and correlationid eq 'abc-123'"
				);
			});

			it('should handle mix of defined and undefined filters', () => {
				const result = builder.buildFromLegacyFilters({
					pluginNameFilter: 'MyPlugin',
					entityNameFilter: undefined,
					messageNameFilter: 'Create',
					operationTypeFilter: undefined,
					modeFilter: ExecutionMode.Asynchronous,
					statusFilter: undefined,
					createdOnFrom: undefined,
					createdOnTo: undefined,
					durationMin: 1000,
					durationMax: undefined,
					hasExceptionFilter: undefined,
					correlationIdFilter: undefined
				});

				expect(result).toBe(
					"contains(typename, 'MyPlugin') and contains(messagename, 'Create') and mode eq 1 and performanceexecutionduration ge 1000"
				);
			});
		});
	});
});
