import { QueryResult } from './QueryResult';
import { QueryResultColumn } from '../valueObjects/QueryResultColumn';
import { QueryResultRow, QueryCellValue } from '../valueObjects/QueryResultRow';

describe('QueryResult', () => {
	const createColumn = (name: string): QueryResultColumn =>
		new QueryResultColumn(name, name, 'string');

	const createRow = (data: Record<string, QueryCellValue>): QueryResultRow =>
		QueryResultRow.fromRecord(data);

	describe('constructor', () => {
		it('should create result with all properties', () => {
			const columns = [createColumn('name'), createColumn('revenue')];
			const rows = [createRow({ name: 'Test', revenue: 1000 })];

			const result = new QueryResult(
				columns,
				rows,
				100,
				true,
				'cookie123',
				'<fetch><entity name="account"/></fetch>',
				50
			);

			expect(result.columns).toHaveLength(2);
			expect(result.rows).toHaveLength(1);
			expect(result.totalRecordCount).toBe(100);
			expect(result.moreRecords).toBe(true);
			expect(result.pagingCookie).toBe('cookie123');
			expect(result.executedFetchXml).toBe('<fetch><entity name="account"/></fetch>');
			expect(result.executionTimeMs).toBe(50);
		});
	});

	describe('empty', () => {
		it('should create empty result', () => {
			const result = QueryResult.empty('<fetch/>', 10);

			expect(result.columns).toHaveLength(0);
			expect(result.rows).toHaveLength(0);
			expect(result.totalRecordCount).toBe(0);
			expect(result.moreRecords).toBe(false);
			expect(result.pagingCookie).toBeNull();
			expect(result.executedFetchXml).toBe('<fetch/>');
			expect(result.executionTimeMs).toBe(10);
		});

		it('should default executionTimeMs to 0', () => {
			const result = QueryResult.empty('<fetch/>');

			expect(result.executionTimeMs).toBe(0);
		});
	});

	describe('getRowCount', () => {
		it('should return number of rows', () => {
			const result = new QueryResult(
				[createColumn('name')],
				[createRow({ name: 'A' }), createRow({ name: 'B' })],
				null,
				false,
				null,
				'',
				0
			);

			expect(result.getRowCount()).toBe(2);
		});

		it('should return 0 for empty result', () => {
			const result = QueryResult.empty('');

			expect(result.getRowCount()).toBe(0);
		});
	});

	describe('getColumnCount', () => {
		it('should return number of columns', () => {
			const result = new QueryResult(
				[createColumn('name'), createColumn('revenue'), createColumn('status')],
				[],
				null,
				false,
				null,
				'',
				0
			);

			expect(result.getColumnCount()).toBe(3);
		});
	});

	describe('isEmpty', () => {
		it('should return true when no rows', () => {
			const result = QueryResult.empty('');

			expect(result.isEmpty()).toBe(true);
		});

		it('should return false when rows exist', () => {
			const result = new QueryResult(
				[createColumn('name')],
				[createRow({ name: 'Test' })],
				null,
				false,
				null,
				'',
				0
			);

			expect(result.isEmpty()).toBe(false);
		});
	});

	describe('hasMoreRecords', () => {
		it('should return true when more records and paging cookie exist', () => {
			const result = new QueryResult([], [], null, true, 'cookie', '', 0);

			expect(result.hasMoreRecords()).toBe(true);
		});

		it('should return false when moreRecords is false', () => {
			const result = new QueryResult([], [], null, false, 'cookie', '', 0);

			expect(result.hasMoreRecords()).toBe(false);
		});

		it('should return false when paging cookie is null', () => {
			const result = new QueryResult([], [], null, true, null, '', 0);

			expect(result.hasMoreRecords()).toBe(false);
		});
	});

	describe('getColumn', () => {
		it('should return column by logical name', () => {
			const columns = [
				createColumn('name'),
				new QueryResultColumn('revenue', 'Revenue', 'money'),
			];
			const result = new QueryResult(columns, [], null, false, null, '', 0);

			const column = result.getColumn('revenue');

			expect(column).not.toBeNull();
			expect(column?.logicalName).toBe('revenue');
			expect(column?.dataType).toBe('money');
		});

		it('should return null for non-existing column', () => {
			const result = new QueryResult([createColumn('name')], [], null, false, null, '', 0);

			expect(result.getColumn('missing')).toBeNull();
		});
	});

	describe('getRow', () => {
		it('should return row by index', () => {
			const rows = [createRow({ name: 'First' }), createRow({ name: 'Second' })];
			const result = new QueryResult([], rows, null, false, null, '', 0);

			const row = result.getRow(1);

			expect(row).not.toBeNull();
			expect(row?.getValue('name')).toBe('Second');
		});

		it('should return null for out of bounds index', () => {
			const result = new QueryResult([], [createRow({ name: 'Test' })], null, false, null, '', 0);

			expect(result.getRow(5)).toBeNull();
		});

		it('should return null for negative index', () => {
			const result = new QueryResult([], [createRow({ name: 'Test' })], null, false, null, '', 0);

			expect(result.getRow(-1)).toBeNull();
		});
	});

	describe('getCellValue', () => {
		it('should return cell value at row/column intersection', () => {
			const rows = [
				createRow({ name: 'First', revenue: 100 }),
				createRow({ name: 'Second', revenue: 200 }),
			];
			const result = new QueryResult([], rows, null, false, null, '', 0);

			expect(result.getCellValue(0, 'name')).toBe('First');
			expect(result.getCellValue(1, 'revenue')).toBe(200);
		});

		it('should return null for invalid row index', () => {
			const result = new QueryResult([], [createRow({ name: 'Test' })], null, false, null, '', 0);

			expect(result.getCellValue(10, 'name')).toBeNull();
		});

		it('should return null for missing column', () => {
			const result = new QueryResult([], [createRow({ name: 'Test' })], null, false, null, '', 0);

			expect(result.getCellValue(0, 'missing')).toBeNull();
		});
	});

	describe('withFilteredColumns', () => {
		it('should return original result when columnNames is empty', () => {
			const columns = [createColumn('name'), createColumn('revenue')];
			const rows = [createRow({ name: 'Test', revenue: 1000 })];
			const result = new QueryResult(columns, rows, 10, false, null, '<fetch/>', 50);

			const filtered = result.withFilteredColumns([]);

			expect(filtered).toBe(result);
		});

		it('should filter columns to only those specified', () => {
			const columns = [createColumn('name'), createColumn('revenue'), createColumn('status')];
			const rows = [createRow({ name: 'Test', revenue: 1000, status: 'Active' })];
			const result = new QueryResult(columns, rows, 10, false, null, '<fetch/>', 50);

			const filtered = result.withFilteredColumns(['name', 'status']);

			expect(filtered.columns).toHaveLength(2);
			expect(filtered.columns[0]!.logicalName).toBe('name');
			expect(filtered.columns[1]!.logicalName).toBe('status');
			expect(filtered.rows).toBe(rows);
			expect(filtered.executedFetchXml).toBe('<fetch/>');
		});

		it('should filter columns case-insensitively', () => {
			const columns = [createColumn('Name'), createColumn('REVENUE')];
			const rows = [createRow({ Name: 'Test', REVENUE: 1000 })];
			const result = new QueryResult(columns, rows, null, false, null, '', 0);

			const filtered = result.withFilteredColumns(['name', 'revenue']);

			expect(filtered.columns).toHaveLength(2);
		});

		it('should return original result when no columns match', () => {
			const columns = [createColumn('name'), createColumn('revenue')];
			const result = new QueryResult(columns, [], null, false, null, '', 0);

			const filtered = result.withFilteredColumns(['missing', 'nonexistent']);

			expect(filtered).toBe(result);
		});

		it('should preserve other properties', () => {
			const columns = [createColumn('name'), createColumn('revenue')];
			const rows = [createRow({ name: 'Test', revenue: 1000 })];
			const result = new QueryResult(columns, rows, 100, true, 'cookie123', '<fetch/>', 75);

			const filtered = result.withFilteredColumns(['name']);

			expect(filtered.totalRecordCount).toBe(100);
			expect(filtered.moreRecords).toBe(true);
			expect(filtered.pagingCookie).toBe('cookie123');
			expect(filtered.executedFetchXml).toBe('<fetch/>');
			expect(filtered.executionTimeMs).toBe(75);
		});
	});
});
