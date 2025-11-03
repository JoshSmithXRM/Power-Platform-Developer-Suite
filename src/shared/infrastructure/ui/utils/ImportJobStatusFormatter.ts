/**
 * Formats import job status codes for display in the UI layer.
 * Handles status codes from Dataverse:
 * - 0: In Progress
 * - 1: Completed
 * - 2: Failed
 * - 3: Completed with Errors
 * - 4: Cancelled
 * - 5: Queued
 */
export class ImportJobStatusFormatter {
	/**
	 * Formats import job status code as user-friendly label.
	 * @param statusCode - Import job status code from Dataverse
	 * @returns Human-readable status string for display
	 */
	static formatStatusLabel(statusCode: number): string {
		switch (statusCode) {
			case 0:
				return 'In Progress';
			case 1:
				return 'Completed';
			case 2:
				return 'Failed';
			case 3:
				return 'Completed with Errors';
			case 4:
				return 'Cancelled';
			case 5:
				return 'Queued';
			default:
				return 'Unknown';
		}
	}
}
