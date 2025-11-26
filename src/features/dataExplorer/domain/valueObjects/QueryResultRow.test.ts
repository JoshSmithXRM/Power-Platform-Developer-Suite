import { QueryResultRow, QueryCellValue } from './QueryResultRow';

describe('QueryResultRow', () => {
	describe('constructor and fromRecord', () => {
		it('should create row from map', () => {
			const cells = new Map<string, QueryCellValue>([
				['name', 'Contoso'],
				['revenue', 1000000],
			]);

			const row = new QueryResultRow(cells);

			expect(row.getValue('name')).toBe('Contoso');
			expect(row.getValue('revenue')).toBe(1000000);
		});

		it('should create row from record object', () => {
			const row = QueryResultRow.fromRecord({
				name: 'Contoso',
				revenue: 1000000,
			});

			expect(row.getValue('name')).toBe('Contoso');
			expect(row.getValue('revenue')).toBe(1000000);
		});
	});

	describe('getValue', () => {
		it('should return value for existing column', () => {
			const row = QueryResultRow.fromRecord({ name: 'Test' });

			expect(row.getValue('name')).toBe('Test');
		});

		it('should return null for non-existing column', () => {
			const row = QueryResultRow.fromRecord({ name: 'Test' });

			expect(row.getValue('missing')).toBeNull();
		});

		it('should handle null values', () => {
			const row = QueryResultRow.fromRecord({ name: null });

			expect(row.getValue('name')).toBeNull();
		});

		it('should handle undefined values as null', () => {
			// Note: Map.get returns undefined for missing keys, but we also store undefined values
			// The ?? null coalescing converts both to null for consistent behavior
			const row = QueryResultRow.fromRecord({ name: undefined });

			expect(row.getValue('name')).toBeNull();
		});
	});

	describe('getColumnNames', () => {
		it('should return all column names', () => {
			const row = QueryResultRow.fromRecord({
				name: 'Test',
				revenue: 1000,
				active: true,
			});

			const columns = row.getColumnNames();

			expect(columns).toContain('name');
			expect(columns).toContain('revenue');
			expect(columns).toContain('active');
			expect(columns).toHaveLength(3);
		});

		it('should return empty array for empty row', () => {
			const row = QueryResultRow.fromRecord({});

			expect(row.getColumnNames()).toHaveLength(0);
		});
	});
});
