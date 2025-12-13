/**
 * Unified view model for tree nodes.
 * Supports all 5 node types (Package, Assembly, PluginType, Step, Image).
 *
 * Flat structure for client-side tree rendering.
 */
export interface TreeItemViewModel {
	readonly id: string;
	readonly parentId: string | null;
	readonly type: 'package' | 'assembly' | 'pluginType' | 'step' | 'image';
	readonly name: string;
	readonly displayName: string;
	readonly icon: string;
	readonly metadata: PackageMetadata | AssemblyMetadata | PluginTypeMetadata | StepMetadata | ImageMetadata;
	readonly isManaged: boolean;
	readonly children: TreeItemViewModel[];
}

/**
 * Package-specific metadata.
 */
export interface PackageMetadata {
	readonly type: 'package';
	readonly uniqueName: string;
	readonly version: string;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}

/**
 * Assembly-specific metadata.
 */
export interface AssemblyMetadata {
	readonly type: 'assembly';
	readonly version: string;
	readonly isolationMode: string;
	readonly sourceType: string;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
	/** Package ID if assembly is part of a package, null if standalone */
	readonly packageId: string | null;
}

/**
 * Plugin type-specific metadata.
 */
export interface PluginTypeMetadata {
	readonly type: 'pluginType';
	readonly typeName: string;
	readonly friendlyName: string;
	readonly isWorkflowActivity: boolean;
	readonly workflowActivityGroupName: string | null;
}

/**
 * Step-specific metadata.
 */
export interface StepMetadata {
	readonly type: 'step';
	readonly messageName: string;
	readonly primaryEntityLogicalName: string | null;
	readonly stage: string;
	readonly mode: string;
	readonly rank: number;
	readonly isEnabled: boolean;
	readonly isCustomizable: boolean;
	readonly isHidden: boolean;
	readonly filteringAttributes: string[];
	readonly executionOrder: string;
	readonly createdOn: string;
	readonly canEnable: boolean;
	readonly canDisable: boolean;
	readonly canDelete: boolean;
}

/**
 * Image-specific metadata.
 */
export interface ImageMetadata {
	readonly type: 'image';
	readonly imageType: string;
	readonly entityAlias: string;
	readonly attributes: string[];
	readonly createdOn: string;
	readonly canDelete: boolean;
}
