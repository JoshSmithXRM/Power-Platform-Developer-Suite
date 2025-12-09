/**
 * ViewModel for displaying component comparison in panel.
 *
 * DTO only - NO behavior.
 */
export interface ComponentDiffViewModel {
	/** Summary message (e.g., "5 added, 3 removed, 10 unchanged") */
	readonly summary: string;

	/** Total component count across all categories */
	readonly totalCount: number;

	/** Components grouped by type */
	readonly componentsByType: readonly ComponentTypeGroupViewModel[];

	/** Source solution component count */
	readonly sourceComponentCount: number;

	/** Target solution component count */
	readonly targetComponentCount: number;
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

	/** Components unchanged (in both) */
	readonly same: readonly ComponentViewModel[];

	/** Total count for this type */
	readonly totalCount: number;

	/** Has differences flag (for UI filtering) */
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
