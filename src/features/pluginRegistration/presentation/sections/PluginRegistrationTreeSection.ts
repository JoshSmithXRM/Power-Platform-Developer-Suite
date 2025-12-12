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

				<!-- Tree Toolbar -->
				<div class="tree-toolbar" id="treeToolbar" style="display: none;">
					<button id="expandAllBtn" class="tree-toolbar-btn" title="Expand All">
						<span class="tree-toolbar-icon">⊞</span>
						<span>Expand All</span>
					</button>
					<button id="collapseAllBtn" class="tree-toolbar-btn" title="Collapse All">
						<span class="tree-toolbar-icon">⊟</span>
						<span>Collapse All</span>
					</button>
					<label class="tree-toolbar-checkbox" title="Hide internal system steps (workflow triggers, etc.)">
						<input type="checkbox" id="hideHiddenSteps" checked />
						<span>Hide hidden steps</span>
					</label>
					<label class="tree-toolbar-checkbox" title="Hide assemblies starting with 'Microsoft.'">
						<input type="checkbox" id="hideMicrosoftAssemblies" />
						<span>Hide Microsoft assemblies</span>
					</label>
				</div>

				<!-- Loading Progress -->
				<div class="loading-progress-container" id="loadingProgress">
					<div class="loading-spinner"></div>
					<div class="loading-step" id="loadingStep">Loading plugin registration...</div>
					<div class="loading-bar-container">
						<div class="loading-bar" id="loadingBar" style="width: 0%"></div>
					</div>
				</div>

				<!-- Tree Container -->
				<div class="tree-container" id="pluginTree" style="display: none;"
					 data-vscode-context='{"preventDefaultContextMenuItems": true}'>
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
