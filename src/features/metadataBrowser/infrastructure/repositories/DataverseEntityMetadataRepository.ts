import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { IConfigurationService } from '../../../../shared/domain/services/IConfigurationService';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { OptionSetMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import { OptionSetMetadataMapper } from '../mappers/OptionSetMetadataMapper';
import { EntityMetadataMapper } from '../mappers/EntityMetadataMapper';
import type {
    EntityMetadataDto,
    AttributeMetadataDto,
    GlobalOptionSetDefinitionDto
} from '../dtos/EntityMetadataDto';

/**
 * OData response wrapper from Dataverse Metadata API.
 */
interface EntityDefinitionsResponse {
    value: EntityMetadataDto[];
}

/**
 * OData response wrapper for GlobalOptionSetDefinitions.
 */
interface GlobalOptionSetDefinitionsResponse {
    value: GlobalOptionSetDefinitionDto[];
}

/**
 * Cache entry for entity metadata with timestamp for expiration tracking.
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Infrastructure implementation of IEntityMetadataRepository using Dataverse Metadata Web API.
 * Fetches entity metadata from Dataverse and maps DTOs to domain entities.
 * Implements in-memory caching for entity metadata to improve performance.
 */
export class DataverseEntityMetadataRepository implements IEntityMetadataRepository {
    /** Default cache duration in seconds (configurable via metadata.cacheDuration) */
    private static readonly DEFAULT_CACHE_DURATION_SECONDS = 300; // 5 minutes

    private readonly entityCache = new Map<string, CacheEntry<EntityMetadata>>();

    /** Configured cache duration in milliseconds */
    private readonly cacheDurationMs: number;

    constructor(
        private readonly apiService: IDataverseApiService,
        private readonly entityMapper: EntityMetadataMapper,
        private readonly optionSetMapper: OptionSetMetadataMapper,
        private readonly logger: ILogger,
        configService?: IConfigurationService
    ) {
        const cacheDurationSeconds = configService?.get('metadata.cacheDuration', DataverseEntityMetadataRepository.DEFAULT_CACHE_DURATION_SECONDS)
            ?? DataverseEntityMetadataRepository.DEFAULT_CACHE_DURATION_SECONDS;
        this.cacheDurationMs = cacheDurationSeconds * 1000;
    }

    /**
     * Retrieves all entity metadata from Dataverse (without attributes/relationships).
     */
    public async getAllEntities(environmentId: string): Promise<readonly EntityMetadata[]> {
        this.logger.debug('Fetching all entity metadata from Dataverse', { environmentId });

        try {
            // Optimized: Only fetch fields needed for tree display and basic entity info
            // Reduced from 20+ fields to 5 essential fields for ~75% payload reduction
            // Tree only displays: DisplayName, LogicalName, Icon (from IsCustomEntity)
            const endpoint = '/api/data/v9.2/EntityDefinitions?$select=MetadataId,LogicalName,SchemaName,DisplayName,IsCustomEntity';
            const response = await this.apiService.get<EntityDefinitionsResponse>(environmentId, endpoint);

            if (!response?.value) {
                throw new Error('Cannot fetch entities: invalid response structure from Dataverse Metadata API');
            }

            this.logger.debug('Received entity metadata', { count: response.value.length });

            const entities = response.value.map(dto => this.entityMapper.mapDtoToEntityWithoutAttributes(dto));
            return entities;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity metadata', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Generates cache key for entity metadata.
     */
    private getCacheKey(environmentId: string, logicalName: string): string {
        return `${environmentId}:${logicalName}`;
    }

    /**
     * Checks if a cache entry is still valid based on timestamp.
     */
    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.cacheDurationMs;
    }

    /**
     * Retrieves entity metadata from cache if available and not expired.
     */
    private getFromCache(environmentId: string, logicalName: string): EntityMetadata | null {
        const key = this.getCacheKey(environmentId, logicalName);
        const entry = this.entityCache.get(key);

        if (!entry) {
            return null;
        }

        if (!this.isCacheValid(entry.timestamp)) {
            this.entityCache.delete(key);
            this.logger.debug('Cache entry expired, removing', { environmentId, logicalName });
            return null;
        }

        return entry.data;
    }

    /**
     * Stores entity metadata in cache with current timestamp.
     */
    private setCache(environmentId: string, logicalName: string, data: EntityMetadata): void {
        const key = this.getCacheKey(environmentId, logicalName);
        this.entityCache.set(key, {
            data,
            timestamp: Date.now()
        });
        this.logger.debug('Entity metadata cached', {
            environmentId,
            logicalName,
            cacheSize: this.entityCache.size
        });
    }

    /**
     * Clears all cached entity metadata.
     * Called when user clicks refresh or switches environments.
     */
    public clearCache(): void {
        const cacheSize = this.entityCache.size;
        this.entityCache.clear();
        this.logger.info('Entity metadata cache cleared', { clearedEntries: cacheSize });
    }

    /**
     * Retrieves full entity metadata including attributes, relationships, and keys.
     * Uses 5-minute in-memory cache to avoid repeated API calls for the same entity.
     */
    public async getEntityWithAttributes(environmentId: string, logicalName: LogicalName): Promise<EntityMetadata> {
        // Check cache first
        const cached = this.getFromCache(environmentId, logicalName.getValue());
        if (cached) {
            this.logger.debug('Using cached entity metadata', {
                environmentId,
                logicalName: logicalName.getValue()
            });
            return cached;
        }

        this.logger.debug('Fetching entity with full metadata', { environmentId, logicalName: logicalName.getValue() });

        try {
            // Use $expand for optimal performance - single request is faster than multiple parallel requests
            // Benchmark results show $expand is 2x+ faster due to reduced network overhead
            const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName.getValue()}')?$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys`;
            const dto = await this.apiService.get<EntityMetadataDto>(environmentId, endpoint);

            if (!dto) {
                throw new Error(`Cannot fetch entity: entity "${logicalName.getValue()}" not found in Dataverse`);
            }

            this.logger.debug('Received full entity metadata', {
                logicalName: logicalName.getValue(),
                attributeCount: dto.Attributes?.length || 0,
                oneToManyCount: dto.OneToManyRelationships?.length || 0,
                manyToOneCount: dto.ManyToOneRelationships?.length || 0,
                manyToManyCount: dto.ManyToManyRelationships?.length || 0,
                keyCount: dto.Keys?.length || 0
            });

            // Enrich attributes with OptionSet data using typed metadata endpoints
            await this.enrichAttributesWithOptionSets(environmentId, logicalName.getValue(), dto);

            const entity = this.entityMapper.mapDtoToEntityWithAttributes(dto);

            // Cache the result
            this.setCache(environmentId, logicalName.getValue(), entity);

            return entity;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch entity with attributes', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Retrieves all global choice (option set) metadata from Dataverse.
     */
    public async getAllGlobalChoices(environmentId: string): Promise<readonly OptionSetMetadata[]> {
        this.logger.debug('Fetching all global choice metadata from Dataverse', { environmentId });

        try {
            // Optimized: Only fetch fields needed for tree display (Name, DisplayName, IsCustomOptionSet)
            // Reduced from 7 fields to 3 for ~60% payload reduction
            // Tree only displays: DisplayName, Name, Icon (from IsCustomOptionSet)
            const endpoint = '/api/data/v9.2/GlobalOptionSetDefinitions?$select=Name,DisplayName,IsCustomOptionSet';
            const response = await this.apiService.get<GlobalOptionSetDefinitionsResponse>(environmentId, endpoint);

            if (!response?.value) {
                throw new Error('Cannot fetch global choices: invalid response structure from Dataverse Metadata API');
            }

            this.logger.debug('Received global choice metadata', { count: response.value.length });

            const globalChoices = response.value.map(dto => this.optionSetMapper.mapGlobalOptionSetDtoToValueObject(dto));
            return globalChoices;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch global choice metadata', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Retrieves a specific global choice (option set) by name.
     */
    public async getGlobalChoiceWithOptions(environmentId: string, name: string): Promise<OptionSetMetadata> {
        this.logger.debug('Fetching global choice by name', { environmentId, name });

        try {
            // Options is a collection property, included by default (no $expand needed)
            const endpoint = `/api/data/v9.2/GlobalOptionSetDefinitions(Name='${name}')`;
            const dto = await this.apiService.get<GlobalOptionSetDefinitionDto>(environmentId, endpoint);

            if (!dto) {
                throw new Error(`Cannot fetch global choice: choice "${name}" not found in Dataverse`);
            }

            this.logger.debug('Received global choice metadata', {
                name,
                optionCount: dto.Options?.length || 0
            });

            const globalChoice = this.optionSetMapper.mapGlobalOptionSetDtoToValueObject(dto);
            return globalChoice;
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to fetch global choice by name', normalizedError);
            throw normalizedError;
        }
    }

    /**
     * Enriches attribute DTOs with OptionSet data using typed metadata endpoints.
     * The generic Attributes endpoint doesn't support nested $expand for OptionSet,
     * but typed endpoints like PicklistAttributeMetadata do support $expand=OptionSet,GlobalOptionSet.
     *
     * Fetches all option set types: Picklist, State, Status, Boolean, MultiSelectPicklist
     */
    private async enrichAttributesWithOptionSets(
        environmentId: string,
        entityLogicalName: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        if (!entityDto.Attributes || entityDto.Attributes.length === 0) {
            return;
        }

        try {
            const baseUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`;

            // Fetch all option set attribute types in parallel
            const [picklistResponse, stateResponse, statusResponse, booleanResponse, multiSelectResponse] =
                await Promise.all([
                    // Picklist attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet`
                    ),
                    // State attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet`
                    ),
                    // Status attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet`
                    ),
                    // Boolean attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$expand=OptionSet`
                    ),
                    // Multi-select picklist attributes with OptionSet expanded
                    this.apiService.get<{ value: AttributeMetadataDto[] }>(
                        environmentId,
                        `${baseUrl}/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$expand=OptionSet,GlobalOptionSet`
                    )
                ]);

            // Combine all attributes into a single map
            const optionSetAttrMap = new Map<string, AttributeMetadataDto>();

            const allAttrs = [
                ...(picklistResponse?.value || []),
                ...(stateResponse?.value || []),
                ...(statusResponse?.value || []),
                ...(booleanResponse?.value || []),
                ...(multiSelectResponse?.value || [])
            ];

            for (const attr of allAttrs) {
                optionSetAttrMap.set(attr.LogicalName, attr);
            }

            this.logger.debug('Fetched option set attributes', {
                total: optionSetAttrMap.size,
                picklist: picklistResponse?.value?.length || 0,
                state: stateResponse?.value?.length || 0,
                status: statusResponse?.value?.length || 0,
                boolean: booleanResponse?.value?.length || 0,
                multiSelect: multiSelectResponse?.value?.length || 0
            });

            // Merge OptionSet data into main attributes
            for (const attr of entityDto.Attributes) {
                const enrichedAttr = optionSetAttrMap.get(attr.LogicalName);
                if (enrichedAttr) {
                    if (enrichedAttr.OptionSet !== undefined) {
                        attr.OptionSet = enrichedAttr.OptionSet;
                    }
                    if (enrichedAttr.GlobalOptionSet !== undefined) {
                        attr.GlobalOptionSet = enrichedAttr.GlobalOptionSet;
                    }
                }
            }

            this.logger.debug('Enriched attributes with OptionSet data (typed endpoints)', {
                enrichedCount: optionSetAttrMap.size
            });

            // Step 2: Enrich global option sets with full option values
            await this.enrichGlobalOptionSets(environmentId, entityDto);
        } catch (error) {
            this.logger.warn('Failed to enrich attributes with OptionSet data', { error });
            // Don't throw - continue with what we have
        }
    }

    /**
     * Enriches attributes that reference global option sets with full option values.
     * Global option set references only contain a name - we need to fetch the full definition.
     */
    private async enrichGlobalOptionSets(
        environmentId: string,
        entityDto: EntityMetadataDto
    ): Promise<void> {
        if (!entityDto.Attributes || entityDto.Attributes.length === 0) {
            return;
        }

        // Collect unique global option set names that need enrichment
        const globalOptionSetNames = new Set<string>();
        for (const attr of entityDto.Attributes) {
            // Check if this attribute has a global option set with empty or missing options
            // Global option sets can be indicated in two ways:
            // 1. Separate GlobalOptionSet property with a Name
            // 2. OptionSet property with IsGlobal=true and a Name
            let globalOptionSetName: string | null = null;

            if (attr.GlobalOptionSet?.Name) {
                globalOptionSetName = attr.GlobalOptionSet.Name;
            } else if (attr.OptionSet?.IsGlobal && attr.OptionSet?.Name) {
                globalOptionSetName = attr.OptionSet.Name;
            }

            if (globalOptionSetName && (!attr.OptionSet?.Options || attr.OptionSet.Options.length === 0)) {
                globalOptionSetNames.add(globalOptionSetName);
            }
        }

        if (globalOptionSetNames.size === 0) {
            return;
        }

        this.logger.debug('Fetching global option set definitions', {
            count: globalOptionSetNames.size,
            names: Array.from(globalOptionSetNames)
        });

        try {
            // Fetch all global option sets in parallel
            const globalOptionSetPromises = Array.from(globalOptionSetNames).map(async (name) => {
                try {
                    const endpoint = `/api/data/v9.2/GlobalOptionSetDefinitions(Name='${name}')`;
                    const dto = await this.apiService.get<GlobalOptionSetDefinitionDto>(environmentId, endpoint);
                    return dto;
                } catch (error) {
                    this.logger.warn('Failed to fetch global option set', { name, error });
                    return null;
                }
            });

            const globalOptionSets = await Promise.all(globalOptionSetPromises);

            // Create a map for quick lookup
            const optionSetMap = new Map<string, GlobalOptionSetDefinitionDto>();
            for (const optionSet of globalOptionSets) {
                if (optionSet) {
                    optionSetMap.set(optionSet.Name, optionSet);
                }
            }

            // Merge full global option set data into attributes
            for (const attr of entityDto.Attributes) {
                // Determine the global option set name (could be in GlobalOptionSet or OptionSet)
                let globalOptionSetName: string | null = null;

                if (attr.GlobalOptionSet?.Name) {
                    globalOptionSetName = attr.GlobalOptionSet.Name;
                } else if (attr.OptionSet?.IsGlobal && attr.OptionSet?.Name) {
                    globalOptionSetName = attr.OptionSet.Name;
                }

                if (globalOptionSetName) {
                    const fullOptionSet = optionSetMap.get(globalOptionSetName);
                    if (fullOptionSet?.Options) {
                        // Replace the empty OptionSet with full data from global definition
                        attr.OptionSet = {
                            Name: fullOptionSet.Name,
                            IsGlobal: fullOptionSet.IsGlobal ?? true,
                            OptionSetType: fullOptionSet.OptionSetType ?? 'Picklist',
                            Options: fullOptionSet.Options
                        };
                    }
                }
            }

            this.logger.debug('Enriched attributes with global option set values', {
                enrichedCount: optionSetMap.size
            });
        } catch (error) {
            this.logger.warn('Failed to enrich global option sets', { error });
            // Don't throw - continue with what we have
        }
    }
}
