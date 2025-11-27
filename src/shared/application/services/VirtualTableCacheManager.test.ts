import { VirtualTableCacheManager } from './VirtualTableCacheManager';
import type { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { PaginatedResult } from '../../domain/valueObjects/PaginatedResult';
import { VirtualTableConfig } from '../../domain/valueObjects/VirtualTableConfig';
import { NullLogger } from '../../../infrastructure/logging/NullLogger';

// Test entity type
interface TestEntity {
	id: string;
	name: string;
}

// Helper to create test entities
function createTestEntities(count: number, startId: number = 1): TestEntity[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `${startId + i}`,
		name: `Entity ${startId + i}`
	}));
}

// Mock provider factory
function createMockProvider(totalCount: number): jest.Mocked<IVirtualTableDataProvider<TestEntity>> {
	return {
		findPaginated: jest.fn().mockImplementation(
			(page: number, pageSize: number) => {
				const startIndex = (page - 1) * pageSize;
				const endIndex = Math.min(startIndex + pageSize, totalCount);
				const items = createTestEntities(endIndex - startIndex, startIndex + 1);
				return Promise.resolve(PaginatedResult.create(items, page, pageSize, totalCount));
			}
		),
		getCount: jest.fn().mockResolvedValue(totalCount)
	};
}

// Config with background loading disabled for tests that only want initial page
function createNoBackgroundConfig(): VirtualTableConfig {
	return VirtualTableConfig.create(100, 5000, 500, false);
}

describe('VirtualTableCacheManager', () => {
	let provider: jest.Mocked<IVirtualTableDataProvider<TestEntity>>;
	let logger: NullLogger;

	beforeEach(() => {
		provider = createMockProvider(1000);
		logger = new NullLogger();
	});

	describe('loadInitialPage', () => {
		it('should load first page and cache records', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const result = await cacheManager.loadInitialPage();

			expect(result.getItems()).toHaveLength(100);
			expect(result.getPage()).toBe(1);
			expect(result.getTotalCount()).toBe(1000);

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				100,
				undefined,
				undefined
			);

			const cacheState = cacheManager.getCacheState();
			expect(cacheState.getCachedRecordCount()).toBe(100);
			expect(cacheState.getTotalRecordCount()).toBe(1000);
			expect(cacheState.getCurrentPage()).toBe(1);
		});

		it('should pass query options to provider', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const options = { filter: "name eq 'test'" };
			await cacheManager.loadInitialPage(options);

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				100,
				options,
				undefined
			);
		});

		it('should pass cancellation token to provider', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const mockToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn().mockReturnValue({ dispose: jest.fn() })
			};

			await cacheManager.loadInitialPage(undefined, mockToken);

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				100,
				undefined,
				mockToken
			);
		});

		it('should start background loading if more pages exist', async () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			// Wait for background loading to start
			await cacheManager.waitForBackgroundLoading();

			// Should have called for page 2 (background loading)
			expect(provider.findPaginated).toHaveBeenCalledWith(
				2,
				500, // background page size
				undefined,
				undefined
			);
		});

		it('should not start background loading when disabled', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			// Wait a tick to ensure no background loading started
			await new Promise(resolve => setTimeout(resolve, 10));

			// Only initial page should be fetched
			expect(provider.findPaginated).toHaveBeenCalledTimes(1);
		});

		it('should not start background loading when all data fits on first page', async () => {
			provider = createMockProvider(50); // Less than page size
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			await new Promise(resolve => setTimeout(resolve, 10));

			// Only initial page should be fetched
			expect(provider.findPaginated).toHaveBeenCalledTimes(1);
		});
	});

	describe('background loading', () => {
		it('should load pages until max cached records reached', async () => {
			// Config: initial=100, max=600, background=500
			// So we should get: page 1 (100) + page 2 (500) = 600 records
			const config = VirtualTableConfig.create(100, 600, 500, true);
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			await cacheManager.waitForBackgroundLoading();

			const cachedRecords = cacheManager.getCachedRecords();
			expect(cachedRecords.length).toBe(600);
		});

		it('should stop loading when no more pages', async () => {
			provider = createMockProvider(300); // Total only 300 records
			// Use same page size for initial and background to simplify mock provider math
			const config = VirtualTableConfig.create(100, 5000, 100, true);
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			await cacheManager.waitForBackgroundLoading();

			const cachedRecords = cacheManager.getCachedRecords();
			expect(cachedRecords.length).toBe(300);
		});

		it('should handle background loading errors gracefully', async () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			provider.findPaginated
				.mockResolvedValueOnce(PaginatedResult.create(createTestEntities(100), 1, 100, 1000))
				.mockRejectedValueOnce(new Error('Network error'));

			await cacheManager.loadInitialPage();
			await cacheManager.waitForBackgroundLoading();

			// Should have cached initial page only
			const cachedRecords = cacheManager.getCachedRecords();
			expect(cachedRecords.length).toBe(100);

			// State should not be loading
			expect(cacheManager.getCacheState().getIsLoading()).toBe(false);
		});
	});

	describe('searchCached', () => {
		it('should filter cached records', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const results = cacheManager.searchCached(r => r.name.includes('Entity 5'));

			// Should find Entity 5, Entity 50-59
			expect(results.length).toBeGreaterThan(0);
			expect(results.every(r => r.name.includes('Entity 5'))).toBe(true);
		});

		it('should return empty array when no matches', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const results = cacheManager.searchCached(r => r.name.includes('nonexistent'));

			expect(results).toHaveLength(0);
		});

		it('should return empty array when cache is empty', () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const results = cacheManager.searchCached(r => r.name.includes('test'));
			expect(results).toHaveLength(0);
		});

		it('should filter with exact match', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const results = cacheManager.searchCached(r => r.id === '42');

			expect(results).toHaveLength(1);
			expect(results[0]?.id).toBe('42');
		});
	});

	describe('clearCache', () => {
		it('should clear cached records and reset state', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			expect(cacheManager.getCachedRecords().length).toBe(100);

			cacheManager.clearCache();

			expect(cacheManager.getCachedRecords()).toHaveLength(0);
			const state = cacheManager.getCacheState();
			expect(state.getCachedRecordCount()).toBe(0);
			expect(state.getTotalRecordCount()).toBe(0);
			expect(state.getCurrentPage()).toBe(0);
			expect(state.getIsLoading()).toBe(false);
		});

		it('should cancel background loading', async () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			// Clear immediately while background loading might be running
			cacheManager.clearCache();

			// Should not throw and state should be reset
			expect(cacheManager.getCachedRecords()).toHaveLength(0);
		});
	});

	describe('getCacheState', () => {
		it('should return empty state initially', () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const state = cacheManager.getCacheState();

			expect(state.getCachedRecordCount()).toBe(0);
			expect(state.getTotalRecordCount()).toBe(0);
			expect(state.getIsLoading()).toBe(false);
			expect(state.getCurrentPage()).toBe(0);
			expect(state.isEmpty()).toBe(true);
		});

		it('should update after loading', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const state = cacheManager.getCacheState();
			expect(state.getCachedRecordCount()).toBe(100);
			expect(state.getTotalRecordCount()).toBe(1000);
			expect(state.hasRecords()).toBe(true);
		});

		it('should return immutable snapshot', async () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			// Get state immediately after initial page load before background completes
			// The state is immutable, so it won't change even as background loading progresses
			const state1 = cacheManager.getCacheState();
			const state1CachedCount = state1.getCachedRecordCount();

			// Wait for background loading
			await cacheManager.waitForBackgroundLoading();
			const state2 = cacheManager.getCacheState();

			// State1 was captured, state2 should have more records
			// But state1 object is immutable and retains original values
			expect(state1CachedCount).toBeGreaterThanOrEqual(100);
			expect(state2.getCachedRecordCount()).toBeGreaterThanOrEqual(state1CachedCount);
		});
	});

	describe('getCachedRecords', () => {
		it('should return defensive copy', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const records1 = cacheManager.getCachedRecords();
			const records2 = cacheManager.getCachedRecords();

			expect(records1).not.toBe(records2); // Different array instances
			expect(records1).toEqual(records2); // Same content
		});

		it('should return empty array initially', () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			expect(cacheManager.getCachedRecords()).toHaveLength(0);
		});
	});

	describe('isBackgroundLoading', () => {
		it('should return false initially', () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			expect(cacheManager.isBackgroundLoading()).toBe(false);
		});

		it('should return true during background loading', async () => {
			// Setup slow provider
			provider.findPaginated.mockImplementation(async (page, pageSize) => {
				if (page > 1) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
				const startIndex = (page - 1) * pageSize;
				const items = createTestEntities(Math.min(pageSize, 1000 - startIndex), startIndex + 1);
				return PaginatedResult.create(items, page, pageSize, 1000);
			});

			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			expect(cacheManager.isBackgroundLoading()).toBe(true);

			await cacheManager.waitForBackgroundLoading();

			expect(cacheManager.isBackgroundLoading()).toBe(false);
		});
	});

	describe('cancelBackgroundLoading', () => {
		it('should cancel background loading', async () => {
			// Setup slow provider to ensure background loading takes time
			provider.findPaginated.mockImplementation(async (page, pageSize) => {
				if (page > 1) {
					await new Promise(resolve => setTimeout(resolve, 50));
				}
				const startIndex = (page - 1) * pageSize;
				const items = createTestEntities(Math.min(pageSize, 1000 - startIndex), startIndex + 1);
				return PaginatedResult.create(items, page, pageSize, 1000);
			});

			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			cacheManager.cancelBackgroundLoading();
			await cacheManager.waitForBackgroundLoading();

			// Should have stopped loading after first page
			const cachedCount = cacheManager.getCachedRecords().length;
			expect(cachedCount).toBeLessThan(config.getMaxCachedRecords());
		});

		it('should be safe to call when not loading', () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			expect(() => cacheManager.cancelBackgroundLoading()).not.toThrow();
		});
	});

	describe('onStateChange', () => {
		it('should notify on initial page load', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const callback = jest.fn();
			cacheManager.onStateChange(callback);

			await cacheManager.loadInitialPage();

			// Should be called at least twice: loading start, loading complete
			expect(callback).toHaveBeenCalled();

			// Check that we received valid state and records
			const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
			const [_state, records] = lastCall as [unknown, readonly TestEntity[]];
			expect(records.length).toBe(100);
		});

		it('should notify during background loading', async () => {
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const callback = jest.fn();
			cacheManager.onStateChange(callback);

			await cacheManager.loadInitialPage();
			await cacheManager.waitForBackgroundLoading();

			// Should have multiple calls as pages load
			expect(callback.mock.calls.length).toBeGreaterThan(2);
		});

		it('should not throw if no callback registered', async () => {
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await expect(cacheManager.loadInitialPage()).resolves.not.toThrow();
		});
	});

	describe('with small dataset', () => {
		it('should handle dataset smaller than page size', async () => {
			provider = createMockProvider(50);
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const result = await cacheManager.loadInitialPage();

			expect(result.getItems()).toHaveLength(50);
			expect(result.getTotalCount()).toBe(50);
			expect(result.isLastPage()).toBe(true);
			expect(result.hasNextPage()).toBe(false);
		});

		it('should show as fully cached', async () => {
			provider = createMockProvider(50);
			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();
			await cacheManager.waitForBackgroundLoading();

			const state = cacheManager.getCacheState();
			expect(state.isFullyCached()).toBe(true);
			expect(state.getCachedRecordCount()).toBe(50);
			expect(state.getTotalRecordCount()).toBe(50);
		});
	});

	describe('with empty dataset', () => {
		it('should handle empty dataset', async () => {
			provider = createMockProvider(0);
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			const result = await cacheManager.loadInitialPage();

			expect(result.getItems()).toHaveLength(0);
			expect(result.getTotalCount()).toBe(0);
			expect(result.isEmpty()).toBe(true);
		});

		it('should show empty state correctly', async () => {
			provider = createMockProvider(0);
			const config = createNoBackgroundConfig();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			const state = cacheManager.getCacheState();
			expect(state.isEmpty()).toBe(true);
			expect(state.isFullyCached()).toBe(true);
			expect(state.getCachePercentage()).toBe(100);
		});
	});

	describe('with cancellation token', () => {
		it('should respect cancellation during background loading', async () => {
			const mockToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn().mockReturnValue({ dispose: jest.fn() })
			};

			// Make background loading slow
			let callCount = 0;
			provider.findPaginated.mockImplementation(async (page, pageSize) => {
				callCount++;
				if (page > 1) {
					await new Promise(resolve => setTimeout(resolve, 50));
					// Cancel after first background page starts
					if (callCount === 2) {
						(mockToken as { isCancellationRequested: boolean }).isCancellationRequested = true;
					}
				}
				const startIndex = (page - 1) * pageSize;
				const items = createTestEntities(Math.min(pageSize, 1000 - startIndex), startIndex + 1);
				return PaginatedResult.create(items, page, pageSize, 1000);
			});

			const config = VirtualTableConfig.createDefault();
			const cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage(undefined, mockToken);
			await cacheManager.waitForBackgroundLoading();

			// Should have stopped early due to cancellation
			const cachedCount = cacheManager.getCachedRecords().length;
			expect(cachedCount).toBeLessThan(config.getMaxCachedRecords());
		});
	});
});
