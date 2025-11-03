import { ImportJobStatus } from '../../../../features/importJobViewer/domain/entities/ImportJob';

/**
 * Formats import job status codes for display in the UI layer.
 * Uses ImportJobStatus enum from domain for type safety.
 */
export class ImportJobStatusFormatter {
	/**
	 * Formats import job status code as user-friendly label.
	 * @param statusCode - Import job status code from Dataverse
	 * @returns Human-readable status string for display
	 */
	static formatStatusLabel(statusCode: number): string {
		switch (statusCode) {
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
			case 5: // Queued - not in enum
				return 'Queued';
			default:
				return 'Unknown';
		}
	}
}
