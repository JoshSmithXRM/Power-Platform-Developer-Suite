/**
 * View rendering for component-level diff results.
 * Generates HTML for displaying component comparison with expandable sections.
 */

import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';
import type {
	ComponentDiffViewModel,
	ComponentTypeGroupViewModel,
	ComponentViewModel,
	ModifiedComponentViewModel
} from '../../application/viewModels/ComponentDiffViewModel';

/**
 * Renders component diff section with expandable component type groups.
 */
export function renderComponentDiff(diff: ComponentDiffViewModel): string {
	if (diff.componentsByType.length === 0) {
		return `
			<div class="component-diff-section">
				<h4>Component Comparison</h4>
				<p class="no-components">No components found in either solution.</p>
			</div>
		`;
	}

	return `
		<div class="component-diff-section">
			<h4>Component Comparison</h4>
			<div class="component-summary">
				${escapeHtml(diff.summary)}
				<span class="component-counts">(${diff.sourceComponentCount} in source, ${diff.targetComponentCount} in target)</span>
			</div>

			<div class="component-type-groups">
				${diff.componentsByType.map(group => renderComponentTypeGroup(group)).join('')}
			</div>
		</div>
	`;
}

/**
 * Renders a component type group (e.g., "Entities").
 */
function renderComponentTypeGroup(group: ComponentTypeGroupViewModel): string {
	if (group.totalCount === 0) {
		return ''; // Don't render empty groups
	}

	const hasChanges = group.hasDifferences;
	// Ensure type name is never empty for proper rendering
	const displayTypeName = group.typeName.trim() || 'Unknown Components';

	return `
		<details class="component-type-group" ${hasChanges ? 'open' : ''}>
			<summary>
				<span class="component-type-name">${escapeHtml(displayTypeName)}</span>
				<span class="component-type-counts">
					${group.added.length > 0 ? `<span class="count-added">+${group.added.length}</span>` : ''}
					${group.removed.length > 0 ? `<span class="count-removed">-${group.removed.length}</span>` : ''}
					${group.modified.length > 0 ? `<span class="count-modified">~${group.modified.length}</span>` : ''}
					${group.same.length > 0 ? `<span class="count-same">${group.same.length} unchanged</span>` : ''}
				</span>
			</summary>

			<div class="component-lists">
				${renderComponentList('Added (in target only)', group.added, 'added')}
				${renderComponentList('Removed (in source only)', group.removed, 'removed')}
				${renderModifiedComponentList('Modified (content differs)', group.modified)}
				${renderComponentList('Unchanged', group.same, 'same')}
			</div>
		</details>
	`;
}

/**
 * Renders a list of components (Added, Removed, or Same).
 */
function renderComponentList(
	label: string,
	components: readonly ComponentViewModel[],
	cssClass: string
): string {
	if (components.length === 0) {
		return '';
	}

	return `
		<div class="component-list component-list-${cssClass}">
			<h5>${escapeHtml(label)} (${components.length})</h5>
			<ul>
				${components.map(c => `
					<li>
						<span class="component-name">${escapeHtml(c.name)}</span>
						<span class="component-id">${escapeHtml(c.objectId)}</span>
					</li>
				`).join('')}
			</ul>
		</div>
	`;
}

/**
 * Renders a list of modified components with column-level diffs.
 */
function renderModifiedComponentList(
	label: string,
	components: readonly ModifiedComponentViewModel[]
): string {
	if (components.length === 0) {
		return '';
	}

	return `
		<div class="component-list component-list-modified">
			<h5>${escapeHtml(label)} (${components.length})</h5>
			<ul>
				${components.map(c => `
					<li class="modified-component">
						<div class="modified-component-header">
							<span class="component-name">${escapeHtml(c.name)}</span>
							<span class="component-id">${escapeHtml(c.objectId)}</span>
						</div>
						<div class="column-diffs">
							${c.columnDiffs.map(diff => `
								<div class="column-diff">
									<span class="column-name">${escapeHtml(diff.columnDisplayName)}</span>
									<span class="column-summary">${escapeHtml(diff.summary)}</span>
								</div>
							`).join('')}
						</div>
					</li>
				`).join('')}
			</ul>
		</div>
	`;
}
