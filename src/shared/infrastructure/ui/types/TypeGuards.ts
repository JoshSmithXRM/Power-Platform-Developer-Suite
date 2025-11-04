/**
 * Type guards for SectionRenderData.customData access.
 * Eliminates type assertions with runtime validation (CLAUDE.md Rule #12 compliance).
 */

/**
 * Type guard for TreeNode arrays.
 * Used to safely access tree data from SectionRenderData.customData.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid TreeNode array
 */
export function isTreeNodeArray(value: unknown): value is TreeNode[] {
	return (
		Array.isArray(value) &&
		value.every(
			(node) =>
				typeof node === 'object' &&
				node !== null &&
				'id' in node &&
				'label' in node
		)
	);
}

/**
 * Type guard for trace level strings.
 * Used to safely access trace level from SectionRenderData.customData.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid trace level
 */
export function isTraceLevel(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		['Off', 'Exception', 'All'].includes(value)
	);
}

/**
 * Type guard for PluginTraceDetailViewModel.
 * Used to safely access detail data from SectionRenderData.detailData.
 *
 * @param value - Unknown value to validate
 * @returns True if value is a valid PluginTraceDetailViewModel
 */
export function isPluginTraceDetailViewModel(
	value: unknown
): value is PluginTraceDetailViewModel {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		'pluginName' in value
	);
}

/**
 * TreeNode interface for type guard validation.
 * Minimal interface for runtime validation (full interface defined in TreeViewSection).
 */
interface TreeNode {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly expanded?: boolean;
	readonly children?: ReadonlyArray<TreeNode>;
}

/**
 * PluginTraceDetailViewModel interface for type guard validation.
 * Minimal interface for runtime validation (full interface defined in feature layer).
 */
interface PluginTraceDetailViewModel {
	readonly id: string;
	readonly pluginName: string;
}
