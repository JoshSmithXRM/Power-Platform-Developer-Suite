import { FilterOperator } from '../FilterOperator';

describe('FilterOperator', () => {
	describe('static operator definitions', () => {
		it('should have Equals operator with correct properties', () => {
			expect(FilterOperator.Equals.displayName).toBe('Equals');
			expect(FilterOperator.Equals.odataOperator).toBe('eq');
			expect(FilterOperator.Equals.applicableTypes).toEqual(['text', 'enum', 'number', 'boolean', 'guid']);
		});

		it('should have Contains operator with correct properties', () => {
			expect(FilterOperator.Contains.displayName).toBe('Contains');
			expect(FilterOperator.Contains.odataOperator).toBe('contains');
			expect(FilterOperator.Contains.applicableTypes).toEqual(['text']);
		});

		it('should have StartsWith operator with correct properties', () => {
			expect(FilterOperator.StartsWith.displayName).toBe('Starts With');
			expect(FilterOperator.StartsWith.odataOperator).toBe('startswith');
			expect(FilterOperator.StartsWith.applicableTypes).toEqual(['text']);
		});

		it('should have EndsWith operator with correct properties', () => {
			expect(FilterOperator.EndsWith.displayName).toBe('Ends With');
			expect(FilterOperator.EndsWith.odataOperator).toBe('endswith');
			expect(FilterOperator.EndsWith.applicableTypes).toEqual(['text']);
		});

		it('should have NotEquals operator with correct properties', () => {
			expect(FilterOperator.NotEquals.displayName).toBe('Not Equals');
			expect(FilterOperator.NotEquals.odataOperator).toBe('ne');
			expect(FilterOperator.NotEquals.applicableTypes).toEqual(['text', 'enum', 'number', 'boolean', 'guid']);
		});

		it('should have GreaterThan operator with correct properties', () => {
			expect(FilterOperator.GreaterThan.displayName).toBe('Greater Than');
			expect(FilterOperator.GreaterThan.odataOperator).toBe('gt');
			expect(FilterOperator.GreaterThan.applicableTypes).toEqual(['number', 'date']);
		});

		it('should have LessThan operator with correct properties', () => {
			expect(FilterOperator.LessThan.displayName).toBe('Less Than');
			expect(FilterOperator.LessThan.odataOperator).toBe('lt');
			expect(FilterOperator.LessThan.applicableTypes).toEqual(['number', 'date']);
		});

		it('should have GreaterThanOrEqual operator with correct properties', () => {
			expect(FilterOperator.GreaterThanOrEqual.displayName).toBe('Greater Than or Equal');
			expect(FilterOperator.GreaterThanOrEqual.odataOperator).toBe('ge');
			expect(FilterOperator.GreaterThanOrEqual.applicableTypes).toEqual(['number', 'date']);
		});

		it('should have LessThanOrEqual operator with correct properties', () => {
			expect(FilterOperator.LessThanOrEqual.displayName).toBe('Less Than or Equal');
			expect(FilterOperator.LessThanOrEqual.odataOperator).toBe('le');
			expect(FilterOperator.LessThanOrEqual.applicableTypes).toEqual(['number', 'date']);
		});

		it('should have IsNull operator with correct properties', () => {
			expect(FilterOperator.IsNull.displayName).toBe('Is Null');
			expect(FilterOperator.IsNull.odataOperator).toBe('null');
			expect(FilterOperator.IsNull.applicableTypes).toEqual(['text', 'enum', 'date', 'number', 'boolean', 'guid']);
		});

		it('should have IsNotNull operator with correct properties', () => {
			expect(FilterOperator.IsNotNull.displayName).toBe('Is Not Null');
			expect(FilterOperator.IsNotNull.odataOperator).toBe('notnull');
			expect(FilterOperator.IsNotNull.applicableTypes).toEqual(['text', 'enum', 'date', 'number', 'boolean', 'guid']);
		});
	});

	describe('All array', () => {
		it('should contain all 11 operator definitions', () => {
			expect(FilterOperator.All).toHaveLength(11);
		});

		it('should contain all operators', () => {
			expect(FilterOperator.All).toContain(FilterOperator.Equals);
			expect(FilterOperator.All).toContain(FilterOperator.Contains);
			expect(FilterOperator.All).toContain(FilterOperator.StartsWith);
			expect(FilterOperator.All).toContain(FilterOperator.EndsWith);
			expect(FilterOperator.All).toContain(FilterOperator.NotEquals);
			expect(FilterOperator.All).toContain(FilterOperator.GreaterThan);
			expect(FilterOperator.All).toContain(FilterOperator.LessThan);
			expect(FilterOperator.All).toContain(FilterOperator.GreaterThanOrEqual);
			expect(FilterOperator.All).toContain(FilterOperator.LessThanOrEqual);
			expect(FilterOperator.All).toContain(FilterOperator.IsNull);
			expect(FilterOperator.All).toContain(FilterOperator.IsNotNull);
		});
	});

	describe('forFieldType', () => {
		it('should return 7 operators for text fields', () => {
			const operators = FilterOperator.forFieldType('text');

			expect(operators).toHaveLength(7);
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.Contains);
			expect(operators).toContain(FilterOperator.StartsWith);
			expect(operators).toContain(FilterOperator.EndsWith);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
		});

		it('should return 4 operators for enum fields', () => {
			const operators = FilterOperator.forFieldType('enum');

			expect(operators).toHaveLength(4);
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
		});

		it('should return 6 operators for date fields', () => {
			const operators = FilterOperator.forFieldType('date');

			expect(operators).toHaveLength(6);
			expect(operators).toContain(FilterOperator.GreaterThan);
			expect(operators).toContain(FilterOperator.LessThan);
			expect(operators).toContain(FilterOperator.GreaterThanOrEqual);
			expect(operators).toContain(FilterOperator.LessThanOrEqual);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
		});

		it('should return 8 operators for number fields', () => {
			const operators = FilterOperator.forFieldType('number');

			expect(operators).toHaveLength(8);
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.GreaterThan);
			expect(operators).toContain(FilterOperator.LessThan);
			expect(operators).toContain(FilterOperator.GreaterThanOrEqual);
			expect(operators).toContain(FilterOperator.LessThanOrEqual);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
		});

		it('should return 4 operators for boolean fields', () => {
			const operators = FilterOperator.forFieldType('boolean');

			expect(operators).toHaveLength(4);
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
		});

		it('should not include Contains for enum fields', () => {
			const operators = FilterOperator.forFieldType('enum');

			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.StartsWith);
			expect(operators).not.toContain(FilterOperator.EndsWith);
		});

		it('should not include Contains for date fields', () => {
			const operators = FilterOperator.forFieldType('date');

			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.StartsWith);
			expect(operators).not.toContain(FilterOperator.EndsWith);
		});

		it('should not include Contains for number fields', () => {
			const operators = FilterOperator.forFieldType('number');

			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.StartsWith);
			expect(operators).not.toContain(FilterOperator.EndsWith);
		});

		it('should not include Equals for date fields', () => {
			const operators = FilterOperator.forFieldType('date');

			expect(operators).not.toContain(FilterOperator.Equals);
			expect(operators).not.toContain(FilterOperator.NotEquals);
		});
	});

	describe('fromDisplayName', () => {
		it('should find operator by Equals', () => {
			const operator = FilterOperator.fromDisplayName('Equals');

			expect(operator).toBe(FilterOperator.Equals);
		});

		it('should find operator by Contains', () => {
			const operator = FilterOperator.fromDisplayName('Contains');

			expect(operator).toBe(FilterOperator.Contains);
		});

		it('should find operator by Starts With', () => {
			const operator = FilterOperator.fromDisplayName('Starts With');

			expect(operator).toBe(FilterOperator.StartsWith);
		});

		it('should find operator by Ends With', () => {
			const operator = FilterOperator.fromDisplayName('Ends With');

			expect(operator).toBe(FilterOperator.EndsWith);
		});

		it('should find operator by Not Equals', () => {
			const operator = FilterOperator.fromDisplayName('Not Equals');

			expect(operator).toBe(FilterOperator.NotEquals);
		});

		it('should find operator by Greater Than', () => {
			const operator = FilterOperator.fromDisplayName('Greater Than');

			expect(operator).toBe(FilterOperator.GreaterThan);
		});

		it('should find operator by Less Than', () => {
			const operator = FilterOperator.fromDisplayName('Less Than');

			expect(operator).toBe(FilterOperator.LessThan);
		});

		it('should find operator by Greater Than or Equal', () => {
			const operator = FilterOperator.fromDisplayName('Greater Than or Equal');

			expect(operator).toBe(FilterOperator.GreaterThanOrEqual);
		});

		it('should find operator by Less Than or Equal', () => {
			const operator = FilterOperator.fromDisplayName('Less Than or Equal');

			expect(operator).toBe(FilterOperator.LessThanOrEqual);
		});

		it('should return undefined for unknown display name', () => {
			const operator = FilterOperator.fromDisplayName('Unknown');

			expect(operator).toBeUndefined();
		});

		it('should be case-sensitive', () => {
			const operator = FilterOperator.fromDisplayName('equals');

			expect(operator).toBeUndefined();
		});
	});

	describe('fromODataOperator', () => {
		it('should find operator by eq', () => {
			const operator = FilterOperator.fromODataOperator('eq');

			expect(operator).toBe(FilterOperator.Equals);
		});

		it('should find operator by contains', () => {
			const operator = FilterOperator.fromODataOperator('contains');

			expect(operator).toBe(FilterOperator.Contains);
		});

		it('should find operator by startswith', () => {
			const operator = FilterOperator.fromODataOperator('startswith');

			expect(operator).toBe(FilterOperator.StartsWith);
		});

		it('should find operator by endswith', () => {
			const operator = FilterOperator.fromODataOperator('endswith');

			expect(operator).toBe(FilterOperator.EndsWith);
		});

		it('should find operator by ne', () => {
			const operator = FilterOperator.fromODataOperator('ne');

			expect(operator).toBe(FilterOperator.NotEquals);
		});

		it('should find operator by gt', () => {
			const operator = FilterOperator.fromODataOperator('gt');

			expect(operator).toBe(FilterOperator.GreaterThan);
		});

		it('should find operator by lt', () => {
			const operator = FilterOperator.fromODataOperator('lt');

			expect(operator).toBe(FilterOperator.LessThan);
		});

		it('should find operator by ge', () => {
			const operator = FilterOperator.fromODataOperator('ge');

			expect(operator).toBe(FilterOperator.GreaterThanOrEqual);
		});

		it('should find operator by le', () => {
			const operator = FilterOperator.fromODataOperator('le');

			expect(operator).toBe(FilterOperator.LessThanOrEqual);
		});

		it('should return undefined for unknown OData operator', () => {
			const operator = FilterOperator.fromODataOperator('unknown');

			expect(operator).toBeUndefined();
		});
	});

	describe('equals', () => {
		it('should return true for same operator', () => {
			expect(FilterOperator.Equals.equals(FilterOperator.Equals)).toBe(true);
		});

		it('should return false for different operators', () => {
			expect(FilterOperator.Equals.equals(FilterOperator.Contains)).toBe(false);
		});

		it('should return false for null', () => {
			expect(FilterOperator.Equals.equals(null)).toBe(false);
		});

		it('should compare by odataOperator', () => {
			const op1 = FilterOperator.Equals;
			const op2 = FilterOperator.fromODataOperator('eq');

			expect(op1.equals(op2 ?? null)).toBe(true);
		});
	});
});
