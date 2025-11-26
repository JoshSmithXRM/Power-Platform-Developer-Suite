/**
 * View model for presenting WebResource data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface WebResourceViewModel {
	[key: string]: unknown;
	readonly id: string;
	readonly name: string;
	/** Pre-rendered HTML for name column with click handler (using data-command pattern) */
	readonly nameHtml: string;
	readonly displayName: string;
	readonly type: string;
	readonly typeCode: number;
	readonly size: string;
	readonly modifiedOn: string;
	readonly isManaged: boolean;
	readonly isEditable: boolean;
}
