// @ts-check
'use strict';

/**
 * Plugin Registration Tree - Client-side JavaScript
 * Handles: progress updates, tree rendering, expand/collapse, filtering
 *
 * Uses createBehavior pattern from messaging.js for proper vscode API access.
 */

// State (module-scoped)
let treeData = [];
let expandedNodes = new Set();
let currentFilter = '';

/**
 * Update loading progress display
 */
function handleProgressUpdate(data) {
	const loadingProgress = document.getElementById('loadingProgress');
	const loadingStep = document.getElementById('loadingStep');
	const loadingBar = document.getElementById('loadingBar');
	const pluginTree = document.getElementById('pluginTree');
	const treeEmpty = document.getElementById('treeEmpty');

	const { step, percent } = data;

	if (loadingProgress) {
		loadingProgress.style.display = 'flex';
	}
	if (pluginTree) {
		pluginTree.style.display = 'none';
	}
	if (treeEmpty) {
		treeEmpty.style.display = 'none';
	}
	if (loadingStep) {
		loadingStep.textContent = step;
	}
	if (loadingBar) {
		loadingBar.style.width = `${percent}%`;
	}
}

/**
 * Update tree with new data
 */
function handleTreeUpdate(data) {
	const loadingProgress = document.getElementById('loadingProgress');
	const pluginTree = document.getElementById('pluginTree');
	const treeEmpty = document.getElementById('treeEmpty');
	const treeToolbar = document.getElementById('treeToolbar');

	const { treeItems, isEmpty } = data;
	treeData = treeItems || [];

	// Hide loading, show appropriate content
	if (loadingProgress) {
		loadingProgress.style.display = 'none';
	}

	if (isEmpty) {
		if (pluginTree) {
			pluginTree.style.display = 'none';
		}
		if (treeEmpty) {
			treeEmpty.style.display = 'flex';
		}
		if (treeToolbar) {
			treeToolbar.style.display = 'none';
		}
	} else {
		if (treeEmpty) {
			treeEmpty.style.display = 'none';
		}
		if (pluginTree) {
			pluginTree.style.display = 'block';
			renderTree(treeData);
		}
		if (treeToolbar) {
			treeToolbar.style.display = 'flex';
		}
	}
}

/**
 * Render the tree
 */
function renderTree(items) {
	const pluginTree = document.getElementById('pluginTree');
	if (!pluginTree) return;

	const html = items.map(item => renderNode(item, 0)).join('');
	pluginTree.innerHTML = html;

	// Attach event listeners
	pluginTree.querySelectorAll('.tree-node').forEach(node => {
		node.addEventListener('click', handleNodeClick);
	});
}

/**
 * Render a single tree node
 */
function renderNode(item, depth) {
	const hasChildren = item.children && item.children.length > 0;
	const isExpanded = expandedNodes.has(item.id);
	const indent = depth * 16;

	const isDisabledStep = item.type === 'step' && item.metadata?.isEnabled === false;
	const classes = [
		'tree-node',
		item.isManaged ? 'managed' : '',
		isDisabledStep ? 'disabled' : ''
	].filter(Boolean).join(' ');

	const toggleClass = hasChildren
		? (isExpanded ? 'expanded' : 'collapsed')
		: 'leaf';

	const icon = getIcon(item.type, item.icon);
	const badge = getBadge(item);

	let html = `
		<div class="${classes}"
			 data-id="${item.id}"
			 data-type="${item.type}"
			 data-has-children="${hasChildren}"
			 style="padding-left: ${indent + 8}px">
			<span class="tree-node-toggle ${toggleClass}"></span>
			<span class="tree-node-icon">${icon}</span>
			<span class="tree-node-label">${escapeHtml(item.displayName)}</span>
			${badge ? `<span class="tree-node-badge">${badge}</span>` : ''}
		</div>
	`;

	// Render children if expanded
	if (hasChildren && isExpanded) {
		html += `<div class="tree-children">`;
		html += item.children.map(child => renderNode(child, depth + 1)).join('');
		html += `</div>`;
	}

	return html;
}

/**
 * Get icon for node type - uses icon from ViewModel
 */
function getIcon(type, iconHint) {
	// Use the icon from ViewModel if provided
	if (iconHint) {
		return iconHint;
	}

	// Fallback icons (shouldn't be needed)
	const icons = {
		'package': '📦',
		'assembly': '⚙️',
		'pluginType': '🔌',
		'step': '⚡',
		'image': '🖼️'
	};

	return icons[type] || '📄';
}

/**
 * Get badge text for node
 */
function getBadge(item) {
	if (item.type === 'assembly' && item.children) {
		const count = item.children.length;
		return `${count} plugin${count !== 1 ? 's' : ''}`;
	}
	if (item.type === 'pluginType' && item.children) {
		const count = item.children.length;
		return `${count} step${count !== 1 ? 's' : ''}`;
	}
	if (item.type === 'step' && item.metadata) {
		const stage = item.metadata.stage || '';
		const mode = item.metadata.mode === 'Asynchronous' ? 'Async' : 'Sync';
		return `${stage} ${mode}`;
	}
	return '';
}

/**
 * Handle node click
 */
function handleNodeClick(event) {
	const node = event.currentTarget;
	const id = node.dataset.id;
	const hasChildren = node.dataset.hasChildren === 'true';

	if (hasChildren) {
		// Toggle expansion
		if (expandedNodes.has(id)) {
			expandedNodes.delete(id);
		} else {
			expandedNodes.add(id);
		}
		renderTree(treeData);
		// Re-apply filter after re-rendering
		if (currentFilter) {
			filterTree(currentFilter);
		}
	}

	// Notify extension of selection (use window.vscode from messaging.js)
	if (window.vscode) {
		window.vscode.postMessage({
			command: 'selectNode',
			nodeId: id
		});
	}
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Filter tree based on search input.
 * Shows matching nodes plus all ancestors (path to root) and descendants.
 */
function filterTree(searchTerm) {
	// Store current filter for re-application after expand/collapse
	currentFilter = searchTerm;

	const pluginTree = document.getElementById('pluginTree');
	if (!pluginTree) return;

	const term = searchTerm.toLowerCase().trim();

	// If no filter, show all nodes
	if (term === '') {
		pluginTree.querySelectorAll('.tree-node').forEach(node => {
			node.style.display = 'flex';
		});
		pluginTree.querySelectorAll('.tree-children').forEach(container => {
			container.style.display = 'block';
		});
		return;
	}

	// Build a set of node IDs that should be visible
	const visibleNodeIds = new Set();

	// Recursive function to check if node or any descendant matches
	// Returns true if this node or any descendant matches
	function markMatchingBranches(item) {
		const nodeMatches = item.displayName.toLowerCase().includes(term);
		let hasMatchingDescendant = false;

		// Check all children recursively
		if (item.children && item.children.length > 0) {
			for (const child of item.children) {
				if (markMatchingBranches(child)) {
					hasMatchingDescendant = true;
				}
			}
		}

		// If this node matches or has matching descendant, mark entire branch visible
		if (nodeMatches || hasMatchingDescendant) {
			visibleNodeIds.add(item.id);

			// If this node directly matches, also show all descendants
			if (nodeMatches && item.children) {
				markAllDescendantsVisible(item.children);
			}

			return true;
		}

		return false;
	}

	// Mark all descendants of a node as visible
	function markAllDescendantsVisible(children) {
		for (const child of children) {
			visibleNodeIds.add(child.id);
			if (child.children && child.children.length > 0) {
				markAllDescendantsVisible(child.children);
			}
		}
	}

	// Process all top-level items
	for (const item of treeData) {
		markMatchingBranches(item);
	}

	// Apply visibility to DOM nodes
	pluginTree.querySelectorAll('.tree-node').forEach(node => {
		const nodeId = node.dataset.id;
		const isVisible = visibleNodeIds.has(nodeId);
		node.style.display = isVisible ? 'flex' : 'none';
	});

	// Show/hide tree-children containers based on whether they have visible children
	pluginTree.querySelectorAll('.tree-children').forEach(container => {
		const hasVisibleChild = Array.from(container.querySelectorAll(':scope > .tree-node'))
			.some(node => node.style.display !== 'none');
		container.style.display = hasVisibleChild ? 'block' : 'none';
	});
}

/**
 * Get IDs of all visible nodes that have children.
 * Respects the current filter - only returns nodes that would be visible.
 */
function getVisibleExpandableNodeIds() {
	const visibleIds = new Set();
	const term = currentFilter.toLowerCase().trim();

	// Helper to check if a node matches the filter term
	function nodeMatches(item) {
		return item.displayName.toLowerCase().includes(term);
	}

	// Helper to check if any descendant matches
	function hasMatchingDescendant(item) {
		if (!item.children || item.children.length === 0) return false;
		for (const child of item.children) {
			if (nodeMatches(child) || hasMatchingDescendant(child)) {
				return true;
			}
		}
		return false;
	}

	// Recursive function to collect expandable node IDs
	function collectExpandableNodes(item, isAncestorVisible) {
		const hasChildren = item.children && item.children.length > 0;
		const matches = nodeMatches(item);
		const hasMatchingChild = hasMatchingDescendant(item);

		// Node is visible if: no filter, it matches, ancestor of match, or descendant of match
		const isVisible = term === '' || matches || hasMatchingChild || isAncestorVisible;

		if (isVisible && hasChildren) {
			visibleIds.add(item.id);
		}

		// Recurse into children
		if (hasChildren) {
			// Children are visible if this node matches (they're descendants of a match)
			const childrenAncestorVisible = isAncestorVisible || matches;
			for (const child of item.children) {
				collectExpandableNodes(child, childrenAncestorVisible);
			}
		}
	}

	for (const item of treeData) {
		collectExpandableNodes(item, false);
	}

	return visibleIds;
}

/**
 * Expand all visible nodes
 */
function expandAll() {
	const visibleExpandableIds = getVisibleExpandableNodeIds();
	for (const id of visibleExpandableIds) {
		expandedNodes.add(id);
	}
	renderTree(treeData);
	if (currentFilter) {
		filterTree(currentFilter);
	}
}

/**
 * Collapse all visible nodes
 */
function collapseAll() {
	// Clear all expanded nodes (simple approach - works well regardless of filter)
	expandedNodes.clear();
	renderTree(treeData);
	if (currentFilter) {
		filterTree(currentFilter);
	}
}

// Use createBehavior pattern (from messaging.js) for proper integration
window.createBehavior({
	initialize() {
		const loadingProgress = document.getElementById('loadingProgress');
		const pluginTree = document.getElementById('pluginTree');
		const treeEmpty = document.getElementById('treeEmpty');
		const treeSearch = document.getElementById('treeSearch');
		const treeToolbar = document.getElementById('treeToolbar');
		const expandAllBtn = document.getElementById('expandAllBtn');
		const collapseAllBtn = document.getElementById('collapseAllBtn');

		// Initial state: show loading
		if (loadingProgress) {
			loadingProgress.style.display = 'flex';
		}
		if (pluginTree) {
			pluginTree.style.display = 'none';
		}
		if (treeEmpty) {
			treeEmpty.style.display = 'none';
		}
		if (treeToolbar) {
			treeToolbar.style.display = 'none';
		}

		// Wire up search handler
		if (treeSearch) {
			treeSearch.addEventListener('input', (event) => {
				const value = event.target.value || '';
				filterTree(value);
			});
		}

		// Wire up expand/collapse all handlers
		if (expandAllBtn) {
			expandAllBtn.addEventListener('click', expandAll);
		}
		if (collapseAllBtn) {
			collapseAllBtn.addEventListener('click', collapseAll);
		}
	},

	handleMessage(message) {
		switch (message.command) {
			case 'updateLoadingProgress':
				handleProgressUpdate(message.data);
				break;
			case 'updateTree':
				handleTreeUpdate(message.data);
				break;
		}
	}
});
