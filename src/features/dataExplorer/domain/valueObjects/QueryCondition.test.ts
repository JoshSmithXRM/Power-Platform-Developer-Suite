import { QueryCondition } from './QueryCondition';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('QueryCondition', () => {
	describe('constructor', () => {
		it('should create comparison condition with single value', () => {
			const condition = new QueryCondition('statecode', 'eq', '0');
			expect(condition.attribute).toBe('statecode');
			expect(condition.operator).toBe('eq');
			expect(condition.value).toBe('0');
		});

		it('should create null condition with null value', () => {
			const condition = new QueryCondition('emailaddress1', 'null', null);
			expect(condition.attribute).toBe('emailaddress1');
			expect(condition.operator).toBe('null');
			expect(condition.value).toBeNull();
		});

		it('should create IN condition with array value', () => {
			const condition = new QueryCondition('statecode', 'in', ['0', '1', '2']);
			expect(condition.attribute).toBe('statecode');
			expect(condition.operator).toBe('in');
			expect(condition.value).toEqual(['0', '1', '2']);
		});

		it('should trim attribute name', () => {
			const condition = new QueryCondition('  statecode  ', 'eq', '0');
			expect(condition.attribute).toBe('statecode');
		});

		it('should throw for empty attribute', () => {
			expect(() => new QueryCondition('', 'eq', '0')).toThrow(ValidationError);
		});

		it('should throw for invalid operator', () => {
			// @ts-expect-error - testing invalid operator
			expect(() => new QueryCondition('statecode', 'invalid', '0')).toThrow(ValidationError);
		});

		it('should throw when null operator has value', () => {
			expect(() => new QueryCondition('field', 'null', 'value')).toThrow(ValidationError);
		});

		it('should throw when comparison operator has null value', () => {
			expect(() => new QueryCondition('field', 'eq', null)).toThrow(ValidationError);
		});

		it('should throw when IN operator has non-array value', () => {
			expect(() => new QueryCondition('field', 'in', 'value')).toThrow(ValidationError);
		});

		it('should throw when IN operator has empty array', () => {
			expect(() => new QueryCondition('field', 'in', [])).toThrow(ValidationError);
		});

		it('should throw when comparison operator has array value', () => {
			expect(() => new QueryCondition('field', 'eq', ['1', '2'])).toThrow(ValidationError);
		});
	});

	describe('operators', () => {
		it('should create eq condition', () => {
			const condition = new QueryCondition('statecode', 'eq', '0');
			expect(condition.operator).toBe('eq');
			expect(condition.value).toBe('0');
		});

		it('should create ne condition', () => {
			const condition = new QueryCondition('statecode', 'ne', '1');
			expect(condition.operator).toBe('ne');
		});

		it('should create lt condition', () => {
			const condition = new QueryCondition('revenue', 'lt', '1000');
			expect(condition.operator).toBe('lt');
		});

		it('should create null condition', () => {
			const condition = new QueryCondition('emailaddress1', 'null', null);
			expect(condition.operator).toBe('null');
			expect(condition.value).toBeNull();
		});

		it('should create not-null condition', () => {
			const condition = new QueryCondition('emailaddress1', 'not-null', null);
			expect(condition.operator).toBe('not-null');
			expect(condition.value).toBeNull();
		});

		it('should create IN condition', () => {
			const condition = new QueryCondition('statecode', 'in', ['0', '1']);
			expect(condition.operator).toBe('in');
			expect(condition.value).toEqual(['0', '1']);
		});

		it('should create NOT IN condition', () => {
			const condition = new QueryCondition('statecode', 'not-in', ['2', '3']);
			expect(condition.operator).toBe('not-in');
			expect(condition.value).toEqual(['2', '3']);
		});

		it('should create LIKE condition', () => {
			const condition = new QueryCondition('fullname', 'like', '%Smith%');
			expect(condition.operator).toBe('like');
			expect(condition.value).toBe('%Smith%');
		});

		it('should create begins-with condition', () => {
			const condition = new QueryCondition('fullname', 'begins-with', 'John');
			expect(condition.operator).toBe('begins-with');
			expect(condition.value).toBe('John');
		});
	});

	describe('requiresValue', () => {
		it('should return true for comparison operators', () => {
			const condition = new QueryCondition('field', 'eq', 'value');
			expect(condition.requiresValue()).toBe(true);
		});

		it('should return false for null operators', () => {
			const condition = new QueryCondition('field', 'null', null);
			expect(condition.requiresValue()).toBe(false);
		});
	});

	describe('hasMultipleValues', () => {
		it('should return true for IN condition', () => {
			const condition = new QueryCondition('field', 'in', ['1', '2']);
			expect(condition.hasMultipleValues()).toBe(true);
		});

		it('should return false for single value condition', () => {
			const condition = new QueryCondition('field', 'eq', 'value');
			expect(condition.hasMultipleValues()).toBe(false);
		});
	});

	describe('getSingleValue', () => {
		it('should return value for single value condition', () => {
			const condition = new QueryCondition('field', 'eq', 'value');
			expect(condition.getSingleValue()).toBe('value');
		});

		it('should return null for null condition', () => {
			const condition = new QueryCondition('field', 'null', null);
			expect(condition.getSingleValue()).toBeNull();
		});

		it('should throw for array value condition', () => {
			const condition = new QueryCondition('field', 'in', ['1', '2']);
			expect(() => condition.getSingleValue()).toThrow(ValidationError);
		});
	});

	describe('getValues', () => {
		it('should return array for IN condition', () => {
			const condition = new QueryCondition('field', 'in', ['1', '2']);
			expect(condition.getValues()).toEqual(['1', '2']);
		});

		it('should return single-element array for single value', () => {
			const condition = new QueryCondition('field', 'eq', 'value');
			expect(condition.getValues()).toEqual(['value']);
		});

		it('should return empty array for null condition', () => {
			const condition = new QueryCondition('field', 'null', null);
			expect(condition.getValues()).toEqual([]);
		});
	});

	describe('equals', () => {
		it('should return true for identical conditions', () => {
			const cond1 = new QueryCondition('field', 'eq', 'value');
			const cond2 = new QueryCondition('field', 'eq', 'value');
			expect(cond1.equals(cond2)).toBe(true);
		});

		it('should return false for different attributes', () => {
			const cond1 = new QueryCondition('field1', 'eq', 'value');
			const cond2 = new QueryCondition('field2', 'eq', 'value');
			expect(cond1.equals(cond2)).toBe(false);
		});

		it('should return false for different operators', () => {
			const cond1 = new QueryCondition('field', 'eq', 'value');
			const cond2 = new QueryCondition('field', 'ne', 'value');
			expect(cond1.equals(cond2)).toBe(false);
		});

		it('should return false for different values', () => {
			const cond1 = new QueryCondition('field', 'eq', 'value1');
			const cond2 = new QueryCondition('field', 'eq', 'value2');
			expect(cond1.equals(cond2)).toBe(false);
		});

		it('should return true for identical array values', () => {
			const cond1 = new QueryCondition('field', 'in', ['1', '2']);
			const cond2 = new QueryCondition('field', 'in', ['1', '2']);
			expect(cond1.equals(cond2)).toBe(true);
		});

		it('should return false for different array values', () => {
			const cond1 = new QueryCondition('field', 'in', ['1', '2']);
			const cond2 = new QueryCondition('field', 'in', ['1', '3']);
			expect(cond1.equals(cond2)).toBe(false);
		});

		it('should return true for identical null conditions', () => {
			const cond1 = new QueryCondition('field', 'null', null);
			const cond2 = new QueryCondition('field', 'null', null);
			expect(cond1.equals(cond2)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should format comparison condition', () => {
			const condition = new QueryCondition('statecode', 'eq', '0');
			expect(condition.toString()).toBe("statecode eq '0'");
		});

		it('should format null condition', () => {
			const condition = new QueryCondition('emailaddress1', 'null', null);
			expect(condition.toString()).toBe('emailaddress1 null');
		});

		it('should format IN condition', () => {
			const condition = new QueryCondition('statecode', 'in', ['0', '1']);
			expect(condition.toString()).toBe('statecode in (0, 1)');
		});
	});
});
