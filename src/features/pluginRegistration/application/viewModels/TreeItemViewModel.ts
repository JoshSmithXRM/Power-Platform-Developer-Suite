/**
 * Unified view model for tree nodes.
 * Supports all node types including grouping nodes for Message View.
 *
 * Node types:
 * - Assembly View: Package, Assembly, PluginType, Step, Image, WebHook, ServiceEndpoint, DataProvider
 * - Message View: SdkMessage, EntityGroup (grouping nodes) + Step, Image, CustomApi
 * - Custom API children: CustomApiEntity, CustomApiPlugin (label nodes)
 *
 * Flat structure for client-side tree rendering.
 */
export interface TreeItemViewModel {
	readonly id: string;
	readonly parentId: string | null;
	readonly type:
		| 'package'
		| 'assembly'
		| 'pluginType'
		| 'step'
		| 'image'
		| 'webHook'
		| 'serviceEndpoint'
		| 'dataProvider'
		| 'customApi'
		| 'customApiEntity' // Custom API child: bound entity
		| 'customApiPlugin' // Custom API child: implementing plugin (label only)
		| 'sdkMessage' // Message View: groups steps by SDK message
		| 'entityGroup'; // Message/Entity View: groups steps by entity
	readonly name: string;
	readonly displayName: string;
	readonly icon: string;
	readonly metadata:
		| PackageMetadata
		| AssemblyMetadata
		| PluginTypeMetadata
		| StepMetadata
		| ImageMetadata
		| WebHookMetadata
		| ServiceEndpointMetadata
		| DataProviderMetadata
		| CustomApiMetadata
		| CustomApiEntityMetadata
		| CustomApiPluginMetadata
		| SdkMessageMetadata
		| EntityGroupMetadata;
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

/**
 * CustomApi-specific metadata.
 * Custom APIs are message-like entities that can be invoked via the Web API.
 */
export interface CustomApiMetadata {
	readonly type: 'customApi';
	readonly uniqueName: string;
	readonly description: string | null;
	/** True if this is an OData function (GET), false if action (POST) */
	readonly isFunction: boolean;
	/** True if hidden from discovery */
	readonly isPrivate: boolean;
	/** Binding type: Global, Entity, or EntityCollection */
	readonly bindingType: string;
	/** Bound entity logical name, if binding type is Entity or EntityCollection */
	readonly boundEntityLogicalName: string | null;
	/** Allowed processing: None, Async Only, or Sync and Async */
	readonly allowedProcessing: string;
	/** Plugin type name implementing this API, if any */
	readonly pluginTypeName: string | null;
	/** Number of request parameters */
	readonly requestParameterCount: number;
	/** Number of response properties */
	readonly responsePropertyCount: number;
	readonly createdOn: string;
	readonly modifiedOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}

/**
 * SDK Message metadata for Message View grouping nodes.
 * Groups plugin steps by their SDK message (Create, Update, Delete, etc.).
 */
export interface SdkMessageMetadata {
	readonly type: 'sdkMessage';
	/** The SDK message name (e.g., "Create", "Update", "Delete") */
	readonly messageName: string;
	/** Total number of steps registered for this message */
	readonly stepCount: number;
	/** True if any step under this message has an entity filter */
	readonly hasEntityGroups: boolean;
}

/**
 * Entity Group metadata for Message/Entity View grouping nodes.
 * Groups plugin steps by entity under an SDK message (Message View)
 * or by message under an entity (Entity View).
 */
export interface EntityGroupMetadata {
	readonly type: 'entityGroup';
	/** The parent SDK message name (empty in Entity View root) */
	readonly messageName: string;
	/** The entity logical name (e.g., "account", "contact"), null for global operations */
	readonly entityLogicalName: string | null;
	/** Number of steps for this message/entity combination */
	readonly stepCount: number;
}

/**
 * Custom API Entity metadata (child of Custom API).
 * Represents the bound entity for entity-bound Custom APIs.
 */
export interface CustomApiEntityMetadata {
	readonly type: 'customApiEntity';
	/** Parent Custom API ID */
	readonly customApiId: string;
	/** The bound entity logical name */
	readonly entityLogicalName: string;
}

/**
 * Custom API Plugin metadata (child of Custom API or Custom API Entity).
 * Label-only node showing which plugin implements the Custom API.
 * NOT expandable - to see plugin steps, use Assembly View.
 */
export interface CustomApiPluginMetadata {
	readonly type: 'customApiPlugin';
	/** Parent Custom API ID */
	readonly customApiId: string;
	/** The implementing plugin type name */
	readonly pluginTypeName: string;
}
