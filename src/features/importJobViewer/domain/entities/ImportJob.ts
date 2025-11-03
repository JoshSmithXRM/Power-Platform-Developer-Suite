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
 * - Provide user-friendly status labels
 * - Derive status from Dataverse fields (since importjobs entity lacks statuscode)
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
		// Validate progress is within valid range
		if (progress < 0 || progress > 100) {
			throw new ValidationError('ImportJob', 'progress', progress, 'Must be between 0 and 100');
		}
	}

	/**
	 * Factory method: Creates ImportJob with status derived from Dataverse raw data.
	 *
	 * The Dataverse importjobs entity doesn't have a statuscode field. We must
	 * infer the status from completedOn, startedOn, and progress fields.
	 *
	 * Business Rules:
	 * - If completedOn is set and progress < 100: Failed
	 * - If completedOn is set and progress = 100: Completed
	 * - If startedOn is set but no completedOn and progress = 0: Failed
	 * - If startedOn is set but no completedOn and progress > 0: InProgress
	 * - If neither startedOn nor completedOn is set: Queued
	 *
	 * @param id - Import job GUID
	 * @param name - Import job name
	 * @param solutionName - Name of the solution being imported
	 * @param createdBy - User who initiated the import
	 * @param createdOn - When the import was created
	 * @param completedOn - When the import finished (null if still running)
	 * @param startedOn - When the import started (null if not started)
	 * @param progress - Progress percentage (0-100)
	 * @param importContext - Import context
	 * @param operationContext - Operation context
	 * @param importLogXml - XML log data (null if not loaded)
	 * @returns ImportJob with derived status
	 */
	static createFromDataverseData(
		id: string,
		name: string,
		solutionName: string,
		createdBy: string,
		createdOn: Date,
		completedOn: Date | null,
		startedOn: Date | null,
		progress: number,
		importContext: string | null,
		operationContext: string | null,
		importLogXml: string | null = null
	): ImportJob {
		const status = ImportJob.deriveStatusFromFields(completedOn, startedOn, progress);

		return new ImportJob(
			id,
			name,
			solutionName,
			createdBy,
			createdOn,
			completedOn,
			progress,
			status,
			importContext,
			operationContext,
			importLogXml
		);
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
	private static deriveStatusFromFields(
		completedOn: Date | null,
		startedOn: Date | null,
		progress: number
	): ImportJobStatus {
		// If job has completed
		if (completedOn) {
			return progress < 100 ? ImportJobStatus.Failed : ImportJobStatus.Completed;
		}

		// If job has started but not completed
		if (startedOn) {
			return progress === 0 ? ImportJobStatus.Failed : ImportJobStatus.InProgress;
		}

		// Job hasn't started yet
		return ImportJobStatus.Queued;
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
	 * Gets a user-friendly status label for display.
	 * @returns Human-readable status string
	 */
	getStatusLabel(): string {
		switch (this.statusCode) {
			case ImportJobStatus.InProgress:
				return 'In Progress';
			case ImportJobStatus.Completed:
				return 'Completed';
			case ImportJobStatus.Failed:
				return 'Failed';
			case ImportJobStatus.CompletedWithErrors:
				return 'Completed with Errors';
			case ImportJobStatus.Cancelled:
				return 'Cancelled';
			case ImportJobStatus.Queued:
				return 'Queued';
			default:
				return 'Unknown';
		}
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
	 * Gets sort priority for UI ordering.
	 * Business rule: In-progress jobs first, then by most recent creation date.
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

	/**
	 * Sorts import jobs by business rules: in-progress jobs first (by priority), then by most recent creation date.
	 * Creates a defensive copy to avoid mutating the original array.
	 * @param jobs - Array of ImportJob entities to sort
	 * @returns New sorted array
	 */
	static sort(jobs: ImportJob[]): ImportJob[] {
		return [...jobs].sort((a, b) => {
			const priorityDiff = a.getSortPriority() - b.getSortPriority();
			if (priorityDiff !== 0) {
				return priorityDiff;
			}
			// Most recent first
			return b.createdOn.getTime() - a.createdOn.getTime();
		});
	}
}
