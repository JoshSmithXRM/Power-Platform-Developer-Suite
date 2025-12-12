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
let hideHiddenSteps = true; // Default: hide internal system steps (ishidden=true)
let hideMicrosoftAssemblies = false; // Default: show Microsoft assemblies

// Virtual scrolling state
const VIRTUAL_SCROLL_THRESHOLD = 500; // Enable virtual scrolling above this node count
const NODE_HEIGHT = 30; // Fixed height for virtual scroll calculations
const OVERSCAN_COUNT = 10; // Extra nodes to render above/below viewport
let flattenedNodes = []; // Flattened list of visible nodes for virtual scrolling
let visibleStart = 0;
let visibleEnd = 50;
let scrollDebounceTimer = null;
let useVirtualScroll = false; // Whether virtual scrolling is active

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
			renderTree();
		}
		if (treeToolbar) {
			treeToolbar.style.display = 'flex';
		}
	}
}

/**
 * Render the tree - uses virtual scrolling for large trees.
 * Automatically applies Microsoft plugins filter if enabled.
 */
function renderTree() {
	const pluginTree = document.getElementById('pluginTree');
	if (!pluginTree) return;

	// Get effective data (filtered if hideMicrosoftPlugins is enabled)
	const effectiveData = getEffectiveTreeData();

	// Flatten tree to determine total visible node count
	flattenedNodes = flattenTree(effectiveData);
	useVirtualScroll = flattenedNodes.length > VIRTUAL_SCROLL_THRESHOLD;

	if (useVirtualScroll) {
		renderVirtualTree(pluginTree);
		setupScrollHandler(pluginTree);
	} else {
		renderFullTree(pluginTree, effectiveData);
	}
}

/**
 * Render the full tree (no virtual scrolling) - used for small trees.
 */
function renderFullTree(pluginTree, items) {
	const html = items.map(item => renderNode(item, 0)).join('');
	pluginTree.innerHTML = html;

	// Attach event listeners
	pluginTree.querySelectorAll('.tree-node').forEach(node => {
		node.addEventListener('click', handleNodeClick);
	});
}

/**
 * Render tree with virtual scrolling - only renders visible nodes.
 */
function renderVirtualTree(pluginTree) {
	// Calculate visible range based on current scroll
	const scrollTop = pluginTree.scrollTop || 0;
	const containerHeight = pluginTree.clientHeight || 600;
	const visibleCount = Math.ceil(containerHeight / NODE_HEIGHT);

	visibleStart = Math.max(0, Math.floor(scrollTop / NODE_HEIGHT) - OVERSCAN_COUNT);
	visibleEnd = Math.min(flattenedNodes.length, visibleStart + visibleCount + OVERSCAN_COUNT * 2);

	// Calculate spacer heights
	const topSpacerHeight = visibleStart * NODE_HEIGHT;
	const bottomSpacerHeight = Math.max(0, (flattenedNodes.length - visibleEnd) * NODE_HEIGHT);

	// Build HTML
	let html = `<div class="virtual-spacer-top" style="height: ${topSpacerHeight}px"></div>`;

	for (let i = visibleStart; i < visibleEnd && i < flattenedNodes.length; i++) {
		const { item, depth } = flattenedNodes[i];
		html += renderFlatNode(item, depth);
	}

	html += `<div class="virtual-spacer-bottom" style="height: ${bottomSpacerHeight}px"></div>`;

	pluginTree.innerHTML = html;

	// Attach event listeners to visible nodes
	pluginTree.querySelectorAll('.tree-node').forEach(node => {
		node.addEventListener('click', handleNodeClick);
	});
}

/**
 * Flatten the tree into a list of {item, depth} for virtual scrolling.
 * Only includes expanded nodes and their visible children.
 */
function flattenTree(items, depth = 0, result = []) {
	for (const item of items) {
		result.push({ item, depth });

		// Only include children if node is expanded
		if (item.children && item.children.length > 0 && expandedNodes.has(item.id)) {
			flattenTree(item.children, depth + 1, result);
		}
	}
	return result;
}

/**
 * Render a flat node (no nested children div) - used for virtual scrolling.
 */
function renderFlatNode(item, depth) {
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
	const vscodeContext = buildVscodeContext(item);

	return `
		<div class="${classes}"
			 data-id="${item.id}"
			 data-type="${item.type}"
			 data-has-children="${hasChildren}"
			 data-depth="${depth}"
			 data-vscode-context='${vscodeContext}'
			 style="padding-left: ${indent + 8}px">
			<span class="tree-node-toggle ${toggleClass}"></span>
			<span class="tree-node-icon">${icon}</span>
			<span class="tree-node-label">${escapeHtml(item.displayName)}</span>
			${badge ? `<span class="tree-node-badge">${badge}</span>` : ''}
		</div>
	`;
}

/**
 * Setup scroll handler for virtual scrolling.
 */
function setupScrollHandler(pluginTree) {
	// Remove existing handler if any
	pluginTree.removeEventListener('scroll', handleVirtualScroll);
	pluginTree.addEventListener('scroll', handleVirtualScroll);
}

/**
 * Handle scroll events for virtual scrolling.
 */
function handleVirtualScroll(event) {
	if (!useVirtualScroll) return;

	const pluginTree = event.target;

	// Debounce using requestAnimationFrame
	if (scrollDebounceTimer) {
		cancelAnimationFrame(scrollDebounceTimer);
	}

	scrollDebounceTimer = requestAnimationFrame(() => {
		const scrollTop = pluginTree.scrollTop;
		const containerHeight = pluginTree.clientHeight || 600;
		const visibleCount = Math.ceil(containerHeight / NODE_HEIGHT);

		const newStart = Math.max(0, Math.floor(scrollTop / NODE_HEIGHT) - OVERSCAN_COUNT);
		const newEnd = Math.min(flattenedNodes.length, newStart + visibleCount + OVERSCAN_COUNT * 2);

		// Only re-render if visible range changed significantly
		if (Math.abs(newStart - visibleStart) > 5 || Math.abs(newEnd - visibleEnd) > 5) {
			visibleStart = newStart;
			visibleEnd = newEnd;
			renderVirtualTreeContent(pluginTree);
		}
	});
}

/**
 * Re-render just the content for virtual scrolling (preserves scroll position).
 */
function renderVirtualTreeContent(pluginTree) {
	const topSpacerHeight = visibleStart * NODE_HEIGHT;
	const bottomSpacerHeight = Math.max(0, (flattenedNodes.length - visibleEnd) * NODE_HEIGHT);

	let html = `<div class="virtual-spacer-top" style="height: ${topSpacerHeight}px"></div>`;

	for (let i = visibleStart; i < visibleEnd && i < flattenedNodes.length; i++) {
		const { item, depth } = flattenedNodes[i];
		html += renderFlatNode(item, depth);
	}

	html += `<div class="virtual-spacer-bottom" style="height: ${bottomSpacerHeight}px"></div>`;

	pluginTree.innerHTML = html;

	// Attach event listeners to visible nodes
	pluginTree.querySelectorAll('.tree-node').forEach(node => {
		node.addEventListener('click', handleNodeClick);
	});
}

/**
 * Build VS Code context menu data for a tree node.
 * This enables VS Code native right-click menus via data-vscode-context.
 *
 * Returns raw JSON string - use with single-quoted HTML attribute.
 */
function buildVscodeContext(item) {
	const context = {
		webviewSection: item.type,
		nodeId: item.id,
		preventDefaultContextMenuItems: true
	};

	// Add type-specific context for menu when clauses
	if (item.type === 'step' && item.metadata) {
		context.canEnable = item.metadata.canEnable === true;
		context.canDisable = item.metadata.canDisable === true;
	} else if (item.type === 'assembly' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		// packageId can be a GUID string or null - preserve it exactly
		// Note: use explicit check for null/undefined, not falsy check
		const pkgId = item.metadata.packageId;
		context.packageId = (pkgId !== null && pkgId !== undefined) ? pkgId : null;
		context.isStandalone = pkgId === null || pkgId === undefined;
	} else if (item.type === 'package' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
	}

	return JSON.stringify(context);
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
	const vscodeContext = buildVscodeContext(item);

	let html = `
		<div class="${classes}"
			 data-id="${item.id}"
			 data-type="${item.type}"
			 data-has-children="${hasChildren}"
			 data-vscode-context='${vscodeContext}'
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
 * Handle node click - uses targeted subtree render for performance.
 * Instead of re-rendering entire tree, only toggles children visibility.
 */
function handleNodeClick(event) {
	const node = event.currentTarget;
	const id = node.dataset.id;
	const hasChildren = node.dataset.hasChildren === 'true';

	if (hasChildren) {
		toggleExpansion(node, id);
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
 * Toggle expansion of a tree node.
 * Uses virtual scrolling re-render for large trees, targeted DOM for small trees.
 */
function toggleExpansion(node, id) {
	const isExpanded = expandedNodes.has(id);

	if (isExpanded) {
		expandedNodes.delete(id);
	} else {
		expandedNodes.add(id);
	}

	// Check if we need to use virtual scrolling after this toggle
	flattenedNodes = flattenTree(treeData);
	const shouldUseVirtualScroll = flattenedNodes.length > VIRTUAL_SCROLL_THRESHOLD;

	// If switching modes or staying in virtual scroll, do full re-render
	if (shouldUseVirtualScroll || useVirtualScroll) {
		useVirtualScroll = shouldUseVirtualScroll;
		const pluginTree = document.getElementById('pluginTree');
		if (pluginTree) {
			if (useVirtualScroll) {
				renderVirtualTree(pluginTree);
				setupScrollHandler(pluginTree);
			} else {
				renderFullTree(pluginTree, treeData);
			}
			if (currentFilter) {
				filterTree(currentFilter);
			}
		}
		return;
	}

	// Small tree: use targeted DOM manipulation for better UX
	if (isExpanded) {
		// Was expanded, now collapsed: remove children container
		const childrenContainer = node.nextElementSibling;
		if (childrenContainer && childrenContainer.classList.contains('tree-children')) {
			childrenContainer.remove();
		}
		updateToggleIcon(node, false);
	} else {
		// Was collapsed, now expanded: render just this node's children
		const item = findNodeInTree(treeData, id);
		if (item && item.children && item.children.length > 0) {
			const depth = getNodeDepth(node);
			const childrenHtml = renderChildrenContainer(item.children, depth + 1);
			node.insertAdjacentHTML('afterend', childrenHtml);
			// Attach click handlers to newly added nodes
			const childrenContainer = node.nextElementSibling;
			if (childrenContainer) {
				childrenContainer.querySelectorAll('.tree-node').forEach(childNode => {
					childNode.addEventListener('click', handleNodeClick);
				});
				// Apply filter to new children if filter is active
				if (currentFilter) {
					applyFilterToSubtree(childrenContainer);
				}
			}
		}
		updateToggleIcon(node, true);
	}
}

/**
 * Update the toggle icon (triangle) on a node.
 */
function updateToggleIcon(node, isExpanded) {
	const toggle = node.querySelector('.tree-node-toggle');
	if (toggle) {
		toggle.classList.remove('expanded', 'collapsed');
		toggle.classList.add(isExpanded ? 'expanded' : 'collapsed');
	}
}

/**
 * Find a node in the tree data by ID.
 */
function findNodeInTree(items, targetId) {
	for (const item of items) {
		if (item.id === targetId) {
			return item;
		}
		if (item.children && item.children.length > 0) {
			const found = findNodeInTree(item.children, targetId);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Get the depth of a node by counting parent tree-children containers.
 */
function getNodeDepth(node) {
	let depth = 0;
	let parent = node.parentElement;
	while (parent) {
		if (parent.classList.contains('tree-children')) {
			depth++;
		}
		if (parent.id === 'pluginTree') {
			break;
		}
		parent = parent.parentElement;
	}
	return depth;
}

/**
 * Render a children container with all child nodes.
 */
function renderChildrenContainer(children, depth) {
	let html = '<div class="tree-children">';
	for (const child of children) {
		html += renderNode(child, depth);
	}
	html += '</div>';
	return html;
}

/**
 * Apply current filter to a newly rendered subtree.
 */
function applyFilterToSubtree(container) {
	const term = currentFilter.toLowerCase().trim();
	if (term === '') return;

	// Build visible node IDs from the effective tree data
	const visibleNodeIds = buildVisibleNodeIds(term);

	// Apply visibility to nodes in this subtree
	container.querySelectorAll('.tree-node').forEach(node => {
		const nodeId = node.dataset.id;
		node.style.display = visibleNodeIds.has(nodeId) ? 'flex' : 'none';
	});
	container.querySelectorAll('.tree-children').forEach(childContainer => {
		const hasVisibleChild = Array.from(childContainer.querySelectorAll(':scope > .tree-node'))
			.some(node => node.style.display !== 'none');
		childContainer.style.display = hasVisibleChild ? 'block' : 'none';
	});
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
 * Works with both virtual scrolling and regular DOM modes.
 */
function filterTree(searchTerm) {
	// Store current filter for re-application after expand/collapse
	currentFilter = searchTerm;

	const pluginTree = document.getElementById('pluginTree');
	if (!pluginTree) return;

	const term = searchTerm.toLowerCase().trim();

	// If no filter, show all nodes
	if (term === '') {
		if (useVirtualScroll) {
			// Virtual scroll: re-render with all nodes
			flattenedNodes = flattenTree(treeData);
			renderVirtualTree(pluginTree);
		} else {
			pluginTree.querySelectorAll('.tree-node').forEach(node => {
				node.style.display = 'flex';
			});
			pluginTree.querySelectorAll('.tree-children').forEach(container => {
				container.style.display = 'block';
			});
		}
		return;
	}

	// Build a set of node IDs that should be visible
	const visibleNodeIds = buildVisibleNodeIds(term);

	if (useVirtualScroll) {
		// Virtual scroll: filter the flattened nodes and re-render
		flattenedNodes = flattenTree(treeData).filter(({ item }) => visibleNodeIds.has(item.id));
		renderVirtualTree(pluginTree);
	} else {
		// Regular DOM: apply visibility styles
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
}

/**
 * Build set of visible node IDs based on filter term.
 * Returns IDs of matching nodes, their ancestors, and descendants.
 */
function buildVisibleNodeIds(term) {
	const visibleNodeIds = new Set();
	const effectiveData = getEffectiveTreeData();

	function markMatchingBranches(item) {
		const nodeMatches = item.displayName.toLowerCase().includes(term);
		let hasMatchingDescendant = false;

		if (item.children && item.children.length > 0) {
			for (const child of item.children) {
				if (markMatchingBranches(child)) {
					hasMatchingDescendant = true;
				}
			}
		}

		if (nodeMatches || hasMatchingDescendant) {
			visibleNodeIds.add(item.id);
			if (nodeMatches && item.children) {
				markAllDescendantsVisible(item.children);
			}
			return true;
		}
		return false;
	}

	function markAllDescendantsVisible(children) {
		for (const child of children) {
			visibleNodeIds.add(child.id);
			if (child.children && child.children.length > 0) {
				markAllDescendantsVisible(child.children);
			}
		}
	}

	for (const item of effectiveData) {
		markMatchingBranches(item);
	}

	return visibleNodeIds;
}

/**
 * Filter out hidden steps (ishidden=true) from tree data.
 * Returns a deep copy with hidden steps removed.
 * Also removes containers that BECAME empty due to filtering (not originally empty ones).
 *
 * Important: Preserves originally empty containers (e.g., plugin types with no steps registered yet).
 * This allows users to see their registered plugins even before adding steps.
 */
function filterHiddenSteps(items) {
	return items
		.map(item => {
			// Deep clone the item
			const clone = { ...item };

			// Track if container was originally empty (before any filtering)
			const wasOriginallyEmpty = !clone.children || clone.children.length === 0;

			if (clone.children && clone.children.length > 0) {
				// Recursively filter children
				clone.children = filterHiddenSteps(clone.children);
			}

			// Store flag for filtering decision (temporary, harmless for rendering)
			clone._wasOriginallyEmpty = wasOriginallyEmpty;

			return clone;
		})
		.filter(item => {
			// Filter out hidden steps
			if (item.type === 'step') {
				return item.metadata?.isHidden !== true;
			}

			// Filter out containers that BECAME empty due to filtering
			// Keep containers that were originally empty (e.g., plugin type with no steps registered)
			if (item.type === 'pluginType' || item.type === 'assembly' || item.type === 'package') {
				const hasChildren = item.children && item.children.length > 0;
				// Keep if: has children OR was originally empty (didn't become empty due to filter)
				return hasChildren || item._wasOriginallyEmpty;
			}

			return true;
		});
}

/**
 * Filter out Microsoft assemblies (name starts with 'Microsoft') from tree data.
 * Returns a deep copy with Microsoft assemblies removed.
 * Also removes containers that BECAME empty due to filtering (not originally empty ones).
 */
function filterMicrosoftAssemblies(items) {
	return items
		.map(item => {
			// Deep clone the item
			const clone = { ...item };

			// Track if container was originally empty (before any filtering)
			const wasOriginallyEmpty = !clone.children || clone.children.length === 0;

			if (clone.children && clone.children.length > 0) {
				// Recursively filter children
				clone.children = filterMicrosoftAssemblies(clone.children);
			}

			// Store flag for filtering decision
			clone._wasOriginallyEmpty = wasOriginallyEmpty;

			return clone;
		})
		.filter(item => {
			// Filter out Microsoft assemblies (matches 'Microsoft.*' and 'MicrosoftPowerApps*' etc.)
			if (item.type === 'assembly') {
				return !item.name.startsWith('Microsoft');
			}

			// Filter out packages that BECAME empty due to filtering
			// Keep packages that were originally empty
			if (item.type === 'package') {
				const hasChildren = item.children && item.children.length > 0;
				return hasChildren || item._wasOriginallyEmpty;
			}

			return true;
		});
}

/**
 * Get the effective tree data (filtered based on active filters)
 */
function getEffectiveTreeData() {
	let data = treeData;

	if (hideHiddenSteps) {
		data = filterHiddenSteps(data);
	}

	if (hideMicrosoftAssemblies) {
		data = filterMicrosoftAssemblies(data);
	}

	return data;
}

/**
 * Get IDs of all visible nodes that have children.
 * Respects the current filter - only returns nodes that would be visible.
 */
function getVisibleExpandableNodeIds() {
	const visibleIds = new Set();
	const term = currentFilter.toLowerCase().trim();
	const effectiveData = getEffectiveTreeData();

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

	for (const item of effectiveData) {
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
	renderTree();
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
	renderTree();
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

		// Initialize dropdown components (Register dropdown)
		if (window.initializeDropdowns) {
			window.initializeDropdowns();
		}

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

		// Wire up hide hidden steps checkbox
		const hideHiddenStepsCheckbox = document.getElementById('hideHiddenSteps');
		if (hideHiddenStepsCheckbox) {
			hideHiddenStepsCheckbox.addEventListener('change', (event) => {
				hideHiddenSteps = event.target.checked;
				renderTree();
				if (currentFilter) {
					filterTree(currentFilter);
				}
			});
		}

		// Wire up hide Microsoft assemblies checkbox
		const hideMicrosoftAssembliesCheckbox = document.getElementById('hideMicrosoftAssemblies');
		if (hideMicrosoftAssembliesCheckbox) {
			hideMicrosoftAssembliesCheckbox.addEventListener('change', (event) => {
				hideMicrosoftAssemblies = event.target.checked;
				renderTree();
				if (currentFilter) {
					filterTree(currentFilter);
				}
			});
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
			case 'updateNode':
				handleNodeUpdate(message.data);
				break;
			case 'updateSubtree':
				handleSubtreeUpdate(message.data);
				break;
			case 'showRegisterPackageModal':
				handleShowRegisterPackageModal(message.data);
				break;
		}
	}
});

/**
 * Show the Register Package modal with pre-filled metadata.
 * @param {Object} data - { name, version, filename, solutions }
 */
function handleShowRegisterPackageModal(data) {
	const { name, version, filename, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build solution options for dropdown with placeholder
	const solutionOptions = [
		{ value: '', label: '-- Select a Solution --' },
		...(solutions || []).map(s => ({
			value: s.id,
			label: s.name,
			prefix: s.prefix
		}))
	];

	// Store solutions for prefix lookup
	const solutionPrefixMap = {};
	(solutions || []).forEach(s => {
		solutionPrefixMap[s.id] = s.prefix;
	});

	window.showFormModal({
		title: 'Register Plugin Package',
		fields: [
			{
				id: 'filename',
				label: 'File',
				type: 'text',
				value: filename || '',
				readonly: true
			},
			{
				id: 'solution',
				label: 'Solution',
				type: 'select',
				value: '', // No pre-selection - user must choose
				options: solutionOptions,
				required: true
			},
			{
				id: 'prefix',
				label: 'Prefix',
				type: 'text',
				value: '', // Empty until solution selected
				required: true,
				placeholder: 'Select a solution first'
			},
			{
				id: 'name',
				label: 'Package Name',
				type: 'text',
				value: name || '',
				required: true,
				placeholder: 'e.g., PPDSDemo.PluginPackage'
			},
			{
				id: 'version',
				label: 'Version',
				type: 'text',
				value: version || '1.0.0',
				required: true,
				placeholder: 'e.g., 1.0.0'
			}
		],
		submitLabel: 'Register',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			// When solution changes, update the prefix field
			if (fieldId === 'solution') {
				const prefix = solutionPrefixMap[value] || '';
				updateField('prefix', prefix);
			}
		},
		onSubmit: (values) => {
			// Validate solution was selected
			if (!values.solution) {
				return; // Form validation will handle this
			}
			// Send confirmation to extension
			vscode.postMessage({
				command: 'confirmRegisterPackage',
				data: {
					name: values.name,
					version: values.version,
					prefix: values.prefix
				}
			});
		}
	});
}

/**
 * Update a single node in the tree (e.g., after enable/disable step).
 * Uses full re-render to ensure correct positioning.
 * @param {Object} data - { nodeId, updatedNode }
 */
function handleNodeUpdate(data) {
	const { nodeId, updatedNode } = data;
	if (!nodeId || !updatedNode) return;

	// Update data model
	updateNodeInTree(treeData, nodeId, updatedNode);

	// Re-render tree to ensure correct positioning
	// (Targeted DOM updates caused positioning bugs with virtual scrolling)
	renderTree();

	// Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}
}

/**
 * Update a subtree (node and all children) in the tree.
 * Uses full re-render to ensure correct positioning.
 * @param {Object} data - { nodeId, updatedSubtree }
 */
function handleSubtreeUpdate(data) {
	const { nodeId, updatedSubtree } = data;
	if (!nodeId || !updatedSubtree) return;

	// Update data model
	updateNodeInTree(treeData, nodeId, updatedSubtree);

	// Re-render tree to ensure correct positioning
	// (Targeted DOM updates caused positioning bugs with virtual scrolling)
	renderTree();

	// Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}
}

/**
 * Recursively find and update a node in the tree.
 * @returns {boolean} True if node was found and updated
 */
function updateNodeInTree(items, nodeId, newNode) {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id === nodeId) {
			items[i] = newNode;
			return true;
		}
		if (items[i].children && items[i].children.length > 0) {
			if (updateNodeInTree(items[i].children, nodeId, newNode)) {
				return true;
			}
		}
	}
	return false;
}
