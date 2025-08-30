import { AuthenticationService } from './AuthenticationService';

export interface EntityMetadata {
    id: string;
    logicalName: string;
    displayName: string;
    schemaName: string;
    description?: string;
    entitySetName: string;
    isCustomEntity: boolean;
    isVirtualEntity: boolean;
    primaryIdAttribute: string;
    primaryNameAttribute: string;
    recordCount?: number;
}

export interface FieldMetadata {
    logicalName: string;
    displayName: string;
    schemaName: string;
    attributeType: string;
    isRequired: boolean;
    isSearchable: boolean;
    isPrimaryId: boolean;
    isPrimaryName: boolean;
}

export interface QueryFilter {
    field: string;
    operator: FilterOperator;
    value: any;
    logicalOperator?: 'and' | 'or';
}

export enum FilterOperator {
    Equals = 'eq',
    NotEquals = 'ne',
    Contains = 'contains',
    StartsWith = 'startswith',
    EndsWith = 'endswith',
    GreaterThan = 'gt',
    GreaterThanOrEqual = 'ge',
    LessThan = 'lt',
    LessThanOrEqual = 'le',
    In = 'in',
    NotIn = 'not in',
    Null = 'null',
    NotNull = 'not null'
}

export interface QueryOptions {
    select?: string[];
    filters?: QueryFilter[];
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    expand?: string[];
    maxPageSize?: number;
}

export interface QueryResult {
    value: any[];
    count?: number;
    nextLink?: string;
    hasMore: boolean;
}

/**
 * Service for querying Dataverse data
 */
export class DataverseQueryService {
    constructor(private authService: AuthenticationService) {}

    /**
     * Get all entities metadata for an environment
     */
    async getEntities(environmentId: string): Promise<EntityMetadata[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;
        
        // Build the query URL - note: some fields might not exist in all versions
        const queryUrl = `${baseUrl}/api/data/v9.2/EntityDefinitions?$select=LogicalName,SchemaName,EntitySetName,IsCustomEntity,PrimaryIdAttribute,PrimaryNameAttribute&$filter=IsValidForAdvancedFind eq true`;
        
        console.log('Fetching entities from:', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Prefer': 'odata.include-annotations="*"'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Entity fetch error:', errorText);
            throw new Error(`Failed to fetch entities: ${response.statusText}`);
        }

        const data = await response.json();
        
        return data.value.map((entity: any) => ({
            id: entity.MetadataId,
            logicalName: entity.LogicalName,
            displayName: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName,
            schemaName: entity.SchemaName,
            description: entity.Description?.UserLocalizedLabel?.Label || '',
            entitySetName: entity.EntitySetName,
            isCustomEntity: entity.IsCustomEntity || false,
            isVirtualEntity: entity.IsVirtualEntity || false,
            primaryIdAttribute: entity.PrimaryIdAttribute,
            primaryNameAttribute: entity.PrimaryNameAttribute
        }));
    }

    /**
     * Get fields metadata for an entity
     */
    async getEntityFields(environmentId: string, entityLogicalName: string): Promise<FieldMetadata[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;
        
        const response = await fetch(
            `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,DisplayName,SchemaName,AttributeType,RequiredLevel,IsValidForAdvancedFind,IsPrimaryId,IsPrimaryName&$filter=IsValidForAdvancedFind eq true`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch entity fields: ${response.statusText}`);
        }

        const data = await response.json();
        
        return data.value.map((field: any) => ({
            logicalName: field.LogicalName,
            displayName: field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName,
            schemaName: field.SchemaName,
            attributeType: field.AttributeType,
            isRequired: field.RequiredLevel?.Value === 'ApplicationRequired' || field.RequiredLevel?.Value === 'SystemRequired',
            isSearchable: field.IsValidForAdvancedFind,
            isPrimaryId: field.IsPrimaryId,
            isPrimaryName: field.IsPrimaryName
        }));
    }

    /**
     * Query entity records
     */
    async queryRecords(
        environmentId: string, 
        entitySetName: string, 
        options: QueryOptions = {}
    ): Promise<QueryResult> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;
        
        // Build OData query string
        const queryParts: string[] = [];
        
        // Select fields
        if (options.select && options.select.length > 0) {
            queryParts.push(`$select=${options.select.join(',')}`);
        }
        
        // Filters
        if (options.filters && options.filters.length > 0) {
            const filterString = this.buildFilterString(options.filters);
            if (filterString) {
                queryParts.push(`$filter=${filterString}`);
            }
        }
        
        // Ordering - REQUIRED for consistent pagination
        if (options.orderBy && options.orderBy.length > 0) {
            const orderByString = options.orderBy
                .map(o => `${o.field} ${o.direction}`)
                .join(',');
            queryParts.push(`$orderby=${orderByString}`);
        }
        
        // Expand related entities
        if (options.expand && options.expand.length > 0) {
            queryParts.push(`$expand=${options.expand.join(',')}`);
        }
        
        const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
        const url = `${baseUrl}/api/data/v9.2/${entitySetName}${queryString}`;
        
        // Build headers with proper pagination
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        };
        
        // Set page size using Prefer header (NOT $top)
        if (options.maxPageSize && options.maxPageSize > 0) {
            headers['Prefer'] = `odata.maxpagesize=${options.maxPageSize}`;
        }
        
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Failed to query records: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            value: data.value,
            count: data['@odata.count'],
            nextLink: data['@odata.nextLink'],
            hasMore: !!data['@odata.nextLink']
        };
    }

    /**
     * Query next page using @odata.nextLink
     */
    async queryNextPage(environmentId: string, nextLink: string): Promise<QueryResult> {
        const token = await this.authService.getAccessToken(environmentId);
        
        const response = await fetch(nextLink, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Prefer': 'odata.maxpagesize=200'  // Must re-apply page size for nextLink
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to query next page: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            value: data.value,
            count: data['@odata.count'],
            nextLink: data['@odata.nextLink'],
            hasMore: !!data['@odata.nextLink']
        };
    }

    /**
     * Build OData filter string from filters
     */
    private buildFilterString(filters: QueryFilter[]): string {
        if (!filters || filters.length === 0) return '';
        
        const filterParts = filters.map((filter, index) => {
            let filterStr = '';
            
            // Add logical operator if not first filter
            if (index > 0 && filter.logicalOperator) {
                filterStr += ` ${filter.logicalOperator} `;
            }
            
            // Build filter expression based on operator
            switch (filter.operator) {
                case FilterOperator.Contains:
                    filterStr += `contains(${filter.field},'${filter.value}')`;
                    break;
                case FilterOperator.StartsWith:
                    filterStr += `startswith(${filter.field},'${filter.value}')`;
                    break;
                case FilterOperator.EndsWith:
                    filterStr += `endswith(${filter.field},'${filter.value}')`;
                    break;
                case FilterOperator.Null:
                    filterStr += `${filter.field} eq null`;
                    break;
                case FilterOperator.NotNull:
                    filterStr += `${filter.field} ne null`;
                    break;
                case FilterOperator.In:
                    // For 'in' operator, expect value to be an array
                    const inValues = Array.isArray(filter.value) ? filter.value : [filter.value];
                    const inConditions = inValues.map(v => `${filter.field} eq '${v}'`).join(' or ');
                    filterStr += `(${inConditions})`;
                    break;
                default:
                    // For standard comparison operators
                    const value = typeof filter.value === 'string' ? `'${filter.value}'` : filter.value;
                    filterStr += `${filter.field} ${filter.operator} ${value}`;
            }
            
            return filterStr;
        });
        
        return filterParts.join('');
    }

    /**
     * Get estimated record count for an entity
     */
    async getRecordCount(environmentId: string, entitySetName: string): Promise<number> {
        const result = await this.queryRecords(environmentId, entitySetName, {
            maxPageSize: 1
        });
        
        return result.count || 0;
    }
}