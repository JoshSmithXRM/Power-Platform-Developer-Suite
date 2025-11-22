/**
 * Tests for FilterOperator value object
 * Tests all operator definitions, lookups, and equality checks
 */
import { FilterOperator } from './FilterOperator';

describe('FilterOperator', () => {
	describe('Operator Definitions', () => {
		it('should define Equals operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.Equals;

			// Assert
			expect(op.displayName).toBe('Equals');
			expect(op.odataOperator).toBe('eq');
			expect(op.applicableTypes).toContain('text');
			expect(op.applicableTypes).toContain('enum');
			expect(op.applicableTypes).toContain('number');
			expect(op.applicableTypes).toContain('boolean');
			expect(op.applicableTypes).toContain('guid');
		});

		it('should define Contains operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.Contains;

			// Assert
			expect(op.displayName).toBe('Contains');
			expect(op.odataOperator).toBe('contains');
			expect(op.applicableTypes).toEqual(['text']);
		});

		it('should define StartsWith operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.StartsWith;

			// Assert
			expect(op.displayName).toBe('Starts With');
			expect(op.odataOperator).toBe('startswith');
			expect(op.applicableTypes).toEqual(['text']);
		});

		it('should define EndsWith operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.EndsWith;

			// Assert
			expect(op.displayName).toBe('Ends With');
			expect(op.odataOperator).toBe('endswith');
			expect(op.applicableTypes).toEqual(['text']);
		});

		it('should define NotEquals operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.NotEquals;

			// Assert
			expect(op.displayName).toBe('Not Equals');
			expect(op.odataOperator).toBe('ne');
			expect(op.applicableTypes).toContain('text');
			expect(op.applicableTypes).toContain('enum');
			expect(op.applicableTypes).toContain('number');
			expect(op.applicableTypes).toContain('boolean');
			expect(op.applicableTypes).toContain('guid');
		});

		it('should define GreaterThan operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.GreaterThan;

			// Assert
			expect(op.displayName).toBe('Greater Than');
			expect(op.odataOperator).toBe('gt');
			expect(op.applicableTypes).toEqual(['number', 'date']);
		});

		it('should define LessThan operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.LessThan;

			// Assert
			expect(op.displayName).toBe('Less Than');
			expect(op.odataOperator).toBe('lt');
			expect(op.applicableTypes).toEqual(['number', 'date']);
		});

		it('should define GreaterThanOrEqual operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.GreaterThanOrEqual;

			// Assert
			expect(op.displayName).toBe('Greater Than or Equal');
			expect(op.odataOperator).toBe('ge');
			expect(op.applicableTypes).toEqual(['number', 'date']);
		});

		it('should define LessThanOrEqual operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.LessThanOrEqual;

			// Assert
			expect(op.displayName).toBe('Less Than or Equal');
			expect(op.odataOperator).toBe('le');
			expect(op.applicableTypes).toEqual(['number', 'date']);
		});

		it('should define IsNull operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.IsNull;

			// Assert
			expect(op.displayName).toBe('Is Null');
			expect(op.odataOperator).toBe('null');
			expect(op.applicableTypes).toEqual(['text', 'enum', 'date', 'number', 'boolean', 'guid']);
		});

		it('should define IsNotNull operator with correct properties', () => {
			// Arrange & Act
			const op = FilterOperator.IsNotNull;

			// Assert
			expect(op.displayName).toBe('Is Not Null');
			expect(op.odataOperator).toBe('notnull');
			expect(op.applicableTypes).toEqual(['text', 'enum', 'date', 'number', 'boolean', 'guid']);
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
		it('should find Equals operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Equals');

			// Assert
			expect(operator).toBe(FilterOperator.Equals);
		});

		it('should find Contains operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Contains');

			// Assert
			expect(operator).toBe(FilterOperator.Contains);
		});

		it('should find StartsWith operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Starts With');

			// Assert
			expect(operator).toBe(FilterOperator.StartsWith);
		});

		it('should find EndsWith operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Ends With');

			// Assert
			expect(operator).toBe(FilterOperator.EndsWith);
		});

		it('should find NotEquals operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Not Equals');

			// Assert
			expect(operator).toBe(FilterOperator.NotEquals);
		});

		it('should find GreaterThan operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Greater Than');

			// Assert
			expect(operator).toBe(FilterOperator.GreaterThan);
		});

		it('should find IsNull operator by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('Is Null');

			// Assert
			expect(operator).toBe(FilterOperator.IsNull);
		});

		it('should return undefined for unknown display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('UnknownOperator');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should be case-sensitive when finding by display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('equals');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should return undefined for empty display name', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName('');

			// Assert
			expect(operator).toBeUndefined();
		});
	});

	describe('fromODataOperator() - Operator lookup by OData string', () => {
		it('should find Equals operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('eq');

			// Assert
			expect(operator).toBe(FilterOperator.Equals);
		});

		it('should find Contains operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('contains');

			// Assert
			expect(operator).toBe(FilterOperator.Contains);
		});

		it('should find StartsWith operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('startswith');

			// Assert
			expect(operator).toBe(FilterOperator.StartsWith);
		});

		it('should find EndsWith operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('endswith');

			// Assert
			expect(operator).toBe(FilterOperator.EndsWith);
		});

		it('should find NotEquals operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('ne');

			// Assert
			expect(operator).toBe(FilterOperator.NotEquals);
		});

		it('should find GreaterThan operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('gt');

			// Assert
			expect(operator).toBe(FilterOperator.GreaterThan);
		});

		it('should find LessThan operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('lt');

			// Assert
			expect(operator).toBe(FilterOperator.LessThan);
		});

		it('should find GreaterThanOrEqual operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('ge');

			// Assert
			expect(operator).toBe(FilterOperator.GreaterThanOrEqual);
		});

		it('should find LessThanOrEqual operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('le');

			// Assert
			expect(operator).toBe(FilterOperator.LessThanOrEqual);
		});

		it('should find IsNull operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('null');

			// Assert
			expect(operator).toBe(FilterOperator.IsNull);
		});

		it('should find IsNotNull operator by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('notnull');

			// Assert
			expect(operator).toBe(FilterOperator.IsNotNull);
		});

		it('should return undefined for unknown OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('unknown');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should be case-sensitive when finding by OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('EQ');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should return undefined for empty OData operator', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator('');

			// Assert
			expect(operator).toBeUndefined();
		});
	});

	describe('equals() - Value object equality', () => {
		it('should return true when comparing same operator instances', () => {
			// Arrange
			const op1 = FilterOperator.Equals;
			const op2 = FilterOperator.Equals;

			// Act & Assert
			expect(op1.equals(op2)).toBe(true);
		});

		it('should return true when comparing operators with same OData value', () => {
			// Arrange
			const op1 = FilterOperator.fromODataOperator('eq');
			const op2 = FilterOperator.Equals;

			// Act & Assert
			expect(op1?.equals(op2)).toBe(true);
		});

		it('should return false when comparing different operators', () => {
			// Arrange
			const op1 = FilterOperator.Equals;
			const op2 = FilterOperator.Contains;

			// Act & Assert
			expect(op1.equals(op2)).toBe(false);
		});

		it('should return false when comparing with null', () => {
			// Arrange
			const op = FilterOperator.Equals;

			// Act & Assert
			expect(op.equals(null)).toBe(false);
		});

		it('should return true for Contains vs Contains', () => {
			// Arrange
			const op1 = FilterOperator.Contains;
			const op2 = FilterOperator.fromDisplayName('Contains');

			// Act & Assert
			expect(op1.equals(op2!)).toBe(true);
		});

		it('should return false for GreaterThan vs LessThan', () => {
			// Arrange
			const op1 = FilterOperator.GreaterThan;
			const op2 = FilterOperator.LessThan;

			// Act & Assert
			expect(op1.equals(op2)).toBe(false);
		});

		it('should return true for IsNull vs IsNull', () => {
			// Arrange
			const op1 = FilterOperator.IsNull;
			const op2 = FilterOperator.fromODataOperator('null');

			// Act & Assert
			expect(op1.equals(op2!)).toBe(true);
		});
	});

	describe('Value object properties', () => {
		it('should have immutable displayName property that does not change', () => {
			// Arrange
			const op = FilterOperator.Equals;
			const originalName = op.displayName;

			// Act & Assert
			expect(op.displayName).toBe(originalName);
			expect(op.displayName).toBe('Equals');
		});

		it('should have immutable odataOperator property that does not change', () => {
			// Arrange
			const op = FilterOperator.Equals;
			const originalOperator = op.odataOperator;

			// Act & Assert
			expect(op.odataOperator).toBe(originalOperator);
			expect(op.odataOperator).toBe('eq');
		});

		it('should have immutable applicableTypes property that does not change', () => {
			// Arrange
			const op = FilterOperator.Equals;
			const originalTypes = op.applicableTypes;

			// Act & Assert
			expect(op.applicableTypes).toBe(originalTypes);
			expect(op.applicableTypes).toHaveLength(5);
		});
	});

	describe('Edge cases', () => {
		it('should handle whitespace in display name lookup', () => {
			// Arrange & Act
			const operator = FilterOperator.fromDisplayName(' Equals ');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should handle whitespace in OData operator lookup', () => {
			// Arrange & Act
			const operator = FilterOperator.fromODataOperator(' eq ');

			// Assert
			expect(operator).toBeUndefined();
		});

		it('should have unique OData operators across all operators', () => {
			// Arrange
			const operators = FilterOperator.All;
			const odataOps = operators.map(op => op.odataOperator);

			// Act & Assert
			expect(new Set(odataOps).size).toBe(odataOps.length);
		});

		it('should have unique display names across all operators', () => {
			// Arrange
			const operators = FilterOperator.All;
			const displayNames = operators.map(op => op.displayName);

			// Act & Assert
			expect(new Set(displayNames).size).toBe(displayNames.length);
		});

		it('should return consistent singleton instances for static operators', () => {
			// Arrange & Act
			const equals1 = FilterOperator.Equals;
			const equals2 = FilterOperator.Equals;

			// Assert
			expect(equals1).toBe(equals2);
		});
	});
});
