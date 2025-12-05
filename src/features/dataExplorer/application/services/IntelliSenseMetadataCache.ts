import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';

import type { IntelliSenseContextService } from './IntelliSenseContextService';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

/**
 * Application Service: IntelliSense Metadata Cache
 *
 * Caches metadata to avoid repeated API calls during typing.
 * Entity list is cached indefinitely (metadata rarely changes).
 * Attribute lists are cached per-entity with 5-minute TTL.
 *
 * Automatically clears cache when environment changes.
 */
export class IntelliSenseMetadataCache {
	private static readonly ATTRIBUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	private readonly entityCache = new Map<string, CacheEntry<EntitySuggestion[]>>();
	private readonly attributeCache = new Map<string, CacheEntry<AttributeSuggestion[]>>();
	private readonly unsubscribe: () => void;

	constructor(
		private readonly repository: IIntelliSenseMetadataRepository,
		contextService: IntelliSenseContextService
	) {
		// Clear cache when environment changes
		this.unsubscribe = contextService.onEnvironmentChange(() => {
			this.clearCache();
		});
	}

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
	 * Clears all caches.
	 */
	public clearCache(): void {
		this.entityCache.clear();
		this.attributeCache.clear();
	}

	/**
	 * Disposes the cache and unsubscribes from context changes.
	 */
	public dispose(): void {
		this.unsubscribe();
		this.clearCache();
	}

	private isExpired(timestamp: number): boolean {
		return Date.now() - timestamp > IntelliSenseMetadataCache.ATTRIBUTE_CACHE_TTL_MS;
	}
}
