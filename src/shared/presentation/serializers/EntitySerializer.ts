/**
 * Base interface for serializing domain entities to raw API format.
 *
 * Purpose: The "Raw Data" tab should show ACTUAL API response data,
 * not domain entities with value object wrappers or presentation formatting.
 *
 * Example issue:
 * - Domain: { logicalName: LogicalName { value: "account" } }
 * - API:    { "logicalname": "account" }
 *
 * This serializer converts domain entities back to API format.
 */
export interface IEntitySerializer<TEntity> {
	/**
	 * Serializes a domain entity to raw API format.
	 * Returns a plain object matching the actual API response structure.
	 */
	serializeToRaw(entity: TEntity): Record<string, unknown>;
}
