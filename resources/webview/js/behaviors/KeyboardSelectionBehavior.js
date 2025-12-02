/**
 * Keyboard Selection Behavior - Zone-Based Architecture
 *
 * Handles keyboard shortcuts for context-aware selection:
 * - Ctrl+A: Select all within the active zone only (prevents cross-zone selection)
 * - Ctrl+C: Copy selected rows to clipboard as TSV
 * - Escape: Clear selection
 *
 * Zone Architecture:
 * - Elements with [data-selection-zone] define selection boundaries
 * - Zones can be nested; closest zone to click/focus wins
 * - Selection never crosses zone boundaries
 *
 * Works with both regular tables (DataTableBehavior) and virtual tables (VirtualTableRenderer).
 */

(function () {
	// Track the last clicked zone element (not string context)
	let lastClickedZone = null;

	/**
	 * Initializes keyboard event handlers and click tracking.
	 */
	function initialize() {
		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('click', trackClickedZone, true);
	}

	/**
	 * Tracks the zone where user clicked.
	 * This helps determine what Ctrl+A should do even when activeElement is body.
	 * @param {MouseEvent} e - The click event
	 */
	function trackClickedZone(e) {
		const target = /** @type {Element} */ (e.target);
		const zone = target.closest('[data-selection-zone]');
		lastClickedZone = zone;
	}

	/**
	 * Finds the active selection zone.
	 * Priority: 1) activeElement's zone, 2) last clicked zone, 3) null
	 * @returns {Element|null} The active zone or null
	 */
	function findActiveZone() {
		// Priority 1: activeElement's closest zone
		const activeEl = document.activeElement;
		if (activeEl && activeEl !== document.body) {
			const zone = activeEl.closest('[data-selection-zone]');
			if (zone) return zone;
		}

		// Priority 2: Last clicked zone
		if (lastClickedZone && document.body.contains(lastClickedZone)) {
			return lastClickedZone;
		}

		// Priority 3: No zone = no selection
		return null;
	}

	/**
	 * Selects content within the given zone based on element type.
	 * @param {Element} zone - The zone element
	 */
	function selectZoneContent(zone) {
		const zoneName = zone.getAttribute('data-selection-zone');
		console.log('[KeyboardSelection] selectZoneContent for zone:', zoneName);

		// Check for textarea first
		const textarea = zone.querySelector('textarea');
		if (textarea) {
			console.log('[KeyboardSelection] Found textarea, selecting');
			textarea.focus();
			textarea.select();
			return;
		}

		// Check for text/search input
		const input = zone.querySelector('input[type="text"], input[type="search"], input:not([type])');
		if (input && input instanceof HTMLInputElement) {
			console.log('[KeyboardSelection] Found input, selecting');
			input.focus();
			input.select();
			return;
		}

		// Check for pre/code element
		const pre = zone.querySelector('pre');
		if (pre) {
			console.log('[KeyboardSelection] Found pre element, selecting contents');
			selectNodeContents(pre);
			return;
		}

		// Check for table (virtual or regular)
		const table = zone.querySelector('table, .virtual-table-container, #virtualTableBody');
		if (table) {
			console.log('[KeyboardSelection] Found table, selecting rows');
			const handled = selectAllTableRows();
			if (handled) {
				updateFooter();
				return;
			}
		}

		// Fallback: select entire zone content (for detail panels)
		console.log('[KeyboardSelection] Fallback: selecting entire zone content');
		selectNodeContents(zone);
	}

	/**
	 * Selects all text content within a node.
	 * @param {Element} element - The element to select
	 */
	function selectNodeContents(element) {
		const selection = window.getSelection();
		if (!selection) return;

		const range = document.createRange();
		range.selectNodeContents(element);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	/**
	 * Selects all rows in the table.
	 * Delegates to VirtualTableRenderer or DataTableBehavior based on table type.
	 * @returns {boolean} True if selection was handled
	 */
	function selectAllTableRows() {
		// Try VirtualTableRenderer first (most common)
		if (window.VirtualTableRenderer?.selectAllRows) {
			window.VirtualTableRenderer.selectAllRows();
			return true;
		}

		// Fall back to DataTableBehavior for non-virtual tables
		if (window.DataTableBehavior?.selectAllRows) {
			window.DataTableBehavior.selectAllRows();
			return true;
		}

		return false;
	}

	/**
	 * Handles keydown events for selection shortcuts.
	 * @param {KeyboardEvent} e - The keyboard event
	 */
	function handleKeydown(e) {
		const isCtrl = e.ctrlKey || e.metaKey;

		// Ctrl+A: Zone-aware select all
		if (isCtrl && e.key === 'a') {
			// ALWAYS prevent browser default FIRST (critical fix)
			e.preventDefault();
			window.getSelection()?.removeAllRanges();

			// DEBUG: Log ALL zones in document
			const allZones = document.querySelectorAll('[data-selection-zone]');
			console.log('[KeyboardSelection] === Ctrl+A Debug ===');
			console.log('[KeyboardSelection] All zones in document:', allZones.length);
			allZones.forEach((z, i) => {
				console.log(`[KeyboardSelection]   Zone ${i}: ${z.getAttribute('data-selection-zone')} (${z.tagName}.${z.className})`);
			});
			console.log('[KeyboardSelection] activeElement:', document.activeElement?.tagName, document.activeElement?.id || document.activeElement?.className);
			console.log('[KeyboardSelection] lastClickedZone:', lastClickedZone?.getAttribute('data-selection-zone'), lastClickedZone?.tagName);

			// Find the active zone
			const zone = findActiveZone();
			console.log('[KeyboardSelection] Found zone:', zone?.getAttribute('data-selection-zone'));

			// No zone = no selection (safe default)
			if (!zone) {
				console.log('[KeyboardSelection] No zone found, doing nothing');
				return;
			}

			// Select content within the zone only
			selectZoneContent(zone);
			return;
		}

		// Ctrl+C: Copy selection to clipboard (table rows take priority)
		if (isCtrl && e.key === 'c') {
			if (hasTableSelection()) {
				e.preventDefault();
				copyToClipboard();
			}
			// Otherwise let browser handle (will copy any text selection)
		}

		// Escape: Clear selection
		if (e.key === 'Escape') {
			clearSelection();
		}
	}

	/**
	 * Checks if any table rows are currently selected.
	 * @returns {boolean} True if table selection exists
	 */
	function hasTableSelection() {
		const virtualCount = window.VirtualTableRenderer?.getSelectionCount?.() || 0;
		const dataTableCount = window.DataTableBehavior?.getSelectionCount?.() || 0;
		return virtualCount > 0 || dataTableCount > 0;
	}

	/**
	 * Clears all row selections.
	 */
	function clearSelection() {
		window.VirtualTableRenderer?.clearSelection?.();
		window.DataTableBehavior?.clearSelection?.();
		window.getSelection()?.removeAllRanges();
		updateFooter();
	}

	/**
	 * Copies selected rows to clipboard as TSV (tab-separated values).
	 * TSV format is compatible with Excel/Google Sheets paste.
	 */
	function copyToClipboard() {
		// Get TSV data from the appropriate renderer
		const data =
			window.VirtualTableRenderer?.getSelectedDataAsTsv?.() ||
			window.DataTableBehavior?.getSelectedDataAsTsv?.();

		if (!data) {
			return;
		}

		const count =
			window.VirtualTableRenderer?.getSelectionCount?.() ||
			window.DataTableBehavior?.getSelectionCount?.() ||
			0;

		navigator.clipboard
			.writeText(data)
			.then(() => {
				// Notify extension for VS Code toast
				if (typeof vscode !== 'undefined') {
					vscode.postMessage({
						command: 'copySuccess',
						data: { count }
					});
				}
			})
			.catch(err => {
				console.error('KeyboardSelectionBehavior: Failed to copy to clipboard', err);
				// Notify extension of error
				if (typeof vscode !== 'undefined') {
					vscode.postMessage({
						command: 'copyError',
						data: { message: 'Failed to copy to clipboard' }
					});
				}
			});
	}

	/**
	 * Updates the footer to show selection count.
	 */
	function updateFooter() {
		const count =
			window.VirtualTableRenderer?.getSelectionCount?.() ||
			window.DataTableBehavior?.getSelectionCount?.() ||
			0;

		const footer = document.querySelector('.table-footer');
		if (!footer) {
			return;
		}

		// Remove existing selection badge
		let badge = footer.querySelector('.selection-badge');

		if (count > 0) {
			if (!badge) {
				badge = document.createElement('span');
				badge.className = 'selection-badge';
				footer.appendChild(badge);
			}
			badge.textContent = ` | ${count} selected`;
		} else if (badge) {
			badge.remove();
		}
	}

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();
