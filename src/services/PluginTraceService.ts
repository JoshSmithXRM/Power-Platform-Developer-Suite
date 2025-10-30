import { EnvironmentConnection } from '../models/PowerPlatformSettings';
import { parseODataResponse } from '../utils/ODataValidator';

import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

// Dataverse API response interfaces
interface DataversePluginTraceLogResponse {
    plugintracelogid: string;
    createdon: string;
    operationtype?: number;
    typename?: string;
    primaryentity?: string;
    messagename?: string;
    mode?: number;
    depth?: number;
    performanceexecutionduration?: number;
    exceptiondetails?: string;
    messageblock?: string;
    configuration?: string;
    performanceconstructorduration?: number;
    correlationid?: string;
    pluginstepid?: string;
}

interface DataverseTraceIdResponse {
    plugintracelogid: string;
}

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
    pluginstepid?: string;
}

export interface PluginTraceFilterOptions {
    fromDate?: string;
    toDate?: string;
    pluginName?: string;
    entityName?: string;
    exceptionOnly?: boolean;
    top?: number;
    orderBy?: string;
    odataFilter?: string; // Raw OData filter string for complex queries (OR/AND logic)
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
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('PluginTraceService');
        }
        return this._logger;
    }

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
        this.logger.info('📋 Building OData filters', { filterOptions });

        // If raw OData filter is provided, use it directly (for complex OR/AND logic)
        if (filterOptions.odataFilter) {
            url += `&$filter=${encodeURIComponent(filterOptions.odataFilter)}`;
            this.logger.info('✅ Applied raw OData filter', { odataFilter: filterOptions.odataFilter, encoded: encodeURIComponent(filterOptions.odataFilter) });
        } else {
            // Otherwise, build filter from individual properties (legacy simple AND logic)
            const filters: string[] = [];

            if (filterOptions.fromDate) {
                filters.push(`createdon ge ${filterOptions.fromDate}`);
                this.logger.debug('Added fromDate filter', { fromDate: filterOptions.fromDate });
            }

            if (filterOptions.toDate) {
                filters.push(`createdon le ${filterOptions.toDate}`);
                this.logger.debug('Added toDate filter', { toDate: filterOptions.toDate });
            }

            if (filterOptions.pluginName) {
                filters.push(`contains(typename,'${filterOptions.pluginName}')`);
                this.logger.debug('Added pluginName filter', { pluginName: filterOptions.pluginName });
            }

            if (filterOptions.entityName) {
                filters.push(`contains(primaryentity,'${filterOptions.entityName}')`);
                this.logger.debug('Added entityName filter', { entityName: filterOptions.entityName });
            }

            if (filterOptions.exceptionOnly) {
                filters.push(`exceptiondetails ne ''`);
                this.logger.debug('Added exceptionOnly filter');
            }

            if (filters.length > 0) {
                const filterString = filters.join(' and ');
                url += `&$filter=${encodeURIComponent(filterString)}`;
                this.logger.info('✅ Applied filters to URL', { filterString, encoded: encodeURIComponent(filterString) });
            } else {
                this.logger.info('ℹ️ No filters applied');
            }
        }

        // Add ordering (most recent first by default)
        const orderBy = filterOptions.orderBy || 'createdon desc';
        url += `&$orderby=${orderBy}`;

        // Add top limit (default 100 to prevent overwhelming results)
        const top = filterOptions.top || 100;
        url += `&$top=${top}`;

        this.logger.debug('Fetching plugin traces', { url });

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
            this.logger.error('PluginTraceService API Error', new Error('API request failed'), {
                status: response.status,
                statusText: response.statusText,
                url: url,
                errorText: errorText
            });
            throw new Error(`Failed to fetch plugin trace logs: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const data = parseODataResponse<DataversePluginTraceLogResponse>(await response.json());

        // Transform data
        const traceLogs: PluginTraceLog[] = (data.value || []).map((log: DataversePluginTraceLogResponse) => ({
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
            exceptiondetails: log.exceptiondetails || undefined,
            messageblock: log.messageblock || '',
            typename: log.typename || '',
            configuration: log.configuration || '',
            performancedetails: `Execution: ${log.performanceexecutionduration || 0}ms, Constructor: ${log.performanceconstructorduration || 0}ms`,
            correlationid: log.correlationid || '',
            pluginstepid: log.pluginstepid || ''
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

        const data = parseODataResponse<OrganizationSettings>(await response.json());
        const organization = data.value?.[0];

        if (!organization) {
            throw new Error('Organization settings not found');
        }

        return organization.plugintracelogsetting as PluginTraceLevel;
    }

    async setPluginTraceLevel(environmentId: string, level: PluginTraceLevel): Promise<void> {
        this.logger.info('Setting plugin trace level', { environmentId, level, levelName: this.getTraceLevelDisplayName(level) });

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // First get the organization ID
        const orgUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/organizations?$select=organizationid`;
        this.logger.debug('Fetching organization ID', { orgUrl });

        const orgResponse = await fetch(orgUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!orgResponse.ok) {
            const errorText = await orgResponse.text();
            this.logger.error('Failed to get organization', new Error('API request failed'), {
                status: orgResponse.status,
                statusText: orgResponse.statusText,
                errorText
            });
            throw new Error(`Failed to get organization: ${orgResponse.statusText}`);
        }

        const orgData = parseODataResponse<OrganizationSettings>(await orgResponse.json());
        const organizationId = orgData.value?.[0]?.organizationid;

        if (!organizationId) {
            this.logger.error('Organization ID not found', new Error('Organization ID not found'));
            throw new Error('Organization ID not found');
        }

        this.logger.debug('Found organization ID', { organizationId });

        // Update the plugin trace log setting
        const updateUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/organizations(${organizationId})`;
        this.logger.info('Updating plugin trace log setting', {
            updateUrl,
            organizationId,
            level,
            levelName: this.getTraceLevelDisplayName(level)
        });

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
            const errorText = await updateResponse.text();
            this.logger.error('Failed to update plugin trace level', new Error('API request failed'), {
                status: updateResponse.status,
                statusText: updateResponse.statusText,
                errorText,
                level
            });
            throw new Error(`Failed to update plugin trace level: ${updateResponse.statusText}`);
        }

        this.logger.info('Plugin trace level updated successfully', {
            organizationId,
            level,
            levelName: this.getTraceLevelDisplayName(level)
        });
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

    /**
     * Delete a single plugin trace log
     */
    async deleteTrace(environmentId: string, traceId: string): Promise<void> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);
        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/plugintracelogs(${traceId})`;

        this.logger.info('Deleting plugin trace', { traceId });

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Failed to delete plugin trace', new Error('API request failed'), {
                status: response.status,
                errorText
            });
            throw new Error(`Failed to delete plugin trace: ${response.status} ${response.statusText}`);
        }

        this.logger.info('Plugin trace deleted successfully', { traceId });
    }

    /**
     * Delete multiple traces using OData $batch API
     */
    private async deleteBatch(environment: EnvironmentConnection, token: string, traceIds: string[]): Promise<number> {
        const batchBoundary = `batch_${Date.now()}`;
        const changesetBoundary = `changeset_${Date.now()}`;

        // Build batch request body
        let batchBody = `--${batchBoundary}\r\n`;
        batchBody += `Content-Type: multipart/mixed; boundary=${changesetBoundary}\r\n\r\n`;

        traceIds.forEach((traceId, index) => {
            batchBody += `--${changesetBoundary}\r\n`;
            batchBody += `Content-Type: application/http\r\n`;
            batchBody += `Content-Transfer-Encoding: binary\r\n`;
            batchBody += `Content-ID: ${index + 1}\r\n\r\n`;
            batchBody += `DELETE ${environment.settings.dataverseUrl}/api/data/v9.2/plugintracelogs(${traceId}) HTTP/1.1\r\n`;
            batchBody += `Content-Type: application/json\r\n\r\n`;
        });

        batchBody += `--${changesetBoundary}--\r\n`;
        batchBody += `--${batchBoundary}--\r\n`;

        const batchUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/$batch`;

        const response = await fetch(batchUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/mixed; boundary=${batchBoundary}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            },
            body: batchBody
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Batch delete failed', new Error('API request failed'), {
                status: response.status,
                errorText
            });
            throw new Error(`Batch delete failed: ${response.status} ${response.statusText}`);
        }

        // Parse batch response to count successes
        const responseText = await response.text();
        const successCount = (responseText.match(/HTTP\/1\.1 204/g) || []).length;

        return successCount;
    }

    /**
     * Delete all plugin trace logs in the environment
     */
    async deleteAllTraces(environmentId: string): Promise<number> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // First, get all trace IDs
        const countUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/plugintracelogs?$select=plugintracelogid&$count=true`;

        this.logger.info('Fetching all plugin traces for deletion');

        const countResponse = await fetch(countUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Prefer': 'odata.include-annotations="*"'
            }
        });

        if (!countResponse.ok) {
            throw new Error(`Failed to fetch plugin traces: ${countResponse.statusText}`);
        }

        const countData = parseODataResponse<DataverseTraceIdResponse>(await countResponse.json());
        const totalCount = countData['@odata.count'] || countData.value?.length || 0;

        if (totalCount === 0) {
            this.logger.info('No plugin traces to delete');
            return 0;
        }

        this.logger.info(`Deleting ${totalCount} plugin traces using batch API`);

        // Delete in batches using OData $batch API for better performance
        const traceIds = countData.value.map((trace: DataverseTraceIdResponse) => trace.plugintracelogid);
        const batchSize = 100; // Dataverse supports up to 1000 operations per batch, but 100 is safer
        let deletedCount = 0;

        for (let i = 0; i < traceIds.length; i += batchSize) {
            const batch = traceIds.slice(i, i + batchSize);

            try {
                const successCount = await this.deleteBatch(environment, token, batch);
                deletedCount += successCount;
                this.logger.info(`Batch delete progress: ${deletedCount}/${totalCount} traces deleted`);
            } catch (error) {
                this.logger.error('Failed to delete batch', error as Error, { batchSize: batch.length });
                // Continue with next batch
            }
        }

        this.logger.info(`Successfully deleted ${deletedCount} plugin traces`);
        return deletedCount;
    }

    /**
     * Delete plugin trace logs older than specified days
     */
    async deleteOldTraces(environmentId: string, olderThanDays: number): Promise<number> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            throw new Error('Environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        // Calculate date threshold
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - olderThanDays);
        const thresholdISO = thresholdDate.toISOString();

        // Get traces older than threshold
        const url = `${environment.settings.dataverseUrl}/api/data/v9.2/plugintracelogs?$select=plugintracelogid&$filter=createdon lt ${thresholdISO}&$count=true`;

        this.logger.info('Fetching old plugin traces for deletion', { olderThanDays, thresholdDate });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Prefer': 'odata.include-annotations="*"'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch old plugin traces: ${response.statusText}`);
        }

        const data = parseODataResponse<DataverseTraceIdResponse>(await response.json());
        const totalCount = data['@odata.count'] || data.value?.length || 0;

        if (totalCount === 0) {
            this.logger.info('No old plugin traces to delete');
            return 0;
        }

        this.logger.info(`Deleting ${totalCount} old plugin traces using batch API`);

        // Delete in batches using OData $batch API for better performance
        const traceIds = data.value.map((trace: DataverseTraceIdResponse) => trace.plugintracelogid);
        const batchSize = 100; // Dataverse supports up to 1000 operations per batch, but 100 is safer
        let deletedCount = 0;

        for (let i = 0; i < traceIds.length; i += batchSize) {
            const batch = traceIds.slice(i, i + batchSize);

            try {
                const successCount = await this.deleteBatch(environment, token, batch);
                deletedCount += successCount;
                this.logger.info(`Batch delete progress: ${deletedCount}/${totalCount} old traces deleted`);
            } catch (error) {
                this.logger.error('Failed to delete batch', error as Error, { batchSize: batch.length });
                // Continue with next batch
            }
        }

        this.logger.info(`Successfully deleted ${deletedCount} old plugin traces`);
        return deletedCount;
    }
}