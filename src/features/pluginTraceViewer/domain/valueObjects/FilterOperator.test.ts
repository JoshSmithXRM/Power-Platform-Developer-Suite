/**
 * Tests for FilterOperator value object
 * Tests all operator definitions, lookups, and equality checks
 */
import { FilterOperator } from './FilterOperator';

describe('FilterOperator', () => {
	describe('Operator Definitions', () => {
		test.each([
			[FilterOperator.Equals, 'eq', ['text', 'enum', 'number', 'boolean', 'guid']],
			[FilterOperator.NotEquals, 'ne', ['text', 'enum', 'number', 'boolean', 'guid']],
			[FilterOperator.Contains, 'contains', ['text']],
			[FilterOperator.StartsWith, 'startswith', ['text']],
			[FilterOperator.EndsWith, 'endswith', ['text']],
			[FilterOperator.GreaterThan, 'gt', ['number', 'date']],
			[FilterOperator.LessThan, 'lt', ['number', 'date']],
			[FilterOperator.GreaterThanOrEqual, 'ge', ['number', 'date']],
			[FilterOperator.LessThanOrEqual, 'le', ['number', 'date']],
			[FilterOperator.IsNull, 'null', ['text', 'enum', 'date', 'number', 'boolean', 'guid']],
			[FilterOperator.IsNotNull, 'notnull', ['text', 'enum', 'date', 'number', 'boolean', 'guid']]
		])('should define operator with odata "%s"', (operator, odataOp, applicableTypes) => {
			expect(operator.odataOperator).toBe(odataOp);
			expect(operator.applicableTypes).toEqual(applicableTypes);
		});
	});

	describe('All Operators Collection', () => {
		it('should contain all 11 operators', () => {
			// Arrange & Act
			const allOps = FilterOperator.All;

			// Assert
			expect(allOps).toHaveLength(11);
		});

		it('should include all text operators in All collection', () => {
			// Arrange
			const textOps = [
				FilterOperator.Equals,
				FilterOperator.Contains,
				FilterOperator.StartsWith,
				FilterOperator.EndsWith,
				FilterOperator.NotEquals
			];

			// Act & Assert
			textOps.forEach(op => {
				expect(FilterOperator.All).toContain(op);
			});
		});

		it('should include all numeric/date operators in All collection', () => {
			// Arrange
			const numericOps = [
				FilterOperator.GreaterThan,
				FilterOperator.LessThan,
				FilterOperator.GreaterThanOrEqual,
				FilterOperator.LessThanOrEqual
			];

			// Act & Assert
			numericOps.forEach(op => {
				expect(FilterOperator.All).toContain(op);
			});
		});

		it('should include all null operators in All collection', () => {
			// Arrange
			const nullOps = [FilterOperator.IsNull, FilterOperator.IsNotNull];

			// Act & Assert
			nullOps.forEach(op => {
				expect(FilterOperator.All).toContain(op);
			});
		});
	});

	describe('forFieldType() - Operator lookup by field type', () => {
		it('should return text operators for text field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('text');

			// Assert
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.Contains);
			expect(operators).toContain(FilterOperator.StartsWith);
			expect(operators).toContain(FilterOperator.EndsWith);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.GreaterThan);
			expect(operators).not.toContain(FilterOperator.LessThan);
		});

		it('should return enum operators for enum field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('enum');

			// Assert
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.GreaterThan);
		});

		it('should return numeric operators for number field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('number');

			// Assert
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.GreaterThan);
			expect(operators).toContain(FilterOperator.LessThan);
			expect(operators).toContain(FilterOperator.GreaterThanOrEqual);
			expect(operators).toContain(FilterOperator.LessThanOrEqual);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.Contains);
		});

		it('should return date operators for date field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('date');

			// Assert
			expect(operators).toContain(FilterOperator.GreaterThan);
			expect(operators).toContain(FilterOperator.LessThan);
			expect(operators).toContain(FilterOperator.GreaterThanOrEqual);
			expect(operators).toContain(FilterOperator.LessThanOrEqual);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.Equals);
		});

		it('should return boolean operators for boolean field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('boolean');

			// Assert
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.GreaterThan);
		});

		it('should return guid operators for guid field type', () => {
			// Arrange & Act
			const operators = FilterOperator.forFieldType('guid');

			// Assert
			expect(operators).toContain(FilterOperator.Equals);
			expect(operators).toContain(FilterOperator.NotEquals);
			expect(operators).toContain(FilterOperator.IsNull);
			expect(operators).toContain(FilterOperator.IsNotNull);
			expect(operators).not.toContain(FilterOperator.Contains);
			expect(operators).not.toContain(FilterOperator.GreaterThan);
		});
	});

	describe('fromDisplayName() - Operator lookup by display name', () => {
		test.each([
			['Equals', FilterOperator.Equals],
			['Contains', FilterOperator.Contains],
			['Starts With', FilterOperator.StartsWith],
			['Ends With', FilterOperator.EndsWith],
			['Not Equals', FilterOperator.NotEquals],
			['Greater Than', FilterOperator.GreaterThan],
			['Is Null', FilterOperator.IsNull]
		])('should find operator by display name "%s"', (displayName, expectedOperator) => {
			const operator = FilterOperator.fromDisplayName(displayName);
			expect(operator).toBe(expectedOperator);
		});

		test.each([
			['UnknownOperator', undefined],
			['equals', undefined],
			['', undefined]
		])('should return undefined for invalid display name "%s"', (displayName, expected) => {
			const operator = FilterOperator.fromDisplayName(displayName);
			expect(operator).toBe(expected);
		});
	});

	describe('fromODataOperator() - Operator lookup by OData string', () => {
		test.each([
			['eq', FilterOperator.Equals],
			['contains', FilterOperator.Contains],
			['startswith', FilterOperator.StartsWith],
			['endswith', FilterOperator.EndsWith],
			['ne', FilterOperator.NotEquals],
			['gt', FilterOperator.GreaterThan],
			['lt', FilterOperator.LessThan],
			['ge', FilterOperator.GreaterThanOrEqual],
			['le', FilterOperator.LessThanOrEqual],
			['null', FilterOperator.IsNull],
			['notnull', FilterOperator.IsNotNull]
		])('should find operator by OData operator "%s"', (odataOp, expectedOperator) => {
			const operator = FilterOperator.fromODataOperator(odataOp);
			expect(operator).toBe(expectedOperator);
		});

		test.each([
			['unknown', undefined],
			['EQ', undefined],
			['', undefined]
		])('should return undefined for invalid OData operator "%s"', (odataOp, expected) => {
			const operator = FilterOperator.fromODataOperator(odataOp);
			expect(operator).toBe(expected);
		});
	});

	describe('equals() - Value object equality', () => {
		test.each([
			[FilterOperator.Equals, FilterOperator.Equals, true],
			[FilterOperator.fromODataOperator('eq')!, FilterOperator.Equals, true],
			[FilterOperator.Equals, FilterOperator.Contains, false],
			[FilterOperator.Contains, FilterOperator.fromDisplayName('Contains')!, true],
			[FilterOperator.GreaterThan, FilterOperator.LessThan, false],
			[FilterOperator.IsNull, FilterOperator.fromODataOperator('null')!, true]
		])('should return correct equality result', (op1, op2, expected) => {
			expect(op1.equals(op2)).toBe(expected);
		});

		it('should return false when comparing with null', () => {
			const op = FilterOperator.Equals;
			expect(op.equals(null)).toBe(false);
		});
	});

	describe('Value object properties', () => {
		test.each([
			['displayName', 'Equals'],
			['odataOperator', 'eq']
		])('should have immutable %s property', (property, expectedValue) => {
			const op = FilterOperator.Equals;
			const originalValue = op[property as keyof typeof op];
			expect(op[property as keyof typeof op]).toBe(originalValue);
			expect(op[property as keyof typeof op]).toBe(expectedValue);
		});

		it('should have immutable applicableTypes property that does not change', () => {
			const op = FilterOperator.Equals;
			const originalTypes = op.applicableTypes;
			expect(op.applicableTypes).toBe(originalTypes);
			expect(op.applicableTypes).toHaveLength(5);
		});
	});

	describe('Edge cases', () => {
		test.each([
			['displayName', ' Equals '],
			['odataOperator', ' eq ']
		])('should handle whitespace in %s lookup', (lookupType, value) => {
			const operator = lookupType === 'displayName'
				? FilterOperator.fromDisplayName(value)
				: FilterOperator.fromODataOperator(value);
			expect(operator).toBeUndefined();
		});

		test.each([
			['OData operators', (op: typeof FilterOperator.Equals) => op.odataOperator],
			['display names', (op: typeof FilterOperator.Equals) => op.displayName]
		])('should have unique %s across all operators', (description, mapper) => {
			const operators = FilterOperator.All;
			const values = operators.map(mapper);
			expect(new Set(values).size).toBe(values.length);
		});

		it('should return consistent singleton instances for static operators', () => {
			const equals1 = FilterOperator.Equals;
			const equals2 = FilterOperator.Equals;
			expect(equals1).toBe(equals2);
		});
	});
});
