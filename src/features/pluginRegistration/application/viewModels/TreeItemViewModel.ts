/**
 * Unified view model for tree nodes.
 * Supports all 8 node types (Package, Assembly, PluginType, Step, Image, WebHook, ServiceEndpoint, DataProvider).
 *
 * Flat structure for client-side tree rendering.
 */
export interface TreeItemViewModel {
	readonly id: string;
	readonly parentId: string | null;
	readonly type: 'package' | 'assembly' | 'pluginType' | 'step' | 'image' | 'webHook' | 'serviceEndpoint' | 'dataProvider';
	readonly name: string;
	readonly displayName: string;
	readonly icon: string;
	readonly metadata: PackageMetadata | AssemblyMetadata | PluginTypeMetadata | StepMetadata | ImageMetadata | WebHookMetadata | ServiceEndpointMetadata | DataProviderMetadata;
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

/**
 * WebHook-specific metadata.
 */
export interface WebHookMetadata {
	readonly type: 'webHook';
	readonly url: string;
	readonly authType: string;
	readonly description: string | null;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}

/**
 * ServiceEndpoint-specific metadata.
 */
export interface ServiceEndpointMetadata {
	readonly type: 'serviceEndpoint';
	readonly contract: string;
	readonly contractValue: number;
	readonly authType: string;
	readonly messageFormat: string;
	readonly userClaim: string;
	readonly namespace: string;
	readonly path: string | null;
	readonly description: string | null;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}

/**
 * DataProvider-specific metadata.
 * Data Providers enable Virtual Entities by mapping plugin types to CRUD operations.
 */
export interface DataProviderMetadata {
	readonly type: 'dataProvider';
	readonly dataSourceLogicalName: string;
	readonly description: string | null;
	/** Whether Retrieve operation has a plugin assigned */
	readonly hasRetrieve: boolean;
	/** Whether RetrieveMultiple operation has a plugin assigned */
	readonly hasRetrieveMultiple: boolean;
	/** Whether Create operation has a plugin assigned */
	readonly hasCreate: boolean;
	/** Whether Update operation has a plugin assigned */
	readonly hasUpdate: boolean;
	/** Whether Delete operation has a plugin assigned */
	readonly hasDelete: boolean;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}
