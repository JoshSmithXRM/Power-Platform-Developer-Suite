import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

export interface AttributeMetadata {
    logicalName: string;
    attributeType: string;
    displayName: string;
    isLookup: boolean;
    lookupTargets?: string[];
}

export interface EntityMetadataCache {
    [entityLogicalName: string]: {
        attributes: { [attributeName: string]: AttributeMetadata };
        lastUpdated: number;
    };
}

export class DataverseMetadataService {
    private metadataCache: EntityMetadataCache = {};
    private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('DataverseMetadataService');
        }
        return this._logger;
    }

    constructor(private authService: AuthenticationService) {}

    /**
     * Get entity attributes with caching
     */
    async getEntityAttributes(environmentId: string, entityLogicalName: string): Promise<AttributeMetadata[]> {
        const cacheKey = entityLogicalName;
        const now = Date.now();
        
        this.logger.debug('Requesting entity attributes', { environmentId, entityLogicalName });
        
        // Check cache first
        if (this.metadataCache[cacheKey] && 
            (now - this.metadataCache[cacheKey].lastUpdated) < this.CACHE_DURATION) {
            this.logger.debug('Using cached metadata for entity', { 
                entityLogicalName, 
                cacheAge: now - this.metadataCache[cacheKey].lastUpdated,
                attributesCount: Object.keys(this.metadataCache[cacheKey].attributes).length
            });
            return Object.values(this.metadataCache[cacheKey].attributes);
        }

        this.logger.info('Fetching metadata for entity', { environmentId, entityLogicalName });
        
        try {
            const token = await this.authService.getAccessToken(environmentId);
            const environment = await this.authService.getEnvironment(environmentId);
            if (!environment) {
                this.logger.error('Environment not found during metadata request', new Error('Environment not found'), { 
                    environmentId, 
                    entityLogicalName 
                });
                throw new Error('Environment not found');
            }
            
            const baseUrl = environment.settings.dataverseUrl;
            const url = `${baseUrl}/api/data/v9.2/EntityDefinitions?$filter=LogicalName eq '${entityLogicalName}'&$expand=Attributes&$select=LogicalName,DisplayName`;
            
            this.logger.debug('Making Dataverse metadata API call', { 
                url, 
                entityLogicalName, 
                dataverseUrl: baseUrl 
            });
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                this.logger.error('Failed to fetch entity metadata', new Error('API request failed'), { 
                    entityLogicalName, 
                    status: response.status, 
                    statusText: response.statusText,
                    environmentId
                });
                throw new Error(`Failed to fetch entity metadata: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.value || data.value.length === 0) {
                this.logger.error('Entity not found in metadata response', new Error('Entity not found'), { 
                    entityLogicalName, 
                    environmentId,
                    responseSize: data.value?.length || 0
                });
                throw new Error(`Entity ${entityLogicalName} not found`);
            }

            const entityData = data.value[0];
            const attributes: { [key: string]: AttributeMetadata } = {};

            // Process attributes
            if (entityData.Attributes) {
                entityData.Attributes.forEach((attr: any) => {
                    const attributeMetadata: AttributeMetadata = {
                        logicalName: attr.LogicalName,
                        attributeType: attr.AttributeType || attr['@odata.type']?.split('.').pop(),
                        displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
                        isLookup: attr.AttributeType === 'Lookup' || attr.AttributeType === 'Customer' || attr.AttributeType === 'Owner',
                        lookupTargets: attr.Targets || []
                    };
                    
                    attributes[attr.LogicalName] = attributeMetadata;
                });
            }

            // Cache the results
            this.metadataCache[cacheKey] = {
                attributes,
                lastUpdated: now
            };

            this.logger.info('Entity metadata cached successfully', { 
                entityLogicalName,
                attributesCount: Object.keys(attributes).length,
                environmentId
            });
            
            return Object.values(attributes);

        } catch (error) {
            this.logger.error('Error fetching entity metadata', error as Error, { 
                entityLogicalName, 
                environmentId,
                operation: 'getEntityAttributes'
            });
            throw error;
        }
    }

    /**
     * Get specific attribute metadata
     */
    async getAttributeMetadata(environmentId: string, entityLogicalName: string, attributeName: string): Promise<AttributeMetadata | null> {
        try {
            this.logger.debug('Requesting specific attribute metadata', { 
                environmentId, 
                entityLogicalName, 
                attributeName 
            });
            
            const attributes = await this.getEntityAttributes(environmentId, entityLogicalName);
            const attribute = attributes.find(attr => attr.logicalName === attributeName) || null;
            
            if (attribute) {
                this.logger.debug('Attribute metadata found', { 
                    entityLogicalName, 
                    attributeName,
                    attributeType: attribute.attributeType,
                    isLookup: attribute.isLookup
                });
            } else {
                this.logger.warn('Attribute not found in entity metadata', {
                    entityLogicalName,
                    attributeName,
                    availableAttributes: attributes.length
                });
            }
            
            return attribute;
        } catch (error) {
            this.logger.warn('Failed to get metadata for attribute', {
                attributeName,
                entityLogicalName,
                environmentId,
                error: (error as Error).message,
                operation: 'getAttributeMetadata'
            });
            return null;
        }
    }

    /**
     * Format a value for OData based on attribute metadata
     */
    formatODataValue(value: any, attributeMetadata: AttributeMetadata | null): string {
        if (value === null || value === undefined) {
            return 'null';
        }

        // If no metadata available, fall back to heuristics
        if (!attributeMetadata) {
            return this.formatValueWithHeuristics(value);
        }

        switch (attributeMetadata.attributeType) {
            case 'String':
            case 'Memo':
                return `'${value}'`;
                
            case 'Integer':
            case 'BigInt':
            case 'Decimal':
            case 'Double':
            case 'Money':
                return this.formatNumericValue(value);
                
            case 'DateTime':
                return this.formatDateTimeValue(value);
                
            case 'Uniqueidentifier':
                return `guid'${value}'`;
                
            case 'Lookup':
            case 'Customer':
            case 'Owner':
                // For lookup fields, we need to use the _fieldname_value format
                return `guid'${value}'`;
                
            case 'Boolean':
                return this.formatBooleanValue(value);
                
            case 'Picklist':
            case 'State':
            case 'Status':
                // Option set values are integers
                return this.formatNumericValue(value);
                
            default:
                this.logger.warn('Unknown attribute type, falling back to string', { attributeType: attributeMetadata.attributeType });
                return `'${value}'`;
        }
    }

    /**
     * Get the correct field name for OData queries (handles lookup field conversion)
     */
    getODataFieldName(fieldName: string, attributeMetadata: AttributeMetadata | null): string {
        if (!attributeMetadata) {
            // Fallback for known lookup fields
            if (fieldName === 'ownerid') {
                return '_ownerid_value';
            }
            return fieldName;
        }

        if (attributeMetadata.isLookup) {
            return `_${fieldName}_value`;
        }

        return fieldName;
    }

    /**
     * Fallback formatting when metadata is not available
     */
    private formatValueWithHeuristics(value: any): string {
        if (typeof value === 'number') {
            return value.toString();
        }
        
        if (typeof value === 'boolean') {
            return value.toString().toLowerCase();
        }
        
        if (typeof value === 'string') {
            // Check if it's a GUID
            const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (guidPattern.test(value)) {
                return `guid'${value}'`;
            }
            
            // Check if it's a number string for common integer fields
            const numericValue = Number(value);
            if (!isNaN(numericValue) && value.trim() !== '' && 
                (value.includes('statecode') || value.includes('statuscode') || value.endsWith('code'))) {
                return value;
            }
            
            return `'${value}'`;
        }
        
        return `'${value}'`;
    }

    private formatNumericValue(value: any): string {
        return Number(value).toString();
    }

    private formatDateTimeValue(value: any): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value.toString();
    }

    private formatBooleanValue(value: any): string {
        if (typeof value === 'boolean') {
            return value.toString().toLowerCase();
        }
        // Handle string boolean values
        const stringValue = value.toString().toLowerCase();
        return (stringValue === 'true' || stringValue === '1') ? 'true' : 'false';
    }

    /**
     * Clear cache for testing or memory management
     */
    clearCache(): void {
        this.metadataCache = {};
        this.logger.info('Metadata cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { entities: number; totalAttributes: number } {
        const entities = Object.keys(this.metadataCache).length;
        const totalAttributes = Object.values(this.metadataCache)
            .reduce((sum, entity) => sum + Object.keys(entity.attributes).length, 0);
        
        return { entities, totalAttributes };
    }
}