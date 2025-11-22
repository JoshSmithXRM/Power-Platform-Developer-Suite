/**
 * Dropdown Component
 * Handles all dropdown interactions (open/close, item selection, keyboard navigation).
 */

/**
 * Initializes all dropdowns on the page.
 * Call this from behavior initialize() function.
 */
function initializeDropdowns() {
	setupDropdownTriggers();
	setupDropdownItems();
	setupDropdownCloseOnClickOutside();
	setupDropdownKeyboardNavigation();
}

/**
 * Sets up dropdown button click handlers (toggle open/close).
 */
function setupDropdownTriggers() {
	const triggers = document.querySelectorAll('[data-dropdown-trigger]');

	triggers.forEach(trigger => {
		trigger.addEventListener('click', (e) => {
			e.stopPropagation();
			const dropdownId = trigger.getAttribute('data-dropdown-trigger');
			toggleDropdown(dropdownId);
		});
	});
}

/**
 * Sets up dropdown item click handlers (emit command, close dropdown).
 */
function setupDropdownItems() {
	const items = document.querySelectorAll('.dropdown-item');

	items.forEach(item => {
		item.addEventListener('click', (e) => {
			const disabled = item.getAttribute('data-disabled') === 'true';
			if (disabled) {
				return;
			}

			const dropdownId = item.getAttribute('data-dropdown-id');
			const itemId = item.getAttribute('data-dropdown-item-id');

			if (dropdownId && itemId) {
				// Optimistic update: Only update checkmark for state dropdowns (not action dropdowns)
				if (isStateDropdown(dropdownId)) {
					updateDropdownState(dropdownId, itemId);
				}

				handleDropdownItemClick(dropdownId, itemId);
				closeDropdown(dropdownId);
			}
		});
	});
}

/**
 * Checks if a dropdown represents state (should show checkmarks) vs actions (no checkmarks).
 * State dropdowns: Trace Level, Auto-Refresh (persist user selection)
 * Action dropdowns: Export, Delete (one-time actions)
 */
function isStateDropdown(dropdownId) {
	const stateDropdowns = ['traceLevelDropdown', 'autoRefreshDropdown'];
	return stateDropdowns.includes(dropdownId);
}

/**
 * Closes all dropdowns when clicking outside.
 */
function setupDropdownCloseOnClickOutside() {
	document.addEventListener('click', (e) => {
		// Check if click is inside any dropdown
		const isInsideDropdown = e.target.closest('.dropdown');
		if (!isInsideDropdown) {
			closeAllDropdowns();
		}
	});
}

/**
 * Sets up keyboard navigation for dropdowns (arrow keys, enter, escape).
 */
function setupDropdownKeyboardNavigation() {
	document.addEventListener('keydown', (e) => {
		const openDropdown = document.querySelector('.dropdown-menu[style*="display: block"]');
		if (!openDropdown) {
			return;
		}

		const items = Array.from(openDropdown.querySelectorAll('.dropdown-item:not(.dropdown-item--disabled)'));
		if (items.length === 0) {
			return;
		}

		const currentIndex = items.findIndex(item => item.classList.contains('dropdown-item--focused'));

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
			focusDropdownItem(items, nextIndex);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
			focusDropdownItem(items, prevIndex);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (currentIndex >= 0) {
				items[currentIndex].click();
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeAllDropdowns();
		}
	});
}

/**
 * Toggles dropdown open/close state.
 */
function toggleDropdown(dropdownId) {
	const menu = document.querySelector(`[data-dropdown-menu="${dropdownId}"]`);
	if (!menu) {
		return;
	}

	const isOpen = menu.style.display === 'block';

	if (isOpen) {
		closeDropdown(dropdownId);
	} else {
		closeAllDropdowns();
		openDropdown(dropdownId);
	}
}

/**
 * Opens a specific dropdown.
 */
function openDropdown(dropdownId) {
	const menu = document.querySelector(`[data-dropdown-menu="${dropdownId}"]`);
	if (menu) {
		menu.style.setProperty('display', 'block', 'important');
	}
}

/**
 * Closes a specific dropdown.
 */
function closeDropdown(dropdownId) {
	const menu = document.querySelector(`[data-dropdown-menu="${dropdownId}"]`);
	if (menu) {
		menu.style.setProperty('display', 'none', 'important');

		// Remove focus from items
		const items = menu.querySelectorAll('.dropdown-item--focused');
		items.forEach(item => item.classList.remove('dropdown-item--focused'));
	}
}

/**
 * Closes all open dropdowns.
 */
function closeAllDropdowns() {
	const menus = document.querySelectorAll('.dropdown-menu');
	menus.forEach(menu => {
		menu.style.setProperty('display', 'none', 'important');

		// Remove focus from items
		const items = menu.querySelectorAll('.dropdown-item--focused');
		items.forEach(item => item.classList.remove('dropdown-item--focused'));
	});
}

/**
 * Focuses a dropdown item (for keyboard navigation).
 */
function focusDropdownItem(items, index) {
	items.forEach(item => item.classList.remove('dropdown-item--focused'));
	if (items[index]) {
		items[index].classList.add('dropdown-item--focused');
		items[index].scrollIntoView({ block: 'nearest' });
	}
}

/**
 * Updates dropdown selected state without re-rendering.
 * Moves checkmark to newly selected item and updates button label.
 *
 * @param {string} dropdownId - ID of the dropdown to update
 * @param {string} selectedId - ID of the item to mark as selected
 * @example
 * updateDropdownState('traceLevelDropdown', '2'); // Selects "All" level
 */
function updateDropdownState(dropdownId, selectedId) {
	const menu = document.querySelector(`[data-dropdown-menu="${dropdownId}"]`);
	if (!menu) {
		return;
	}

	const items = menu.querySelectorAll('.dropdown-item');

	items.forEach(item => {
		const itemId = item.getAttribute('data-dropdown-item-id');
		const isSelected = itemId === selectedId;

		// Update selected class
		if (isSelected) {
			item.classList.add('dropdown-item--selected');
		} else {
			item.classList.remove('dropdown-item--selected');
		}

		// Update checkmark visibility (first child element)
		const firstChild = item.firstElementChild;
		if (firstChild) {
			if (isSelected) {
				// Replace with checkmark
				firstChild.outerHTML = '<span style="color: var(--vscode-testing-iconPassed); font-size: 16px; width: 16px; display: inline-block; text-align: center;">✓</span>';
			} else {
				// Replace with spacer
				firstChild.outerHTML = '<span class="dropdown-item-spacer"></span>';
			}
		}
	});

	// Update button label for dropdowns that show current state
	updateDropdownButtonLabel(dropdownId, selectedId);
}

/**
 * Updates the dropdown button label to show the current selection.
 * Only updates buttons for dropdowns that display state (trace level, auto-refresh).
 *
 * @param {string} dropdownId - ID of the dropdown
 * @param {string} selectedId - ID of the selected item
 */
function updateDropdownButtonLabel(dropdownId, selectedId) {
	const button = document.getElementById(dropdownId);
	if (!button) {
		return;
	}

	const labelSpan = button.querySelector('.dropdown-label');
	if (!labelSpan) {
		return;
	}

	// Define label templates for dropdowns that show state
	const labelTemplates = {
		'traceLevelDropdown': {
			'0': 'Trace Level: Off',
			'1': 'Trace Level: Exception',
			'2': 'Trace Level: All'
		},
		'autoRefreshDropdown': {
			'0': 'Auto-Refresh: Off',
			'10': 'Auto-Refresh: 10s',
			'30': 'Auto-Refresh: 30s',
			'60': 'Auto-Refresh: 60s'
		}
	};

	const templates = labelTemplates[dropdownId];
	if (templates && templates[selectedId]) {
		labelSpan.textContent = templates[selectedId];
	}
}

/**
 * Gets trace IDs from visible table rows (respects search/filter).
 * Extracts IDs from data-trace-id attributes on plugin name links.
 *
 * @returns Array of trace IDs for visible rows
 */
function getVisibleTraceIds() {
	const rows = document.querySelectorAll('tbody tr');
	const visibleTraceIds = [];

	rows.forEach(row => {
		// Check if row is visible (not hidden by search filter)
		const style = window.getComputedStyle(row);
		if (style.display !== 'none') {
			// Find the link with data-trace-id attribute (plugin name column)
			const link = row.querySelector('[data-trace-id]');
			if (link) {
				const traceId = link.getAttribute('data-trace-id');
				if (traceId) {
					visibleTraceIds.push(traceId);
				}
			}
		}
	});

	return visibleTraceIds;
}

/**
 * Handles dropdown item click - emits appropriate command based on dropdown and item.
 */
function handleDropdownItemClick(dropdownId, itemId) {
	// Map dropdown item selections to commands
	const commandMap = {
		'exportDropdown': {
			'csv': 'exportCsv',
			'json': 'exportJson'
		},
		'deleteDropdown': {
			'selected': 'deleteSelected',
			'all': 'deleteAll',
			'old': 'deleteOld'
		},
		'traceLevelDropdown': {
			'0': 'setTraceLevel',
			'1': 'setTraceLevel',
			'2': 'setTraceLevel'
		},
		'autoRefreshDropdown': {
			'0': 'setAutoRefresh',
			'10': 'setAutoRefresh',
			'30': 'setAutoRefresh',
			'60': 'setAutoRefresh'
		}
	};

	const dropdownCommands = commandMap[dropdownId];
	if (!dropdownCommands) {
		console.warn(`No command mapping for dropdown: ${dropdownId}`);
		return;
	}

	const command = dropdownCommands[itemId];
	if (!command) {
		console.warn(`No command mapping for dropdown item: ${dropdownId}:${itemId}`);
		return;
	}

	// Build command data based on dropdown type
	let data = {};

	if (dropdownId === 'traceLevelDropdown') {
		const levelMap = { '0': 'Off', '1': 'Exception', '2': 'All' };
		data = { level: levelMap[itemId] };
	} else if (dropdownId === 'autoRefreshDropdown') {
		data = { interval: parseInt(itemId, 10) };
	} else if (dropdownId === 'exportDropdown' || dropdownId === 'deleteDropdown') {
		// Get visible trace IDs from table (respects search/filter)
		data = { traceIds: getVisibleTraceIds() };
	}

	// Post message to extension
	vscode.postMessage({
		command,
		data
	});
}

// Make available globally for behaviors
window.initializeDropdowns = initializeDropdowns;
window.updateDropdownState = updateDropdownState;
