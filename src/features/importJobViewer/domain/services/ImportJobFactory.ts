import { ImportJob, ImportJobStatus } from '../entities/ImportJob';

/**
 * Domain service responsible for creating ImportJob entities from raw Dataverse data.
 *
 * Handles the business logic of deriving ImportJob status from Dataverse fields
 * because the Dataverse importjobs entity lacks a statuscode field.
 */
export class ImportJobFactory {
	/**
	 * Creates ImportJob entity with status derived from Dataverse raw data.
	 *
	 * Dataverse importjobs entity lacks a statuscode field, so status is inferred
	 * from completedOn, startedOn, and progress fields using business rules:
	 * - completedOn set + progress < 100 → Failed
	 * - completedOn set + progress = 100 → Completed
	 * - startedOn set + no completedOn + progress = 0 → Failed
	 * - startedOn set + no completedOn + progress > 0 → InProgress
	 * - Neither startedOn nor completedOn set → Queued
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
	createFromDataverseData(
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
		const status = this.deriveStatusFromFields(completedOn, startedOn, progress);

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
	private deriveStatusFromFields(
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
}
