import { VisualQuery } from './VisualQuery';
import { QueryColumn } from './QueryColumn';
import { QueryCondition } from './QueryCondition';
import { QueryFilterGroup } from './QueryFilterGroup';
import { QuerySort } from './QuerySort';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('VisualQuery', () => {
	const col1 = new QueryColumn('fullname');
	const col2 = new QueryColumn('emailaddress1', 'email');
	const cond1 = new QueryCondition('statecode', 'eq', '0');
	const sort1 = new QuerySort('createdon', true);

	describe('constructor', () => {
		it('should create minimal query with entity name only', () => {
			const query = new VisualQuery('contact');
			expect(query.entityName).toBe('contact');
			expect(query.columns.kind).toBe('all');
			expect(query.filter).toBeNull();
			expect(query.sorts).toHaveLength(0);
			expect(query.top).toBeNull();
			expect(query.distinct).toBe(false);
		});

		it('should create query with all options', () => {
			const filter = new QueryFilterGroup('and', [cond1]);
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1, col2] },
				filter,
				[sort1],
				100,
				true
			);
			expect(query.entityName).toBe('contact');
			expect(query.columns.kind).toBe('specific');
			expect(query.filter).toBe(filter);
			expect(query.sorts).toHaveLength(1);
			expect(query.top).toBe(100);
			expect(query.distinct).toBe(true);
		});

		it('should trim entity name', () => {
			const query = new VisualQuery('  contact  ');
			expect(query.entityName).toBe('contact');
		});

		it('should throw for empty entity name', () => {
			expect(() => new VisualQuery('')).toThrow(ValidationError);
		});

		it('should throw for whitespace-only entity name', () => {
			expect(() => new VisualQuery('   ')).toThrow(ValidationError);
		});

		it('should treat zero or negative top as null', () => {
			expect(new VisualQuery('contact', { kind: 'all' }, null, [], 0).top).toBeNull();
			expect(new VisualQuery('contact', { kind: 'all' }, null, [], -1).top).toBeNull();
		});
	});

	describe('withColumns', () => {
		it('should set specific columns', () => {
			const query = new VisualQuery('contact').withColumns({
				kind: 'specific',
				columns: [col1],
			});
			expect(query.columns.kind).toBe('specific');
			expect(query.isSelectAll()).toBe(false);
		});

		it('should not modify original', () => {
			const query = new VisualQuery('contact');
			query.withColumns({ kind: 'specific', columns: [col1] });
			expect(query.isSelectAll()).toBe(true);
		});
	});

	describe('withAllColumns', () => {
		it('should set to all columns', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1] }
			).withAllColumns();
			expect(query.isSelectAll()).toBe(true);
		});
	});

	describe('withSpecificColumns', () => {
		it('should set specific columns', () => {
			const query = new VisualQuery('contact').withSpecificColumns([col1, col2]);
			expect(query.columns.kind).toBe('specific');
			if (query.columns.kind === 'specific') {
				expect(query.columns.columns).toHaveLength(2);
			}
		});
	});

	describe('withAddedColumn', () => {
		it('should switch from all to specific with new column', () => {
			const query = new VisualQuery('contact').withAddedColumn(col1);
			expect(query.columns.kind).toBe('specific');
			if (query.columns.kind === 'specific') {
				expect(query.columns.columns).toHaveLength(1);
			}
		});

		it('should add column to existing specific columns', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1] }
			).withAddedColumn(col2);
			if (query.columns.kind === 'specific') {
				expect(query.columns.columns).toHaveLength(2);
			}
		});
	});

	describe('withFilter', () => {
		it('should set filter', () => {
			const filter = new QueryFilterGroup('and', [cond1]);
			const query = new VisualQuery('contact').withFilter(filter);
			expect(query.filter).toBe(filter);
			expect(query.hasFilter()).toBe(true);
		});

		it('should clear filter with null', () => {
			const filter = new QueryFilterGroup('and', [cond1]);
			const query = new VisualQuery('contact')
				.withFilter(filter)
				.withFilter(null);
			expect(query.filter).toBeNull();
			expect(query.hasFilter()).toBe(false);
		});
	});

	describe('withSorts', () => {
		it('should set sorts', () => {
			const query = new VisualQuery('contact').withSorts([sort1]);
			expect(query.sorts).toHaveLength(1);
			expect(query.hasSorting()).toBe(true);
		});
	});

	describe('withAddedSort', () => {
		it('should add sort', () => {
			const sort2 = new QuerySort('fullname', false);
			const query = new VisualQuery('contact')
				.withSorts([sort1])
				.withAddedSort(sort2);
			expect(query.sorts).toHaveLength(2);
		});
	});

	describe('withTop', () => {
		it('should set top', () => {
			const query = new VisualQuery('contact').withTop(50);
			expect(query.top).toBe(50);
			expect(query.hasTop()).toBe(true);
		});

		it('should clear top with null', () => {
			const query = new VisualQuery('contact').withTop(50).withTop(null);
			expect(query.top).toBeNull();
			expect(query.hasTop()).toBe(false);
		});

		it('should treat zero as null', () => {
			const query = new VisualQuery('contact').withTop(0);
			expect(query.top).toBeNull();
		});
	});

	describe('withDistinct', () => {
		it('should set distinct', () => {
			const query = new VisualQuery('contact').withDistinct(true);
			expect(query.distinct).toBe(true);
		});
	});

	describe('withEntity', () => {
		it('should change entity and clear columns/filter', () => {
			const filter = new QueryFilterGroup('and', [cond1]);
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1] },
				filter,
				[sort1]
			).withEntity('account');
			expect(query.entityName).toBe('account');
			expect(query.isSelectAll()).toBe(true);
			expect(query.filter).toBeNull();
			expect(query.sorts).toHaveLength(0);
		});

		it('should preserve top and distinct', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'all' },
				null,
				[],
				100,
				true
			).withEntity('account');
			expect(query.top).toBe(100);
			expect(query.distinct).toBe(true);
		});

		it('should throw for empty entity name', () => {
			const query = new VisualQuery('contact');
			expect(() => query.withEntity('')).toThrow(ValidationError);
		});
	});

	describe('isSelectAll', () => {
		it('should return true for all columns', () => {
			const query = new VisualQuery('contact');
			expect(query.isSelectAll()).toBe(true);
		});

		it('should return false for specific columns', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1] }
			);
			expect(query.isSelectAll()).toBe(false);
		});
	});

	describe('hasFilter', () => {
		it('should return false for null filter', () => {
			const query = new VisualQuery('contact');
			expect(query.hasFilter()).toBe(false);
		});

		it('should return false for empty filter', () => {
			const query = new VisualQuery('contact').withFilter(new QueryFilterGroup('and', []));
			expect(query.hasFilter()).toBe(false);
		});

		it('should return true for non-empty filter', () => {
			const query = new VisualQuery('contact').withFilter(new QueryFilterGroup('and', [cond1]));
			expect(query.hasFilter()).toBe(true);
		});
	});

	describe('getColumnNames', () => {
		it('should return empty array for SELECT *', () => {
			const query = new VisualQuery('contact');
			expect(query.getColumnNames()).toEqual([]);
		});

		it('should return column names for specific columns', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1, col2] }
			);
			expect(query.getColumnNames()).toEqual(['fullname', 'emailaddress1']);
		});
	});

	describe('getColumnCount', () => {
		it('should return 0 for SELECT *', () => {
			const query = new VisualQuery('contact');
			expect(query.getColumnCount()).toBe(0);
		});

		it('should return count for specific columns', () => {
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1, col2] }
			);
			expect(query.getColumnCount()).toBe(2);
		});
	});

	describe('getConditionCount', () => {
		it('should return 0 for no filter', () => {
			const query = new VisualQuery('contact');
			expect(query.getConditionCount()).toBe(0);
		});

		it('should return count including nested', () => {
			const cond2 = new QueryCondition('emailaddress1', 'null', null);
			const nested = new QueryFilterGroup('or', [cond2]);
			const filter = new QueryFilterGroup('and', [cond1], [nested]);
			const query = new VisualQuery('contact').withFilter(filter);
			expect(query.getConditionCount()).toBe(2);
		});
	});

	describe('toString', () => {
		it('should format SELECT * query', () => {
			const query = new VisualQuery('contact');
			expect(query.toString()).toBe('SELECT * FROM contact');
		});

		it('should format query with all options', () => {
			const filter = new QueryFilterGroup('and', [cond1]);
			const query = new VisualQuery(
				'contact',
				{ kind: 'specific', columns: [col1] },
				filter,
				[sort1],
				100,
				true
			);
			const str = query.toString();
			expect(str).toContain('SELECT');
			expect(str).toContain('DISTINCT');
			expect(str).toContain('TOP 100');
			expect(str).toContain('fullname');
			expect(str).toContain('FROM contact');
			expect(str).toContain('WHERE');
			expect(str).toContain('ORDER BY');
		});
	});
});
