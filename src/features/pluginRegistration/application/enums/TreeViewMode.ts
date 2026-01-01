/**
 * View mode for plugin registration tree display.
 *
 * - Assembly: Packages -> Assemblies -> PluginTypes -> Steps -> Images (default)
 *   Also shows WebHooks, ServiceEndpoints, DataProviders at root.
 *
 * - Message: SDK Messages -> Entities -> Steps -> Images
 *   Groups steps by their SDK message, then by primary entity.
 *   CustomApis shown at root (only in this view).
 *
 * - Entity: Entities -> Messages -> Steps -> Images
 *   Groups steps by their primary entity, then by SDK message.
 *   No CustomApis in this view.
 */
export enum TreeViewMode {
	/** Default view: hierarchical by package/assembly/type */
	Assembly = 'assembly',

	/** Message-first view: grouped by SDK message, then entity */
	Message = 'message',

	/** Entity-first view: grouped by entity, then SDK message */
	Entity = 'entity',
}
