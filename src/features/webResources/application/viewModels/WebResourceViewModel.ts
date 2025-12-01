import type { CellLink } from '../../../../shared/infrastructure/ui/types/CellLink';

/**
 * View model for presenting WebResource data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface WebResourceViewModel {
	[key: string]: unknown;
	readonly id: string;
	readonly name: string;
	/** Structured link data for name column (used by virtual table renderer). Only present for editable (text-based) resources. */
	readonly nameLink?: CellLink;
	readonly displayName: string;
	readonly type: string;
	readonly typeCode: number;
	readonly createdOn: string;
	/** Sort value for createdOn (timestamp for proper date sorting) */
	readonly createdOnSortValue: number;
	readonly modifiedOn: string;
	/** Sort value for modifiedOn (timestamp for proper date sorting) */
	readonly modifiedOnSortValue: number;
	/** Display value for isManaged ('Yes' or 'No') */
	readonly managed: string;
	/** Raw boolean for isManaged (used for filtering/logic) */
	readonly isManaged: boolean;
	readonly isEditable: boolean;
}
