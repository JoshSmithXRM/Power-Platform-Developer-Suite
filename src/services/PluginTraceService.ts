import { AuthenticationService } from './AuthenticationService';

export interface PluginTraceLog {
    plugintracelogid: string;
    createdon: string;
    operationtype: string;
    pluginname: string;
    entityname?: string;
    messagename: string;
    mode: number;
    stage: number;
    depth: number;
    duration: number;
    exceptiondetails?: string;
    messageblock?: string;
    typename?: string;
    configuration?: string;
    performancedetails?: string;
    correlationid?: string;
    userid?: string;
    initiatinguserid?: string;
    ownerid?: string;
    businessunitid?: string;
    organizationid?: string;
}

export interface PluginTraceFilterOptions {
    fromDate?: string;
    toDate?: string;
    pluginName?: string;
    entityName?: string;
    exceptionOnly?: boolean;
    top?: number;
    orderBy?: string;
}

export enum PluginTraceLevel {
    Off = 0,
    Exception = 1,
    All = 2
}

export interface OrganizationSettings {
    organizationid: string;
    plugintracelogsetting: number;
}

export class PluginTraceService {
    constructor(private authService: AuthenticationService) { }

    async getPluginTraceLogs(environmentId: string, filterOptions: PluginTraceFilterOptions = {}): Promise<PluginTraceLog[]> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // Build OData query - using plugintracelogs entity
        let url = `${environment.settings.dataverseUrl}/api/data/v9.2/plugintracelogs`;

        // Select specific fields for performance - using correct Dataverse field names
        const selectFields = [
            'plugintracelogid',
            'createdon',
            'operationtype',
            'typename',
            'primaryentity',
            'messagename',
            'mode',
            'depth',
            'performanceexecutionduration',
            'performanceconstructorduration',
            'exceptiondetails',
            'messageblock',
            'configuration',
            'correlationid',
            'organizationid',
            'pluginstepid',
            'requestid',
            'performanceexecutionstarttime',
            'performanceconstructorstarttime',
            'profile',
            'persistencekey',
            'issystemcreated',
            '_createdby_value',
            '_createdonbehalfby_value',
            'secureconfiguration'
        ];

        url += `?$select=${selectFields.join(',')}`;

        // Add filters
        const filters: string[] = [];

        if (filterOptions.fromDate) {
            filters.push(`createdon ge ${filterOptions.fromDate}`);
        }

        if (filterOptions.toDate) {
            filters.push(`createdon le ${filterOptions.toDate}`);
        }

        if (filterOptions.pluginName) {
            filters.push(`contains(typename,'${filterOptions.pluginName}')`);
        }

        if (filterOptions.entityName) {
            filters.push(`contains(primaryentity,'${filterOptions.entityName}')`);
        }

        if (filterOptions.exceptionOnly) {
            filters.push(`exceptiondetails ne ''`);
        }

        if (filters.length > 0) {
            url += `&$filter=${filters.join(' and ')}`;
        }

        // Add ordering (most recent first by default)
        const orderBy = filterOptions.orderBy || 'createdon desc';
        url += `&$orderby=${orderBy}`;

        // Add top limit (default 1000 to prevent overwhelming results)
        const top = filterOptions.top || 1000;
        url += `&$top=${top}`;

        console.log('PluginTraceService: Fetching plugin traces with URL:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PluginTraceService API Error:', {
                status: response.status,
                statusText: response.statusText,
                url: url,
                errorText: errorText
            });
            throw new Error(`Failed to fetch plugin trace logs: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();

        // Transform data
        const traceLogs: PluginTraceLog[] = (data.value || []).map((log: any) => ({
            plugintracelogid: log.plugintracelogid,
            createdon: log.createdon,
            operationtype: log.operationtype?.toString() || '',
            pluginname: log.typename || '',
            entityname: log.primaryentity || '',
            messagename: log.messagename || '',
            mode: log.mode || 0,
            stage: 0, // Stage is not available in the API response, defaulting to 0
            depth: log.depth || 0,
            duration: log.performanceexecutionduration || 0,
            exceptiondetails: log.exceptiondetails || null,
            messageblock: log.messageblock || '',
            typename: log.typename || '',
            configuration: log.configuration || '',
            performancedetails: `Execution: ${log.performanceexecutionduration || 0}ms, Constructor: ${log.performanceconstructorduration || 0}ms`,
            correlationid: log.correlationid || ''
        }));

        return traceLogs;
    }

    async getPluginTraceLevel(environmentId: string): Promise<PluginTraceLevel> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/organizations?$select=plugintracelogsetting`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get plugin trace level: ${response.statusText}`);
        }

        const data = await response.json();
        const organization = data.value?.[0];

        if (!organization) {
            throw new Error('Organization settings not found');
        }

        return organization.plugintracelogsetting as PluginTraceLevel;
    }

    async setPluginTraceLevel(environmentId: string, level: PluginTraceLevel): Promise<void> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // First get the organization ID
        const orgResponse = await fetch(`${environment.settings.dataverseUrl}/api/data/v9.2/organizations?$select=organizationid`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!orgResponse.ok) {
            throw new Error(`Failed to get organization: ${orgResponse.statusText}`);
        }

        const orgData = await orgResponse.json();
        const organizationId = orgData.value?.[0]?.organizationid;

        if (!organizationId) {
            throw new Error('Organization ID not found');
        }

        // Update the plugin trace log setting
        const updateUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/organizations(${organizationId})`;

        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            },
            body: JSON.stringify({
                plugintracelogsetting: level
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`Failed to update plugin trace level: ${updateResponse.statusText}`);
        }
    }

    getModeDisplayName(mode: number): string {
        switch (mode) {
            case 0: return 'Synchronous';
            case 1: return 'Asynchronous';
            default: return 'Unknown';
        }
    }

    getStageDisplayName(stage: number): string {
        switch (stage) {
            case 10: return 'Pre-validation';
            case 20: return 'Pre-operation';
            case 40: return 'Post-operation';
            case 50: return 'Post-operation (Deprecated)';
            default: return 'Unknown';
        }
    }

    getTraceLevelDisplayName(level: PluginTraceLevel): string {
        switch (level) {
            case PluginTraceLevel.Off: return 'Off';
            case PluginTraceLevel.Exception: return 'Exception';
            case PluginTraceLevel.All: return 'All';
            default: return 'Unknown';
        }
    }

    formatDuration(duration: number): string {
        if (duration < 1000) {
            return `${duration}ms`;
        } else if (duration < 60000) {
            return `${(duration / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    formatDate(dateString: string): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}