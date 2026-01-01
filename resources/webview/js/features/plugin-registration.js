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
let hideMicrosoftAssemblies = true; // Default: hide Microsoft assemblies
let selectedNodeId = null; // Currently selected node for detail panel
let currentSolutionId = ''; // Selected solution for filtering (empty = All Solutions)
let solutionMemberships = {}; // solutionId -> objectId[] for client-side filtering

// Cache for entities per message (messageId -> entity logical names array)
const entityCacheByMessage = new Map();
// Active step modal state (for async entity loading)
let activeStepModal = {
	updateField: null, // Function to update fields in the active modal
	pendingMessageId: null // Message ID we're waiting for entities
};

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

	const { treeItems, isEmpty, solutionMemberships: memberships } = data;
	treeData = treeItems || [];

	// Store solution memberships for client-side filtering
	if (memberships) {
		solutionMemberships = memberships;
	}

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
			expandAll(); // Show tree fully expanded by default
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
		context.canDelete = item.metadata.canDelete === true;
	} else if (item.type === 'assembly' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		// packageId can be a GUID string or null - preserve it exactly
		// Note: use explicit check for null/undefined, not falsy check
		const pkgId = item.metadata.packageId;
		context.packageId = (pkgId !== null && pkgId !== undefined) ? pkgId : null;
		context.isStandalone = pkgId === null || pkgId === undefined;
	} else if (item.type === 'package' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
	} else if (item.type === 'image' && item.metadata) {
		context.canDelete = item.metadata.canDelete === true;
	} else if (item.type === 'webHook' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		context.canDelete = item.metadata.canDelete === true;
	} else if (item.type === 'serviceEndpoint' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		context.canDelete = item.metadata.canDelete === true;
	} else if (item.type === 'dataProvider' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		context.canDelete = item.metadata.canDelete === true;
	} else if (item.type === 'customApi' && item.metadata) {
		context.canUpdate = item.metadata.canUpdate === true;
		context.canDelete = item.metadata.canDelete === true;
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
		'image': '🖼️',
		'webHook': '🌐',
		'serviceEndpoint': '🌐',
		'dataProvider': '🗃️',
		'customApi': '📨'
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
	const nodeType = node.dataset.type;
	const hasChildren = node.dataset.hasChildren === 'true';

	// Check if click was on the toggle icon (expand/collapse arrow)
	const clickedOnToggle = event.target.classList.contains('tree-node-toggle');

	if (clickedOnToggle && hasChildren) {
		// Toggle icon click: toggle expansion (both expand and collapse)
		toggleExpansion(node, id);
		return; // Don't update selection or show details
	}

	// Content click: expand if collapsed, but don't collapse if already expanded
	// This allows users to expand nodes by clicking anywhere, but prevents
	// accidental collapse when clicking to view details
	if (hasChildren && !expandedNodes.has(id)) {
		toggleExpansion(node, id);
	}

	// Update visual selection
	updateNodeSelection(node, id);

	// Notify extension of selection for detail panel
	if (window.vscode) {
		window.vscode.postMessage({
			command: 'selectNode',
			data: {
				nodeId: id,
				nodeType: nodeType
			}
		});
	}
}

/**
 * Update visual selection state of tree nodes.
 * @param {HTMLElement} node - The clicked node element
 * @param {string} id - The node ID
 */
function updateNodeSelection(node, id) {
	// Remove selection from previous node
	if (selectedNodeId) {
		const prevNode = document.querySelector(`.tree-node[data-id="${selectedNodeId}"]`);
		if (prevNode) {
			prevNode.classList.remove('selected');
		}
	}

	// Add selection to new node
	node.classList.add('selected');
	selectedNodeId = id;

	// Show detail panel if hidden
	const detailPanel = document.getElementById('detailPanel');
	if (detailPanel && detailPanel.style.display === 'none') {
		detailPanel.style.display = 'flex';
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

	// Get filtered tree data (respects solution filter, hide Microsoft, etc.)
	const effectiveData = getEffectiveTreeData();

	// Check if we need to use virtual scrolling after this toggle
	flattenedNodes = flattenTree(effectiveData);
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
				renderFullTree(pluginTree, effectiveData);
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
		const item = findNodeInTree(effectiveData, id);
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

	// Get filtered tree data (respects solution filter, hide Microsoft, etc.)
	const effectiveData = getEffectiveTreeData();

	// If no filter, show all nodes (still respects other filters via effectiveData)
	if (term === '') {
		if (useVirtualScroll) {
			// Virtual scroll: re-render with all nodes from effective data
			flattenedNodes = flattenTree(effectiveData);
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
		flattenedNodes = flattenTree(effectiveData).filter(({ item }) => visibleNodeIds.has(item.id));
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
			const containerTypes = ['pluginType', 'assembly', 'package', 'sdkMessage', 'entityGroup'];
			if (containerTypes.includes(item.type)) {
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
			// Exception: Microsoft.Crm.ServiceBus is used for Azure Service Bus integration
			if (item.type === 'assembly') {
				return !item.name.startsWith('Microsoft') || item.name === 'Microsoft.Crm.ServiceBus';
			}

			// Filter out containers that BECAME empty due to filtering
			// Keep containers that were originally empty
			const containerTypes = ['package', 'sdkMessage', 'entityGroup'];
			if (containerTypes.includes(item.type)) {
				const hasChildren = item.children && item.children.length > 0;
				return hasChildren || item._wasOriginallyEmpty;
			}

			return true;
		});
}

/**
 * Filter tree to only show nodes that belong to the selected solution.
 * A node belongs to a solution if its ID is in the solution's membership set,
 * OR if any of its descendants belong to the solution.
 *
 * Note: Some item types (dataProvider, customApi) are not tracked in solutioncomponent,
 * so they are always shown regardless of solution filter.
 *
 * @param {Array} items - Tree items to filter
 * @param {Set<string>} memberIds - Set of object IDs in the selected solution
 * @returns {Array} Filtered tree with only members and their ancestors
 */
function filterBySolution(items, memberIds) {
	// Item types that are NOT tracked in solutioncomponent table
	// These should always be shown regardless of solution filter
	const untrackableTypes = new Set(['dataProvider', 'customApi']);

	return items
		.map(item => {
			// Deep clone the item
			const clone = { ...item };

			// Items of untrackable types are always considered members
			const isUntrackableType = untrackableTypes.has(item.type);

			// Track if this item is directly a member
			const isDirectMember = isUntrackableType || memberIds.has(item.id);

			if (clone.children && clone.children.length > 0) {
				// Images are NOT solution components - keep them if parent step is kept
				// Only filter non-image children by solution membership
				if (clone.type === 'step') {
					// Steps contain images - keep all images (don't filter them)
					clone.children = clone.children.map(child => ({ ...child }));
				} else {
					// Recursively filter children (packages, assemblies, plugin types)
					clone.children = filterBySolution(clone.children, memberIds);
				}
			}

			// Store membership flags
			clone._isDirectMember = isDirectMember;
			clone._hasChildMembers = clone.children && clone.children.length > 0;

			return clone;
		})
		.filter(item => {
			// Keep if: directly a member OR has child members (ancestor path)
			return item._isDirectMember || item._hasChildMembers;
		});
}

/**
 * Get the effective tree data (filtered based on active filters)
 */
function getEffectiveTreeData() {
	let data = treeData;

	// Apply solution filter first (most restrictive)
	if (currentSolutionId && solutionMemberships[currentSolutionId]) {
		const memberIds = new Set(solutionMemberships[currentSolutionId]);
		data = filterBySolution(data, memberIds);
	}

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

		// Wire up detail panel collapse/expand toggle
		const detailPanelHeader = document.getElementById('detailPanelHeader');
		if (detailPanelHeader) {
			detailPanelHeader.addEventListener('click', () => {
				const detailPanel = document.getElementById('detailPanel');
				if (detailPanel) {
					detailPanel.classList.toggle('collapsed');
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
			case 'showRegisterAssemblyModal':
				handleShowRegisterAssemblyModal(message.data);
				break;
			case 'removeNode':
				handleRemoveNode(message.data);
				break;
			case 'addStandaloneAssembly':
				handleAddStandaloneAssembly(message.data);
				break;
			case 'addPackage':
				handleAddPackage(message.data);
				break;
			case 'showUpdatePackageModal':
				handleShowUpdatePackageModal(message.data);
				break;
			case 'showUpdateAssemblyModal':
				handleShowUpdateAssemblyModal(message.data);
				break;
			case 'showRegisterStepModal':
				handleShowRegisterStepModal(message.data);
				break;
			case 'showEditStepModal':
				handleShowEditStepModal(message.data);
				break;
			case 'showRegisterImageModal':
				handleShowRegisterImageModal(message.data);
				break;
			case 'showEditImageModal':
				handleShowEditImageModal(message.data);
				break;
			case 'addNode':
				handleAddNode(message.data);
				break;
			case 'entitiesForMessage':
				handleEntitiesForMessage(message.data);
				break;
			case 'showNodeDetails':
				handleShowNodeDetails(message.data);
				break;
			case 'solutionFilterChanged':
				handleSolutionFilterChanged(message.data);
				break;
			case 'updateSolutionSelector':
				// Sync our filtering state when solution selector is updated (environment change, init)
				handleSolutionSelectorUpdate(message.data);
				break;
			case 'showAttributePickerModal':
				handleShowAttributePickerModal(message.data);
				break;
			case 'showRegisterWebHookModal':
				handleShowRegisterWebHookModal(message.data);
				break;
			case 'showEditWebHookModal':
				handleShowEditWebHookModal(message.data);
				break;
			case 'showRegisterServiceEndpointModal':
				handleShowRegisterServiceEndpointModal(message.data);
				break;
			case 'showEditServiceEndpointModal':
				handleShowEditServiceEndpointModal(message.data);
				break;
			case 'showRegisterDataProviderModal':
				handleShowRegisterDataProviderModal(message.data);
				break;
			case 'showEditDataProviderModal':
				handleShowEditDataProviderModal(message.data);
				break;
			case 'showRegisterCustomApiModal':
				handleShowRegisterCustomApiModal(message.data);
				break;
			case 'showEditCustomApiModal':
				handleShowEditCustomApiModal(message.data);
				break;
			case 'selectAndShowDetails':
				handleSelectAndShowDetails(message.data);
				break;
		}
	}
});

/**
 * Handle solution selector update (sent during initialization and environment change).
 * Syncs our filtering state with the dropdown state.
 * @param {Object} data - { solutions, currentSolutionId }
 */
function handleSolutionSelectorUpdate(data) {
	const { currentSolutionId: newSolutionId } = data || {};

	// Update our filtering state to match the dropdown
	currentSolutionId = newSolutionId || '';

	// Note: We don't re-render here because the tree will be loaded/refreshed separately
	// This just ensures our filter state is in sync when tree data arrives
}

/**
 * Handle solution filter change from the solution selector dropdown.
 * Uses client-side filtering instead of server reload.
 * @param {Object} data - { solutionId }
 */
function handleSolutionFilterChanged(data) {
	const { solutionId } = data;

	// Update current solution filter (empty string = All Solutions)
	currentSolutionId = solutionId || '';

	// Re-render tree with new filter
	renderTree();

	// Re-apply text search filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}
}

/**
 * Handle showing the attribute picker modal.
 * @param {Object} data - { entityLogicalName, fieldId, attributes, currentSelection }
 */
function handleShowAttributePickerModal(data) {
	const { entityLogicalName, fieldId, attributes, currentSelection } = data;

	if (!window.showAttributePickerModal) {
		console.error('AttributePickerModal component not loaded');
		return;
	}

	const attributeList = attributes || [];
	window.showAttributePickerModal({
		entityLogicalName,
		fieldId,
		attributes: attributeList,
		currentSelection: currentSelection || [],
		onSubmit: (selected) => {
			// Update the form field directly via stored callback
			if (window._activeAttributePicker && window._activeAttributePicker.fieldId === fieldId) {
				// If all attributes selected (or none), show "All Attributes"
				// This is converted to undefined on form submit (means capture all in Dataverse)
				const effectiveValue =
					selected.length === 0 || selected.length === attributeList.length
						? 'All Attributes'
						: selected.join(',');
				window._activeAttributePicker.updateField(effectiveValue);
				window._activeAttributePicker = null;
			}
		}
	});
}

/**
 * Show the Register WebHook modal.
 * @param {Object} data - { authTypes, solutions }
 */
function handleShowRegisterWebHookModal(data) {
	const { authTypes, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build solution options for dropdown (optional for webhooks)
	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name
		}))
	];

	// Build auth type options
	const authTypeOptions = (authTypes || []).map(a => ({
		value: a.value.toString(),
		label: a.label
	}));

	window.showFormModal({
		title: 'Register WebHook',
		fields: [
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., MyWebHook'
			},
			{
				id: 'url',
				label: 'Endpoint URL',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'https://example.com/webhook'
			},
			{
				id: 'authType',
				label: 'Authentication',
				type: 'select',
				value: '5', // Default to HttpHeader (5)
				options: authTypeOptions,
				required: true
			},
			{
				id: 'authKeyValues',
				label: 'Authentication Properties',
				type: 'keyvalue',
				keyLabel: 'Keys',
				valueLabel: 'Values',
				keyPlaceholder: 'Header name',
				valuePlaceholder: 'Header value',
				value: [],
				hidden: false // Shown by default for HttpHeader(5), also for HttpQueryString(6)
			},
			{
				id: 'webhookKey',
				label: 'Value',
				type: 'password',
				value: '',
				placeholder: 'Enter webhook secret key',
				hidden: true // Initially hidden, shown for WebhookKey(4)
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: '',
				placeholder: 'Optional description'
			},
			{
				id: 'solution',
				label: 'Solution',
				type: 'select',
				value: '',
				options: solutionOptions
			}
		],
		submitLabel: 'Register',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			if (fieldId === 'authType') {
				const authTypeValue = parseInt(value, 10);
				// HttpHeader(5) or HttpQueryString(6) - show key-value grid
				const showKeyValues = authTypeValue === 5 || authTypeValue === 6;
				// WebhookKey(4) - show single password field
				const showWebhookKey = authTypeValue === 4;

				updateField('authKeyValues', undefined, undefined, showKeyValues);
				updateField('webhookKey', undefined, undefined, showWebhookKey);
			}
		},
		onSubmit: (values) => {
			// Validate URL is well-formed absolute URL (matches PRT behavior)
			if (!isValidAbsoluteUrl(values.url)) {
				vscode.postMessage({
					command: 'showValidationError',
					data: { message: 'Endpoint URL should be valid.' }
				});
				return false; // Keep modal open
			}

			const authType = parseInt(values.authType, 10);
			let authValue;

			// Serialize auth value based on auth type
			if (authType === 4) {
				// WebhookKey(4) - plain string
				authValue = values.webhookKey || undefined;
			} else if (authType === 5 || authType === 6) {
				// HttpHeader(5) or HttpQueryString(6) - XML format
				const keyValues = values.authKeyValues || [];
				if (keyValues.length > 0) {
					authValue = serializeAuthValueToXml(keyValues);
				}
			}

			// Send confirmation to extension
			vscode.postMessage({
				command: 'confirmRegisterWebHook',
				data: {
					name: values.name,
					url: values.url,
					authType: authType,
					authValue: authValue,
					description: values.description || undefined,
					solutionUniqueName: values.solution || undefined
				}
			});
		}
	});
}

/**
 * Validates that a URL is a well-formed absolute URL.
 * Matches PRT behavior: Uri.IsWellFormedUriString(url, UriKind.Absolute)
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid absolute URL
 */
function isValidAbsoluteUrl(url) {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		// Must have http or https protocol
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Escapes special XML characters in a string.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Serializes key-value pairs to XML format for WebHook auth value.
 * Format: <settings><setting name="Key" value="Value"/></settings>
 * @param {Array<{key: string, value: string}>} keyValues - Key-value pairs
 * @returns {string} XML string
 */
function serializeAuthValueToXml(keyValues) {
	if (!keyValues || keyValues.length === 0) return '';

	const settings = keyValues
		.filter(kv => kv.key && kv.key.trim() !== '')
		.map(kv => `<setting name="${escapeXml(kv.key)}" value="${escapeXml(kv.value)}"/>`)
		.join('');

	return `<settings>${settings}</settings>`;
}

/**
 * Deserializes XML auth value to key-value pairs.
 * @param {string} xml - XML string in format <settings><setting name="..." value="..."/></settings>
 * @returns {Array<{key: string, value: string}>} Key-value pairs
 */
function deserializeAuthValueFromXml(xml) {
	if (!xml) return [];

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xml, 'text/xml');
		const settings = doc.getElementsByTagName('setting');
		const keyValues = [];

		for (let i = 0; i < settings.length; i++) {
			keyValues.push({
				key: settings[i].getAttribute('name') || '',
				value: settings[i].getAttribute('value') || ''
			});
		}

		return keyValues;
	} catch {
		return [];
	}
}

/**
 * Show the Edit WebHook modal with pre-populated values.
 * @param {Object} data - { webhookId, name, url, authType, description, authTypes, solutions }
 */
function handleShowEditWebHookModal(data) {
	const { webhookId, name, url, authType, description, authTypes, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build auth type options
	const authTypeOptions = (authTypes || []).map(a => ({
		value: a.value.toString(),
		label: a.label
	}));

	// Determine initial visibility based on current auth type
	const currentAuthType = authType || 5; // Default to HttpHeader(5) if not provided
	const showKeyValues = currentAuthType === 5 || currentAuthType === 6;
	const showWebhookKey = currentAuthType === 4;

	window.showFormModal({
		title: 'Edit WebHook',
		fields: [
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: name || '',
				required: true,
				placeholder: 'e.g., MyWebHook'
			},
			{
				id: 'url',
				label: 'Endpoint URL',
				type: 'text',
				value: url || '',
				required: true,
				placeholder: 'https://example.com/webhook'
			},
			{
				id: 'authType',
				label: 'Authentication',
				type: 'select',
				value: currentAuthType.toString(),
				options: authTypeOptions,
				required: true
			},
			{
				id: 'authKeyValues',
				label: 'Authentication Properties',
				type: 'keyvalue',
				keyLabel: 'Keys',
				valueLabel: 'Values',
				keyPlaceholder: 'Header name',
				valuePlaceholder: 'Header value',
				value: [], // Auth values not pre-populated for security
				hidden: !showKeyValues
			},
			{
				id: 'webhookKey',
				label: 'Value',
				type: 'password',
				value: '', // Auth values not pre-populated for security
				placeholder: 'Leave empty to keep existing value',
				hidden: !showWebhookKey
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: description || '',
				placeholder: 'Optional description'
			}
		],
		submitLabel: 'Update',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			if (fieldId === 'authType') {
				const authTypeValue = parseInt(value, 10);
				// HttpHeader(5) or HttpQueryString(6) - show key-value grid
				const showKV = authTypeValue === 5 || authTypeValue === 6;
				// WebhookKey(4) - show single password field
				const showWK = authTypeValue === 4;

				updateField('authKeyValues', undefined, undefined, showKV);
				updateField('webhookKey', undefined, undefined, showWK);
			}
		},
		onSubmit: (values) => {
			// Validate URL is well-formed absolute URL (matches PRT behavior)
			if (!isValidAbsoluteUrl(values.url)) {
				vscode.postMessage({
					command: 'showValidationError',
					data: { message: 'Endpoint URL should be valid.' }
				});
				return false; // Keep modal open
			}

			const newAuthType = parseInt(values.authType, 10);
			let authValue;

			// Serialize auth value based on auth type
			if (newAuthType === 4) {
				// WebhookKey(4) - plain string (only if provided)
				authValue = values.webhookKey || undefined;
			} else if (newAuthType === 5 || newAuthType === 6) {
				// HttpHeader(5) or HttpQueryString(6) - XML format (only if provided)
				const keyValues = values.authKeyValues || [];
				if (keyValues.length > 0) {
					authValue = serializeAuthValueToXml(keyValues);
				}
			}

			// Send confirmation to extension
			vscode.postMessage({
				command: 'confirmUpdateWebHook',
				data: {
					webhookId: webhookId,
					name: values.name,
					url: values.url,
					authType: newAuthType,
					authValue: authValue,
					description: values.description || undefined
				}
			});
		}
	});
}

/**
 * Show the Register Service Endpoint modal.
 * @param {Object} data - { contractTypes, authTypes, messageFormats, userClaims, solutions }
 */
function handleShowRegisterServiceEndpointModal(data) {
	const { contractTypes, authTypes, messageFormats, userClaims, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build options for dropdowns
	const contractOptions = (contractTypes || []).map(c => ({
		value: c.value.toString(),
		label: c.label
	}));

	const authTypeOptions = (authTypes || []).map(a => ({
		value: a.value.toString(),
		label: a.label
	}));

	const messageFormatOptions = (messageFormats || []).map(m => ({
		value: m.value.toString(),
		label: m.label
	}));

	const userClaimOptions = (userClaims || []).map(u => ({
		value: u.value.toString(),
		label: u.label
	}));

	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name
		}))
	];

	window.showFormModal({
		title: 'Register Service Endpoint',
		fields: [
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., MyServiceBusQueue'
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: '',
				placeholder: 'Optional description'
			},
			{
				id: 'contract',
				label: 'Contract Type',
				type: 'select',
				value: '6', // Default: Queue
				options: contractOptions,
				required: true
			},
			{
				id: 'solutionNamespace',
				label: 'Service Bus Namespace',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., my-namespace'
			},
			{
				id: 'namespaceAddress',
				label: 'Namespace Address',
				type: 'text',
				value: '',
				placeholder: 'Full URL for EventHub, leave empty for Queue/Topic',
				hidden: true // Shown when contract is EventHub
			},
			{
				id: 'path',
				label: 'Queue/Topic Name',
				type: 'text',
				value: '',
				placeholder: 'e.g., my-queue'
			},
			{
				id: 'authType',
				label: 'Authentication',
				type: 'select',
				value: '2', // Default: SASKey
				options: authTypeOptions,
				required: true
			},
			{
				id: 'sasKeyName',
				label: 'SAS Key Name',
				type: 'text',
				value: '',
				placeholder: 'e.g., RootManageSharedAccessKey'
			},
			{
				id: 'sasKey',
				label: 'SAS Key',
				type: 'password',
				value: '',
				placeholder: 'Enter SAS Key'
			},
			{
				id: 'sasToken',
				label: 'SAS Token',
				type: 'password',
				value: '',
				placeholder: 'Enter SAS Token',
				hidden: true // Shown when authType is SASToken
			},
			{
				id: 'messageFormat',
				label: 'Message Format',
				type: 'select',
				value: '2', // Default: JSON
				options: messageFormatOptions
			},
			{
				id: 'userClaim',
				label: 'User Information Sent',
				type: 'select',
				value: '1', // Default: None
				options: userClaimOptions
			},
			{
				id: 'solution',
				label: 'Solution',
				type: 'select',
				value: '',
				options: solutionOptions
			}
		],
		submitLabel: 'Register',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			if (fieldId === 'contract') {
				const contractValue = parseInt(value, 10);
				// EventHub (7) uses namespaceAddress instead of solutionNamespace
				const isEventHub = contractValue === 7;
				updateField('solutionNamespace', undefined, undefined, !isEventHub);
				updateField('namespaceAddress', undefined, undefined, isEventHub);
				updateField('path', undefined, undefined, !isEventHub);
			}
			if (fieldId === 'authType') {
				const authTypeValue = parseInt(value, 10);
				// SASKey (2) shows sasKeyName and sasKey
				// SASToken (3) shows sasToken
				const isSASKey = authTypeValue === 2;
				const isSASToken = authTypeValue === 3;
				updateField('sasKeyName', undefined, undefined, isSASKey);
				updateField('sasKey', undefined, undefined, isSASKey);
				updateField('sasToken', undefined, undefined, isSASToken);
			}
		},
		onSubmit: (values) => {
			const contract = parseInt(values.contract, 10);
			const authType = parseInt(values.authType, 10);
			const messageFormat = parseInt(values.messageFormat, 10);
			const userClaim = parseInt(values.userClaim, 10);

			vscode.postMessage({
				command: 'confirmRegisterServiceEndpoint',
				data: {
					name: values.name,
					description: values.description || undefined,
					contract: contract,
					connectionMode: 1, // Normal
					authType: authType,
					solutionNamespace: values.solutionNamespace,
					namespaceAddress: values.namespaceAddress || undefined,
					path: values.path || undefined,
					sasKeyName: values.sasKeyName || undefined,
					sasKey: values.sasKey || undefined,
					sasToken: values.sasToken || undefined,
					messageFormat: messageFormat,
					userClaim: userClaim,
					solutionUniqueName: values.solution || undefined
				}
			});
		}
	});
}

/**
 * Show the Edit Service Endpoint modal with pre-populated values.
 * @param {Object} data - Current endpoint data + dropdown options
 */
function handleShowEditServiceEndpointModal(data) {
	const {
		serviceEndpointId,
		name,
		description,
		contract,
		contractValue,
		solutionNamespace,
		namespaceAddress,
		path,
		authType,
		authTypeValue,
		sasKeyName,
		messageFormat,
		messageFormatValue,
		userClaim,
		userClaimValue,
		authTypes,
		messageFormats,
		userClaims
	} = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	const authTypeOptions = (authTypes || []).map(a => ({
		value: a.value.toString(),
		label: a.label
	}));

	const messageFormatOptions = (messageFormats || []).map(m => ({
		value: m.value.toString(),
		label: m.label
	}));

	const userClaimOptions = (userClaims || []).map(u => ({
		value: u.value.toString(),
		label: u.label
	}));

	const isSASKey = authTypeValue === 2;
	const isSASToken = authTypeValue === 3;
	const isEventHub = contractValue === 7;

	window.showFormModal({
		title: 'Edit Service Endpoint',
		fields: [
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: name || '',
				required: true
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: description || ''
			},
			{
				id: 'contract',
				label: 'Contract Type',
				type: 'text',
				value: contract || '',
				disabled: true // Cannot change contract type
			},
			{
				id: 'solutionNamespace',
				label: 'Service Bus Namespace',
				type: 'text',
				value: solutionNamespace || '',
				hidden: isEventHub
			},
			{
				id: 'namespaceAddress',
				label: 'Namespace Address',
				type: 'text',
				value: namespaceAddress || '',
				hidden: !isEventHub
			},
			{
				id: 'path',
				label: 'Queue/Topic Name',
				type: 'text',
				value: path || '',
				hidden: isEventHub
			},
			{
				id: 'authType',
				label: 'Authentication',
				type: 'select',
				value: authTypeValue?.toString() || '2',
				options: authTypeOptions
			},
			{
				id: 'sasKeyName',
				label: 'SAS Key Name',
				type: 'text',
				value: sasKeyName || '',
				hidden: !isSASKey
			},
			{
				id: 'sasKey',
				label: 'SAS Key (leave empty to keep current)',
				type: 'password',
				value: '',
				placeholder: 'Leave empty to keep current key',
				hidden: !isSASKey
			},
			{
				id: 'sasToken',
				label: 'SAS Token (leave empty to keep current)',
				type: 'password',
				value: '',
				placeholder: 'Leave empty to keep current token',
				hidden: !isSASToken
			},
			{
				id: 'messageFormat',
				label: 'Message Format',
				type: 'select',
				value: messageFormatValue?.toString() || '2',
				options: messageFormatOptions
			},
			{
				id: 'userClaim',
				label: 'User Information Sent',
				type: 'select',
				value: userClaimValue?.toString() || '1',
				options: userClaimOptions
			}
		],
		submitLabel: 'Update',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			if (fieldId === 'authType') {
				const newAuthType = parseInt(value, 10);
				const newIsSASKey = newAuthType === 2;
				const newIsSASToken = newAuthType === 3;
				updateField('sasKeyName', undefined, undefined, newIsSASKey);
				updateField('sasKey', undefined, undefined, newIsSASKey);
				updateField('sasToken', undefined, undefined, newIsSASToken);
			}
		},
		onSubmit: (values) => {
			const newAuthType = parseInt(values.authType, 10);
			const newMessageFormat = parseInt(values.messageFormat, 10);
			const newUserClaim = parseInt(values.userClaim, 10);

			vscode.postMessage({
				command: 'confirmUpdateServiceEndpoint',
				data: {
					serviceEndpointId: serviceEndpointId,
					name: values.name,
					description: values.description || undefined,
					solutionNamespace: values.solutionNamespace || undefined,
					namespaceAddress: values.namespaceAddress || undefined,
					path: values.path || undefined,
					authType: newAuthType,
					sasKeyName: values.sasKeyName || undefined,
					sasKey: values.sasKey || undefined,
					sasToken: values.sasToken || undefined,
					messageFormat: newMessageFormat,
					userClaim: newUserClaim
				}
			});
		}
	});
}

/**
 * Show the Register Data Provider modal.
 * @param {Object} data - { pluginTypes, solutions }
 */
function handleShowRegisterDataProviderModal(data) {
	const { pluginTypes, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build solution options
	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name
		}))
	];

	// Build plugin type options (with empty option for "Not Implemented")
	const pluginTypeOptions = [
		{ value: '', label: '(Not Implemented)' },
		...(pluginTypes || [])
	];

	window.showFormModal({
		title: 'Register Data Provider',
		width: '600px',
		fields: [
			{ id: 'sectionBasic', type: 'section', label: 'Basic Information' },
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., MyVirtualEntityProvider'
			},
			{
				id: 'dataSourceLogicalName',
				label: 'Data Source Entity (Virtual Entity)',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., new_virtualentity'
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: '',
				placeholder: 'Optional description'
			},
			{ id: 'sectionPlugins', type: 'section', label: 'Plugin Mappings' },
			{
				id: 'retrievePluginId',
				label: 'Retrieve Plugin',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'retrieveMultiplePluginId',
				label: 'RetrieveMultiple Plugin',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type (recommended)...'
			},
			{
				id: 'createPluginId',
				label: 'Create Plugin',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'updatePluginId',
				label: 'Update Plugin',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'deletePluginId',
				label: 'Delete Plugin',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{ id: 'sectionSolution', type: 'section', label: 'Solution' },
			{
				id: 'solution',
				label: 'Add to Solution',
				type: 'select',
				value: '',
				options: solutionOptions
			}
		],
		submitLabel: 'Register',
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmRegisterDataProvider',
				data: {
					name: values.name,
					dataSourceLogicalName: values.dataSourceLogicalName,
					description: values.description || undefined,
					retrievePluginId: values.retrievePluginId || undefined,
					retrieveMultiplePluginId: values.retrieveMultiplePluginId || undefined,
					createPluginId: values.createPluginId || undefined,
					updatePluginId: values.updatePluginId || undefined,
					deletePluginId: values.deletePluginId || undefined,
					solutionUniqueName: values.solution || undefined
				}
			});
		}
	});
}

/**
 * Show the Edit Data Provider modal with pre-populated values.
 * @param {Object} data - { dataProviderId, name, dataSourceLogicalName, description, retrievePluginId, retrieveMultiplePluginId, createPluginId, updatePluginId, deletePluginId, pluginTypes }
 */
function handleShowEditDataProviderModal(data) {
	const {
		dataProviderId,
		name,
		dataSourceLogicalName,
		description,
		retrievePluginId,
		retrieveMultiplePluginId,
		createPluginId,
		updatePluginId,
		deletePluginId,
		pluginTypes
	} = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build plugin type options (with empty option for "Not Implemented")
	const pluginTypeOptions = [
		{ value: '', label: '(Not Implemented)' },
		...(pluginTypes || [])
	];

	window.showFormModal({
		title: 'Edit Data Provider',
		width: '600px',
		fields: [
			{ id: 'sectionBasic', type: 'section', label: 'Basic Information' },
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: name || '',
				required: true,
				placeholder: 'e.g., MyVirtualEntityProvider'
			},
			{
				id: 'dataSourceLogicalName',
				label: 'Data Source Entity (Virtual Entity)',
				type: 'text',
				value: dataSourceLogicalName || '',
				disabled: true // Cannot change data source after creation
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: description || '',
				placeholder: 'Optional description'
			},
			{ id: 'sectionPlugins', type: 'section', label: 'Plugin Mappings' },
			{
				id: 'retrievePluginId',
				label: 'Retrieve Plugin',
				type: 'combobox',
				value: retrievePluginId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'retrieveMultiplePluginId',
				label: 'RetrieveMultiple Plugin',
				type: 'combobox',
				value: retrieveMultiplePluginId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type (recommended)...'
			},
			{
				id: 'createPluginId',
				label: 'Create Plugin',
				type: 'combobox',
				value: createPluginId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'updatePluginId',
				label: 'Update Plugin',
				type: 'combobox',
				value: updatePluginId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			},
			{
				id: 'deletePluginId',
				label: 'Delete Plugin',
				type: 'combobox',
				value: deletePluginId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type...'
			}
		],
		submitLabel: 'Update',
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmUpdateDataProvider',
				data: {
					dataProviderId: dataProviderId,
					name: values.name,
					description: values.description || undefined,
					// Use null to clear, undefined to leave unchanged, value to set
					retrievePluginId: values.retrievePluginId === '' ? null : (values.retrievePluginId || undefined),
					retrieveMultiplePluginId: values.retrieveMultiplePluginId === '' ? null : (values.retrieveMultiplePluginId || undefined),
					createPluginId: values.createPluginId === '' ? null : (values.createPluginId || undefined),
					updatePluginId: values.updatePluginId === '' ? null : (values.updatePluginId || undefined),
					deletePluginId: values.deletePluginId === '' ? null : (values.deletePluginId || undefined)
				}
			});
		}
	});
}

/**
 * Show the Register Custom API modal.
 * @param {Object} data - { pluginTypes, solutions }
 */
function handleShowRegisterCustomApiModal(data) {
	const { pluginTypes, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build solution options
	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name
		}))
	];

	// Build plugin type options (with empty option for "No Implementation")
	const pluginTypeOptions = [
		{ value: '', label: '(No Plugin Implementation)' },
		...(pluginTypes || [])
	];

	// Build binding type options
	const bindingTypeOptions = [
		{ value: '0', label: 'Global (unbound)' },
		{ value: '1', label: 'Entity' },
		{ value: '2', label: 'Entity Collection' }
	];

	// Build allowed processing options
	const processingOptions = [
		{ value: '0', label: 'None (sync only)' },
		{ value: '1', label: 'Async Only' },
		{ value: '2', label: 'Sync and Async' }
	];

	// Build parameter type options
	const parameterTypeOptions = [
		{ value: '0', label: 'Boolean' },
		{ value: '1', label: 'DateTime' },
		{ value: '2', label: 'Decimal' },
		{ value: '3', label: 'Entity' },
		{ value: '4', label: 'EntityCollection' },
		{ value: '5', label: 'EntityReference' },
		{ value: '6', label: 'Float' },
		{ value: '7', label: 'Integer' },
		{ value: '8', label: 'Money' },
		{ value: '9', label: 'Picklist' },
		{ value: '10', label: 'String' },
		{ value: '11', label: 'StringArray' },
		{ value: '12', label: 'Guid' }
	];

	window.showFormModal({
		title: 'Register Custom API',
		width: '700px',
		fields: [
			{ id: 'sectionBasic', type: 'section', label: 'Basic Information' },
			{
				id: 'displayName',
				label: 'Display Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., Get Customer Orders'
			},
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., GetCustomerOrders',
				helpText: 'PascalCase, no spaces or special characters'
			},
			{
				id: 'uniqueName',
				label: 'Unique Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'e.g., new_GetCustomerOrders',
				helpText: 'Publisher prefix + underscore + name'
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: '',
				placeholder: 'Optional description'
			},
			{ id: 'sectionBehavior', type: 'section', label: 'API Behavior' },
			{
				id: 'isFunction',
				label: 'Is Function',
				type: 'checkbox',
				value: false,
				helpText: 'Function (GET) vs Action (POST)'
			},
			{
				id: 'isPrivate',
				label: 'Is Private',
				type: 'checkbox',
				value: false,
				helpText: 'Private APIs are not exposed in Web API'
			},
			{
				id: 'executePrivilegeName',
				label: 'Execute Privilege',
				type: 'text',
				value: '',
				placeholder: 'e.g., prvExecuteMyAPI (optional)'
			},
			{ id: 'sectionBinding', type: 'section', label: 'Binding' },
			{
				id: 'bindingType',
				label: 'Binding Type',
				type: 'select',
				value: '0',
				options: bindingTypeOptions,
				required: true
			},
			{
				id: 'boundEntityLogicalName',
				label: 'Bound Entity',
				type: 'text',
				value: '',
				placeholder: 'e.g., account',
				helpText: 'Required when Binding Type is Entity or Entity Collection',
				visibleWhen: { field: 'bindingType', values: ['1', '2'] }
			},
			{ id: 'sectionProcessing', type: 'section', label: 'Processing' },
			{
				id: 'allowedCustomProcessingStepType',
				label: 'Allowed Processing',
				type: 'select',
				value: '0',
				options: processingOptions
			},
			{
				id: 'pluginTypeId',
				label: 'Plugin Type',
				type: 'combobox',
				value: '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type (optional)...'
			},
			{ id: 'sectionParameters', type: 'section', label: 'Request Parameters' },
			{
				id: 'requestParameters',
				type: 'parameterList',
				value: [],
				direction: 'request',
				parameterTypeOptions
			},
			{ id: 'sectionResponse', type: 'section', label: 'Response Properties' },
			{
				id: 'responseProperties',
				type: 'parameterList',
				value: [],
				direction: 'response',
				parameterTypeOptions
			},
			{ id: 'sectionSolution', type: 'section', label: 'Solution' },
			{
				id: 'solution',
				label: 'Add to Solution',
				type: 'select',
				value: '',
				options: solutionOptions
			}
		],
		submitLabel: 'Register',
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmRegisterCustomApi',
				data: {
					name: values.name,
					uniqueName: values.uniqueName,
					displayName: values.displayName,
					description: values.description || undefined,
					isFunction: values.isFunction || false,
					isPrivate: values.isPrivate || false,
					executePrivilegeName: values.executePrivilegeName || undefined,
					bindingType: parseInt(values.bindingType, 10),
					boundEntityLogicalName: values.boundEntityLogicalName || undefined,
					allowedCustomProcessingStepType: parseInt(values.allowedCustomProcessingStepType, 10),
					pluginTypeId: values.pluginTypeId || undefined,
					solutionUniqueName: values.solution || undefined,
					requestParameters: values.requestParameters || [],
					responseProperties: values.responseProperties || []
				}
			});
		}
	});
}

/**
 * Show the Edit Custom API modal with pre-populated values.
 * @param {Object} data - { customApiId, name, uniqueName, displayName, description, isFunction, isPrivate, executePrivilegeName, bindingType, boundEntityLogicalName, allowedCustomProcessingStepType, pluginTypeId, pluginTypes }
 */
function handleShowEditCustomApiModal(data) {
	const {
		customApiId,
		name,
		uniqueName,
		displayName,
		description,
		isFunction,
		isPrivate,
		executePrivilegeName,
		bindingType,
		boundEntityLogicalName,
		allowedCustomProcessingStepType,
		pluginTypeId,
		pluginTypes
	} = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build plugin type options (with empty option for "No Implementation")
	const pluginTypeOptions = [
		{ value: '', label: '(No Plugin Implementation)' },
		...(pluginTypes || [])
	];

	// Build binding type display (read-only)
	const bindingTypeLabels = { 0: 'Global (unbound)', 1: 'Entity', 2: 'Entity Collection' };
	const bindingTypeLabel = bindingTypeLabels[bindingType] || 'Unknown';

	// Build allowed processing display
	const processingLabels = { 0: 'None (sync only)', 1: 'Async Only', 2: 'Sync and Async' };
	const processingLabel = processingLabels[allowedCustomProcessingStepType] || 'Unknown';

	window.showFormModal({
		title: 'Edit Custom API',
		width: '600px',
		fields: [
			{ id: 'sectionBasic', type: 'section', label: 'Basic Information' },
			{
				id: 'displayName',
				label: 'Display Name',
				type: 'text',
				value: displayName || '',
				required: true
			},
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: name || '',
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{
				id: 'uniqueName',
				label: 'Unique Name',
				type: 'text',
				value: uniqueName || '',
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: description || '',
				placeholder: 'Optional description'
			},
			{ id: 'sectionBehavior', type: 'section', label: 'API Behavior' },
			{
				id: 'isFunction',
				label: 'Is Function',
				type: 'text',
				value: isFunction ? 'Yes (GET)' : 'No (POST)',
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{
				id: 'isPrivate',
				label: 'Is Private',
				type: 'checkbox',
				value: isPrivate || false,
				helpText: 'Private APIs are not exposed in Web API'
			},
			{
				id: 'executePrivilegeName',
				label: 'Execute Privilege',
				type: 'text',
				value: executePrivilegeName || '',
				placeholder: 'e.g., prvExecuteMyAPI (optional)'
			},
			{ id: 'sectionBinding', type: 'section', label: 'Binding (Read-only)' },
			{
				id: 'bindingTypeDisplay',
				label: 'Binding Type',
				type: 'text',
				value: bindingTypeLabel,
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{
				id: 'boundEntityDisplay',
				label: 'Bound Entity',
				type: 'text',
				value: boundEntityLogicalName || '(none)',
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{ id: 'sectionProcessing', type: 'section', label: 'Processing (Read-only)' },
			{
				id: 'processingDisplay',
				label: 'Allowed Processing',
				type: 'text',
				value: processingLabel,
				disabled: true,
				helpText: 'Cannot be changed after creation'
			},
			{
				id: 'pluginTypeId',
				label: 'Plugin Type',
				type: 'combobox',
				value: pluginTypeId || '',
				options: pluginTypeOptions,
				placeholder: 'Select plugin type (optional)...'
			}
		],
		submitLabel: 'Update',
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmUpdateCustomApi',
				data: {
					customApiId: customApiId,
					displayName: values.displayName,
					description: values.description || undefined,
					isPrivate: values.isPrivate || false,
					executePrivilegeName: values.executePrivilegeName || undefined,
					// Use null to clear plugin type, undefined means don't change
					pluginTypeId: values.pluginTypeId === '' ? null : (values.pluginTypeId || undefined)
				}
			});
		}
	});
}

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
	// Use uniqueName as value (required by Dataverse API header)
	const solutionOptions = [
		{ value: '', label: '-- Select a Solution --' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name,
			prefix: s.prefix
		}))
	];

	// Store solutions for prefix lookup (keyed by uniqueName)
	const solutionPrefixMap = {};
	(solutions || []).forEach(s => {
		solutionPrefixMap[s.uniqueName] = s.prefix;
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
					prefix: values.prefix,
					solutionUniqueName: values.solution
				}
			});
		}
	});
}

/**
 * Show the Register Assembly modal with pre-filled metadata and plugin type selection.
 * @param {Object} data - { name, filename, version, solutions, discoveredTypes }
 */
function handleShowRegisterAssemblyModal(data) {
	const { name, filename, version, solutions, discoveredTypes } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build solution options for dropdown - solution is OPTIONAL for assemblies (unlike packages)
	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)', uniqueName: '' },
		...(solutions || []).map(s => ({
			value: s.id,
			label: s.name,
			uniqueName: s.uniqueName
		}))
	];

	// Store solution unique names for lookup
	const solutionUniqueNameMap = {};
	(solutions || []).forEach(s => {
		solutionUniqueNameMap[s.id] = s.uniqueName;
	});

	// Build fields array - always include basic fields
	const fields = [
		{
			id: 'filename',
			label: 'File',
			type: 'text',
			value: filename || '',
			readonly: true
		},
		{
			id: 'name',
			label: 'Assembly Name',
			type: 'text',
			value: name || '',
			required: true,
			placeholder: 'e.g., PPDSDemo.Plugins'
		},
		{
			id: 'version',
			label: 'Version',
			type: 'text',
			value: version || '1.0.0.0',
			readonly: true
		},
		{
			id: 'solution',
			label: 'Add to Solution (Optional)',
			type: 'select',
			value: '', // None by default
			options: solutionOptions,
			required: false
		}
	];

	// Add plugin types section if we have discovered types
	if (discoveredTypes && discoveredTypes.length > 0) {
		fields.push({
			id: 'pluginTypesHeader',
			label: '',
			type: 'info',
			value: `Found ${discoveredTypes.length} plugin type(s). Select which to register:`
		});

		fields.push({
			id: 'pluginTypes',
			label: 'Plugin Types',
			type: 'checkboxGroup',
			options: discoveredTypes.map(t => ({
				value: t.typeName,
				label: t.displayName,
				description: t.typeKind === 'WorkflowActivity' ? '(Workflow Activity)' : '(Plugin)',
				checked: true // All selected by default
			})),
			required: true
		});
	}

	window.showFormModal({
		title: 'Register Plugin Assembly',
		fields: fields,
		submitLabel: 'Register',
		cancelLabel: 'Cancel',
		onSubmit: (values) => {
			// Look up solution unique name if a solution was selected
			const solutionUniqueName = values.solution
				? solutionUniqueNameMap[values.solution]
				: undefined;

			// Get selected plugin types
			const selectedTypes = values.pluginTypes || [];

			// Send confirmation to extension
			vscode.postMessage({
				command: 'confirmRegisterAssembly',
				data: {
					name: values.name,
					solutionUniqueName,
					selectedTypes
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
 * Select a node, expand ancestors, scroll into view, and trigger detail loading.
 * Called after create/update operations for consistent UX.
 * @param {Object} data - { nodeId, nodeType }
 */
function handleSelectAndShowDetails(data) {
	const { nodeId, nodeType } = data;
	if (!nodeId) return;

	// 1. Expand ancestors so node is visible
	expandAncestors(nodeId, treeData);

	// 2. Re-render tree with expanded ancestors
	renderTree();

	// 3. Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}

	// 4. Find the node element and select it
	requestAnimationFrame(() => {
		const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
		if (nodeElement) {
			updateNodeSelection(nodeElement, nodeId);
			nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}

		// 5. Post selectNode message to trigger detail loading
		if (window.vscode) {
			window.vscode.postMessage({
				command: 'selectNode',
				nodeId: nodeId,
				nodeType: nodeType
			});
		}
	});
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

/**
 * Remove a node from the tree by ID.
 * Used for unregister operations to provide instant UI feedback.
 * @param {Object} data - { nodeId }
 */
function handleRemoveNode(data) {
	const { nodeId } = data;
	if (!nodeId) return;

	// Remove from data model
	const removed = removeNodeFromTree(treeData, nodeId);

	if (removed) {
		// Check if tree is now empty
		const treeEmpty = document.getElementById('treeEmpty');
		const pluginTree = document.getElementById('pluginTree');
		const treeToolbar = document.getElementById('treeToolbar');

		if (treeData.length === 0) {
			if (pluginTree) pluginTree.style.display = 'none';
			if (treeEmpty) treeEmpty.style.display = 'flex';
			if (treeToolbar) treeToolbar.style.display = 'none';
		} else {
			// Re-render tree
			renderTree();

			// Re-apply filter if active
			if (currentFilter) {
				filterTree(currentFilter);
			}
		}
	}
}

/**
 * Recursively find and remove a node from the tree.
 * @returns {boolean} True if node was found and removed
 */
function removeNodeFromTree(items, nodeId) {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id === nodeId) {
			items.splice(i, 1);
			return true;
		}
		if (items[i].children && items[i].children.length > 0) {
			if (removeNodeFromTree(items[i].children, nodeId)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Add a standalone assembly to the tree.
 * Used for register operations to provide near-instant UI feedback.
 * @param {Object} data - { assemblyNode } - The TreeItemViewModel for the new assembly
 */
function handleAddStandaloneAssembly(data) {
	const { assemblyNode } = data;
	if (!assemblyNode) return;

	// Add to tree data (standalone assemblies go at root level after packages)
	// Find the first standalone assembly (type === 'assembly' at root) and insert before it
	// Or if no standalone assemblies exist, append at end
	let insertIndex = treeData.length;
	for (let i = 0; i < treeData.length; i++) {
		if (treeData[i].type === 'assembly') {
			insertIndex = i;
			break;
		}
	}
	treeData.splice(insertIndex, 0, assemblyNode);

	// Ensure tree container is visible (in case it was empty before)
	const treeEmpty = document.getElementById('treeEmpty');
	const pluginTree = document.getElementById('pluginTree');
	const treeToolbar = document.getElementById('treeToolbar');

	if (treeEmpty) treeEmpty.style.display = 'none';
	if (pluginTree) pluginTree.style.display = 'block';
	if (treeToolbar) treeToolbar.style.display = 'flex';

	// Re-render tree
	renderTree();

	// Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}

	// Scroll the new node into view
	scrollNodeIntoView(assemblyNode.id);
}

/**
 * Add a new package to the tree.
 * Used for register operations to provide near-instant UI feedback.
 * @param {Object} data - { packageNode } - The TreeItemViewModel for the new package
 */
function handleAddPackage(data) {
	const { packageNode } = data;
	if (!packageNode) return;

	// Add to tree data (packages go at root level, before assemblies)
	// Find the first standalone assembly (type === 'assembly' at root) and insert before it
	// Or if no standalone assemblies exist, append at end
	let insertIndex = treeData.length;
	for (let i = 0; i < treeData.length; i++) {
		if (treeData[i].type === 'assembly') {
			insertIndex = i;
			break;
		}
	}
	treeData.splice(insertIndex, 0, packageNode);

	// Ensure tree container is visible (in case it was empty before)
	const treeEmpty = document.getElementById('treeEmpty');
	const pluginTree = document.getElementById('pluginTree');
	const treeToolbar = document.getElementById('treeToolbar');

	if (treeEmpty) treeEmpty.style.display = 'none';
	if (pluginTree) pluginTree.style.display = 'block';
	if (treeToolbar) treeToolbar.style.display = 'flex';

	// Expand the new package node
	expandedNodes.add(packageNode.id);

	// Re-render tree
	renderTree();

	// Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}

	// Scroll the new node into view
	scrollNodeIntoView(packageNode.id);
}

/**
 * Scroll a tree node into view.
 * @param {string} nodeId - ID of the node to scroll to
 */
function scrollNodeIntoView(nodeId) {
	// Use requestAnimationFrame to ensure DOM has updated
	requestAnimationFrame(() => {
		const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
		if (nodeElement) {
			nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
}

/**
 * Show the Update Package modal with pre-filled metadata.
 * Simpler than register - no solution picker needed.
 * @param {Object} data - { packageId, name, version, filename }
 */
function handleShowUpdatePackageModal(data) {
	const { packageId, name, version, filename } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	window.showFormModal({
		title: `Update Package: ${name}`,
		fields: [
			{
				id: 'filename',
				label: 'New File',
				type: 'text',
				value: filename || '',
				readonly: true
			},
			{
				id: 'name',
				label: 'Package Name',
				type: 'text',
				value: name || '',
				readonly: true // Name cannot change on update
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
		submitLabel: 'Update',
		cancelLabel: 'Cancel',
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmUpdatePackage',
				data: {
					packageId,
					version: values.version
				}
			});
		}
	});
}

/**
 * Show the Update Assembly modal with discovered types.
 * Types are EDITABLE - user can select which types to register/unregister (like PRT).
 * @param {Object} data - { assemblyId, name, filename, version, discoveredTypes }
 * discoveredTypes: Array of { typeName, displayName, typeKind, isRegistered, existsInNewDll }
 */
function handleShowUpdateAssemblyModal(data) {
	const { assemblyId, name, filename, version, discoveredTypes } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build fields array
	const fields = [
		{
			id: 'filename',
			label: 'New File',
			type: 'text',
			value: filename || '',
			readonly: true
		},
		{
			id: 'name',
			label: 'Assembly Name',
			type: 'text',
			value: name || '',
			readonly: true // Name cannot change on update
		},
		{
			id: 'version',
			label: 'Version',
			type: 'text',
			value: version || '1.0.0.0',
			readonly: true
		}
	];

	// Add plugin types section if we have discovered types
	// Show as EDITABLE checkboxes - user can select which types to register/unregister
	if (discoveredTypes && discoveredTypes.length > 0) {
		// Count types by category
		const newTypes = discoveredTypes.filter(t => t.existsInNewDll && !t.isRegistered);
		const existingTypes = discoveredTypes.filter(t => t.existsInNewDll && t.isRegistered);
		const removedTypes = discoveredTypes.filter(t => !t.existsInNewDll && t.isRegistered);

		// Build info message
		let infoMessage = `Found ${discoveredTypes.length} plugin type(s). Select which to register:`;
		if (newTypes.length > 0) {
			infoMessage += `\n• ${newTypes.length} new type(s) to add`;
		}
		if (removedTypes.length > 0) {
			infoMessage += `\n• ${removedTypes.length} type(s) removed from DLL`;
		}

		fields.push({
			id: 'pluginTypesHeader',
			label: '',
			type: 'info',
			value: infoMessage
		});

		fields.push({
			id: 'pluginTypes',
			label: 'Plugin Types',
			type: 'checkboxGroup',
			// EDITABLE - user can select/deselect types
			options: discoveredTypes.map(t => {
				// Build description showing type status
				let description = t.typeKind === 'WorkflowActivity' ? '(Workflow Activity)' : '(Plugin)';
				if (!t.existsInNewDll) {
					description += ' [REMOVED FROM DLL]';
				} else if (!t.isRegistered) {
					description += ' [NEW]';
				}

				return {
					value: t.typeName,
					label: t.displayName,
					description: description,
					// Pre-check types that exist in the new DLL (both new and existing)
					// Types removed from DLL are unchecked by default (will be unregistered)
					checked: t.existsInNewDll
				};
			})
		});
	}

	window.showFormModal({
		title: `Update Assembly: ${name}`,
		fields: fields,
		submitLabel: 'Update',
		cancelLabel: 'Cancel',
		onSubmit: (values) => {
			// Get selected plugin types (returns array of checked type names)
			const selectedTypes = values.pluginTypes || [];

			vscode.postMessage({
				command: 'confirmUpdateAssembly',
				data: {
					assemblyId,
					selectedTypes
				}
			});
		}
	});
}

/**
 * Show the Register Step modal.
 * @param {Object} data - { pluginTypeId, pluginTypeName, messages, solutions }
 */
function handleShowRegisterStepModal(data) {
	const { pluginTypeId, pluginTypeName, messages, solutions } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Build message options for combobox (no placeholder needed - user types to filter)
	const messageOptions = (messages || []).map(m => ({ value: m.id, label: m.name }));

	// Build solution options for dropdown - solution is OPTIONAL for steps
	const solutionOptions = [
		{ value: '', label: 'None (do not add to solution)' },
		...(solutions || []).map(s => ({
			value: s.uniqueName,
			label: s.name
		}))
	];

	// State for step name auto-generation
	const stepNameState = {
		userEditedName: false,
		selectedMessageName: '',
		selectedEntity: '',
		selectedSecondaryEntity: ''
	};

	/**
	 * Generate step name in format: "{PluginTypeName}: {MessageName} of {PrimaryEntity}[ and {SecondaryEntity}]"
	 */
	function generateStepName() {
		if (!stepNameState.selectedMessageName) {
			return `${pluginTypeName}: `;
		}
		if (!stepNameState.selectedEntity) {
			return `${pluginTypeName}: ${stepNameState.selectedMessageName}`;
		}
		let name = `${pluginTypeName}: ${stepNameState.selectedMessageName} of ${stepNameState.selectedEntity}`;
		if (stepNameState.selectedSecondaryEntity) {
			name += ` and ${stepNameState.selectedSecondaryEntity}`;
		}
		return name;
	}

	// Stage options (matching Dataverse values)
	const stageOptions = [
		{ value: '10', label: 'Pre-validation' },
		{ value: '20', label: 'Pre-operation' },
		{ value: '40', label: 'Post-operation' }
	];

	// Mode options
	const modeOptions = [
		{ value: '0', label: 'Synchronous' },
		{ value: '1', label: 'Asynchronous' }
	];

	// Deployment options
	const deploymentOptions = [
		{ value: '0', label: 'Server Only' },
		{ value: '1', label: 'Offline Only' },
		{ value: '2', label: 'Server and Offline' }
	];

	window.showFormModal({
		title: `Register New Step`,
		width: '550px',
		fields: [
			{
				id: 'sectionGeneral',
				type: 'section',
				label: 'General Configuration'
			},
			{
				id: 'solutionUniqueName',
				label: 'Add to Solution (Optional)',
				type: 'select',
				value: '',
				options: solutionOptions,
				required: false
			},
			{
				id: 'sdkMessageId',
				label: 'Message',
				type: 'combobox',
				value: '',
				options: messageOptions,
				required: true,
				placeholder: 'Type to search messages...'
			},
			{
				id: 'primaryEntity',
				label: 'Primary Entity',
				type: 'combobox',
				value: '',
				options: [], // Will be populated when message is selected
				placeholder: 'Select message first...'
			},
			{
				id: 'secondaryEntity',
				label: 'Secondary Entity',
				type: 'combobox',
				value: '',
				options: [], // Will be populated when message is selected (for Associate/Disassociate)
				placeholder: 'Not applicable for this message'
			},
			{
				id: 'filteringAttributes',
				label: 'Filtering Attributes',
				type: 'attributeInput',
				value: '',
				placeholder: 'Comma-separated (only for Create/Update messages)',
				entityField: 'primaryEntity'
			},
			{
				id: 'name',
				label: 'Step Name',
				type: 'text',
				value: `${pluginTypeName}: `,
				required: true,
				placeholder: 'Step name'
			},
			{
				id: 'sectionExecution',
				type: 'section',
				label: 'Execution'
			},
			{
				id: 'stage',
				label: 'Stage',
				type: 'select',
				value: '40',
				options: stageOptions,
				required: true
			},
			{
				id: 'mode',
				label: 'Mode',
				type: 'select',
				value: '0',
				options: modeOptions,
				required: true
			},
			{
				id: 'asyncAutoDelete',
				label: 'Delete AsyncOperation if Successful',
				type: 'checkbox',
				value: false,
				hidden: true // Hidden by default since mode defaults to Synchronous
			},
			{
				id: 'rank',
				label: 'Execution Order',
				type: 'number',
				value: '1',
				required: true
			},
			{
				id: 'supportedDeployment',
				label: 'Deployment',
				type: 'select',
				value: '0',
				options: deploymentOptions,
				required: true
			},
			{
				id: 'impersonatingUserId',
				label: 'Run in User\'s Context',
				type: 'select',
				value: '',
				options: [
					{ value: '', label: 'Calling User' }
				]
			},
			{
				id: 'sectionConfiguration',
				type: 'section',
				label: 'Configuration (Optional)'
			},
			{
				id: 'unsecureConfiguration',
				label: 'Unsecure Configuration',
				type: 'textarea',
				value: '',
				placeholder: 'Configuration string accessible to plugin'
			},
			{
				id: 'secureConfiguration',
				label: 'Secure Configuration',
				type: 'textarea',
				value: '',
				placeholder: 'Encrypted configuration (only accessible to plugin)'
			}
		],
		submitLabel: 'Register Step',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			// Store references for async entity loading and step name regeneration
			activeStepModal.updateField = updateField;
			activeStepModal.stepNameState = stepNameState;
			activeStepModal.generateStepName = generateStepName;

			if (fieldId === 'sdkMessageId' && value) {
				// Find the message name from options
				const selectedMessage = messageOptions.find(m => m.value === value);
				if (selectedMessage) {
					stepNameState.selectedMessageName = selectedMessage.label;
				}
				// Clear entities since message changed
				stepNameState.selectedEntity = '';
				stepNameState.selectedSecondaryEntity = '';

				// Auto-generate step name if not manually edited
				if (!stepNameState.userEditedName) {
					updateField('name', generateStepName());
				}

				// When message changes, fetch or use cached entities
				const cached = entityCacheByMessage.get(value);
				if (cached) {
					// Use cached entities
					const primaryOptions = (cached.primary || []).map(e => ({ value: e, label: e }));
					const secondaryOptions = (cached.secondary || []).map(e => ({ value: e, label: e }));
					updateField('primaryEntity', '', primaryOptions);
					updateField('secondaryEntity', '', secondaryOptions);
				} else {
					// Fetch entities from extension
					activeStepModal.pendingMessageId = value;
					vscode.postMessage({
						command: 'getEntitiesForMessage',
						data: { messageId: value }
					});
				}
			}

			// Track primary entity changes for step name generation
			if (fieldId === 'primaryEntity') {
				stepNameState.selectedEntity = value || '';
				if (!stepNameState.userEditedName) {
					updateField('name', generateStepName());
				}
			}

			// Track secondary entity changes for step name generation
			if (fieldId === 'secondaryEntity') {
				stepNameState.selectedSecondaryEntity = value || '';
				if (!stepNameState.userEditedName) {
					updateField('name', generateStepName());
				}
			}

			// Track manual name edits
			if (fieldId === 'name') {
				const trimmedValue = (value || '').trim();
				const autoGenerated = generateStepName();
				const autoPrefix = `${pluginTypeName}: `;

				// Reset userEditedName if user cleared the field or value matches auto-generated
				if (!trimmedValue || trimmedValue === autoGenerated || trimmedValue === autoPrefix.trim()) {
					stepNameState.userEditedName = false;
				} else if (trimmedValue !== autoGenerated) {
					// User typed something different - stop auto-generation
					stepNameState.userEditedName = true;
				}
			}

			// Stage/Mode validation: Async mode forces PostOperation
			// Also toggle asyncAutoDelete visibility (only relevant for async)
			// Deployment validation: Async mode requires Server Only deployment
			if (fieldId === 'mode') {
				const isAsync = value === '1';
				if (isAsync) {
					// Asynchronous - force PostOperation (stage 40)
					updateField('stage', '40');
					// Asynchronous - force Server Only deployment (Dataverse constraint)
					updateField('supportedDeployment', '0', undefined, undefined, true);
				} else {
					// Synchronous - re-enable deployment selection
					updateField('supportedDeployment', undefined, undefined, undefined, false);
				}
				// Show/hide asyncAutoDelete based on mode (4th param is visibility)
				updateField('asyncAutoDelete', undefined, undefined, isAsync);
			}
		},
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmRegisterStep',
				data: {
					pluginTypeId,
					sdkMessageId: values.sdkMessageId,
					name: values.name,
					stage: parseInt(values.stage, 10),
					mode: parseInt(values.mode, 10),
					rank: parseInt(values.rank, 10),
					supportedDeployment: parseInt(values.supportedDeployment, 10),
					filteringAttributes: values.filteringAttributes || undefined,
					asyncAutoDelete: values.asyncAutoDelete === true || values.asyncAutoDelete === 'true',
					unsecureConfiguration: values.unsecureConfiguration || undefined,
					secureConfiguration: values.secureConfiguration || undefined,
					primaryEntity: values.primaryEntity || undefined,
					secondaryEntity: values.secondaryEntity || undefined,
					impersonatingUserId: values.impersonatingUserId || undefined,
					solutionUniqueName: values.solutionUniqueName || undefined
				}
			});
		}
	});
}

/**
 * Show the Edit Step modal.
 * @param {Object} data - Step data with all editable properties
 */
function handleShowEditStepModal(data) {
	const {
		stepId, stepName, sdkMessageName, stage, mode, rank,
		filteringAttributes, supportedDeployment, asyncAutoDelete,
		unsecureConfiguration, secureConfiguration, primaryEntity
	} = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Stage options
	const stageOptions = [
		{ value: '10', label: 'Pre-validation' },
		{ value: '20', label: 'Pre-operation' },
		{ value: '40', label: 'Post-operation' }
	];

	// Mode options
	const modeOptions = [
		{ value: '0', label: 'Synchronous' },
		{ value: '1', label: 'Asynchronous' }
	];

	// Deployment options
	const deploymentOptions = [
		{ value: '0', label: 'Server Only' },
		{ value: '1', label: 'Offline Only' },
		{ value: '2', label: 'Server and Offline' }
	];

	window.showFormModal({
		title: `Update Step`,
		width: '550px',
		fields: [
			{
				id: 'sectionGeneral',
				type: 'section',
				label: 'General Configuration'
			},
			{
				id: 'messageName',
				label: 'Message',
				type: 'text',
				value: sdkMessageName || 'Unknown',
				readonly: true
			},
			{
				id: 'primaryEntityDisplay',
				label: 'Primary Entity',
				type: 'text',
				value: primaryEntity || '(none)',
				readonly: true
			},
			{
				id: 'filteringAttributes',
				label: 'Filtering Attributes',
				type: 'attributeInput',
				value: filteringAttributes || '',
				placeholder: 'Comma-separated attribute names',
				entityField: 'primaryEntityDisplay'
			},
			{
				id: 'name',
				label: 'Step Name',
				type: 'text',
				value: stepName,
				required: true
			},
			{
				id: 'sectionExecution',
				type: 'section',
				label: 'Execution'
			},
			{
				id: 'stage',
				label: 'Stage',
				type: 'select',
				value: String(stage),
				options: stageOptions,
				required: true
			},
			{
				id: 'mode',
				label: 'Mode',
				type: 'select',
				value: String(mode),
				options: modeOptions,
				required: true
			},
			{
				id: 'asyncAutoDelete',
				label: 'Delete AsyncOperation if Successful',
				type: 'checkbox',
				value: asyncAutoDelete ?? false,
				hidden: mode !== 1 // Only show for async mode
			},
			{
				id: 'rank',
				label: 'Execution Order',
				type: 'number',
				value: String(rank),
				required: true
			},
			{
				id: 'supportedDeployment',
				label: 'Deployment',
				type: 'select',
				value: String(supportedDeployment ?? 0),
				options: deploymentOptions,
				required: true,
				disabled: mode === 1 // Disable if current mode is Async (Dataverse constraint)
			},
			{
				id: 'sectionConfiguration',
				type: 'section',
				label: 'Configuration (Optional)'
			},
			{
				id: 'unsecureConfiguration',
				label: 'Unsecure Configuration',
				type: 'textarea',
				value: unsecureConfiguration || '',
				placeholder: 'Configuration string accessible to plugin'
			},
			{
				id: 'secureConfiguration',
				label: 'Secure Configuration',
				type: 'textarea',
				value: secureConfiguration || '',
				placeholder: 'Encrypted configuration (only accessible to plugin)'
			}
		],
		submitLabel: 'Update Step',
		cancelLabel: 'Cancel',
		onFieldChange: (fieldId, value, updateField) => {
			// Stage/Mode validation: Async mode forces PostOperation
			// Also toggle asyncAutoDelete visibility (only relevant for async)
			// Deployment validation: Async mode requires Server Only deployment
			if (fieldId === 'mode') {
				const isAsync = value === '1';
				if (isAsync) {
					// Asynchronous - force PostOperation (stage 40)
					updateField('stage', '40');
					// Asynchronous - force Server Only deployment (Dataverse constraint)
					updateField('supportedDeployment', '0', undefined, undefined, true);
				} else {
					// Synchronous - re-enable deployment selection
					updateField('supportedDeployment', undefined, undefined, undefined, false);
				}
				// Show/hide asyncAutoDelete based on mode (4th param is visibility)
				updateField('asyncAutoDelete', undefined, undefined, isAsync);
			}
		},
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmEditStep',
				data: {
					stepId,
					name: values.name,
					stage: parseInt(values.stage, 10),
					mode: parseInt(values.mode, 10),
					rank: parseInt(values.rank, 10),
					supportedDeployment: parseInt(values.supportedDeployment, 10),
					filteringAttributes: values.filteringAttributes || undefined,
					asyncAutoDelete: values.asyncAutoDelete === true || values.asyncAutoDelete === 'true',
					unsecureConfiguration: values.unsecureConfiguration || undefined,
					secureConfiguration: values.secureConfiguration || undefined
				}
			});
		}
	});
}

/**
 * Get valid image property names for a message.
 * This mirrors the static metadata from MessageMetadataService.
 * @param {string} messageName - The SDK message name
 * @returns {Array<{value: string, label: string}>} Property name options
 */
function getImagePropertyNamesForMessage(messageName) {
	const mapping = {
		'Create': [{ value: 'id', label: 'Created Entity (id)' }],
		'CreateMultiple': [{ value: 'Ids', label: 'Created Entities (Ids)' }],
		'Update': [{ value: 'Target', label: 'Updated Entity (Target)' }],
		'UpdateMultiple': [{ value: 'Targets', label: 'Updated Entities (Targets)' }],
		'Delete': [{ value: 'Target', label: 'Deleted Entity (Target)' }],
		'Assign': [{ value: 'Target', label: 'Assigned Entity (Target)' }],
		'SetState': [{ value: 'EntityMoniker', label: 'Entity (EntityMoniker)' }],
		'SetStateDynamicEntity': [{ value: 'EntityMoniker', label: 'Entity (EntityMoniker)' }],
		'Route': [{ value: 'Target', label: 'Routed Entity (Target)' }],
		'Send': [{ value: 'EmailId', label: 'Sent Entity Id (EmailId)' }],
		'DeliverIncoming': [{ value: 'EmailId', label: 'Delivered E-mail Id (EmailId)' }],
		'DeliverPromote': [{ value: 'EmailId', label: 'Delivered E-mail Id (EmailId)' }],
		'ExecuteWorkflow': [{ value: 'Target', label: 'Workflow Entity (Target)' }],
		'Merge': [
			{ value: 'Target', label: 'Parent Entity (Target)' },
			{ value: 'SubordinateId', label: 'Child Entity (SubordinateId)' }
		]
	};
	return mapping[messageName] || [{ value: 'Target', label: 'Target' }];
}

/**
 * Show the Register Image modal.
 * @param {Object} data - { stepId, stepName, messageName }
 */
function handleShowRegisterImageModal(data) {
	const { stepId, stepName, messageName, primaryEntity } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Image type options (matching Dataverse values)
	const imageTypeOptions = [
		{ value: '', label: '-- Select Image Type --' },
		{ value: '0', label: 'PreImage' },
		{ value: '1', label: 'PostImage' },
		{ value: '2', label: 'Both' }
	];

	// Auto-determine message property name (user doesn't need to see this)
	// Use first/primary option for the message (e.g., "Target" for most messages)
	const propertyNameOptions = getImagePropertyNamesForMessage(messageName);
	const messagePropertyName = propertyNameOptions[0].value;

	// Build fields array - include entity display if we have one
	const fields = [
		{
			id: 'name',
			label: 'Name',
			type: 'text',
			value: '',
			required: true,
			placeholder: 'Image name'
		},
		{
			id: 'imageType',
			label: 'Image Type',
			type: 'select',
			value: '',
			options: imageTypeOptions,
			required: true
		},
		{
			id: 'entityAlias',
			label: 'Entity Alias',
			type: 'text',
			value: '',
			required: true,
			placeholder: 'e.g., PreImage or PostImage'
		}
	];

	// Add entity display and attribute picker if we have a primary entity
	if (primaryEntity) {
		fields.push({
			id: 'primaryEntity',
			label: 'Entity',
			type: 'text',
			value: primaryEntity,
			readonly: true
		});
		fields.push({
			id: 'attributes',
			label: 'Attributes',
			type: 'attributeInput',
			value: 'All Attributes',
			entityField: 'primaryEntity'
		});
	} else {
		// No entity - use plain text field
		fields.push({
			id: 'attributes',
			label: 'Attributes',
			type: 'text',
			value: 'All Attributes'
		});
	}

	window.showFormModal({
		title: `Register Image for ${stepName}`,
		fields,
		submitLabel: 'Register',
		cancelLabel: 'Cancel',
		onSubmit: (values) => {
			// Convert "All Attributes" back to undefined (means capture all)
			const attrs = values.attributes === 'All Attributes' ? undefined : values.attributes || undefined;
			vscode.postMessage({
				command: 'confirmRegisterImage',
				data: {
					stepId,
					name: values.name,
					imageType: parseInt(values.imageType, 10),
					messagePropertyName,
					entityAlias: values.entityAlias,
					attributes: attrs
				}
			});
		}
	});
}

/**
 * Show the Edit Image modal.
 * @param {Object} data - { imageId, imageName, imageType, entityAlias, attributes, primaryEntity }
 */
function handleShowEditImageModal(data) {
	const { imageId, imageName, imageType, entityAlias, attributes, primaryEntity } = data;

	if (!window.showFormModal) {
		console.error('FormModal component not loaded');
		return;
	}

	// Image type options
	const imageTypeOptions = [
		{ value: '0', label: 'PreImage' },
		{ value: '1', label: 'PostImage' },
		{ value: '2', label: 'Both' }
	];

	// Build fields array - include entity display if we have one
	const fields = [
		{
			id: 'name',
			label: 'Name',
			type: 'text',
			value: imageName,
			required: true
		},
		{
			id: 'imageType',
			label: 'Image Type',
			type: 'select',
			value: String(imageType),
			options: imageTypeOptions,
			required: true
		},
		{
			id: 'entityAlias',
			label: 'Entity Alias',
			type: 'text',
			value: entityAlias,
			required: true
		}
	];

	// Add entity display and attribute picker if we have a primary entity
	if (primaryEntity) {
		fields.push({
			id: 'primaryEntity',
			label: 'Entity',
			type: 'text',
			value: primaryEntity,
			readonly: true
		});
		fields.push({
			id: 'attributes',
			label: 'Attributes',
			type: 'attributeInput',
			value: attributes || 'All Attributes',
			entityField: 'primaryEntity'
		});
	} else {
		// No entity - use plain text field
		fields.push({
			id: 'attributes',
			label: 'Attributes',
			type: 'text',
			value: attributes || 'All Attributes'
		});
	}

	window.showFormModal({
		title: `Edit Image: ${imageName}`,
		fields,
		submitLabel: 'Update',
		cancelLabel: 'Cancel',
		onSubmit: (values) => {
			// Convert "All Attributes" back to undefined (means capture all)
			const attrs = values.attributes === 'All Attributes' ? undefined : values.attributes || undefined;
			vscode.postMessage({
				command: 'confirmEditImage',
				data: {
					imageId,
					name: values.name,
					imageType: parseInt(values.imageType, 10),
					entityAlias: values.entityAlias,
					attributes: attrs
				}
			});
		}
	});
}

/**
 * Handle adding a new node to the tree (delta update).
 * @param {Object} data - { parentId, node, solutionId? } - parentId can be null for root-level nodes
 */
function handleAddNode(data) {
	const { parentId, node, solutionId } = data;
	if (!node || !node.id) return;

	// If node was registered in a solution, update the memberships cache
	// This ensures the node isn't filtered out by solution filter
	if (solutionId && solutionMemberships[solutionId]) {
		solutionMemberships[solutionId].push(node.id);
	}

	// Root-level node (no parent) - add directly to treeData
	if (parentId === null || parentId === undefined) {
		treeData.push(node);
	} else {
		// Find parent node in tree and add child
		function addToParent(items) {
			for (const item of items) {
				if (item.id === parentId) {
					if (!item.children) {
						item.children = [];
					}
					item.children.push(node);
					return true;
				}
				if (item.children && addToParent(item.children)) {
					return true;
				}
			}
			return false;
		}

		addToParent(treeData);

		// Expand parent so the new node is visible
		expandedNodes.add(parentId);

		// Also expand any ancestor nodes up to the root
		expandAncestors(parentId, treeData);
	}

	// Render tree
	renderTree();

	// Re-apply filter if active
	if (currentFilter) {
		filterTree(currentFilter);
	}

	// Scroll new node into view
	scrollNodeIntoView(node.id);
}

/**
 * Expand all ancestor nodes up to the root for a given node ID.
 * This ensures the full path to a node is visible.
 * @param {string} targetId - ID of the node whose ancestors should be expanded
 * @param {Array} items - Tree items to search
 * @param {Array} [path=[]] - Current path of parent IDs
 * @returns {boolean} True if target was found
 */
function expandAncestors(targetId, items, path = []) {
	for (const item of items) {
		if (item.id === targetId) {
			// Found target - expand all ancestors in path
			path.forEach(id => expandedNodes.add(id));
			return true;
		}
		if (item.children && item.children.length > 0) {
			// Recurse with this node added to path
			if (expandAncestors(targetId, item.children, [...path, item.id])) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Handle entities response from extension for a message.
 * Updates the active primary/secondary entity comboboxes with available entities.
 * @param {Object} data - { messageId, entities, secondaryEntities, error? }
 */
function handleEntitiesForMessage(data) {
	const { messageId, entities, secondaryEntities, error } = data;

	// Cache the results with both primary and secondary
	if (!error) {
		entityCacheByMessage.set(messageId, {
			primary: entities || [],
			secondary: secondaryEntities || []
		});
	}

	// Update the active modal's entity fields if we're waiting for this message
	if (activeStepModal.updateField && activeStepModal.pendingMessageId === messageId) {
		const primaryOptions = (entities || []).map(e => ({ value: e, label: e }));
		const secondaryOptions = (secondaryEntities || []).map(e => ({ value: e, label: e }));
		activeStepModal.updateField('primaryEntity', '', primaryOptions);
		activeStepModal.updateField('secondaryEntity', '', secondaryOptions);
		activeStepModal.pendingMessageId = null;

		// Regenerate step name after entities load (name will reflect message selection)
		if (activeStepModal.stepNameState && activeStepModal.generateStepName) {
			if (!activeStepModal.stepNameState.userEditedName) {
				activeStepModal.updateField('name', activeStepModal.generateStepName());
			}
		}
	}
}

/**
 * Handle showing node details in the detail panel.
 * Renders details based on node type.
 * @param {Object} data - Details object with nodeType and type-specific fields
 */
function handleShowNodeDetails(data) {
	const { nodeType } = data;
	const detailContent = document.getElementById('detailPanelContent');

	if (!detailContent) {
		console.warn('[PluginRegistration] Detail panel content element not found');
		return;
	}

	// Render based on node type
	let html = '<div class="detail-grid">';

	switch (nodeType) {
		case 'package':
			html += renderPackageDetails(data);
			break;
		case 'assembly':
			html += renderAssemblyDetails(data);
			break;
		case 'pluginType':
			html += renderPluginTypeDetails(data);
			break;
		case 'step':
			html += renderStepDetails(data);
			break;
		case 'image':
			html += renderImageDetails(data);
			break;
		case 'webHook':
			html += renderWebHookDetails(data);
			break;
		case 'serviceEndpoint':
			html += renderServiceEndpointDetails(data);
			break;
		case 'dataProvider':
			html += renderDataProviderDetails(data);
			break;
		case 'customApi':
			html += renderCustomApiDetails(data);
			break;
		default:
			html = '<p class="detail-placeholder">Unknown node type</p>';
	}

	if (nodeType !== 'unknown') {
		html += '</div>';
	}

	detailContent.innerHTML = html;
}

/**
 * Render package details.
 */
function renderPackageDetails(data) {
	return `
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Unique Name:</span>
		<span class="detail-value monospace">${escapeHtml(data.uniqueName || '')}</span>
		<span class="detail-label">Version:</span>
		<span class="detail-value">${escapeHtml(data.version || '')}</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
		<span class="detail-label">Modified:</span>
		<span class="detail-value">${formatDate(data.modifiedOn)}</span>
	`;
}

/**
 * Render assembly details.
 */
function renderAssemblyDetails(data) {
	return `
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Version:</span>
		<span class="detail-value">${escapeHtml(data.version || '')}</span>
		<span class="detail-label">Isolation Mode:</span>
		<span class="detail-value">${escapeHtml(data.isolationMode || '')}</span>
		<span class="detail-label">Source Type:</span>
		<span class="detail-value">${escapeHtml(data.sourceType || '')}</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Plugin Count:</span>
		<span class="detail-value">${data.pluginCount ?? '-'}</span>
		<span class="detail-label">In Package:</span>
		<span class="detail-value">${data.packageName ? escapeHtml(data.packageName) : 'No (standalone)'}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
	`;
}

/**
 * Render plugin type details.
 */
function renderPluginTypeDetails(data) {
	return `
		<span class="detail-label">Type Name:</span>
		<span class="detail-value monospace">${escapeHtml(data.typeName || '')}</span>
		<span class="detail-label">Friendly Name:</span>
		<span class="detail-value">${escapeHtml(data.friendlyName || '')}</span>
		<span class="detail-label">Type:</span>
		<span class="detail-value">${data.isWorkflowActivity ? '⚙️ Workflow Activity' : '🔌 Plugin'}</span>
		<span class="detail-label">Assembly:</span>
		<span class="detail-value">${escapeHtml(data.assemblyName || '')}</span>
		<span class="detail-label">Step Count:</span>
		<span class="detail-value">${data.stepCount ?? '-'}</span>
	`;
}

/**
 * Render webhook details.
 */
function renderWebHookDetails(data) {
	return `
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Endpoint URL:</span>
		<span class="detail-value monospace">${escapeHtml(data.url || '')}</span>
		<span class="detail-label">Authentication:</span>
		<span class="detail-value">${escapeHtml(data.authType || '')}</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Description:</span>
		<span class="detail-value">${escapeHtml(data.description || '-')}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
		<span class="detail-label">Modified:</span>
		<span class="detail-value">${formatDate(data.modifiedOn)}</span>
	`;
}

/**
 * Render service endpoint details.
 */
function renderServiceEndpointDetails(data) {
	let html = `
		<span class="detail-section-title">General</span>
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Description:</span>
		<span class="detail-value">${escapeHtml(data.description || '-')}</span>
		<span class="detail-label">Contract:</span>
		<span class="detail-value">${escapeHtml(data.contract || '')}</span>
		<span class="detail-label">Connection Mode:</span>
		<span class="detail-value">${escapeHtml(data.connectionMode || '')}</span>

		<span class="detail-section-title">Configuration</span>
		<span class="detail-label">Namespace:</span>
		<span class="detail-value monospace">${escapeHtml(data.namespace || '')}</span>
	`;

	if (data.path) {
		html += `
		<span class="detail-label">Path (Queue/Topic):</span>
		<span class="detail-value monospace">${escapeHtml(data.path)}</span>
		`;
	}

	html += `
		<span class="detail-label">Authentication:</span>
		<span class="detail-value">${escapeHtml(data.authType || '')}</span>
	`;

	if (data.sasKeyName) {
		html += `
		<span class="detail-label">SAS Key Name:</span>
		<span class="detail-value">${escapeHtml(data.sasKeyName)}</span>
		`;
	}

	html += `
		<span class="detail-section-title">Message Options</span>
		<span class="detail-label">Message Format:</span>
		<span class="detail-value">${escapeHtml(data.messageFormat || '')}</span>
		<span class="detail-label">User Information:</span>
		<span class="detail-value">${escapeHtml(data.userClaim || '')}</span>

		<span class="detail-section-title">System</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
		<span class="detail-label">Modified:</span>
		<span class="detail-value">${formatDate(data.modifiedOn)}</span>
	`;

	return html;
}

/**
 * Render data provider details.
 */
function renderDataProviderDetails(data) {
	let html = `
		<span class="detail-section-title">General</span>
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Data Source:</span>
		<span class="detail-value monospace">${escapeHtml(data.dataSourceLogicalName || '')}</span>
		<span class="detail-label">Description:</span>
		<span class="detail-value">${escapeHtml(data.description || '-')}</span>

		<span class="detail-section-title">Operations</span>
		<span class="detail-label">Retrieve:</span>
		<span class="detail-value">${data.hasRetrieve ? '✓ Configured' : '✗ Not configured'}</span>
		<span class="detail-label">Retrieve Multiple:</span>
		<span class="detail-value">${data.hasRetrieveMultiple ? '✓ Configured' : '✗ Not configured'}</span>
		<span class="detail-label">Create:</span>
		<span class="detail-value">${data.hasCreate ? '✓ Configured' : '✗ Not configured'}</span>
		<span class="detail-label">Update:</span>
		<span class="detail-value">${data.hasUpdate ? '✓ Configured' : '✗ Not configured'}</span>
		<span class="detail-label">Delete:</span>
		<span class="detail-value">${data.hasDelete ? '✓ Configured' : '✗ Not configured'}</span>

		<span class="detail-section-title">System</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
		<span class="detail-label">Modified:</span>
		<span class="detail-value">${formatDate(data.modifiedOn)}</span>
	`;

	return html;
}

/**
 * Render custom API details.
 */
function renderCustomApiDetails(data) {
	let html = `
		<span class="detail-section-title">General</span>
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Unique Name:</span>
		<span class="detail-value monospace">${escapeHtml(data.uniqueName || '')}</span>
		<span class="detail-label">Display Name:</span>
		<span class="detail-value">${escapeHtml(data.displayName || '')}</span>
		<span class="detail-label">Description:</span>
		<span class="detail-value">${escapeHtml(data.description || '-')}</span>

		<span class="detail-section-title">Behavior</span>
		<span class="detail-label">Type:</span>
		<span class="detail-value">${data.isFunction ? 'Function (GET)' : 'Action (POST)'}</span>
		<span class="detail-label">Private:</span>
		<span class="detail-value">${data.isPrivate ? 'Yes (hidden from discovery)' : 'No'}</span>

		<span class="detail-section-title">Binding</span>
		<span class="detail-label">Binding Type:</span>
		<span class="detail-value">${escapeHtml(data.bindingType || 'Global')}</span>
	`;

	if (data.boundEntityLogicalName) {
		html += `
		<span class="detail-label">Bound Entity:</span>
		<span class="detail-value monospace">${escapeHtml(data.boundEntityLogicalName)}</span>
		`;
	}

	html += `
		<span class="detail-section-title">Processing</span>
		<span class="detail-label">Allowed Processing:</span>
		<span class="detail-value">${escapeHtml(data.allowedProcessing || 'None')}</span>
		<span class="detail-label">Plugin Implementation:</span>
		<span class="detail-value">${data.pluginTypeName ? escapeHtml(data.pluginTypeName) : 'None'}</span>

		<span class="detail-section-title">Parameters</span>
		<span class="detail-label">Request Parameters:</span>
		<span class="detail-value">${data.requestParameterCount || 0}</span>
		<span class="detail-label">Response Properties:</span>
		<span class="detail-value">${data.responsePropertyCount || 0}</span>

		<span class="detail-section-title">System</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
		<span class="detail-label">Modified:</span>
		<span class="detail-value">${formatDate(data.modifiedOn)}</span>
	`;

	return html;
}

/**
 * Render step details.
 */
function renderStepDetails(data) {
	let html = `
		<span class="detail-section-title">General</span>
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Message:</span>
		<span class="detail-value">${escapeHtml(data.message || '')}</span>
		<span class="detail-label">Primary Entity:</span>
		<span class="detail-value">${escapeHtml(data.primaryEntity || 'none')}</span>
	`;

	if (data.secondaryEntity) {
		html += `
		<span class="detail-label">Secondary Entity:</span>
		<span class="detail-value">${escapeHtml(data.secondaryEntity)}</span>
		`;
	}

	html += `
		<span class="detail-section-title">Execution</span>
		<span class="detail-label">Stage:</span>
		<span class="detail-value">${escapeHtml(data.stage || '')}</span>
		<span class="detail-label">Mode:</span>
		<span class="detail-value">${escapeHtml(data.mode || '')}</span>
		<span class="detail-label">Execution Order:</span>
		<span class="detail-value">${data.rank ?? '-'}</span>
		<span class="detail-label">Deployment:</span>
		<span class="detail-value">${escapeHtml(data.deployment || '')}</span>
	`;

	if (data.mode === 'Asynchronous') {
		html += `
		<span class="detail-label">Auto Delete:</span>
		<span class="detail-value">${data.asyncAutoDelete ? 'Yes' : 'No'}</span>
		`;
	}

	if (data.filteringAttributes) {
		html += `
		<span class="detail-label">Filtering Attrs:</span>
		<span class="detail-value monospace truncated">${escapeHtml(data.filteringAttributes)}</span>
		`;
	}

	html += `
		<span class="detail-section-title">Status</span>
		<span class="detail-label">Enabled:</span>
		<span class="detail-value">${renderEnabledStatus(data.isEnabled)}</span>
		<span class="detail-label">Managed:</span>
		<span class="detail-value">${renderManagedStatus(data.isManaged)}</span>
	`;

	if (data.unsecureConfig) {
		html += `
		<span class="detail-label">Unsecure Config:</span>
		<span class="detail-value monospace truncated">${escapeHtml(data.unsecureConfig)}</span>
		`;
	}

	html += `
		<span class="detail-label">Created:</span>
		<span class="detail-value">${formatDate(data.createdOn)}</span>
	`;

	return html;
}

/**
 * Render image details.
 */
function renderImageDetails(data) {
	return `
		<span class="detail-label">Name:</span>
		<span class="detail-value">${escapeHtml(data.name || '')}</span>
		<span class="detail-label">Image Type:</span>
		<span class="detail-value">${escapeHtml(data.imageType || '')}</span>
		<span class="detail-label">Entity Alias:</span>
		<span class="detail-value monospace">${escapeHtml(data.entityAlias || '')}</span>
		<span class="detail-label">Message Property:</span>
		<span class="detail-value monospace">${escapeHtml(data.messagePropertyName || '')}</span>
		<span class="detail-label">Attributes:</span>
		<span class="detail-value monospace truncated">${escapeHtml(data.attributes || 'All attributes')}</span>
	`;
}

/**
 * Render enabled/disabled status with icon.
 */
function renderEnabledStatus(isEnabled) {
	if (isEnabled) {
		return '<span class="detail-status"><span class="detail-status-icon enabled">✓</span> Enabled</span>';
	}
	return '<span class="detail-status"><span class="detail-status-icon disabled">✗</span> Disabled</span>';
}

/**
 * Render managed status with icon.
 */
function renderManagedStatus(isManaged) {
	if (isManaged) {
		return '<span class="detail-status"><span class="detail-status-icon managed">🔒</span> Yes</span>';
	}
	return 'No';
}

/**
 * Format date for display.
 */
function formatDate(dateString) {
	if (!dateString) return '-';
	try {
		const date = new Date(dateString);
		return date.toLocaleString();
	} catch {
		return dateString;
	}
}
