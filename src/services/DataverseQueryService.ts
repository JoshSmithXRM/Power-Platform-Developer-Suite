import { AuthenticationService } from './AuthenticationService';
import { DataverseMetadataService } from './DataverseMetadataService';
import { ServiceFactory } from './ServiceFactory';

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

export interface EntityView {
    id: string;
    name: string;
    description?: string;
    queryType: number;
    isDefault: boolean;
    fetchXml: string;
    layoutXml?: string;
    isSystem: boolean;
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
    fetchXml?: string; // For tracking FetchXML queries
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
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('DataverseQueryService');
        }
        return this._logger;
    }

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
        
        this.logger.debug('Fetching entities from URL', { queryUrl });
        
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
            this.logger.error('Entity fetch error', new Error(errorText));
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
     * Get views (saved queries) for an entity
     */
    async getEntityViews(environmentId: string, entityLogicalName: string): Promise<EntityView[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;
        
        // Query both system views (savedquery) and user views (userquery)
        const systemViewsUrl = `${baseUrl}/api/data/v9.2/savedqueries?$select=savedqueryid,name,description,querytype,isdefault,fetchxml,layoutxml&$filter=returnedtypecode eq '${entityLogicalName}' and querytype eq 0 and statecode eq 0`;
        
        const response = await fetch(systemViewsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Failed to fetch entity views', new Error(errorText));
            // Return empty array instead of throwing - views are optional
            return [];
        }

        const data = await response.json();
        
        // Log raw view data for debugging
        this.logger.debug('Raw views data from API', { count: data.value?.length || 0 });
        
        const views = data.value.map((view: any) => {
            const mappedView = {
                id: view.savedqueryid,
                name: view.name,
                description: view.description,
                queryType: view.querytype,
                isDefault: view.isdefault || false,
                fetchXml: view.fetchxml,
                layoutXml: view.layoutxml,
                isSystem: true
            };
            
            // Log each view's details
            this.logger.debug('View details', {
                name: mappedView.name,
                id: mappedView.id,
                isDefault: mappedView.isDefault,
                hasFetchXml: !!mappedView.fetchXml,
                hasLayoutXml: !!mappedView.layoutXml
            });
            
            return mappedView;
        });
        
        this.logger.info('Entity views loaded', { entityLogicalName, count: views.length });
        return views;
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
     * Execute FetchXML directly against the Web API (preferred method for view queries)
     */
    async executeFetchXml(environmentId: string, fetchXml: string): Promise<QueryResult> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        // Extract entity set name from FetchXML for the URL
        const entityMatch = fetchXml.match(/<entity[^>]+name="([^"]+)"/);
        if (!entityMatch) {
            throw new Error('Could not determine entity name from FetchXML');
        }
        
        const entityLogicalName = entityMatch[1];
        const entitySetName = this.getEntitySetNameFromLogicalName(entityLogicalName);
        
        // URL encode the FetchXML
        const encodedFetchXml = encodeURIComponent(fetchXml);
        const url = `${baseUrl}/api/data/v9.2/${entitySetName}?fetchXml=${encodedFetchXml}`;

        this.logger.debug('Executing FetchXML query', { url, entityLogicalName });

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'odata.maxpagesize=200'
        };

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        this.logger.debug('Starting FetchXML request');
        let response: Response;
        try {
            response = await fetch(url, { 
                headers,
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            this.logger.debug('FetchXML request completed', { status: response.status, statusText: response.statusText });
        } catch (error) {
            clearTimeout(timeoutId);
            this.logger.error('FetchXML fetch error', error instanceof Error ? error : new Error(String(error)));
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('FetchXML request timed out after 30 seconds');
            }
            throw error;
        }

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('FetchXML error response', new Error(errorText));
            throw new Error(`FetchXML query failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        const result: QueryResult = {
            value: data.value || [],
            count: data['@odata.count'],
            nextLink: data['@odata.nextLink'],
            hasMore: !!data['@odata.nextLink']
        };

        this.logger.info('FetchXML query completed successfully', {
            recordsReturned: result.value.length,
            totalCount: result.count,
            hasMore: result.hasMore
        });

        return result;
    }

    /**
     * Query entity records using OData (for custom queries)
     */
    async queryRecords(
        environmentId: string, 
        entitySetName: string, 
        options: QueryOptions = {},
        metadataService?: DataverseMetadataService
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
            this.logger.debug('Building filter string', { filterCount: options.filters.length });
            const entityLogicalName = this.getEntityLogicalNameFromSetName(entitySetName);
            const filterString = await this.buildFilterString(options.filters, environmentId, entityLogicalName, metadataService);
            this.logger.debug('Built filter string', { filterString });
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
        
        this.logger.debug('Executing OData query', { url, entitySetName });
        
        // Build headers with proper pagination
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        };
        
        this.logger.debug('Headers prepared', { hasToken: !!token });
        
        // Set page size using Prefer header (NOT $top)
        if (options.maxPageSize && options.maxPageSize > 0) {
            headers['Prefer'] = `odata.maxpagesize=${options.maxPageSize}`;
        }
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        this.logger.debug('Starting OData fetch request');
        let response: Response;
        try {
            response = await fetch(url, { 
                headers,
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            this.logger.debug('OData fetch completed', { status: response.status, statusText: response.statusText });
        } catch (error) {
            clearTimeout(timeoutId);
            this.logger.error('OData fetch error', error instanceof Error ? error : new Error(String(error)));
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds');
            }
            throw error;
        }

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('HTTP error response', new Error(errorText));
            throw new Error(`Failed to query records: ${response.statusText}`);
        }

        this.logger.debug('Parsing response JSON');
        const data = await response.json();
        this.logger.debug('Response parsed', { recordCount: data.value?.length || 0 });
        
        const result = {
            value: data.value,
            count: data['@odata.count'],
            nextLink: data['@odata.nextLink'],
            hasMore: !!data['@odata.nextLink']
        };
        
        this.logger.debug('Returning query result', {
            recordCount: result.value?.length || 0,
            hasMore: result.hasMore,
            nextLinkExists: !!result.nextLink
        });
        
        return result;
    }

    /**
     * Query next page using @odata.nextLink
     */
    async queryNextPage(environmentId: string, nextLink: string): Promise<QueryResult> {
        const token = await this.authService.getAccessToken(environmentId);
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        let response: Response;
        try {
            response = await fetch(nextLink, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Prefer': 'odata.maxpagesize=200'  // Must re-apply page size for nextLink
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds');
            }
            throw error;
        }

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
     * Convert entity set name to logical name (simple heuristic)
     */
    private getEntityLogicalNameFromSetName(entitySetName: string): string {
        // Simple conversion: remove 's' from end for most cases
        // This is a heuristic - ideally we'd have a mapping table
        if (entitySetName.endsWith('ies')) {
            return entitySetName.slice(0, -3) + 'y'; // companies -> company
        } else if (entitySetName.endsWith('s')) {
            return entitySetName.slice(0, -1); // accounts -> account
        }
        return entitySetName;
    }

    /**
     * Convert logical name to entity set name (simple heuristic)
     */
    private getEntitySetNameFromLogicalName(entityLogicalName: string): string {
        // Simple conversion: add 's' to end for most cases
        // This is a heuristic - ideally we'd have a mapping table
        if (entityLogicalName.endsWith('y')) {
            return entityLogicalName.slice(0, -1) + 'ies'; // company -> companies
        } else {
            return entityLogicalName + 's'; // account -> accounts
        }
    }

    /**
     * Format a value for OData queries using metadata
     */
    private async formatFilterValue(
        value: any, 
        fieldName: string,
        environmentId?: string,
        entityLogicalName?: string,
        metadataService?: DataverseMetadataService
    ): Promise<{ fieldName: string; value: string }> {
        let formattedFieldName = fieldName;
        let formattedValue = '';

        // Try to get metadata for proper formatting
        if (metadataService && environmentId && entityLogicalName) {
            try {
                const attributeMetadata = await metadataService.getAttributeMetadata(environmentId, entityLogicalName, fieldName);
                if (attributeMetadata) {
                    formattedFieldName = metadataService.getODataFieldName(fieldName, attributeMetadata);
                    formattedValue = metadataService.formatODataValue(value, attributeMetadata);
                    return { fieldName: formattedFieldName, value: formattedValue };
                }
            } catch (error) {
                this.logger.warn('Failed to get metadata for field', { fieldName, error });
            }
        }

        // Fallback to heuristics if metadata not available
        if (value === null || value === undefined) {
            formattedValue = 'null';
        } else if (typeof value === 'number') {
            formattedValue = value.toString();
        } else if (typeof value === 'boolean') {
            formattedValue = value.toString();
        } else if (typeof value === 'string') {
            // Check if the string represents a number (for fields like statecode)
            const numericValue = Number(value);
            if (!isNaN(numericValue) && value.trim() !== '' && 
                (fieldName === 'statecode' || fieldName === 'statuscode' || fieldName.endsWith('code'))) {
                // Treat as number for common integer fields
                formattedValue = value;
            } else {
                // Treat as string
                formattedValue = `'${value}'`;
            }
        } else {
            formattedValue = `'${value}'`;
        }

        // Handle known lookup fields
        if (fieldName === 'ownerid') {
            formattedFieldName = '_ownerid_value';
        }

        return { fieldName: formattedFieldName, value: formattedValue };
    }

    /**
     * Build OData filter string from filters
     */
    private async buildFilterString(
        filters: QueryFilter[], 
        environmentId?: string, 
        entityLogicalName?: string,
        metadataService?: DataverseMetadataService
    ): Promise<string> {
        if (!filters || filters.length === 0) return '';
        
        // Resolve special placeholders
        const resolvedFilters = await Promise.all(filters.map(async filter => {
            const resolvedFilter = { ...filter };
            
            // Handle special placeholders
            if (filter.value === 'CURRENT_USER' && environmentId) {
                try {
                    const currentUser = await this.getCurrentUser(environmentId);
                    this.logger.debug('WhoAmI API response received');
                    
                    // The WhoAmI API returns UserId, not systemuserid
                    const userId = currentUser.UserId;
                    if (!userId) {
                        this.logger.error('No UserId found in WhoAmI response', new Error('Missing UserId'));
                        return null;
                    }
                    
                    // Validate that it's a proper GUID format
                    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (!guidRegex.test(userId)) {
                        this.logger.error('Invalid GUID format for UserId', new Error(`Invalid GUID: ${userId}`));
                        return null;
                    }
                    
                    resolvedFilter.value = userId;
                    this.logger.debug('Resolved CURRENT_USER placeholder', { userId: resolvedFilter.value });
                    
                    // Special handling for lookup fields - convert field name to OData syntax
                    if (filter.field === 'ownerid') {
                        resolvedFilter.field = '_ownerid_value';
                        this.logger.debug('Converted lookup field for OData query', { from: 'ownerid', to: '_ownerid_value' });
                    }
                } catch (error) {
                    this.logger.warn('Failed to resolve current user ID, skipping filter', { error });
                    return null; // Skip this filter if we can't resolve the user
                }
            }
            
            return resolvedFilter;
        }));
        
        // Filter out null filters (those that couldn't be resolved)
        const validFilters = resolvedFilters.filter(f => f !== null) as QueryFilter[];
        
        const filterParts = await Promise.all(validFilters.map(async (filter, index) => {
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
                    const inConditions = await Promise.all(inValues.map(async v => {
                        const formatted = await this.formatFilterValue(v, filter.field, environmentId, entityLogicalName, metadataService);
                        return `${formatted.fieldName} eq ${formatted.value}`;
                    }));
                    filterStr += `(${inConditions.join(' or ')})`;
                    break;
                default:
                    // For standard comparison operators - use metadata-driven formatting
                    const formatted = await this.formatFilterValue(filter.value, filter.field, environmentId, entityLogicalName, metadataService);
                    filterStr += `${formatted.fieldName} ${filter.operator} ${formatted.value}`;
            }
            
            return filterStr;
        }));
        
        return filterParts.join('');
    }

    /**
     * Get current user information
     */
    private async getCurrentUser(environmentId: string): Promise<any> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for WhoAmI

        let response: Response;
        try {
            response = await fetch(`${baseUrl}/api/data/v9.2/WhoAmI`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('WhoAmI request timed out after 10 seconds');
            }
            throw error;
        }

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('WhoAmI API error response', new Error(errorText));
            throw new Error(`Failed to get current user: ${response.statusText}`);
        }

        return await response.json();
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