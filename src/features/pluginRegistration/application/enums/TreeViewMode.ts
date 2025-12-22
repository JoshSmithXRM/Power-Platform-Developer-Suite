/**
 * View mode for plugin registration tree display.
 *
 * - Assembly: Packages -> Assemblies -> PluginTypes -> Steps -> Images (default)
 *   Also shows WebHooks, ServiceEndpoints, DataProviders, CustomApis at root.
 *
 * - Message: SDK Messages -> Entities -> Steps (PRT-style)
 *   Groups steps by their SDK message and primary entity.
 *   CustomApis shown at root (same as Assembly view).
 */
export enum TreeViewMode {
	/** Default view: hierarchical by package/assembly/type */
	Assembly = 'assembly',

	/** PRT-style view: grouped by SDK message and entity */
	Message = 'message',
}
