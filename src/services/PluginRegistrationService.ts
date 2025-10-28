import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

/**
 * Plugin entity interfaces
 */
export interface PluginAssembly {
    pluginassemblyid: string;
    name: string;
    version: string;
    culture: string;
    publickeytoken: string;
    isolationmode: number; // 1=None, 2=Sandbox
    sourcetype: number; // 0=Database, 1=Disk, 2=GAC, 3=NuGet
    content?: string; // Base64 DLL
    ismanaged: boolean;
    packageid?: string;
    solutionid?: string;
}

export interface PluginType {
    plugintypeid: string;
    typename: string;
    friendlyname: string;
    pluginassemblyid: string;
    name: string;
}

export interface PluginStep {
    sdkmessageprocessingstepid: string;
    name: string;
    plugintypeid: string;
    sdkmessageid: string;
    stage: number; // 10=PreValidation, 20=PreOperation, 40=PostOperation
    mode: number; // 0=Synchronous, 1=Asynchronous
    rank: number;
    filteringattributes?: string;
    statecode: number; // 0=Enabled, 1=Disabled
}

export interface PluginImage {
    sdkmessageprocessingstepimageid: string;
    name: string;
    entityalias: string;
    imagetype: number; // 0=PreImage, 1=PostImage, 2=Both
    attributes: string; // Comma-separated
    sdkmessageprocessingstepid: string;
}

/**
 * Service for plugin registration operations
 */
export class PluginRegistrationService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('PluginRegistrationService');
        }
        return this._logger;
    }

    constructor(private authService: AuthenticationService) {}

    /**
     * Fetch all pages from OData query (handles pagination)
     */
    private async fetchAllPages<T>(
        initialUrl: string,
        token: string
    ): Promise<T[]> {
        const results: T[] = [];
        let nextUrl: string | undefined = initialUrl;

        while (nextUrl) {
            const response: Response = await fetch(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('Fetch page error', new Error(errorText), { url: nextUrl });
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: { value: T[]; '@odata.nextLink'?: string } = await response.json() as any;
            results.push(...data.value);

            // Check for next page
            nextUrl = data['@odata.nextLink'];
        }

        return results;
    }

    /**
     * Get all plugin assemblies
     */
    async getAssemblies(environmentId: string): Promise<PluginAssembly[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/pluginassemblies?$select=pluginassemblyid,name,version,culture,publickeytoken,isolationmode,sourcetype,ismanaged&$orderby=name asc`;

        this.logger.debug('Fetching plugin assemblies', { queryUrl });

        const response = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Plugin assemblies fetch error', new Error(errorText));
            throw new Error(`Failed to fetch plugin assemblies: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value;
    }

    /**
     * Get plugin types for an assembly
     */
    async getPluginTypes(environmentId: string, assemblyId: string): Promise<PluginType[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/plugintypes?$select=plugintypeid,typename,friendlyname,name,pluginassemblyid&$filter=_pluginassemblyid_value eq ${assemblyId}&$orderby=typename asc`;

        this.logger.debug('Fetching plugin types', { assemblyId, queryUrl });

        const response = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Plugin types fetch error', new Error(errorText));
            throw new Error(`Failed to fetch plugin types: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value;
    }

    /**
     * Get plugin steps for a plugin type
     */
    async getSteps(environmentId: string, pluginTypeId: string): Promise<PluginStep[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,plugintypeid,sdkmessageid,stage,mode,rank,filteringattributes,statecode&$filter=_plugintypeid_value eq ${pluginTypeId}&$orderby=rank asc`;

        this.logger.debug('Fetching plugin steps', { pluginTypeId, queryUrl });

        const response = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Plugin steps fetch error', new Error(errorText));
            throw new Error(`Failed to fetch plugin steps: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value;
    }

    /**
     * Get plugin images for a step
     */
    async getImages(environmentId: string, stepId: string): Promise<PluginImage[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingstepimages?$select=sdkmessageprocessingstepimageid,name,entityalias,imagetype,attributes,sdkmessageprocessingstepid&$filter=_sdkmessageprocessingstepid_value eq ${stepId}&$orderby=name asc`;

        this.logger.debug('Fetching plugin images', { stepId, queryUrl });

        const response = await fetch(queryUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Plugin images fetch error', new Error(errorText));
            throw new Error(`Failed to fetch plugin images: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value;
    }

    /**
     * BULK OPERATIONS - Get all records without filters for in-memory joining
     * These methods are much faster than individual filtered queries
     */

    /**
     * Get ALL plugin types across all assemblies (bulk fetch)
     */
    async getAllPluginTypes(environmentId: string): Promise<PluginType[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/plugintypes?$select=plugintypeid,typename,friendlyname,name,_pluginassemblyid_value&$orderby=typename asc`;

        this.logger.debug('Bulk fetching all plugin types', { queryUrl });

        const results = await this.fetchAllPages<PluginType & { _pluginassemblyid_value: string }>(queryUrl, token);

        // Map the lookup field to the standard property name
        return results.map(type => ({
            ...type,
            pluginassemblyid: type._pluginassemblyid_value
        }));
    }

    /**
     * Get ALL plugin steps across all types (bulk fetch)
     */
    async getAllSteps(environmentId: string): Promise<PluginStep[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,_plugintypeid_value,sdkmessageid,stage,mode,rank,filteringattributes,statecode&$orderby=rank asc`;

        this.logger.debug('Bulk fetching all plugin steps', { queryUrl });

        const results = await this.fetchAllPages<PluginStep & { _plugintypeid_value: string }>(queryUrl, token);

        // Map the lookup field to the standard property name
        return results.map(step => ({
            ...step,
            plugintypeid: step._plugintypeid_value
        }));
    }

    /**
     * Get ALL plugin images across all steps (bulk fetch)
     */
    async getAllImages(environmentId: string): Promise<PluginImage[]> {
        const token = await this.authService.getAccessToken(environmentId);
        const environment = await this.authService.getEnvironment(environmentId);
        if (!environment) {
            throw new Error('Environment not found');
        }
        const baseUrl = environment.settings.dataverseUrl;

        const queryUrl = `${baseUrl}/api/data/v9.2/sdkmessageprocessingstepimages?$select=sdkmessageprocessingstepimageid,name,entityalias,imagetype,attributes,_sdkmessageprocessingstepid_value&$orderby=name asc`;

        this.logger.debug('Bulk fetching all plugin images', { queryUrl });

        const results = await this.fetchAllPages<PluginImage & { _sdkmessageprocessingstepid_value: string }>(queryUrl, token);

        // Map the lookup field to the standard property name
        return results.map(image => ({
            ...image,
            sdkmessageprocessingstepid: image._sdkmessageprocessingstepid_value
        }));
    }
}
