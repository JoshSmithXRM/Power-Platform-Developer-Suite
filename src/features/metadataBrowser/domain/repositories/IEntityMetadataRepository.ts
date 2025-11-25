import { EntityMetadata } from '../entities/EntityMetadata';
import { LogicalName } from '../valueObjects/LogicalName';
import { OptionSetMetadata } from '../valueObjects/OptionSetMetadata';

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

    /**
     * Retrieves all global choice (option set) metadata from the Dataverse environment.
     * @param environmentId Power Platform environment GUID
     * @returns Array of global choice metadata for tree display
     */
    getAllGlobalChoices(environmentId: string): Promise<readonly OptionSetMetadata[]>;

    /**
     * Retrieves a specific global choice (option set) by name with all options.
     * @param environmentId Power Platform environment GUID
     * @param name The name of the global choice
     * @returns Global choice metadata with all options
     */
    getGlobalChoiceWithOptions(environmentId: string, name: string): Promise<OptionSetMetadata>;

    /**
     * Clears all cached entity metadata.
     * Should be called when user clicks refresh or switches environments.
     */
    clearCache(): void;
}
