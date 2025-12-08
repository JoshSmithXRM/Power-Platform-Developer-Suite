import { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import { IntelliSenseMetadataCache } from './IntelliSenseMetadataCache';

describe('IntelliSenseMetadataCache', () => {
	let cache: IntelliSenseMetadataCache;
	let mockRepository: jest.Mocked<IIntelliSenseMetadataRepository>;

	beforeEach(() => {
		mockRepository = {
			getEntitySuggestions: jest.fn(),
			getAttributeSuggestions: jest.fn(),
		};
		cache = new IntelliSenseMetadataCache(mockRepository);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('getEntitySuggestions', () => {
		it('should fetch entities from repository on first call', async () => {
			const entities = [
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('contact', 'Contact', false),
			];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			const result = await cache.getEntitySuggestions('env-123');

			expect(result).toEqual(entities);
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledWith('env-123');
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(1);
		});

		it('should return cached entities on subsequent calls', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-123');
			const result = await cache.getEntitySuggestions('env-123');

			expect(result).toEqual(entities);
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(1);
		});

		it('should cache entities per environment', async () => {
			const env1Entities = [EntitySuggestion.create('account', 'Account', false)];
			const env2Entities = [EntitySuggestion.create('contact', 'Contact', false)];

			mockRepository.getEntitySuggestions
				.mockResolvedValueOnce(env1Entities)
				.mockResolvedValueOnce(env2Entities);

			const result1 = await cache.getEntitySuggestions('env-1');
			const result2 = await cache.getEntitySuggestions('env-2');

			expect(result1).toEqual(env1Entities);
			expect(result2).toEqual(env2Entities);
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(2);
		});

		it('should keep entity cache indefinitely', async () => {
			jest.useFakeTimers();
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-123');

			// Advance time by 1 hour
			jest.advanceTimersByTime(60 * 60 * 1000);

			const result = await cache.getEntitySuggestions('env-123');

			expect(result).toEqual(entities);
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(1);
		});
	});

	describe('getAttributeSuggestions', () => {
		it('should fetch attributes from repository on first call', async () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
			];
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await cache.getAttributeSuggestions('env-123', 'account');

			expect(result).toEqual(attributes);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledWith('env-123', 'account');
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(1);
		});

		it('should return cached attributes on subsequent calls', async () => {
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getAttributeSuggestions('env-123', 'account');
			const result = await cache.getAttributeSuggestions('env-123', 'account');

			expect(result).toEqual(attributes);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(1);
		});

		it('should cache attributes per entity', async () => {
			const accountAttrs = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			const contactAttrs = [AttributeSuggestion.create('fullname', 'Full Name', 'String', false)];

			mockRepository.getAttributeSuggestions
				.mockResolvedValueOnce(accountAttrs)
				.mockResolvedValueOnce(contactAttrs);

			const result1 = await cache.getAttributeSuggestions('env-123', 'account');
			const result2 = await cache.getAttributeSuggestions('env-123', 'contact');

			expect(result1).toEqual(accountAttrs);
			expect(result2).toEqual(contactAttrs);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(2);
		});

		it('should cache attributes per environment', async () => {
			const env1Attrs = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			const env2Attrs = [AttributeSuggestion.create('fullname', 'Full Name', 'String', false)];

			mockRepository.getAttributeSuggestions
				.mockResolvedValueOnce(env1Attrs)
				.mockResolvedValueOnce(env2Attrs);

			const result1 = await cache.getAttributeSuggestions('env-1', 'account');
			const result2 = await cache.getAttributeSuggestions('env-2', 'account');

			expect(result1).toEqual(env1Attrs);
			expect(result2).toEqual(env2Attrs);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(2);
		});

		it('should expire attribute cache after 5 minutes', async () => {
			jest.useFakeTimers();
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			const newAttributes = [AttributeSuggestion.create('name', 'Updated Name', 'String', false)];

			mockRepository.getAttributeSuggestions
				.mockResolvedValueOnce(attributes)
				.mockResolvedValueOnce(newAttributes);

			await cache.getAttributeSuggestions('env-123', 'account');

			// Advance time by 5 minutes + 1ms to trigger expiry
			jest.advanceTimersByTime(5 * 60 * 1000 + 1);

			const result = await cache.getAttributeSuggestions('env-123', 'account');

			expect(result).toEqual(newAttributes);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(2);
		});

		it('should not expire attribute cache before 5 minutes', async () => {
			jest.useFakeTimers();
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getAttributeSuggestions('env-123', 'account');

			// Advance time by 4 minutes 59 seconds
			jest.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);

			const result = await cache.getAttributeSuggestions('env-123', 'account');

			expect(result).toEqual(attributes);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearEnvironmentCache', () => {
		it('should clear entity cache for specific environment', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-123');
			cache.clearEnvironmentCache('env-123');
			await cache.getEntitySuggestions('env-123');

			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(2);
		});

		it('should clear attribute caches for specific environment', async () => {
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getAttributeSuggestions('env-123', 'account');
			await cache.getAttributeSuggestions('env-123', 'contact');
			cache.clearEnvironmentCache('env-123');
			await cache.getAttributeSuggestions('env-123', 'account');

			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(3);
		});

		it('should not affect other environment caches', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-1');
			await cache.getEntitySuggestions('env-2');

			cache.clearEnvironmentCache('env-1');

			await cache.getEntitySuggestions('env-1');
			await cache.getEntitySuggestions('env-2');

			// env-1 should be re-fetched, env-2 should be cached
			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(3);
		});

		it('should handle clearing non-existent environment', () => {
			// Should not throw
			expect(() => cache.clearEnvironmentCache('non-existent')).not.toThrow();
		});
	});

	describe('clearAllCaches', () => {
		it('should clear all entity and attribute caches', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];

			mockRepository.getEntitySuggestions.mockResolvedValue(entities);
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getEntitySuggestions('env-1');
			await cache.getEntitySuggestions('env-2');
			await cache.getAttributeSuggestions('env-1', 'account');
			await cache.getAttributeSuggestions('env-2', 'contact');

			cache.clearAllCaches();

			await cache.getEntitySuggestions('env-1');
			await cache.getAttributeSuggestions('env-1', 'account');

			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(3);
			expect(mockRepository.getAttributeSuggestions).toHaveBeenCalledTimes(3);
		});
	});

	describe('dispose', () => {
		it('should clear all caches on dispose', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-123');

			cache.dispose();

			await cache.getEntitySuggestions('env-123');

			expect(mockRepository.getEntitySuggestions).toHaveBeenCalledTimes(2);
		});
	});

	describe('getCacheStats', () => {
		it('should return zero counts for empty cache', () => {
			const stats = cache.getCacheStats();

			expect(stats.entityCacheSize).toBe(0);
			expect(stats.attributeCacheSize).toBe(0);
		});

		it('should return correct entity cache size', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			mockRepository.getEntitySuggestions.mockResolvedValue(entities);

			await cache.getEntitySuggestions('env-1');
			await cache.getEntitySuggestions('env-2');

			const stats = cache.getCacheStats();

			expect(stats.entityCacheSize).toBe(2);
		});

		it('should return correct attribute cache size', async () => {
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getAttributeSuggestions('env-1', 'account');
			await cache.getAttributeSuggestions('env-1', 'contact');
			await cache.getAttributeSuggestions('env-2', 'account');

			const stats = cache.getCacheStats();

			expect(stats.attributeCacheSize).toBe(3);
		});

		it('should reflect cache state after clears', async () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];
			const attributes = [AttributeSuggestion.create('name', 'Name', 'String', false)];

			mockRepository.getEntitySuggestions.mockResolvedValue(entities);
			mockRepository.getAttributeSuggestions.mockResolvedValue(attributes);

			await cache.getEntitySuggestions('env-1');
			await cache.getAttributeSuggestions('env-1', 'account');

			let stats = cache.getCacheStats();
			expect(stats.entityCacheSize).toBe(1);
			expect(stats.attributeCacheSize).toBe(1);

			cache.clearAllCaches();

			stats = cache.getCacheStats();
			expect(stats.entityCacheSize).toBe(0);
			expect(stats.attributeCacheSize).toBe(0);
		});
	});
});
