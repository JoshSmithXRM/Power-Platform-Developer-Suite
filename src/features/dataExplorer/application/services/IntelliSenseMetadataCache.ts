import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

/**
 * Application Service: IntelliSense Metadata Cache
 *
 * Caches metadata to avoid repeated API calls during typing.
 * Cache is keyed by environment ID, allowing multiple environments
 * to be cached simultaneously.
 *
 * This enables:
 * - Panel and notebooks using the same environment to share cache
 * - Panel and notebooks using different environments to coexist
 * - Switching between environments without losing cached data
 *
 * Entity list is cached indefinitely per environment.
 * Attribute lists are cached per-entity with 5-minute TTL.
 */
export class IntelliSenseMetadataCache {
	private static readonly ATTRIBUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private readonly entityCache = new Map<string, CacheEntry<EntitySuggestion[]>>();
	private readonly attributeCache = new Map<string, CacheEntry<AttributeSuggestion[]>>();

	constructor(private readonly repository: IIntelliSenseMetadataRepository) {}

	/**
	 * Gets entity suggestions, using cache if available.
	 * Entity list is cached indefinitely per environment.
	 */
	public async getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]> {
		const cacheKey = environmentId;
		const cached = this.entityCache.get(cacheKey);

		if (cached !== undefined) {
			return cached.data;
		}

		const entities = await this.repository.getEntitySuggestions(environmentId);
		this.entityCache.set(cacheKey, {
			data: entities,
			timestamp: Date.now(),
		});

		return entities;
	}

	/**
	 * Gets attribute suggestions for an entity, using cache if available.
	 * Attributes are cached per-entity with 5-minute TTL.
	 */
	public async getAttributeSuggestions(
		environmentId: string,
		entityLogicalName: string
	): Promise<AttributeSuggestion[]> {
		const cacheKey = `${environmentId}:${entityLogicalName}`;
		const cached = this.attributeCache.get(cacheKey);

		if (cached !== undefined && !this.isExpired(cached.timestamp)) {
			return cached.data;
		}

		const attributes = await this.repository.getAttributeSuggestions(
			environmentId,
			entityLogicalName
		);

		this.attributeCache.set(cacheKey, {
			data: attributes,
			timestamp: Date.now(),
		});

		return attributes;
	}

	/**
	 * Clears cache for a specific environment.
	 * Useful when environment data is known to be stale.
	 */
	public clearEnvironmentCache(environmentId: string): void {
		// Clear entity cache for this environment
		this.entityCache.delete(environmentId);

		// Clear attribute caches for this environment (prefixed with envId:)
		const attributeKeysToDelete: string[] = [];
		for (const key of this.attributeCache.keys()) {
			if (key.startsWith(`${environmentId}:`)) {
				attributeKeysToDelete.push(key);
			}
		}
		for (const key of attributeKeysToDelete) {
			this.attributeCache.delete(key);
		}
	}

	/**
	 * Clears all cached data for all environments.
	 */
	public clearAllCaches(): void {
		this.entityCache.clear();
		this.attributeCache.clear();
	}

	/**
	 * Disposes the cache.
	 */
	public dispose(): void {
		this.clearAllCaches();
	}

	/**
	 * Returns cache statistics for debugging.
	 */
	public getCacheStats(): { entityCacheSize: number; attributeCacheSize: number } {
		return {
			entityCacheSize: this.entityCache.size,
			attributeCacheSize: this.attributeCache.size,
		};
	}

	private isExpired(timestamp: number): boolean {
		return Date.now() - timestamp > IntelliSenseMetadataCache.ATTRIBUTE_CACHE_TTL_MS;
	}
}
