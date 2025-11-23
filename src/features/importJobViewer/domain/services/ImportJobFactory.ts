import { ImportJob, ImportJobStatus } from '../entities/ImportJob';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Data required to construct an ImportJob entity.
 * Domain layer defines this contract for infrastructure to implement.
 */
export interface ImportJobFactoryData {
	/** Import job GUID */
	id: string;
	/** Import job name */
	name: string;
	/** Name of the solution being imported */
	solutionName: string;
	/** User who initiated the import */
	createdBy: string;
	/** When the import was created */
	createdOn: Date;
	/** When the import finished (null if still running) */
	completedOn: Date | null;
	/** When the import started (null if not started) */
	startedOn: Date | null;
	/** Progress percentage (0-100) */
	progress: number;
	/** Import context */
	importContext: string | null;
	/** Operation context */
	operationContext: string | null;
	/** XML log data (null if not loaded) */
	importLogXml: string | null;
}

/**
 * Domain service responsible for creating ImportJob entities.
 *
 * Handles the business logic of deriving ImportJob status from field values
 * because the Dataverse importjobs entity lacks a statuscode field.
 */
export class ImportJobFactory {
	/** Maximum valid progress percentage (100%) */
	private static readonly MAX_PROGRESS_PERCENTAGE = 100;

	/** Minimum valid progress percentage (0%) */
	private static readonly MIN_PROGRESS_PERCENTAGE = 0;

	/**
	 * Creates ImportJob entity with status derived from provided data.
	 *
	 * Dataverse importjobs entity lacks a statuscode field, so status is inferred
	 * from completedOn, startedOn, and progress fields using business rules:
	 * - completedOn set + progress < 100 → Failed
	 * - completedOn set + progress = 100 → Completed
	 * - startedOn set + no completedOn + progress = 0 → Failed
	 * - startedOn set + no completedOn + progress > 0 → InProgress
	 * - Neither startedOn nor completedOn set → Queued
	 *
	 * @param data - Data conforming to ImportJobFactoryData contract
	 * @returns ImportJob with derived status
	 * @throws {ValidationError} When required fields are missing or progress is out of range
	 */
	createFromData(data: ImportJobFactoryData): ImportJob {
		this.validateRequiredFields(data);
		this.validateProgress(data.progress);

		const status = this.deriveStatusFromFields(data.completedOn, data.startedOn, data.progress);

		return new ImportJob(
			data.id,
			data.name,
			data.solutionName,
			data.createdBy,
			data.createdOn,
			data.completedOn,
			data.progress,
			status,
			data.importContext,
			data.operationContext,
			data.importLogXml
		);
	}

	/**
	 * Validates that required fields are present and not empty.
	 * Provides clear error messages at factory level before entity construction.
	 * @throws {ValidationError} When required fields are missing
	 */
	private validateRequiredFields(data: ImportJobFactoryData): void {
		if (!data.id || data.id.trim() === '') {
			throw new ValidationError('ImportJobFactory', 'id', data.id, 'Import job ID is required');
		}
		if (!data.name || data.name.trim() === '') {
			throw new ValidationError('ImportJobFactory', 'name', data.name, 'Import job name is required');
		}
		if (!data.solutionName || data.solutionName.trim() === '') {
			throw new ValidationError('ImportJobFactory', 'solutionName', data.solutionName, 'Solution name is required');
		}
		if (!data.createdBy || data.createdBy.trim() === '') {
			throw new ValidationError('ImportJobFactory', 'createdBy', data.createdBy, 'Created by is required');
		}
		if (!data.createdOn) {
			throw new ValidationError('ImportJobFactory', 'createdOn', data.createdOn, 'Created date is required');
		}
	}

	/**
	 * Validates progress is within acceptable range.
	 * @throws {ValidationError} When progress is out of range
	 */
	private validateProgress(progress: number): void {
		if (progress < ImportJobFactory.MIN_PROGRESS_PERCENTAGE || progress > ImportJobFactory.MAX_PROGRESS_PERCENTAGE) {
			throw new ValidationError(
				'ImportJobFactory',
				'progress',
				progress,
				`Progress must be between ${ImportJobFactory.MIN_PROGRESS_PERCENTAGE} and ${ImportJobFactory.MAX_PROGRESS_PERCENTAGE}`
			);
		}
	}

	/**
	 * Business logic: Derives ImportJobStatus from Dataverse field values.
	 *
	 * Dataverse importjobs entity lacks a statuscode field, so we infer
	 * status from the combination of completedOn, startedOn, and progress.
	 *
	 * @param completedOn - Completion date (null if not completed)
	 * @param startedOn - Start date (null if not started)
	 * @param progress - Progress percentage (0-100)
	 * @returns Derived ImportJobStatus
	 */
	private deriveStatusFromFields(
		completedOn: Date | null,
		startedOn: Date | null,
		progress: number
	): ImportJobStatus {
		// If job has completed
		if (completedOn) {
			return progress < ImportJobFactory.MAX_PROGRESS_PERCENTAGE ? ImportJobStatus.Failed : ImportJobStatus.Completed;
		}

		// If job has started but not completed
		if (startedOn) {
			return progress === ImportJobFactory.MIN_PROGRESS_PERCENTAGE ? ImportJobStatus.Failed : ImportJobStatus.InProgress;
		}

		// Job hasn't started yet
		return ImportJobStatus.Queued;
	}
}
