import { QueryColumn } from './QueryColumn';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('QueryColumn', () => {
	describe('constructor', () => {
		it('should create a column with name only', () => {
			const column = new QueryColumn('fullname');
			expect(column.name).toBe('fullname');
			expect(column.alias).toBeNull();
			expect(column.width).toBeNull();
		});

		it('should create a column with name and alias', () => {
			const column = new QueryColumn('fullname', 'name');
			expect(column.name).toBe('fullname');
			expect(column.alias).toBe('name');
			expect(column.width).toBeNull();
		});

		it('should create a column with all properties', () => {
			const column = new QueryColumn('fullname', 'name', 150);
			expect(column.name).toBe('fullname');
			expect(column.alias).toBe('name');
			expect(column.width).toBe(150);
		});

		it('should trim name', () => {
			const column = new QueryColumn('  fullname  ');
			expect(column.name).toBe('fullname');
		});

		it('should trim alias', () => {
			const column = new QueryColumn('fullname', '  name  ');
			expect(column.alias).toBe('name');
		});

		it('should throw for empty name', () => {
			expect(() => new QueryColumn('')).toThrow(ValidationError);
		});

		it('should throw for whitespace-only name', () => {
			expect(() => new QueryColumn('   ')).toThrow(ValidationError);
		});

		it('should treat empty alias as null', () => {
			const column = new QueryColumn('fullname', '');
			expect(column.alias).toBeNull();
		});

		it('should treat zero or negative width as null', () => {
			expect(new QueryColumn('fullname', null, 0).width).toBeNull();
			expect(new QueryColumn('fullname', null, -1).width).toBeNull();
		});

		it('should accept positive width', () => {
			const column = new QueryColumn('fullname', null, 100);
			expect(column.width).toBe(100);
		});
	});

	describe('withAlias', () => {
		it('should create copy with new alias', () => {
			const column = new QueryColumn('fullname');
			const withAlias = column.withAlias('name');
			expect(withAlias.alias).toBe('name');
			expect(withAlias.name).toBe('fullname');
		});

		it('should create copy without alias', () => {
			const column = new QueryColumn('fullname', 'name');
			const withoutAlias = column.withAlias(null);
			expect(withoutAlias.alias).toBeNull();
		});

		it('should not modify original', () => {
			const column = new QueryColumn('fullname');
			column.withAlias('name');
			expect(column.alias).toBeNull();
		});
	});

	describe('withWidth', () => {
		it('should create copy with new width', () => {
			const column = new QueryColumn('fullname');
			const withWidth = column.withWidth(200);
			expect(withWidth.width).toBe(200);
		});

		it('should create copy without width', () => {
			const column = new QueryColumn('fullname', null, 100);
			const withoutWidth = column.withWidth(null);
			expect(withoutWidth.width).toBeNull();
		});
	});

	describe('hasAlias', () => {
		it('should return true when alias exists', () => {
			const column = new QueryColumn('fullname', 'name');
			expect(column.hasAlias()).toBe(true);
		});

		it('should return false when alias is null', () => {
			const column = new QueryColumn('fullname');
			expect(column.hasAlias()).toBe(false);
		});
	});

	describe('getEffectiveName', () => {
		it('should return alias when present', () => {
			const column = new QueryColumn('fullname', 'name');
			expect(column.getEffectiveName()).toBe('name');
		});

		it('should return name when no alias', () => {
			const column = new QueryColumn('fullname');
			expect(column.getEffectiveName()).toBe('fullname');
		});
	});

	describe('equals', () => {
		it('should return true for identical columns', () => {
			const col1 = new QueryColumn('fullname', 'name', 100);
			const col2 = new QueryColumn('fullname', 'name', 100);
			expect(col1.equals(col2)).toBe(true);
		});

		it('should return false for different names', () => {
			const col1 = new QueryColumn('fullname');
			const col2 = new QueryColumn('emailaddress1');
			expect(col1.equals(col2)).toBe(false);
		});

		it('should return false for different aliases', () => {
			const col1 = new QueryColumn('fullname', 'name');
			const col2 = new QueryColumn('fullname', 'othername');
			expect(col1.equals(col2)).toBe(false);
		});

		it('should return false for different widths', () => {
			const col1 = new QueryColumn('fullname', null, 100);
			const col2 = new QueryColumn('fullname', null, 200);
			expect(col1.equals(col2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return name only when no alias', () => {
			const column = new QueryColumn('fullname');
			expect(column.toString()).toBe('fullname');
		});

		it('should return name AS alias when alias present', () => {
			const column = new QueryColumn('fullname', 'name');
			expect(column.toString()).toBe('fullname AS name');
		});
	});
});
