import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Custom section that renders plugin registration tree.
 *
 * Layout:
 * - Tree search input
 * - Hierarchical tree (Packages → Assemblies → PluginTypes → Steps → Images)
 * - Expand/collapse nodes
 * - Icon-based visual hierarchy
 *
 * Client-side behavior handled by JavaScript loaded from webview.
 */
export class PluginRegistrationTreeSection implements ISection {
	readonly position = SectionPosition.Main;

	render(): string {
		return `
			<div class="plugin-registration-container">
				<!-- Tree Search -->
				<div class="tree-search-container">
					<input
						type="text"
						id="treeSearch"
						class="tree-search-input"
						placeholder="Filter plugins..."
						autocomplete="off"
					/>
				</div>

				<!-- Tree Container -->
				<div class="tree-container" id="pluginTree">
					<div class="tree-loading">Loading plugin registration...</div>
				</div>

				<!-- Empty State -->
				<div class="tree-empty" id="treeEmpty" style="display: none;">
					<p>No plugin assemblies found.</p>
					<p class="help-text">Register assemblies using the Plugin Registration Tool.</p>
				</div>
			</div>
		`;
	}
}
