import { VirtualTableCacheState } from './VirtualTableCacheState';

describe('VirtualTableCacheState', () => {
	describe('createEmpty', () => {
		it('should create empty state with default values', () => {
			const state = VirtualTableCacheState.createEmpty();

			expect(state.getCachedRecordCount()).toBe(0);
			expect(state.getTotalRecordCount()).toBe(0);
			expect(state.getIsLoading()).toBe(false);
			expect(state.getCurrentPage()).toBe(0);
			expect(state.getSearchFilter()).toBeNull();
		});

		it('should be empty', () => {
			const state = VirtualTableCacheState.createEmpty();
			expect(state.isEmpty()).toBe(true);
		});

		it('should be fully cached (empty is considered fully cached)', () => {
			const state = VirtualTableCacheState.createEmpty();
			expect(state.isFullyCached()).toBe(true);
		});
	});

	describe('create', () => {
		it('should create state with provided values', () => {
			const state = VirtualTableCacheState.create(100, 1000, true, 1, 'test');

			expect(state.getCachedRecordCount()).toBe(100);
			expect(state.getTotalRecordCount()).toBe(1000);
			expect(state.getIsLoading()).toBe(true);
			expect(state.getCurrentPage()).toBe(1);
			expect(state.getSearchFilter()).toBe('test');
		});

		it('should default searchFilter to null', () => {
			const state = VirtualTableCacheState.create(100, 1000, false, 1);
			expect(state.getSearchFilter()).toBeNull();
		});
	});

	describe('validation', () => {
		it('should throw if cachedRecordCount is negative', () => {
			expect(() => VirtualTableCacheState.create(-1, 100, false, 1)).toThrow(
				'Cached record count must be >= 0'
			);
		});

		it('should throw if totalRecordCount is negative', () => {
			expect(() => VirtualTableCacheState.create(0, -1, false, 1)).toThrow(
				'Total record count must be >= 0'
			);
		});

		it('should throw if currentPage is negative', () => {
			expect(() => VirtualTableCacheState.create(0, 100, false, -1)).toThrow(
				'Current page must be >= 0'
			);
		});

		it('should accept zero values', () => {
			const state = VirtualTableCacheState.create(0, 0, false, 0, null);

			expect(state.getCachedRecordCount()).toBe(0);
			expect(state.getTotalRecordCount()).toBe(0);
			expect(state.getCurrentPage()).toBe(0);
		});
	});

	describe('isFullyCached', () => {
		it('should return true when cached equals total and not loading', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1);
			expect(state.isFullyCached()).toBe(true);
		});

		it('should return true when cached exceeds total and not loading', () => {
			const state = VirtualTableCacheState.create(150, 100, false, 1);
			expect(state.isFullyCached()).toBe(true);
		});

		it('should return false when still loading', () => {
			const state = VirtualTableCacheState.create(100, 100, true, 1);
			expect(state.isFullyCached()).toBe(false);
		});

		it('should return false when cached less than total', () => {
			const state = VirtualTableCacheState.create(50, 100, false, 1);
			expect(state.isFullyCached()).toBe(false);
		});

		it('should return true for empty dataset', () => {
			const state = VirtualTableCacheState.create(0, 0, false, 0);
			expect(state.isFullyCached()).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('should return true when cached count is 0', () => {
			const state = VirtualTableCacheState.create(0, 100, false, 1);
			expect(state.isEmpty()).toBe(true);
		});

		it('should return false when cached count > 0', () => {
			const state = VirtualTableCacheState.create(1, 100, false, 1);
			expect(state.isEmpty()).toBe(false);
		});
	});

	describe('hasRecords', () => {
		it('should return false when cached count is 0', () => {
			const state = VirtualTableCacheState.create(0, 100, false, 1);
			expect(state.hasRecords()).toBe(false);
		});

		it('should return true when cached count > 0', () => {
			const state = VirtualTableCacheState.create(1, 100, false, 1);
			expect(state.hasRecords()).toBe(true);
		});
	});

	describe('isFiltered', () => {
		it('should return false when searchFilter is null', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1, null);
			expect(state.isFiltered()).toBe(false);
		});

		it('should return false when searchFilter is empty string', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1, '');
			expect(state.isFiltered()).toBe(false);
		});

		it('should return true when searchFilter has content', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1, 'test');
			expect(state.isFiltered()).toBe(true);
		});

		it('should return true when searchFilter has whitespace', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1, ' ');
			expect(state.isFiltered()).toBe(true);
		});
	});

	describe('getCachePercentage', () => {
		it('should return 100 when total is 0', () => {
			const state = VirtualTableCacheState.create(0, 0, false, 0);
			expect(state.getCachePercentage()).toBe(100);
		});

		it('should calculate percentage correctly', () => {
			const state = VirtualTableCacheState.create(50, 100, false, 1);
			expect(state.getCachePercentage()).toBe(50);
		});

		it('should round percentage', () => {
			const state = VirtualTableCacheState.create(33, 100, false, 1);
			expect(state.getCachePercentage()).toBe(33);
		});

		it('should cap at 100', () => {
			const state = VirtualTableCacheState.create(150, 100, false, 1);
			expect(state.getCachePercentage()).toBe(100);
		});

		it('should return 0 for 0 cached out of many', () => {
			const state = VirtualTableCacheState.create(0, 1000, false, 0);
			expect(state.getCachePercentage()).toBe(0);
		});

		it('should handle small percentages', () => {
			const state = VirtualTableCacheState.create(1, 1000, false, 1);
			expect(state.getCachePercentage()).toBe(0); // 0.1% rounds to 0
		});

		it('should handle 100%', () => {
			const state = VirtualTableCacheState.create(1000, 1000, false, 10);
			expect(state.getCachePercentage()).toBe(100);
		});
	});

	describe('getRemainingRecords', () => {
		it('should return remaining records', () => {
			const state = VirtualTableCacheState.create(30, 100, false, 1);
			expect(state.getRemainingRecords()).toBe(70);
		});

		it('should return 0 when fully cached', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1);
			expect(state.getRemainingRecords()).toBe(0);
		});

		it('should return 0 when cached exceeds total', () => {
			const state = VirtualTableCacheState.create(150, 100, false, 1);
			expect(state.getRemainingRecords()).toBe(0);
		});

		it('should return total when nothing cached', () => {
			const state = VirtualTableCacheState.create(0, 100, false, 0);
			expect(state.getRemainingRecords()).toBe(100);
		});
	});

	describe('hasMoreRecordsOnServer', () => {
		it('should return true when total > cached', () => {
			const state = VirtualTableCacheState.create(50, 100, false, 1);
			expect(state.hasMoreRecordsOnServer()).toBe(true);
		});

		it('should return false when total equals cached', () => {
			const state = VirtualTableCacheState.create(100, 100, false, 1);
			expect(state.hasMoreRecordsOnServer()).toBe(false);
		});

		it('should return false when cached exceeds total', () => {
			const state = VirtualTableCacheState.create(150, 100, false, 1);
			expect(state.hasMoreRecordsOnServer()).toBe(false);
		});
	});

	describe('withCachedCount', () => {
		it('should return new state with updated cached count', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, 'test');
			const updated = original.withCachedCount(75);

			expect(original.getCachedRecordCount()).toBe(50);
			expect(updated.getCachedRecordCount()).toBe(75);

			// Other values preserved
			expect(updated.getTotalRecordCount()).toBe(100);
			expect(updated.getIsLoading()).toBe(false);
			expect(updated.getCurrentPage()).toBe(1);
			expect(updated.getSearchFilter()).toBe('test');
		});
	});

	describe('withTotalCount', () => {
		it('should return new state with updated total count', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1);
			const updated = original.withTotalCount(200);

			expect(original.getTotalRecordCount()).toBe(100);
			expect(updated.getTotalRecordCount()).toBe(200);
		});
	});

	describe('withLoading', () => {
		it('should return new state with updated loading status', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1);
			const updated = original.withLoading(true);

			expect(original.getIsLoading()).toBe(false);
			expect(updated.getIsLoading()).toBe(true);
		});
	});

	describe('withPage', () => {
		it('should return new state with updated page', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1);
			const updated = original.withPage(5);

			expect(original.getCurrentPage()).toBe(1);
			expect(updated.getCurrentPage()).toBe(5);
		});
	});

	describe('withSearchFilter', () => {
		it('should return new state with updated filter', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, null);
			const updated = original.withSearchFilter('search term');

			expect(original.getSearchFilter()).toBeNull();
			expect(updated.getSearchFilter()).toBe('search term');
		});

		it('should allow clearing filter', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, 'test');
			const updated = original.withSearchFilter(null);

			expect(updated.getSearchFilter()).toBeNull();
			expect(updated.isFiltered()).toBe(false);
		});
	});

	describe('withUpdates', () => {
		it('should update multiple values at once', () => {
			const original = VirtualTableCacheState.createEmpty();
			const updated = original.withUpdates({
				cachedCount: 100,
				totalCount: 1000,
				loading: true,
				page: 1,
				filter: 'test'
			});

			expect(updated.getCachedRecordCount()).toBe(100);
			expect(updated.getTotalRecordCount()).toBe(1000);
			expect(updated.getIsLoading()).toBe(true);
			expect(updated.getCurrentPage()).toBe(1);
			expect(updated.getSearchFilter()).toBe('test');
		});

		it('should only update provided values', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, 'test');
			const updated = original.withUpdates({ cachedCount: 75 });

			expect(updated.getCachedRecordCount()).toBe(75);
			expect(updated.getTotalRecordCount()).toBe(100);
			expect(updated.getIsLoading()).toBe(false);
			expect(updated.getCurrentPage()).toBe(1);
			expect(updated.getSearchFilter()).toBe('test');
		});

		it('should handle explicit null for filter', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, 'test');
			const updated = original.withUpdates({ filter: null });

			expect(updated.getSearchFilter()).toBeNull();
		});

		it('should preserve filter when not provided', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, 'test');
			const updated = original.withUpdates({ cachedCount: 100 });

			expect(updated.getSearchFilter()).toBe('test');
		});
	});

	describe('immutability', () => {
		it('should not modify original state when using with* methods', () => {
			const original = VirtualTableCacheState.create(50, 100, false, 1, null);

			const modified = original
				.withCachedCount(100)
				.withTotalCount(200)
				.withLoading(true)
				.withPage(5)
				.withSearchFilter('test');

			// Original unchanged
			expect(original.getCachedRecordCount()).toBe(50);
			expect(original.getTotalRecordCount()).toBe(100);
			expect(original.getIsLoading()).toBe(false);
			expect(original.getCurrentPage()).toBe(1);
			expect(original.getSearchFilter()).toBeNull();

			// Modified has new values
			expect(modified.getCachedRecordCount()).toBe(100);
			expect(modified.getTotalRecordCount()).toBe(200);
			expect(modified.getIsLoading()).toBe(true);
			expect(modified.getCurrentPage()).toBe(5);
			expect(modified.getSearchFilter()).toBe('test');
		});
	});

	describe('edge cases', () => {
		it('should handle large numbers', () => {
			const state = VirtualTableCacheState.create(50000, 1000000, false, 100);

			expect(state.getCachePercentage()).toBe(5);
			expect(state.getRemainingRecords()).toBe(950000);
			expect(state.hasMoreRecordsOnServer()).toBe(true);
		});

		it('should handle chained updates', () => {
			const state = VirtualTableCacheState.createEmpty()
				.withLoading(true)
				.withPage(1)
				.withTotalCount(1000)
				.withCachedCount(100)
				.withLoading(false);

			expect(state.getCachedRecordCount()).toBe(100);
			expect(state.getTotalRecordCount()).toBe(1000);
			expect(state.getIsLoading()).toBe(false);
			expect(state.getCurrentPage()).toBe(1);
		});
	});
});
