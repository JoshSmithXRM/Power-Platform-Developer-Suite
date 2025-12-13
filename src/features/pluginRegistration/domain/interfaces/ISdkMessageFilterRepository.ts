import type { SdkMessageFilter } from '../entities/SdkMessageFilter';

/**
 * Repository interface for SDK message filters.
 * Filters link messages to entities - needed for step registration.
 */
export interface ISdkMessageFilterRepository {
	/**
	 * Find all filters for a specific message.
	 * Returns the entities that support this message.
	 */
	findByMessageId(environmentId: string, messageId: string): Promise<readonly SdkMessageFilter[]>;

	/**
	 * Find a specific filter by message and entity.
	 * Returns null if no filter exists (message doesn't support this entity).
	 */
	findByMessageAndEntity(
		environmentId: string,
		messageId: string,
		entityLogicalName: string
	): Promise<SdkMessageFilter | null>;

	/**
	 * Find filter by ID.
	 */
	findById(environmentId: string, filterId: string): Promise<SdkMessageFilter | null>;
}
