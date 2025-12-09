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
	} else {
		if (treeEmpty) {
			treeEmpty.style.display = 'none';
		}
		if (pluginTree) {
			pluginTree.style.display = 'block';
			renderTree(treeData);
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

	const classes = [
		'tree-node',
		item.isManaged ? 'managed' : '',
		item.metadata?.statecode === 1 ? 'disabled' : ''
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
 * Filter tree based on search input
 */
function filterTree(searchTerm) {
	const pluginTree = document.getElementById('pluginTree');
	if (!pluginTree) return;

	const term = searchTerm.toLowerCase();
	const nodes = pluginTree.querySelectorAll('.tree-node');

	nodes.forEach(node => {
		const label = node.querySelector('.tree-node-label');
		const text = label ? label.textContent.toLowerCase() : '';
		const matches = term === '' || text.includes(term);

		// Show/hide based on match
		// For simplicity, just show matching nodes (full tree filtering is complex)
		node.style.display = matches ? 'flex' : 'none';
	});
}

// Use createBehavior pattern (from messaging.js) for proper integration
window.createBehavior({
	initialize() {
		const loadingProgress = document.getElementById('loadingProgress');
		const pluginTree = document.getElementById('pluginTree');
		const treeEmpty = document.getElementById('treeEmpty');
		const treeSearch = document.getElementById('treeSearch');

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

		// Wire up search handler
		if (treeSearch) {
			treeSearch.addEventListener('input', (event) => {
				const value = event.target.value || '';
				filterTree(value);
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
		}
	}
});
