/**
 * View model for presenting import job data in the UI.
 * All fields are formatted as strings for display purposes.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface ImportJobViewModel {
	readonly id: string;
	readonly name: string;
	readonly solutionName: string;
	readonly createdBy: string;
	readonly createdOn: string;  // Formatted date string
	readonly completedOn: string;  // Formatted date string or empty
	readonly progress: string;  // Formatted as "XX%"
	readonly status: string;  // User-friendly status label
	readonly duration: string;  // Formatted duration or empty if incomplete
	readonly importContext: string;  // Import context (e.g., "ImportUpgrade")
	readonly operationContext: string;  // Operation context (e.g., "Upgrade")
}
