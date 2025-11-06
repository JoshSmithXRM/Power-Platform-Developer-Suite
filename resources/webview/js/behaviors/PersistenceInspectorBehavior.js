/**
 * Client-side behavior for Persistence Inspector panel.
 * Handles storage entry rendering and user interactions.
 */
window.createBehavior({
	initialize() {
		const vscode = window.vscode;

		// Request initial data on load
		vscode.postMessage({ command: 'refresh' });
	},

	handleMessage(message) {
		switch (message.command) {
			case 'storageData':
				renderStorageData(message.data);
				break;
			case 'secretRevealed':
				updateSecretValue(message.key, message.value);
				break;
			case 'error':
				alert('Error: ' + message.message);
				break;
		}
	}
});

function renderStorageData(data) {
	renderEntries(data.globalStateEntries, 'globalStateEntries');
	renderEntries(data.workspaceStateEntries, 'workspaceStateEntries');
	renderEntries(data.secretEntries, 'secretEntries');
}

function renderEntries(entries, containerId) {
	const container = document.getElementById(containerId);
	if (!container) {
		console.error('[PersistenceInspector] Container not found:', containerId);
		return;
	}

	container.innerHTML = '';

	if (!entries || entries.length === 0) {
		container.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No entries</div>';
		return;
	}

	entries.forEach(entry => {
		const entryDiv = document.createElement('div');
		entryDiv.className = 'entry';
		if (entry.isProtected) entryDiv.classList.add('protected');
		if (entry.isSecret) entryDiv.classList.add('secret');

		const header = document.createElement('div');
		header.className = 'entry-header';

		const keySpan = document.createElement('span');
		keySpan.className = 'entry-key';
		keySpan.textContent = entry.key;

		const actions = document.createElement('div');
		actions.className = 'entry-actions';

		if (entry.isSecret) {
			const toggleBtn = document.createElement('button');
			toggleBtn.id = 'toggle-' + entry.key;
			toggleBtn.textContent = 'Show';
			toggleBtn.setAttribute('data-revealed', 'false');
			toggleBtn.onclick = () => {
				const isRevealed = toggleBtn.getAttribute('data-revealed') === 'true';
				if (isRevealed) {
					// Hide the secret
					const valueDiv = document.getElementById('value-' + entry.key);
					if (valueDiv) {
						valueDiv.textContent = entry.displayValue;
					}
					toggleBtn.textContent = 'Show';
					toggleBtn.setAttribute('data-revealed', 'false');
				} else {
					// Reveal the secret
					window.vscode.postMessage({
						command: 'revealSecret',
						data: { key: entry.key }
					});
				}
			};
			actions.appendChild(toggleBtn);
		}

		if (entry.canBeCleared) {
			const clearBtn = document.createElement('button');
			clearBtn.textContent = 'Clear';
			clearBtn.onclick = () => {
				window.vscode.postMessage({
					command: 'clearEntry',
					data: { key: entry.key }
				});
			};
			actions.appendChild(clearBtn);
		}

		header.appendChild(keySpan);
		header.appendChild(actions);

		const value = document.createElement('div');
		value.className = 'entry-value';
		value.id = 'value-' + entry.key;

		// Render value as JSON tree if expandable, otherwise as plain text
		if (entry.isExpandable && !entry.isSecret) {
			renderJsonTree(value, entry.displayValue, entry.key, entry.canBeCleared);
		} else {
			value.textContent = entry.displayValue;
		}

		const meta = document.createElement('div');
		meta.className = 'entry-meta';
		meta.textContent = `Type: ${entry.metadata.dataType} | Size: ${entry.metadata.displaySize}` +
			(entry.isProtected ? ' | Protected' : '');

		entryDiv.appendChild(header);
		entryDiv.appendChild(value);
		entryDiv.appendChild(meta);

		container.appendChild(entryDiv);
	});
}

function updateSecretValue(key, value) {
	const valueDiv = document.getElementById('value-' + key);
	if (valueDiv) {
		valueDiv.textContent = value;
	}
	const toggleBtn = document.getElementById('toggle-' + key);
	if (toggleBtn) {
		toggleBtn.textContent = 'Hide';
		toggleBtn.setAttribute('data-revealed', 'true');
	}
}

/**
 * Renders a JSON string as an expandable tree with inline delete buttons
 * @param {HTMLElement} container - Container to render into
 * @param {string} jsonString - JSON string to parse and render
 * @param {string} entryKey - Storage entry key for delete operations
 * @param {boolean} canBeCleared - Whether properties can be deleted
 */
function renderJsonTree(container, jsonString, entryKey, canBeCleared) {
	try {
		const data = JSON.parse(jsonString);
		const tree = createTreeNode(data, [], entryKey, canBeCleared);
		container.appendChild(tree);
	} catch (error) {
		// If parsing fails, fall back to plain text
		container.textContent = jsonString;
	}
}

/**
 * Creates a tree node for a value (object, array, or primitive)
 * @param {*} value - Value to render
 * @param {string[]} path - Current property path
 * @param {string} entryKey - Storage entry key
 * @param {boolean} canBeCleared - Whether to show delete buttons
 * @param {boolean} showDeleteOnHeader - If true and value is object/array, show delete on header
 * @returns {HTMLElement} Tree node element
 */
function createTreeNode(value, path, entryKey, canBeCleared, showDeleteOnHeader = false) {
	const node = document.createElement('div');
	node.className = 'tree-node';

	if (value === null) {
		node.textContent = 'null';
		node.className = 'tree-value tree-null';
	} else if (Array.isArray(value)) {
		renderArrayNode(node, value, path, entryKey, canBeCleared, showDeleteOnHeader);
	} else if (typeof value === 'object') {
		renderObjectNode(node, value, path, entryKey, canBeCleared, showDeleteOnHeader);
	} else {
		// Primitive value
		node.className = 'tree-value tree-' + typeof value;
		node.textContent = JSON.stringify(value);
	}

	return node;
}

/**
 * Renders an object as an expandable tree node
 */
function renderObjectNode(node, obj, path, entryKey, canBeCleared, showDeleteOnHeader = false) {
	const keys = Object.keys(obj);

	if (keys.length === 0) {
		node.textContent = '{}';
		node.className = 'tree-value tree-object';
		return;
	}

	const header = document.createElement('div');
	header.className = 'tree-header';

	const toggle = document.createElement('span');
	toggle.className = 'tree-toggle';
	toggle.textContent = '▼';

	const label = document.createElement('span');
	label.textContent = '{';
	label.className = 'tree-label';

	header.appendChild(toggle);
	header.appendChild(label);

	const children = document.createElement('div');
	children.className = 'tree-children';

	keys.forEach(key => {
		const childPath = [...path, key];
		const childValue = obj[key];
		const isExpandable = childValue !== null && typeof childValue === 'object';

		const childNode = document.createElement('div');
		childNode.className = 'tree-property';

		if (isExpandable) {
			// For objects/arrays: key with delete button on its own line, then nested content
			const keyLine = document.createElement('div');
			keyLine.className = 'tree-property-key-line';

			const propKey = document.createElement('span');
			propKey.className = 'tree-property-key';
			propKey.textContent = key + ':';
			keyLine.appendChild(propKey);

			// Add delete button for nested objects/arrays right after the key
			if (canBeCleared && childPath.length > 0) {
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'tree-delete-btn';
				deleteBtn.textContent = '×';
				deleteBtn.title = 'Delete ' + key;
				deleteBtn.onclick = (e) => {
					e.stopPropagation();
					deleteProperty(entryKey, childPath);
				};
				keyLine.appendChild(deleteBtn);
			}

			childNode.appendChild(keyLine);

			// Nested content gets rendered as a block element
			const propValue = createTreeNode(childValue, childPath, entryKey, canBeCleared, true);
			childNode.appendChild(propValue);
		} else {
			// For primitives: key, value, and delete button on same line
			const propLine = document.createElement('div');
			propLine.className = 'tree-property-line';

			const propKey = document.createElement('span');
			propKey.className = 'tree-property-key';
			propKey.textContent = key + ': ';
			propLine.appendChild(propKey);

			const propValue = createTreeNode(childValue, childPath, entryKey, canBeCleared, false);
			propLine.appendChild(propValue);

			// Add delete button for primitive values
			if (canBeCleared && childPath.length > 0) {
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'tree-delete-btn';
				deleteBtn.textContent = '×';
				deleteBtn.title = 'Delete ' + key;
				deleteBtn.onclick = (e) => {
					e.stopPropagation();
					deleteProperty(entryKey, childPath);
				};
				propLine.appendChild(deleteBtn);
			}

			childNode.appendChild(propLine);
		}

		children.appendChild(childNode);
	});

	// Closing brace
	const closingBrace = document.createElement('div');
	closingBrace.className = 'tree-closing-bracket';
	closingBrace.textContent = '}';

	// Toggle expand/collapse
	header.onclick = () => {
		children.classList.toggle('collapsed');
		closingBrace.classList.toggle('collapsed');
		toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
	};

	node.appendChild(header);
	node.appendChild(children);
	node.appendChild(closingBrace);
}

/**
 * Renders an array as an expandable tree node
 */
function renderArrayNode(node, arr, path, entryKey, canBeCleared, showDeleteOnHeader = false) {
	if (arr.length === 0) {
		node.textContent = '[]';
		node.className = 'tree-value tree-array';
		return;
	}

	const header = document.createElement('div');
	header.className = 'tree-header';

	const toggle = document.createElement('span');
	toggle.className = 'tree-toggle';
	toggle.textContent = '▼';

	const label = document.createElement('span');
	label.textContent = '[';
	label.className = 'tree-label';

	header.appendChild(toggle);
	header.appendChild(label);

	const children = document.createElement('div');
	children.className = 'tree-children';

	arr.forEach((item, index) => {
		const childPath = [...path, String(index)];
		const isExpandable = item !== null && typeof item === 'object';

		const childNode = document.createElement('div');
		childNode.className = 'tree-property';

		if (isExpandable) {
			// For objects/arrays: index with delete button on its own line, then nested content
			const keyLine = document.createElement('div');
			keyLine.className = 'tree-property-key-line';

			const propKey = document.createElement('span');
			propKey.className = 'tree-property-key tree-array-index';
			propKey.textContent = index + ':';
			keyLine.appendChild(propKey);

			// Add delete button for nested objects/arrays right after the index
			if (canBeCleared && childPath.length > 0) {
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'tree-delete-btn';
				deleteBtn.textContent = '×';
				deleteBtn.title = 'Delete item ' + index;
				deleteBtn.onclick = (e) => {
					e.stopPropagation();
					deleteProperty(entryKey, childPath);
				};
				keyLine.appendChild(deleteBtn);
			}

			childNode.appendChild(keyLine);

			// Nested content gets rendered as a block element
			const propValue = createTreeNode(item, childPath, entryKey, canBeCleared, true);
			childNode.appendChild(propValue);
		} else {
			// For primitives: index, value, and delete button on same line
			const propLine = document.createElement('div');
			propLine.className = 'tree-property-line';

			const propKey = document.createElement('span');
			propKey.className = 'tree-property-key tree-array-index';
			propKey.textContent = index + ': ';
			propLine.appendChild(propKey);

			const propValue = createTreeNode(item, childPath, entryKey, canBeCleared, false);
			propLine.appendChild(propValue);

			// Add delete button for primitive values
			if (canBeCleared && childPath.length > 0) {
				const deleteBtn = document.createElement('button');
				deleteBtn.className = 'tree-delete-btn';
				deleteBtn.textContent = '×';
				deleteBtn.title = 'Delete item ' + index;
				deleteBtn.onclick = (e) => {
					e.stopPropagation();
					deleteProperty(entryKey, childPath);
				};
				propLine.appendChild(deleteBtn);
			}

			childNode.appendChild(propLine);
		}

		children.appendChild(childNode);
	});

	// Closing bracket
	const closingBracket = document.createElement('div');
	closingBracket.className = 'tree-closing-bracket';
	closingBracket.textContent = ']';

	// Toggle expand/collapse
	header.onclick = () => {
		children.classList.toggle('collapsed');
		closingBracket.classList.toggle('collapsed');
		toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
	};

	node.appendChild(header);
	node.appendChild(children);
	node.appendChild(closingBracket);
}

/**
 * Deletes a property by sending clearProperty command
 * Extension host will handle the confirmation dialog
 * @param {string} entryKey - Storage entry key
 * @param {string[]} pathArray - Property path as array
 */
function deleteProperty(entryKey, pathArray) {
	const path = pathArray.join('.');

	window.vscode.postMessage({
		command: 'clearProperty',
		data: { key: entryKey, path: path }
	});
}
