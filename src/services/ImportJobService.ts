import { parseODataResponse, parseODataSingleResponse } from '../utils/ODataValidator';

import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';
import { XmlFormatterService } from './XmlFormatterService';

/**
 * Import Job interface representing Dataverse import job entity
 */
export interface ImportJob {
    importjobid: string;
    solutionname?: string;
    progress?: number;
    startedon?: string;
    completedon?: string;
    modifiedon?: string;
    importcontext?: string;
    operationcontext?: string;
}

/**
 * Import Job Service
 * Handles all import job related operations with Dataverse API
 * Follows SOLID principles with dependency injection
 */
export class ImportJobService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;

    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('ImportJobService');
        }
        return this._logger;
    }

    constructor(
        private authService: AuthenticationService,
        private xmlFormatterService: XmlFormatterService
    ) {}

    /**
     * Get all import jobs for an environment
     * @param environmentId - Environment ID to fetch import jobs from
     * @returns Promise resolving to array of import jobs
     */
    async getImportJobs(environmentId: string): Promise<ImportJob[]> {
        this.logger.info('Starting import jobs retrieval', { environmentId });

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Selected environment not found');
        }

        this.logger.debug('Environment found', {
            environmentId,
            environmentName: environment.name,
            dataverseUrl: environment.settings.dataverseUrl
        });

        const token = await this.authService.getAccessToken(environment.id);

        const importJobsUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/importjobs?$select=importjobid,solutionname,progress,startedon,completedon,modifiedon,importcontext,operationcontext&$orderby=startedon desc`;

        this.logger.debug('Fetching import jobs data', {
            environmentId,
            environmentName: environment.name,
            importJobsUrl
        });

        const response = await fetch(importJobsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Failed to fetch import jobs', new Error('API request failed'), {
                environmentId,
                status: response.status,
                statusText: response.statusText,
                errorText
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = parseODataResponse<ImportJob>(await response.json());
        const importJobs = data.value || [];

        this.logger.info('Import jobs retrieval completed', {
            environmentId,
            totalImportJobs: importJobs.length
        });

        return importJobs;
    }

    /**
     * Get XML data for a specific import job
     * @param environmentId - Environment ID
     * @param importJobId - Import Job ID to fetch XML for
     * @returns Promise resolving to formatted XML string
     */
    async getImportJobXml(environmentId: string, importJobId: string): Promise<string> {
        this.logger.info('Starting import job XML retrieval', { environmentId, importJobId });

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(env => env.id === environmentId);

        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Selected environment not found');
        }

        const token = await this.authService.getAccessToken(environment.id);

        const importJobUrl = `${environment.settings.dataverseUrl}/api/data/v9.2/importjobs(${importJobId})?$select=data`;

        this.logger.debug('Fetching import job XML', {
            environmentId,
            importJobId,
            importJobUrl
        });

        const response = await fetch(importJobUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('Failed to fetch import job XML', new Error('API request failed'), {
                environmentId,
                importJobId,
                status: response.status,
                statusText: response.statusText,
                errorText
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        interface ImportJobXmlResponse {
            data?: string;
        }

        const data = parseODataSingleResponse<ImportJobXmlResponse>(await response.json());
        const xmlData = data.data || '<empty>No XML data available</empty>';

        this.logger.debug('Import job XML retrieved', {
            environmentId,
            importJobId,
            xmlLength: xmlData.length
        });

        // Format the XML using XmlFormatterService
        const formattedXml = this.xmlFormatterService.formatXml(xmlData);

        this.logger.info('Import job XML retrieval completed', {
            environmentId,
            importJobId
        });

        return formattedXml;
    }
}
