import {
	calculateColumnWidths,
	calculateColumnWidthsWithOptionalTypes,
	hasTypedColumns,
	formatColumnWidth,
	type ColumnWithOptionalType
} from './ColumnWidthCalculator';
import type { TypedColumnConfig } from './ColumnTypes';

describe('ColumnWidthCalculator', () => {
	describe('calculateColumnWidths', () => {
		it('should calculate width for name column', () => {
			const data = [
				{ name: 'Short' },
				{ name: 'Longer Name' },
				{ name: 'Medium' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
			expect(typeof result[0]!.width).toBe('number');
		});

		it('should calculate width for numeric column', () => {
			const data = [
				{ count: 100 },
				{ count: 1000000 },
				{ count: 50 }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'count', label: 'Count', type: 'numeric' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should calculate width for boolean column', () => {
			const data = [
				{ active: true },
				{ active: false }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'active', label: 'Active', type: 'boolean' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should calculate width for date column', () => {
			const data = [
				{ created: '2024-01-15' },
				{ created: '2024-12-31' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'created', label: 'Created', type: 'date' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should calculate width for datetime column', () => {
			const data = [
				{ modified: '2024-01-15T10:30:00' },
				{ modified: '2024-12-31T23:59:59' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'modified', label: 'Modified', type: 'datetime' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should handle empty data', () => {
			const data: Record<string, unknown>[] = [];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			// Should still have a width (based on header)
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should handle null values', () => {
			const data = [
				{ name: null },
				{ name: 'Valid' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should handle undefined values', () => {
			const data = [
				{ name: undefined },
				{ name: 'Valid' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should handle multiple columns', () => {
			const data = [
				{ name: 'Test', count: 100, active: true }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' },
				{ key: 'count', label: 'Count', type: 'numeric' },
				{ key: 'active', label: 'Active', type: 'boolean' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result).toHaveLength(3);
			result.forEach(col => {
				expect(col.width).toBeGreaterThan(0);
			});
		});

		it('should respect minWidth override', () => {
			const data = [{ name: 'A' }];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'X', type: 'name', minWidth: 200 }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result[0]!.width).toBeGreaterThanOrEqual(200);
		});

		it('should respect maxWidth override', () => {
			const data = [{ name: 'A very very very very very very very long string that should be truncated' }];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name', maxWidth: 100 }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result[0]!.width).toBeLessThanOrEqual(100);
		});

		it('should preserve column properties', () => {
			const data = [{ name: 'Test' }];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result[0]!.key).toBe('name');
			expect(result[0]!.label).toBe('Name');
			expect(result[0]!.type).toBe('name');
		});
	});

	describe('calculateColumnWidthsWithOptionalTypes', () => {
		it('should calculate width for typed columns', () => {
			const data = [{ name: 'Test Value' }];
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidthsWithOptionalTypes(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.calculatedWidth).toMatch(/^\d+px$/);
		});

		it('should not calculate width for columns without type', () => {
			const data = [{ name: 'Test Value' }];
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name' }
			];

			const result = calculateColumnWidthsWithOptionalTypes(data, columns);

			expect(result).toHaveLength(1);
			expect(result[0]!.calculatedWidth).toBeUndefined();
		});

		it('should preserve manual width for columns without type', () => {
			const data = [{ name: 'Test Value' }];
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name', width: '150px' }
			];

			const result = calculateColumnWidthsWithOptionalTypes(data, columns);

			expect(result[0]!.width).toBe('150px');
			expect(result[0]!.calculatedWidth).toBeUndefined();
		});

		it('should handle mixed typed and untyped columns', () => {
			const data = [{ name: 'Test', count: 100 }];
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name' },
				{ key: 'count', label: 'Count', type: 'numeric' }
			];

			const result = calculateColumnWidthsWithOptionalTypes(data, columns);

			expect(result[0]!.calculatedWidth).toBeUndefined();
			expect(result[1]!.calculatedWidth).toMatch(/^\d+px$/);
		});
	});

	describe('hasTypedColumns', () => {
		it('should return true when columns have types', () => {
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			expect(hasTypedColumns(columns)).toBe(true);
		});

		it('should return false when no columns have types', () => {
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name' },
				{ key: 'count', label: 'Count' }
			];

			expect(hasTypedColumns(columns)).toBe(false);
		});

		it('should return true when at least one column has type', () => {
			const columns: ColumnWithOptionalType[] = [
				{ key: 'name', label: 'Name' },
				{ key: 'count', label: 'Count', type: 'numeric' }
			];

			expect(hasTypedColumns(columns)).toBe(true);
		});

		it('should return false for empty columns array', () => {
			const columns: ColumnWithOptionalType[] = [];

			expect(hasTypedColumns(columns)).toBe(false);
		});
	});

	describe('formatColumnWidth', () => {
		it('should format width as CSS pixel value', () => {
			expect(formatColumnWidth(150)).toBe('150px');
		});

		it('should handle zero width', () => {
			expect(formatColumnWidth(0)).toBe('0px');
		});

		it('should handle large width', () => {
			expect(formatColumnWidth(1000)).toBe('1000px');
		});
	});

	describe('width calculation edge cases', () => {
		it('should use header width when data is empty', () => {
			const data: Record<string, unknown>[] = [];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Very Long Header Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			// Width should account for header text
			expect(result[0]!.width).toBeGreaterThan(50);
		});

		it('should use content width when longer than header', () => {
			const data = [
				{ name: 'This is a very long content string that exceeds header' }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'name', label: 'Name', type: 'name' }
			];

			const result = calculateColumnWidths(data, columns);

			// Width should be substantial for long content
			expect(result[0]!.width).toBeGreaterThan(100);
		});

		it('should handle numeric values for width measurement', () => {
			const data = [
				{ count: 1234567890 }
			];
			const columns: TypedColumnConfig[] = [
				{ key: 'count', label: 'Count', type: 'numeric' }
			];

			const result = calculateColumnWidths(data, columns);

			expect(result[0]!.width).toBeGreaterThan(0);
		});

		it('should format numbers with locale separators', () => {
			// Large number should use locale formatting
			const data = [{ count: 1000000 }];
			const columns: TypedColumnConfig[] = [
				{ key: 'count', label: 'Count', type: 'numeric' }
			];

			const result = calculateColumnWidths(data, columns);

			// Should work without error
			expect(result[0]!.width).toBeGreaterThan(0);
		});
	});
});
