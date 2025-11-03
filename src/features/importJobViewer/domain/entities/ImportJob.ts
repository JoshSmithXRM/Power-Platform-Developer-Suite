import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

/**
 * Import job status codes from Dataverse
 */
export enum ImportJobStatus {
	/** Import is in progress */
	InProgress = 0,
	/** Import completed successfully */
	Completed = 1,
	/** Import failed */
	Failed = 2,
	/** Import completed with warnings/errors */
	CompletedWithErrors = 3,
	/** Import was cancelled */
	Cancelled = 4,
	/** Import is queued */
	Queued = 5
}

/**
 * ImportJob entity representing a Power Platform solution import operation.
 *
 * Responsibilities:
 * - Validate progress range (0-100)
 * - Determine completion status
 * - Calculate duration
 */
export class ImportJob {
	/**
	 * Creates a new ImportJob entity.
	 * @param id - Import job GUID
	 * @param name - Import job name
	 * @param solutionName - Name of the solution being imported
	 * @param createdBy - User who initiated the import
	 * @param createdOn - When the import was started
	 * @param completedOn - When the import finished (null if still running)
	 * @param progress - Progress percentage (0-100)
	 * @param statusCode - Import status code
	 * @param importContext - Import context (e.g., "ImportUpgrade", "Import")
	 * @param operationContext - Operation context (e.g., "Upgrade", "New")
	 * @param importLogXml - XML log data (null if not loaded)
	 * @throws {ValidationError} When progress is out of range
	 */
	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly solutionName: string,
		public readonly createdBy: string,
		public readonly createdOn: Date,
		public readonly completedOn: Date | null,
		public readonly progress: number,
		public readonly statusCode: ImportJobStatus,
		public readonly importContext: string | null,
		public readonly operationContext: string | null,
		public readonly importLogXml: string | null = null
	) {
		if (progress < 0 || progress > 100) {
			throw new ValidationError('ImportJob', 'progress', progress, 'Must be between 0 and 100');
		}
	}

	/**
	 * Determines if the import is still in progress.
	 * @returns True if import is queued or in progress, false otherwise
	 */
	isInProgress(): boolean {
		return this.statusCode === ImportJobStatus.InProgress ||
		       this.statusCode === ImportJobStatus.Queued;
	}

	/**
	 * Determines if the import completed successfully without errors.
	 * @returns True if status is Completed, false otherwise
	 */
	isSuccessful(): boolean {
		return this.statusCode === ImportJobStatus.Completed;
	}

	/**
	 * Determines if the import failed or was cancelled.
	 * @returns True if status is Failed or Cancelled, false otherwise
	 */
	isFailed(): boolean {
		return this.statusCode === ImportJobStatus.Failed ||
		       this.statusCode === ImportJobStatus.Cancelled;
	}

	/**
	 * Calculates the duration of the import job.
	 * @returns Duration in milliseconds, or null if not yet completed
	 */
	getDuration(): number | null {
		if (!this.completedOn) {
			return null;
		}
		return this.completedOn.getTime() - this.createdOn.getTime();
	}

	/**
	 * Gets sort priority for UI ordering (in-progress first).
	 * @returns 0 for in-progress jobs (highest priority), 1 for completed jobs
	 */
	getSortPriority(): number {
		return this.isInProgress() ? 0 : 1;
	}

	/**
	 * Checks if import log XML has been loaded.
	 * @returns True if XML data is available, false otherwise
	 */
	hasLog(): boolean {
		return this.importLogXml !== null && this.importLogXml.length > 0;
	}
}
