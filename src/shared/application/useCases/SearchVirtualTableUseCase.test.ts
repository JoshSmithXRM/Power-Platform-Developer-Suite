import {
	SearchVirtualTableUseCase,
	VirtualTableCacheManager,
	VirtualTableConfig
} from '../index';
import type { SearchResult, ODataFilterBuilder } from '../index';
import type { IVirtualTableDataProvider } from '../../domain/interfaces/IVirtualTableDataProvider';
import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { PaginatedResult } from '../../domain/valueObjects/PaginatedResult';
import { NullLogger } from '../../../infrastructure/logging/NullLogger';

// Test entity type
interface TestEntity {
	id: string;
	name: string;
	displayName: string;
}

// Helper to create test entities
function createTestEntities(count: number, startId: number = 1): TestEntity[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `${startId + i}`,
		name: `entity_${startId + i}`,
		displayName: `Entity ${startId + i}`
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

// Client-side filter function
const testFilterFn = (record: TestEntity, query: string): boolean => {
	return record.name.toLowerCase().includes(query) ||
		record.displayName.toLowerCase().includes(query);
};

// OData filter builder
const testODataFilterBuilder: ODataFilterBuilder = (query: string): string => {
	const escaped = query.replace(/'/g, "''");
	return `contains(name, '${escaped}') or contains(displayname, '${escaped}')`;
};

// Config with background loading disabled
function createNoBackgroundConfig(): VirtualTableConfig {
	return VirtualTableConfig.create(100, 5000, 500, false);
}

describe('SearchVirtualTableUseCase', () => {
	let provider: jest.Mocked<IVirtualTableDataProvider<TestEntity>>;
	let cacheManager: VirtualTableCacheManager<TestEntity>;
	let searchUseCase: SearchVirtualTableUseCase<TestEntity>;
	let logger: NullLogger;

	beforeEach(async () => {
		logger = new NullLogger();
		provider = createMockProvider(10000); // 10k total records
		const config = createNoBackgroundConfig();
		cacheManager = new VirtualTableCacheManager(provider, config, logger);

		// Load initial page so cache has some data
		await cacheManager.loadInitialPage();

		searchUseCase = new SearchVirtualTableUseCase(
			cacheManager,
			provider,
			testFilterFn,
			testODataFilterBuilder,
			logger
		);
	});

	describe('execute with empty query', () => {
		it('should return all cached records when query is empty', async () => {
			const result = await searchUseCase.execute('');

			expect(result.source).toBe('cache');
			expect(result.results).toHaveLength(100); // Initial page size
		});

		it('should return all cached records when query is only whitespace', async () => {
			const result = await searchUseCase.execute('   ');

			expect(result.source).toBe('cache');
			expect(result.results).toHaveLength(100);
		});

		it('should not call provider when query is empty', async () => {
			provider.findPaginated.mockClear(); // Clear initial load call

			await searchUseCase.execute('');

			expect(provider.findPaginated).not.toHaveBeenCalled();
		});
	});

	describe('execute with cache hit', () => {
		it('should return cached results when matches found', async () => {
			// Entity 1 should match "entity_1"
			const result = await searchUseCase.execute('entity_1');

			expect(result.source).toBe('cache');
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results.some(r => r.name === 'entity_1')).toBe(true);
		});

		it('should perform case-insensitive search', async () => {
			const result = await searchUseCase.execute('ENTITY_1');

			expect(result.source).toBe('cache');
			expect(result.results.some(r => r.name === 'entity_1')).toBe(true);
		});

		it('should not call provider when cache has matches', async () => {
			provider.findPaginated.mockClear();

			await searchUseCase.execute('entity_1');

			expect(provider.findPaginated).not.toHaveBeenCalled();
		});

		it('should match on displayName field', async () => {
			const result = await searchUseCase.execute('Entity 5');

			expect(result.source).toBe('cache');
			expect(result.results.some(r => r.displayName === 'Entity 5')).toBe(true);
		});
	});

	describe('execute with server fallback', () => {
		it('should search server when no cache matches and cache not fully loaded', async () => {
			// Search for entity that is beyond cached page (entity_500 is > 100)
			provider.findPaginated.mockClear();

			// Mock server response for filtered search
			const serverResults = createTestEntities(5, 500);
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(serverResults, 1, 1000, 5)
			);

			const result = await searchUseCase.execute('entity_500');

			expect(result.source).toBe('server');
			expect(result.results).toHaveLength(5);
			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				1000,
				expect.objectContaining({
					filter: expect.stringContaining('entity_500')
				}),
				undefined
			);
		});

		it('should build correct OData filter for server search', async () => {
			provider.findPaginated.mockClear();
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 1000, 0)
			);

			await searchUseCase.execute('test-query');

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				1000,
				{
					filter: "contains(name, 'test-query') or contains(displayname, 'test-query')",
					top: 1000
				},
				undefined
			);
		});

		it('should escape single quotes in OData filter', async () => {
			provider.findPaginated.mockClear();
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 1000, 0)
			);

			await searchUseCase.execute("O'Reilly");

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				1000,
				expect.objectContaining({
					filter: expect.stringContaining("O''Reilly")
				}),
				undefined
			);
		});

		it('should pass cancellation token to provider', async () => {
			provider.findPaginated.mockClear();
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 1000, 0)
			);

			const mockToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn().mockReturnValue({ dispose: jest.fn() })
			};

			await searchUseCase.execute('not-in-cache', mockToken);

			expect(provider.findPaginated).toHaveBeenCalledWith(
				1,
				1000,
				expect.anything(),
				mockToken
			);
		});
	});

	describe('execute with fully cached data', () => {
		beforeEach(async () => {
			// Create a provider with small total count so cache can be fully loaded
			provider = createMockProvider(50);
			const config = createNoBackgroundConfig();
			cacheManager = new VirtualTableCacheManager(provider, config, logger);

			await cacheManager.loadInitialPage();

			searchUseCase = new SearchVirtualTableUseCase(
				cacheManager,
				provider,
				testFilterFn,
				testODataFilterBuilder,
				logger
			);
		});

		it('should return empty results from cache when no matches and cache fully loaded', async () => {
			provider.findPaginated.mockClear();

			const result = await searchUseCase.execute('nonexistent-entity');

			expect(result.source).toBe('cache');
			expect(result.results).toHaveLength(0);
			expect(provider.findPaginated).not.toHaveBeenCalled();
		});

		it('should not search server when cache is fully loaded', async () => {
			provider.findPaginated.mockClear();

			await searchUseCase.execute('definitely-not-there');

			expect(provider.findPaginated).not.toHaveBeenCalled();
		});
	});

	describe('SearchResult type', () => {
		it('should have correct shape for cache results', async () => {
			const result: SearchResult<TestEntity> = await searchUseCase.execute('entity_1');

			expect(result).toHaveProperty('results');
			expect(result).toHaveProperty('source');
			expect(Array.isArray(result.results)).toBe(true);
			expect(['cache', 'server']).toContain(result.source);
		});

		it('should return readonly array', async () => {
			const result = await searchUseCase.execute('entity_1');

			// TypeScript enforces readonly, but verify at runtime the array is usable
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results[0]).toHaveProperty('id');
		});
	});

	describe('edge cases', () => {
		it('should handle null query gracefully', async () => {
			const result = await searchUseCase.execute(null as unknown as string);

			expect(result.source).toBe('cache');
			expect(result.results).toHaveLength(100);
		});

		it('should handle undefined query gracefully', async () => {
			const result = await searchUseCase.execute(undefined as unknown as string);

			expect(result.source).toBe('cache');
			expect(result.results).toHaveLength(100);
		});

		it('should trim query before searching', async () => {
			const result1 = await searchUseCase.execute('  entity_1  ');
			const result2 = await searchUseCase.execute('entity_1');

			expect(result1.results.length).toBe(result2.results.length);
		});

		it('should handle special regex characters in query', async () => {
			// These should not break the search (literal match, not regex)
			// 'entity.*' won't match 'entity_1' since we do literal string matching
			provider.findPaginated.mockClear();
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create([], 1, 1000, 0)
			);

			const result = await searchUseCase.execute('entity.*');

			// Falls back to server since no literal match in cache
			expect(result.source).toBe('server');
			expect(result.results).toHaveLength(0);
		});

		it('should handle provider error during server search', async () => {
			provider.findPaginated.mockClear();
			provider.findPaginated.mockRejectedValueOnce(new Error('Network error'));

			await expect(searchUseCase.execute('not-in-cache')).rejects.toThrow('Network error');
		});
	});

	describe('multiple consecutive searches', () => {
		it('should not cache server results', async () => {
			// First search - server fallback
			provider.findPaginated.mockClear();
			const serverResults = createTestEntities(3, 500);
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(serverResults, 1, 1000, 3)
			);

			await searchUseCase.execute('entity_500');

			// Second search for same term - should still hit server (not cached)
			provider.findPaginated.mockResolvedValueOnce(
				PaginatedResult.create(serverResults, 1, 1000, 3)
			);

			await searchUseCase.execute('entity_500');

			// Provider should be called twice (once for each search)
			expect(provider.findPaginated).toHaveBeenCalledTimes(2);
		});

		it('should handle rapid consecutive searches', async () => {
			const searches = ['entity_1', 'entity_2', 'entity_3'];

			const results = await Promise.all(
				searches.map(q => searchUseCase.execute(q))
			);

			expect(results).toHaveLength(3);
			results.forEach(r => {
				expect(r.source).toBe('cache');
				expect(r.results.length).toBeGreaterThan(0);
			});
		});
	});
});

describe('ODataFilterBuilder', () => {
	it('should be a function type', () => {
		const builder: ODataFilterBuilder = (query) => `contains(name, '${query}')`;
		expect(typeof builder).toBe('function');
		expect(builder('test')).toBe("contains(name, 'test')");
	});
});
