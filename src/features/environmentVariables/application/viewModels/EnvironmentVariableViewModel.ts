/**
 * View model for presenting EnvironmentVariable data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface EnvironmentVariableViewModel {
	readonly definitionId: string;
	readonly schemaName: string;
	readonly displayName: string;
	readonly type: string;
	readonly currentValue: string;
	readonly defaultValue: string;
	readonly isManaged: string;
	readonly description: string;
	readonly modifiedOn: string;
}
