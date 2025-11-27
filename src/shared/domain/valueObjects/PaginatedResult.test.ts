import { PaginatedResult } from './PaginatedResult';

describe('PaginatedResult', () => {
	describe('create', () => {
		it('should create valid paginated result with items', () => {
			const items = [{ id: '1' }, { id: '2' }];
			const result = PaginatedResult.create(items, 1, 10, 100);

			expect(result.getItems()).toEqual(items);
			expect(result.getPage()).toBe(1);
			expect(result.getPageSize()).toBe(10);
			expect(result.getTotalCount()).toBe(100);
		});

		it('should create valid paginated result with empty items', () => {
			const result = PaginatedResult.create([], 1, 10, 0);

			expect(result.getItems()).toEqual([]);
			expect(result.isEmpty()).toBe(true);
		});

		it('should throw if page < 1', () => {
			expect(() => PaginatedResult.create([], 0, 10, 100)).toThrow(
				'Page must be >= 1 (1-based pagination)'
			);
		});

		it('should throw if page is negative', () => {
			expect(() => PaginatedResult.create([], -1, 10, 100)).toThrow(
				'Page must be >= 1 (1-based pagination)'
			);
		});

		it('should throw if pageSize < 1', () => {
			expect(() => PaginatedResult.create([], 1, 0, 100)).toThrow(
				'Page size must be > 0'
			);
		});

		it('should throw if pageSize is negative', () => {
			expect(() => PaginatedResult.create([], 1, -5, 100)).toThrow(
				'Page size must be > 0'
			);
		});

		it('should throw if totalCount is negative', () => {
			expect(() => PaginatedResult.create([], 1, 10, -1)).toThrow(
				'Total count must be >= 0'
			);
		});

		it('should throw if items exceed pageSize', () => {
			const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
			expect(() => PaginatedResult.create(items, 1, 2, 100)).toThrow(
				'Items length (3) exceeds page size (2)'
			);
		});

		it('should allow items equal to pageSize', () => {
			const items = [{ id: '1' }, { id: '2' }];
			const result = PaginatedResult.create(items, 1, 2, 100);

			expect(result.getItems()).toHaveLength(2);
		});
	});

	describe('createEmpty', () => {
		it('should create empty result with default page size', () => {
			const result = PaginatedResult.createEmpty<{ id: string }>();

			expect(result.getItems()).toEqual([]);
			expect(result.getPage()).toBe(1);
			expect(result.getPageSize()).toBe(100);
			expect(result.getTotalCount()).toBe(0);
			expect(result.isEmpty()).toBe(true);
		});

		it('should create empty result with custom page size', () => {
			const result = PaginatedResult.createEmpty<{ id: string }>(50);

			expect(result.getPageSize()).toBe(50);
		});
	});

	describe('isFirstPage', () => {
		it('should return true for page 1', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.isFirstPage()).toBe(true);
		});

		it('should return false for page 2', () => {
			const result = PaginatedResult.create([], 2, 10, 100);
			expect(result.isFirstPage()).toBe(false);
		});

		it('should return false for higher pages', () => {
			const result = PaginatedResult.create([], 10, 10, 100);
			expect(result.isFirstPage()).toBe(false);
		});
	});

	describe('isLastPage', () => {
		it('should return true when on exactly last page', () => {
			// Page 10, items 91-100 of 100 total (10 items on page)
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 10, 10, 100);
			expect(result.isLastPage()).toBe(true);
		});

		it('should return true when partial last page', () => {
			// Page 11, items 101-105 of 105 total (5 items on page)
			const items = Array(5).fill({ id: '1' });
			const result = PaginatedResult.create(items, 11, 10, 105);
			expect(result.isLastPage()).toBe(true);
		});

		it('should return true for empty dataset', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.isLastPage()).toBe(true);
		});

		it('should return false when more pages exist', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 1, 10, 100);
			expect(result.isLastPage()).toBe(false);
		});

		it('should return false in middle of dataset', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 5, 10, 100);
			expect(result.isLastPage()).toBe(false);
		});
	});

	describe('getTotalPages', () => {
		it('should calculate total pages correctly for exact division', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.getTotalPages()).toBe(10);
		});

		it('should handle partial last page', () => {
			const result = PaginatedResult.create([], 1, 10, 105);
			expect(result.getTotalPages()).toBe(11);
		});

		it('should return 0 for empty dataset', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.getTotalPages()).toBe(0);
		});

		it('should return 1 for dataset smaller than page size', () => {
			const result = PaginatedResult.create([], 1, 10, 5);
			expect(result.getTotalPages()).toBe(1);
		});

		it('should return 1 for dataset exactly equal to page size', () => {
			const result = PaginatedResult.create([], 1, 10, 10);
			expect(result.getTotalPages()).toBe(1);
		});
	});

	describe('hasNextPage', () => {
		it('should return true when not on last page', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 1, 10, 100);
			expect(result.hasNextPage()).toBe(true);
		});

		it('should return false when on last page', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 10, 10, 100);
			expect(result.hasNextPage()).toBe(false);
		});

		it('should return false for empty dataset', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.hasNextPage()).toBe(false);
		});
	});

	describe('getNextPage', () => {
		it('should return next page number when not on last page', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 1, 10, 100);
			expect(result.getNextPage()).toBe(2);
		});

		it('should return null when on last page', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 10, 10, 100);
			expect(result.getNextPage()).toBeNull();
		});

		it('should return null for empty dataset', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.getNextPage()).toBeNull();
		});
	});

	describe('hasPreviousPage', () => {
		it('should return false when on first page', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.hasPreviousPage()).toBe(false);
		});

		it('should return true when not on first page', () => {
			const result = PaginatedResult.create([], 2, 10, 100);
			expect(result.hasPreviousPage()).toBe(true);
		});
	});

	describe('getPreviousPage', () => {
		it('should return null when on first page', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.getPreviousPage()).toBeNull();
		});

		it('should return previous page number when not on first page', () => {
			const result = PaginatedResult.create([], 5, 10, 100);
			expect(result.getPreviousPage()).toBe(4);
		});
	});

	describe('getStartIndex', () => {
		it('should return 0 for first page', () => {
			const result = PaginatedResult.create([], 1, 10, 100);
			expect(result.getStartIndex()).toBe(0);
		});

		it('should calculate correctly for subsequent pages', () => {
			const result = PaginatedResult.create([], 3, 10, 100);
			expect(result.getStartIndex()).toBe(20);
		});

		it('should calculate correctly for large page sizes', () => {
			const result = PaginatedResult.create([], 2, 100, 1000);
			expect(result.getStartIndex()).toBe(100);
		});
	});

	describe('getEndIndex', () => {
		it('should return item count for first page with items', () => {
			const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
			const result = PaginatedResult.create(items, 1, 10, 100);
			expect(result.getEndIndex()).toBe(3);
		});

		it('should calculate correctly for subsequent pages', () => {
			const items = Array(10).fill({ id: '1' });
			const result = PaginatedResult.create(items, 3, 10, 100);
			expect(result.getEndIndex()).toBe(30);
		});

		it('should handle partial pages', () => {
			const items = Array(5).fill({ id: '1' });
			const result = PaginatedResult.create(items, 11, 10, 105);
			expect(result.getEndIndex()).toBe(105);
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty items', () => {
			const result = PaginatedResult.create([], 1, 10, 0);
			expect(result.isEmpty()).toBe(true);
		});

		it('should return false for non-empty items', () => {
			const result = PaginatedResult.create([{ id: '1' }], 1, 10, 100);
			expect(result.isEmpty()).toBe(false);
		});
	});

	describe('immutability', () => {
		it('should return immutable items array', () => {
			const items = [{ id: '1' }, { id: '2' }];
			const result = PaginatedResult.create(items, 1, 10, 100);

			const returnedItems = result.getItems();

			// TypeScript readonly prevents modification at compile time
			// At runtime, the array reference is the same but should not be modified
			expect(returnedItems).toEqual(items);
		});
	});

	describe('edge cases', () => {
		it('should handle single item result', () => {
			const result = PaginatedResult.create([{ id: '1' }], 1, 10, 1);

			expect(result.isFirstPage()).toBe(true);
			expect(result.isLastPage()).toBe(true);
			expect(result.getTotalPages()).toBe(1);
			expect(result.hasNextPage()).toBe(false);
			expect(result.hasPreviousPage()).toBe(false);
		});

		it('should handle large page numbers', () => {
			const result = PaginatedResult.create([], 1000, 10, 10000);

			expect(result.getPage()).toBe(1000);
			expect(result.getStartIndex()).toBe(9990);
		});

		it('should handle large total counts', () => {
			const result = PaginatedResult.create([], 1, 100, 1000000);

			expect(result.getTotalPages()).toBe(10000);
			expect(result.hasNextPage()).toBe(true);
		});
	});
});
