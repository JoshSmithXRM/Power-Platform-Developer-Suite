import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { CancellationHelper } from '../../../../shared/infrastructure/utils/CancellationHelper';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import { ImportJob } from '../../domain/entities/ImportJob';
import { ImportJobFactory, ImportJobFactoryData } from '../../domain/services/ImportJobFactory';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * OData response wrapper from Dataverse API importjobs query.
 */
interface DataverseImportJobsResponse {
	value: DataverseImportJobDto[];
}

/**
 * DTO representing an import job entity from Dataverse Web API.
 * Maps to the importjobs entity schema in Dataverse.
 */
interface DataverseImportJobDto {
	/** importjobid field - Primary key */
	importjobid: string;
	/** name field - Import job name */
	name: string;
	/** solutionname field - Name of solution being imported */
	solutionname: string;
	/** createdon field - Creation timestamp */
	createdon: string;
	/** startedon field - Import start timestamp */
	startedon: string | null;
	/** completedon field - Import completion timestamp */
	completedon: string | null;
	/** progress field - Progress percentage (0-100) */
	progress: number;
	/** importcontext field - Import operation context */
	importcontext: string | null;
	/** operationcontext field - Additional operation metadata */
	operationcontext: string | null;
	/** data field - XML log data (only included when explicitly selected) */
	data?: string;
	/** _createdby_value field - Creator user GUID */
	_createdby_value: string;
	/** createdby expanded navigation - Creator user entity */
	createdby?: {
		fullname: string;
	};
}

/**
 * Infrastructure implementation of IImportJobRepository using Dataverse Web API.
 */
export class DataverseApiImportJobRepository implements IImportJobRepository {
	private readonly factory: ImportJobFactory;

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {
		this.factory = new ImportJobFactory();
	}

	/**
	 * Fetches all import jobs from Dataverse for the specified environment.
	 */
	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ImportJob[]> {
		// Exclude 'data' field to avoid fetching large XML logs in list view
		const defaultOptions: QueryOptions = {
			select: ['importjobid', 'name', 'solutionname', 'createdon', 'startedon', 'completedon', 'progress', 'importcontext', 'operationcontext', '_createdby_value'],
			expand: 'createdby($select=fullname)',
			orderBy: 'createdon desc'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/importjobs${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching import jobs from Dataverse API', { environmentId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const response = await this.apiService.get<DataverseImportJobsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			const jobs = response.value.map((dto) => this.mapToEntity(dto));

			this.logger.debug('Fetched import jobs from Dataverse', { environmentId, count: jobs.length });

			return jobs;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch import jobs from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}


	/**
	 * Fetches a single import job with the import log XML data.
	 */
	async findByIdWithLog(
		environmentId: string,
		importJobId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ImportJob> {
		// Include 'data' field to fetch XML log for editor display
		const defaultOptions: QueryOptions = {
			select: ['importjobid', 'name', 'solutionname', 'createdon', 'startedon', 'completedon', 'progress', 'importcontext', 'operationcontext', 'data', '_createdby_value'],
			expand: 'createdby($select=fullname)'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const endpoint = `/api/data/v9.2/importjobs(${importJobId})${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching import job with log from Dataverse API', { environmentId, importJobId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const dto = await this.apiService.get<DataverseImportJobDto>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			const job = this.mapToEntityWithLog(dto);

			this.logger.debug('Fetched import job with log from Dataverse', {
				environmentId,
				importJobId,
				hasLog: job.hasLog()
			});

			return job;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch import job with log from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Maps Dataverse DTO to ImportJob domain entity without log data.
	 */
	private mapToEntity(dto: DataverseImportJobDto): ImportJob {
		const factoryData: ImportJobFactoryData = {
			id: dto.importjobid,
			name: dto.name || 'Unnamed Import',
			solutionName: dto.solutionname || 'Unknown Solution',
			createdBy: dto.createdby?.fullname ?? 'Unknown User',
			createdOn: new Date(dto.createdon),
			completedOn: dto.completedon ? new Date(dto.completedon) : null,
			startedOn: dto.startedon ? new Date(dto.startedon) : null,
			progress: dto.progress,
			importContext: dto.importcontext,
			operationContext: dto.operationcontext,
			importLogXml: null
		};

		return this.factory.createFromData(factoryData);
	}

	/**
	 * Maps Dataverse DTO to ImportJob domain entity with log data included.
	 */
	private mapToEntityWithLog(dto: DataverseImportJobDto): ImportJob {
		const factoryData: ImportJobFactoryData = {
			id: dto.importjobid,
			name: dto.name || 'Unnamed Import',
			solutionName: dto.solutionname || 'Unknown Solution',
			createdBy: dto.createdby?.fullname ?? 'Unknown User',
			createdOn: new Date(dto.createdon),
			completedOn: dto.completedon ? new Date(dto.completedon) : null,
			startedOn: dto.startedon ? new Date(dto.startedon) : null,
			progress: dto.progress,
			importContext: dto.importcontext,
			operationContext: dto.operationcontext,
			importLogXml: dto.data || null
		};

		return this.factory.createFromData(factoryData);
	}
}
