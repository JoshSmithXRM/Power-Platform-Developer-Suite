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
	/** Structured link data for name column (used by virtual table renderer) */
	readonly nameLink: CellLink;
	readonly displayName: string;
	readonly type: string;
	readonly typeCode: number;
	readonly modifiedOn: string;
	readonly isManaged: boolean;
	readonly isEditable: boolean;
}
