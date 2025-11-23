import { ODataExpressionBuilder } from './ODataExpressionBuilder';
import { FilterCondition } from './../entities/FilterCondition';
import { FilterField } from './../valueObjects/FilterField';
import { FilterOperator } from './../valueObjects/FilterOperator';

describe('ODataExpressionBuilder', () => {
	let builder: ODataExpressionBuilder;

	beforeEach(() => {
		builder = new ODataExpressionBuilder();
	});

	describe('buildExpression', () => {
		describe('disabled conditions', () => {
			it('should return undefined for disabled condition', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'test',
					false
				);

				expect(builder.buildExpression(condition)).toBeUndefined();
			});
		});

		describe('function-style operators', () => {
			it('should build contains function', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'MyPlugin',
					true
				);

				expect(builder.buildExpression(condition)).toBe("contains(typename, 'MyPlugin')");
			});

			it('should build startswith function', () => {
				const condition = new FilterCondition(
					FilterField.EntityName,
					FilterOperator.StartsWith,
					'account',
					true
				);

				expect(builder.buildExpression(condition)).toBe("startswith(primaryentity, 'account')");
			});

			it('should build endswith function', () => {
				const condition = new FilterCondition(
					FilterField.MessageName,
					FilterOperator.EndsWith,
					'Update',
					true
				);

				expect(builder.buildExpression(condition)).toBe("endswith(messagename, 'Update')");
			});
		});

		describe('comparison operators', () => {
			it('should build equals comparison for text fields', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Equals,
					'MyPlugin',
					true
				);

				expect(builder.buildExpression(condition)).toBe("typename eq 'MyPlugin'");
			});

			it('should build not equals comparison for text fields', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.NotEquals,
					'MyPlugin',
					true
				);

				expect(builder.buildExpression(condition)).toBe("typename ne 'MyPlugin'");
			});

			it('should build greater than comparison for number fields', () => {
				const condition = new FilterCondition(
					FilterField.Duration,
					FilterOperator.GreaterThan,
					'1000',
					true
				);

				expect(builder.buildExpression(condition)).toBe('performanceexecutionduration gt 1000');
			});

			it('should build less than comparison for number fields', () => {
				const condition = new FilterCondition(
					FilterField.Duration,
					FilterOperator.LessThan,
					'5000',
					true
				);

				expect(builder.buildExpression(condition)).toBe('performanceexecutionduration lt 5000');
			});

			it('should build greater than or equal comparison for date fields', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2024-01-01T00:00:00Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon ge 2024-01-01T00:00:00Z');
			});

			it('should build less than or equal comparison for date fields', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.LessThanOrEqual,
					'2024-12-31T23:59:59Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon le 2024-12-31T23:59:59Z');
			});
		});

		describe('value formatting', () => {
			it('should quote text field values', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Equals,
					'test',
					true
				);

				expect(builder.buildExpression(condition)).toBe("typename eq 'test'");
			});

			it('should quote enum field values', () => {
				const condition = new FilterCondition(
					FilterField.OperationType,
					FilterOperator.Equals,
					'Plugin',
					true
				);

				expect(builder.buildExpression(condition)).toBe("operationtype eq 'Plugin'");
			});

			it('should not quote number field values', () => {
				const condition = new FilterCondition(
					FilterField.Duration,
					FilterOperator.Equals,
					'1500',
					true
				);

				expect(builder.buildExpression(condition)).toBe('performanceexecutionduration eq 1500');
			});

			it('should not quote date field values', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2024-01-01T00:00:00Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon ge 2024-01-01T00:00:00Z');
			});
		});

		describe('OData string escaping', () => {
			it('should escape single quote as double single quote', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					"O'Brien",
					true
				);

				expect(builder.buildExpression(condition)).toBe("contains(typename, 'O''Brien')");
			});

			it('should escape multiple single quotes', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Equals,
					"It's a test's value",
					true
				);

				expect(builder.buildExpression(condition)).toBe("typename eq 'It''s a test''s value'");
			});

			it('should handle strings with no quotes', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'NoQuotesHere',
					true
				);

				expect(builder.buildExpression(condition)).toBe("contains(typename, 'NoQuotesHere')");
			});
		});

		describe('null operators', () => {
			it('should build IsNull expression', () => {
				const condition = new FilterCondition(
					FilterField.ExceptionDetails,
					FilterOperator.IsNull,
					'',
					true
				);

				expect(builder.buildExpression(condition)).toBe('exceptiondetails eq null');
			});

			it('should build IsNotNull expression', () => {
				const condition = new FilterCondition(
					FilterField.ExceptionDetails,
					FilterOperator.IsNotNull,
					'',
					true
				);

				expect(builder.buildExpression(condition)).toBe('exceptiondetails ne null');
			});

			it('should work with any nullable field', () => {
				const condition = new FilterCondition(
					FilterField.EntityName,
					FilterOperator.IsNull,
					'',
					true
				);

				expect(builder.buildExpression(condition)).toBe('primaryentity eq null');
			});

			it('should build IsNotNull for correlation ID', () => {
				const condition = new FilterCondition(
					FilterField.CorrelationId,
					FilterOperator.IsNotNull,
					'',
					true
				);

				expect(builder.buildExpression(condition)).toBe('correlationid ne null');
			});
		});

		describe('date formatting', () => {
			it('should format UTC ISO to OData format (remove milliseconds)', () => {
				// FilterCondition.value is UTC ISO (converted by presentation layer)
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2025-11-10T16:20:00.000Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon ge 2025-11-10T16:20:00Z');
			});

			it('should handle UTC ISO without milliseconds', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2024-01-01T00:00:00Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon ge 2024-01-01T00:00:00Z');
			});

			it('should format UTC ISO with milliseconds to OData format', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2024-01-01T00:00:00.123Z',
					true
				);

				// OData format removes milliseconds
				expect(builder.buildExpression(condition)).toBe('createdon ge 2024-01-01T00:00:00Z');
			});

			it('should handle different comparison operators with dates', () => {
				const greaterThan = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThan,
					'2025-11-10T16:20:00.000Z',
					true
				);

				const lessThan = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.LessThan,
					'2025-11-10T16:20:00.000Z',
					true
				);

				expect(builder.buildExpression(greaterThan)).toBe('createdon gt 2025-11-10T16:20:00Z');
				expect(builder.buildExpression(lessThan)).toBe('createdon lt 2025-11-10T16:20:00Z');
			});

			it('should handle midnight UTC', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.GreaterThanOrEqual,
					'2025-11-11T00:00:00.000Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon ge 2025-11-11T00:00:00Z');
			});

			it('should handle end of day UTC', () => {
				const condition = new FilterCondition(
					FilterField.CreatedOn,
					FilterOperator.LessThanOrEqual,
					'2025-11-11T23:59:59.999Z',
					true
				);

				expect(builder.buildExpression(condition)).toBe('createdon le 2025-11-11T23:59:59Z');
			});
		});

		describe('edge cases', () => {

			it('should handle zero for number fields', () => {
				const condition = new FilterCondition(
					FilterField.Duration,
					FilterOperator.Equals,
					'0',
					true
				);

				expect(builder.buildExpression(condition)).toBe('performanceexecutionduration eq 0');
			});

			it('should handle special characters in text values', () => {
				const condition = new FilterCondition(
					FilterField.PluginName,
					FilterOperator.Contains,
					'test-plugin_v2.0',
					true
				);

				expect(builder.buildExpression(condition)).toBe("contains(typename, 'test-plugin_v2.0')");
			});
		});
	});

	describe('GUID field handling', () => {
		it('should quote GUID field values like text values', () => {
			const condition = new FilterCondition(
				FilterField.CorrelationId,
				FilterOperator.Equals,
				'12345678-1234-1234-1234-123456789abc',
				true
			);

			expect(builder.buildExpression(condition)).toBe("correlationid eq '12345678-1234-1234-1234-123456789abc'");
		});

		it('should support equals operator on GUID fields', () => {
			const condition = new FilterCondition(
				FilterField.RequestId,
				FilterOperator.Equals,
				'87654321-4321-4321-4321-cba987654321',
				true
			);

			expect(builder.buildExpression(condition)).toBe("requestid eq '87654321-4321-4321-4321-cba987654321'");
		});

		it('should support not equals operator on GUID fields', () => {
			const condition = new FilterCondition(
				FilterField.PluginStepId,
				FilterOperator.NotEquals,
				'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
				true
			);

			expect(builder.buildExpression(condition)).toBe("pluginstepid ne 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'");
		});

		it('should support IsNull operator on GUID fields', () => {
			const condition = new FilterCondition(
				FilterField.CorrelationId,
				FilterOperator.IsNull,
				'',
				true
			);

			expect(builder.buildExpression(condition)).toBe('correlationid eq null');
		});

		it('should support IsNotNull operator on GUID fields', () => {
			const condition = new FilterCondition(
				FilterField.OrganizationId,
				FilterOperator.IsNotNull,
				'',
				true
			);

			expect(builder.buildExpression(condition)).toBe('organizationid ne null');
		});

		it('should handle GUID values with mixed case', () => {
			const condition = new FilterCondition(
				FilterField.CreatedBy,
				FilterOperator.Equals,
				'AbCdEfGh-1234-5678-90AB-CdEf12345678',
				true
			);

			expect(builder.buildExpression(condition)).toBe("_createdby_value eq 'AbCdEfGh-1234-5678-90AB-CdEf12345678'");
		});
	});
});
