/**
 * View model for presenting import job data in the UI.
 * All fields are formatted as strings for display purposes.
 */
export interface ImportJobViewModel {
	id: string;
	name: string;
	solutionName: string;
	createdBy: string;
	createdOn: string;  // Formatted date string
	completedOn: string;  // Formatted date string or empty
	progress: string;  // Formatted as "XX%"
	status: string;  // User-friendly status label
	duration: string;  // Formatted duration or empty if incomplete
	importContext: string;  // Import context (e.g., "ImportUpgrade")
	operationContext: string;  // Operation context (e.g., "Upgrade")
}
