/**
 * AttributePickerModal Component
 *
 * Specialized modal for selecting entity attributes with search/filter.
 * Used by step and image forms for filtering attributes selection.
 *
 * @example
 * showAttributePickerModal({
 *   entityLogicalName: 'account',
 *   attributes: [{ logicalName: 'name', displayName: 'Account Name', attributeType: 'String' }],
 *   currentSelection: ['name', 'accountnumber'],
 *   onSubmit: (selected) => console.log('Selected:', selected)
 * });
 */

/**
 * Shows the attribute picker modal.
 *
 * @param {Object} options - Modal configuration
 * @param {string} options.entityLogicalName - Entity logical name for title
 * @param {string} options.fieldId - Field ID to update when done
 * @param {Array} options.attributes - Array of { logicalName, displayName, attributeType }
 * @param {Array} options.currentSelection - Array of currently selected logical names
 * @param {Function} options.onSubmit - Callback with selected logical names array
 * @param {Function} [options.onCancel] - Optional callback when cancelled
 * @returns {Function} Cleanup function to remove modal
 */
window.showAttributePickerModal = function(options) {
	const {
		entityLogicalName,
		fieldId,
		attributes = [],
		currentSelection = [],
		onSubmit,
		onCancel
	} = options;

	// Selection state
	const selectedSet = new Set(currentSelection.map(a => a.toLowerCase()));
	let filteredAttributes = [...attributes];
	let searchTerm = '';

	// Create overlay
	const overlay = document.createElement('div');
	overlay.className = 'form-modal-overlay';

	// Create dialog container
	const dialog = document.createElement('div');
	dialog.className = 'form-modal-container attribute-picker-modal';
	dialog.setAttribute('role', 'dialog');
	dialog.setAttribute('aria-labelledby', 'attribute-picker-title');
	dialog.setAttribute('aria-modal', 'true');
	dialog.style.width = '500px';
	dialog.style.maxWidth = '90vw';
	dialog.style.maxHeight = '80vh';
	dialog.style.display = 'flex';
	dialog.style.flexDirection = 'column';

	// Header
	const header = document.createElement('div');
	header.className = 'form-modal-header';

	const titleElement = document.createElement('h3');
	titleElement.id = 'attribute-picker-title';
	titleElement.className = 'form-modal-title';
	titleElement.textContent = `Select Attributes - ${entityLogicalName}`;

	const closeButton = document.createElement('button');
	closeButton.className = 'form-modal-close';
	closeButton.innerHTML = '&times;';
	closeButton.title = 'Close';
	closeButton.onclick = () => {
		if (onCancel) onCancel();
		removeModal();
	};

	header.appendChild(titleElement);
	header.appendChild(closeButton);

	// Toolbar (search + actions)
	const toolbar = document.createElement('div');
	toolbar.className = 'attribute-picker-toolbar';
	toolbar.style.padding = '8px 16px';
	toolbar.style.borderBottom = '1px solid var(--vscode-editorWidget-border, #333)';

	// Search box
	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.className = 'form-modal-input';
	searchInput.placeholder = 'Search attributes...';
	searchInput.style.width = '100%';
	searchInput.style.marginBottom = '8px';

	// Action buttons row
	const actionsRow = document.createElement('div');
	actionsRow.style.display = 'flex';
	actionsRow.style.justifyContent = 'space-between';
	actionsRow.style.alignItems = 'center';
	actionsRow.style.fontSize = '12px';

	const leftActions = document.createElement('div');
	leftActions.style.display = 'flex';
	leftActions.style.gap = '8px';

	const selectAllLink = document.createElement('a');
	selectAllLink.href = '#';
	selectAllLink.textContent = 'Select All';
	selectAllLink.style.color = 'var(--vscode-textLink-foreground)';
	selectAllLink.onclick = (e) => {
		e.preventDefault();
		filteredAttributes.forEach(attr => selectedSet.add(attr.logicalName.toLowerCase()));
		renderList();
		updateCounter();
	};

	const deselectAllLink = document.createElement('a');
	deselectAllLink.href = '#';
	deselectAllLink.textContent = 'Deselect All';
	deselectAllLink.style.color = 'var(--vscode-textLink-foreground)';
	deselectAllLink.onclick = (e) => {
		e.preventDefault();
		selectedSet.clear();
		renderList();
		updateCounter();
	};

	leftActions.appendChild(selectAllLink);
	leftActions.appendChild(deselectAllLink);

	const counterSpan = document.createElement('span');
	counterSpan.style.color = 'var(--vscode-descriptionForeground)';

	actionsRow.appendChild(leftActions);
	actionsRow.appendChild(counterSpan);

	toolbar.appendChild(searchInput);
	toolbar.appendChild(actionsRow);

	// List container (scrollable)
	const listContainer = document.createElement('div');
	listContainer.className = 'attribute-picker-list';
	listContainer.style.flex = '1';
	listContainer.style.overflowY = 'auto';
	listContainer.style.padding = '8px 16px';
	listContainer.style.minHeight = '200px';
	listContainer.style.maxHeight = '400px';

	// Footer with buttons
	const footer = document.createElement('div');
	footer.className = 'form-modal-footer';

	const cancelButton = document.createElement('button');
	cancelButton.type = 'button';
	cancelButton.className = 'form-modal-button form-modal-button-secondary';
	cancelButton.textContent = 'Cancel';
	cancelButton.onclick = () => {
		if (onCancel) onCancel();
		removeModal();
	};

	const submitButton = document.createElement('button');
	submitButton.type = 'button';
	submitButton.className = 'form-modal-button form-modal-button-primary';
	submitButton.textContent = 'OK';
	submitButton.onclick = () => {
		const selected = Array.from(selectedSet);
		onSubmit(selected, fieldId);
		removeModal();
	};

	footer.appendChild(cancelButton);
	footer.appendChild(submitButton);

	// Assemble dialog
	dialog.appendChild(header);
	dialog.appendChild(toolbar);
	dialog.appendChild(listContainer);
	dialog.appendChild(footer);
	overlay.appendChild(dialog);

	// Render functions
	function renderList() {
		listContainer.innerHTML = '';

		if (filteredAttributes.length === 0) {
			const emptyMessage = document.createElement('div');
			emptyMessage.style.textAlign = 'center';
			emptyMessage.style.padding = '20px';
			emptyMessage.style.color = 'var(--vscode-descriptionForeground)';
			emptyMessage.textContent = searchTerm
				? 'No attributes match your search.'
				: 'No attributes available.';
			listContainer.appendChild(emptyMessage);
			return;
		}

		filteredAttributes.forEach(attr => {
			const row = document.createElement('label');
			row.className = 'attribute-picker-item';
			row.style.display = 'flex';
			row.style.alignItems = 'center';
			row.style.padding = '4px 0';
			row.style.cursor = 'pointer';

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = selectedSet.has(attr.logicalName.toLowerCase());
			checkbox.style.marginRight = '8px';
			checkbox.onchange = () => {
				if (checkbox.checked) {
					selectedSet.add(attr.logicalName.toLowerCase());
				} else {
					selectedSet.delete(attr.logicalName.toLowerCase());
				}
				updateCounter();
			};

			const labelText = document.createElement('span');
			labelText.style.flex = '1';
			labelText.innerHTML = `<strong>${escapeHtml(attr.displayName)}</strong> <span style="color: var(--vscode-descriptionForeground)">(${escapeHtml(attr.logicalName)})</span>`;

			const typeText = document.createElement('span');
			typeText.style.fontSize = '11px';
			typeText.style.color = 'var(--vscode-descriptionForeground)';
			typeText.textContent = attr.attributeType;

			row.appendChild(checkbox);
			row.appendChild(labelText);
			row.appendChild(typeText);
			listContainer.appendChild(row);
		});
	}

	function updateCounter() {
		const total = attributes.length;
		const selected = selectedSet.size;
		counterSpan.textContent = `${selected} of ${total} selected`;
	}

	function filterAttributes() {
		const term = searchTerm.toLowerCase();
		if (!term) {
			filteredAttributes = [...attributes];
		} else {
			filteredAttributes = attributes.filter(attr =>
				attr.displayName.toLowerCase().includes(term) ||
				attr.logicalName.toLowerCase().includes(term)
			);
		}
		renderList();
	}

	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function removeModal() {
		if (overlay.parentNode) {
			overlay.parentNode.removeChild(overlay);
		}
		document.removeEventListener('keydown', handleKeyDown);
	}

	function handleKeyDown(event) {
		if (event.key === 'Escape') {
			if (onCancel) onCancel();
			removeModal();
		}
	}

	// Wire up search
	searchInput.addEventListener('input', (e) => {
		searchTerm = e.target.value;
		filterAttributes();
	});

	// Add to DOM
	document.body.appendChild(overlay);
	document.addEventListener('keydown', handleKeyDown);

	// Initial render
	renderList();
	updateCounter();

	// Focus search input
	searchInput.focus();

	return removeModal;
};
