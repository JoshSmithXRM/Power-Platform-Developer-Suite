import { EntityMetadata } from '../entities/EntityMetadata';
import { LogicalName } from '../valueObjects/LogicalName';

/**
 * Repository interface for entity metadata operations.
 * Domain layer defines the contract; infrastructure layer implements it.
 */
export interface IEntityMetadataRepository {
    /**
     * Retrieves all entity metadata from the Dataverse environment.
     * Returns entity metadata with basic properties only (no attributes loaded).
     * @param environmentId Power Platform environment GUID
     * @returns Array of entity metadata for tree display
     */
    getAllEntities(environmentId: string): Promise<readonly EntityMetadata[]>;

    /**
     * Retrieves full entity metadata including all attributes.
     * @param environmentId Power Platform environment GUID
     * @param logicalName The logical name of the entity
     * @returns Full entity metadata with attributes
     */
    getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata>;
}
