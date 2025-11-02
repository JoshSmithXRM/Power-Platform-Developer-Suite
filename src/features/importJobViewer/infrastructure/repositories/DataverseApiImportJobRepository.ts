import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { IImportJobRepository } from '../../domain/interfaces/IImportJobRepository';
import { ImportJob, ImportJobStatus } from '../../domain/entities/ImportJob';

/**
 * Dataverse API response for importjobs endpoint
 */
interface DataverseImportJobsResponse {
	value: DataverseImportJobDto[];
}

/**
 * DTO for import job data from Dataverse API
 */
interface DataverseImportJobDto {
	importjobid: string;
	name: string;
	solutionname: string;
	createdon: string;
	startedon: string | null;
	completedon: string | null;
	progress: number;
	importcontext: string | null;
	operationcontext: string | null;
	data?: string; // XML log data (optional - only included when fetching single job)
	_createdby_value: string;
	createdby?: {
		fullname: string;
	};
}

/**
 * Infrastructure implementation of IImportJobRepository using Dataverse Web API.
 */
export class DataverseApiImportJobRepository implements IImportJobRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	/**
	 * Fetches all import jobs from Dataverse for the specified environment.
	 */
	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<ImportJob[]> {
		// Default options: exclude 'data' field (large XML logs), expand createdby, order by createdon desc
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

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const response = await this.apiService.get<DataverseImportJobsResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			const jobs = response.value.map((dto) => this.mapToEntity(dto));

			this.logger.debug(`Fetched ${jobs.length} import job(s) from Dataverse`, { environmentId });

			return jobs;
		} catch (error) {
			this.logger.error('Failed to fetch import jobs from Dataverse API', error as Error);
			throw error;
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
		// Default options: include 'data' field (XML log), expand createdby
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

		if (cancellationToken?.isCancellationRequested) {
			this.logger.debug('Repository operation cancelled before API call');
			throw new OperationCancelledException();
		}

		try {
			const dto = await this.apiService.get<DataverseImportJobDto>(
				environmentId,
				endpoint,
				cancellationToken
			);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.debug('Repository operation cancelled after API call');
				throw new OperationCancelledException();
			}

			const job = this.mapToEntityWithLog(dto);

			this.logger.debug('Fetched import job with log from Dataverse', {
				environmentId,
				importJobId,
				hasLog: job.hasLog()
			});

			return job;
		} catch (error) {
			this.logger.error('Failed to fetch import job with log from Dataverse API', error as Error);
			throw error;
		}
	}

	/**
	 * Maps Dataverse DTO to ImportJob domain entity.
	 */
	private mapToEntity(dto: DataverseImportJobDto): ImportJob {
		return new ImportJob(
			dto.importjobid,
			dto.name || 'Unnamed Import',
			dto.solutionname || 'Unknown Solution',
			dto.createdby?.fullname ?? 'Unknown User',
			new Date(dto.createdon),
			dto.completedon ? new Date(dto.completedon) : null,
			dto.progress,
			this.deriveStatus(dto.completedon, dto.startedon, dto.progress),
			dto.importcontext,
			dto.operationcontext,
			null // No log data for list view
		);
	}

	/**
	 * Maps Dataverse DTO to ImportJob domain entity WITH log data.
	 */
	private mapToEntityWithLog(dto: DataverseImportJobDto): ImportJob {
		return new ImportJob(
			dto.importjobid,
			dto.name || 'Unnamed Import',
			dto.solutionname || 'Unknown Solution',
			dto.createdby?.fullname ?? 'Unknown User',
			new Date(dto.createdon),
			dto.completedon ? new Date(dto.completedon) : null,
			dto.progress,
			this.deriveStatus(dto.completedon, dto.startedon, dto.progress),
			dto.importcontext,
			dto.operationcontext,
			dto.data || null // Include log XML data
		);
	}

	/**
	 * Derives ImportJobStatus from completedOn, startedOn, and progress fields.
	 * The importjobs entity doesn't have a statuscode field, so we infer status from available data.
	 */
	private deriveStatus(completedOn: string | null, startedOn: string | null, progress: number): ImportJobStatus {
		// If job has completed
		if (completedOn) {
			if (progress < 100) {
				return ImportJobStatus.Failed;
			}
			return ImportJobStatus.Completed;
		}

		// If job has started but not completed
		if (startedOn) {
			// If no progress or 0 progress, it failed
			if (progress === 0 || progress === null || progress === undefined) {
				return ImportJobStatus.Failed;
			}
			return ImportJobStatus.InProgress;
		}

		// Job hasn't started yet - queued
		return ImportJobStatus.Queued;
	}
}
