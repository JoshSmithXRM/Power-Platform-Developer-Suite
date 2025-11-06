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
				handleDropdownItemClick(dropdownId, itemId);
				closeDropdown(dropdownId);
			}
		});
	});
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
		menu.style.display = 'block';
	}
}

/**
 * Closes a specific dropdown.
 */
function closeDropdown(dropdownId) {
	const menu = document.querySelector(`[data-dropdown-menu="${dropdownId}"]`);
	if (menu) {
		menu.style.display = 'none';

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
		menu.style.display = 'none';

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
