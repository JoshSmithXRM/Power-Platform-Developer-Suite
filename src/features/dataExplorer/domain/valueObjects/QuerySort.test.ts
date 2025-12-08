import { QuerySort } from './QuerySort';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('QuerySort', () => {
	describe('constructor', () => {
		it('should create ascending sort', () => {
			const sort = new QuerySort('createdon', false);
			expect(sort.attribute).toBe('createdon');
			expect(sort.descending).toBe(false);
		});

		it('should create descending sort', () => {
			const sort = new QuerySort('createdon', true);
			expect(sort.attribute).toBe('createdon');
			expect(sort.descending).toBe(true);
		});

		it('should trim attribute name', () => {
			const sort = new QuerySort('  createdon  ', false);
			expect(sort.attribute).toBe('createdon');
		});

		it('should throw for empty attribute', () => {
			expect(() => new QuerySort('', false)).toThrow(ValidationError);
		});

		it('should throw for whitespace-only attribute', () => {
			expect(() => new QuerySort('   ', true)).toThrow(ValidationError);
		});
	});

	describe('isAscending and isDescending', () => {
		it('should correctly identify ascending', () => {
			const sort = new QuerySort('field', false);
			expect(sort.isAscending()).toBe(true);
			expect(sort.isDescending()).toBe(false);
		});

		it('should correctly identify descending', () => {
			const sort = new QuerySort('field', true);
			expect(sort.isAscending()).toBe(false);
			expect(sort.isDescending()).toBe(true);
		});
	});

	describe('reversed', () => {
		it('should reverse ascending to descending', () => {
			const sort = new QuerySort('field', false);
			const reversed = sort.reversed();
			expect(reversed.descending).toBe(true);
			expect(reversed.attribute).toBe('field');
		});

		it('should reverse descending to ascending', () => {
			const sort = new QuerySort('field', true);
			const reversed = sort.reversed();
			expect(reversed.descending).toBe(false);
		});

		it('should not modify original', () => {
			const sort = new QuerySort('field', false);
			sort.reversed();
			expect(sort.descending).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for identical sorts', () => {
			const sort1 = new QuerySort('createdon', false);
			const sort2 = new QuerySort('createdon', false);
			expect(sort1.equals(sort2)).toBe(true);
		});

		it('should return false for different attributes', () => {
			const sort1 = new QuerySort('createdon', false);
			const sort2 = new QuerySort('modifiedon', false);
			expect(sort1.equals(sort2)).toBe(false);
		});

		it('should return false for different directions', () => {
			const sort1 = new QuerySort('createdon', false);
			const sort2 = new QuerySort('createdon', true);
			expect(sort1.equals(sort2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should format ascending sort', () => {
			const sort = new QuerySort('createdon', false);
			expect(sort.toString()).toBe('createdon ASC');
		});

		it('should format descending sort', () => {
			const sort = new QuerySort('createdon', true);
			expect(sort.toString()).toBe('createdon DESC');
		});
	});
});
