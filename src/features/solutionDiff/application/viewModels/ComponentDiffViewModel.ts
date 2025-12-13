/**
 * ViewModel for displaying component comparison in panel.
 *
 * DTO only - NO behavior.
 */
export interface ComponentDiffViewModel {
	/** Summary message (e.g., "5 added, 3 removed, 2 modified, 10 unchanged") */
	readonly summary: string;

	/** Total component count across all categories */
	readonly totalCount: number;

	/** Components grouped by type */
	readonly componentsByType: readonly ComponentTypeGroupViewModel[];

	/** Source solution component count */
	readonly sourceComponentCount: number;

	/** Target solution component count */
	readonly targetComponentCount: number;

	/** Count of added components */
	readonly addedCount: number;

	/** Count of removed components */
	readonly removedCount: number;

	/** Count of modified components (content differs) */
	readonly modifiedCount: number;

	/** Count of unchanged components */
	readonly unchangedCount: number;

	/** Indicates if deep comparison was performed */
	readonly isDeepComparison: boolean;
}

/**
 * ViewModel for a component type group (e.g., "Entities").
 */
export interface ComponentTypeGroupViewModel {
	/** Component type code (for internal use) */
	readonly type: number;

	/** Display name (e.g., "Entities", "Flows", "Web Resources") */
	readonly typeName: string;

	/** Components added (in target only) */
	readonly added: readonly ComponentViewModel[];

	/** Components removed (in source only) */
	readonly removed: readonly ComponentViewModel[];

	/** Components modified (in both but content differs) */
	readonly modified: readonly ModifiedComponentViewModel[];

	/** Components unchanged (in both with same content) */
	readonly same: readonly ComponentViewModel[];

	/** Total count for this type */
	readonly totalCount: number;

	/** Has differences flag (for UI filtering) - includes modified */
	readonly hasDifferences: boolean;
}

/**
 * ViewModel for a single component.
 */
export interface ComponentViewModel {
	/** Component object ID */
	readonly objectId: string;

	/** Display name (or objectId if name unavailable) */
	readonly name: string;

	/** Component type code */
	readonly componentType: number;
}

/**
 * ViewModel for a modified component with column-level differences.
 */
export interface ModifiedComponentViewModel {
	/** Component object ID */
	readonly objectId: string;

	/** Display name */
	readonly name: string;

	/** Component type code */
	readonly componentType: number;

	/** Column-level differences */
	readonly columnDiffs: readonly ColumnDiffViewModel[];
}

/**
 * ViewModel for a single column difference.
 */
export interface ColumnDiffViewModel {
	/** Column name (e.g., "clientdata", "version") */
	readonly columnName: string;

	/** Human-readable column display name */
	readonly columnDisplayName: string;

	/** Human-readable summary (e.g., "version: 1.0 → 1.1") */
	readonly summary: string;
}
