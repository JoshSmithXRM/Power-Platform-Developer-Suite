import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface ODataQueryOptions {
    select?: string[];
    filter?: string;
    orderby?: string;
    top?: number;
    skip?: number;
    expand?: string[];
    count?: boolean;
}

export interface ODataResponse<T = any> {
    '@odata.context': string;
    '@odata.count'?: number;
    value: T[];
    '@odata.nextLink'?: string;
}

export interface ODataError {
    error: {
        code: string;
        message: string;
        innererror?: any;
    };
}

export class ODataService {
    private readonly apiVersion = 'v9.2';

    /**
     * Execute a raw OData query
     */
    async executeQuery(environmentUrl: string, accessToken: string, query: string): Promise<any> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const fullUrl = `${baseUrl}/${query}`;

        return this.makeRequest('GET', fullUrl, accessToken);
    }

    /**
     * Get entities with query options
     */
    async getEntities<T = any>(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        options?: ODataQueryOptions
    ): Promise<ODataResponse<T>> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const queryString = this.buildQueryString(options);
        const url = `${baseUrl}/${entitySetName}${queryString}`;

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Get a single entity by ID
     */
    async getEntity<T = any>(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        entityId: string, 
        options?: Pick<ODataQueryOptions, 'select' | 'expand'>
    ): Promise<T> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const queryString = this.buildQueryString(options);
        const url = `${baseUrl}/${entitySetName}(${entityId})${queryString}`;

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Create a new entity
     */
    async createEntity<T = any>(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        data: any
    ): Promise<T> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const url = `${baseUrl}/${entitySetName}`;

        return this.makeRequest('POST', url, accessToken, data);
    }

    /**
     * Update an entity
     */
    async updateEntity(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        entityId: string, 
        data: any
    ): Promise<void> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const url = `${baseUrl}/${entitySetName}(${entityId})`;

        return this.makeRequest('PATCH', url, accessToken, data);
    }

    /**
     * Delete an entity
     */
    async deleteEntity(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        entityId: string
    ): Promise<void> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const url = `${baseUrl}/${entitySetName}(${entityId})`;

        return this.makeRequest('DELETE', url, accessToken);
    }

    /**
     * Execute a FetchXML query
     */
    async executeFetchXml<T = any>(
        environmentUrl: string, 
        accessToken: string, 
        entitySetName: string, 
        fetchXml: string
    ): Promise<ODataResponse<T>> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const encodedFetchXml = encodeURIComponent(fetchXml);
        const url = `${baseUrl}/${entitySetName}?fetchXml=${encodedFetchXml}`;

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Get entity metadata
     */
    async getEntityMetadata(
        environmentUrl: string, 
        accessToken: string, 
        entityLogicalName: string
    ): Promise<any> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const url = `${baseUrl}/$metadata#EntityDefinitions(LogicalName='${entityLogicalName}')`;

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Get all entity definitions (table metadata)
     */
    async getEntityDefinitions(
        environmentUrl: string, 
        accessToken: string, 
        options?: Pick<ODataQueryOptions, 'select' | 'filter' | 'orderby'>
    ): Promise<ODataResponse<any>> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const queryString = this.buildQueryString(options);
        const url = `${baseUrl}/EntityDefinitions${queryString}`;

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Execute a Web API function
     */
    async executeFunction(
        environmentUrl: string, 
        accessToken: string, 
        functionName: string, 
        parameters?: Record<string, any>
    ): Promise<any> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        let url = `${baseUrl}/${functionName}`;

        if (parameters) {
            const paramString = Object.entries(parameters)
                .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
                .join('&');
            url += `?${paramString}`;
        }

        return this.makeRequest('GET', url, accessToken);
    }

    /**
     * Execute a Web API action
     */
    async executeAction(
        environmentUrl: string, 
        accessToken: string, 
        actionName: string, 
        data?: any
    ): Promise<any> {
        const baseUrl = this.getApiBaseUrl(environmentUrl);
        const url = `${baseUrl}/${actionName}`;

        return this.makeRequest('POST', url, accessToken, data);
    }

    /**
     * Make HTTP request to Dataverse Web API
     */
    private async makeRequest(
        method: string, 
        url: string, 
        accessToken: string, 
        data?: any
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Prefer': 'return=representation'
                }
            };

            const req = httpModule.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            // Success
                            if (responseData) {
                                const jsonData = JSON.parse(responseData);
                                resolve(jsonData);
                            } else {
                                resolve(null);
                            }
                        } else {
                            // Error
                            let errorData: ODataError;
                            if (responseData) {
                                errorData = JSON.parse(responseData);
                            } else {
                                errorData = {
                                    error: {
                                        code: res.statusCode?.toString() || 'UNKNOWN',
                                        message: res.statusMessage || 'Unknown error'
                                    }
                                };
                            }
                            reject(new Error(`HTTP ${res.statusCode}: ${errorData.error.message}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse response: ${parseError}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            // Write request data if provided
            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Build query string from OData options
     */
    private buildQueryString(options?: ODataQueryOptions): string {
        if (!options) return '';

        const params: string[] = [];

        if (options.select && options.select.length > 0) {
            params.push(`$select=${options.select.join(',')}`);
        }

        if (options.filter) {
            params.push(`$filter=${encodeURIComponent(options.filter)}`);
        }

        if (options.orderby) {
            params.push(`$orderby=${encodeURIComponent(options.orderby)}`);
        }

        if (options.top !== undefined) {
            params.push(`$top=${options.top}`);
        }

        if (options.skip !== undefined) {
            params.push(`$skip=${options.skip}`);
        }

        if (options.expand && options.expand.length > 0) {
            params.push(`$expand=${options.expand.join(',')}`);
        }

        if (options.count) {
            params.push('$count=true');
        }

        return params.length > 0 ? '?' + params.join('&') : '';
    }

    /**
     * Get the Web API base URL for an environment
     */
    private getApiBaseUrl(environmentUrl: string): string {
        // Remove trailing slash if present
        const baseUrl = environmentUrl.replace(/\/$/, '');
        return `${baseUrl}/api/data/${this.apiVersion}`;
    }

    /**
     * Test connection to an environment
     */
    async testConnection(environmentUrl: string, accessToken: string): Promise<boolean> {
        try {
            await this.executeQuery(environmentUrl, accessToken, 'WhoAmI()');
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}
