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
	 * Uses CAPTURE phase (true) for keydown to intercept before other handlers.
	 */
	function initialize() {
		// CRITICAL: Use capture phase to run BEFORE other handlers
		document.addEventListener('keydown', handleKeydown, true);
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
	 * Checks if an element is directly owned by this zone (not in a nested zone).
	 * @param {Element} element - The element to check
	 * @param {Element} zone - The zone that should own the element
	 * @returns {boolean} True if element belongs directly to this zone
	 */
	function isDirectlyInZone(element, zone) {
		// Find the element's closest zone
		const elementZone = element.closest('[data-selection-zone]');
		// It's directly in our zone if its closest zone IS our zone
		return elementZone === zone;
	}

	/**
	 * Selects content within the given zone based on element type.
	 * Only selects elements that are DIRECTLY in this zone (not in nested zones).
	 * @param {Element} zone - The zone element
	 */
	function selectZoneContent(zone) {
		// Check for textarea first (only if directly in this zone)
		const textarea = zone.querySelector('textarea');
		if (textarea && isDirectlyInZone(textarea, zone)) {
			textarea.focus();
			textarea.select();
			return;
		}

		// Check for text/search input (only if directly in this zone)
		const input = zone.querySelector('input[type="text"], input[type="search"], input:not([type])');
		if (input && input instanceof HTMLInputElement && isDirectlyInZone(input, zone)) {
			input.focus();
			input.select();
			return;
		}

		// Check for pre/code element (only if directly in this zone)
		const pre = zone.querySelector('pre');
		if (pre && isDirectlyInZone(pre, zone)) {
			selectNodeContents(pre);
			return;
		}

		// Check for DATA table (with .data-table class) or virtual table - only if directly in this zone
		// Layout tables (without .data-table) should fall through to text selection
		const dataTable = zone.querySelector('table.data-table, .virtual-table-container, #virtualTableBody');
		if (dataTable && isDirectlyInZone(dataTable, zone)) {
			// Pass the specific table element to select rows in THIS table, not first in document
			const handled = selectAllTableRows(dataTable);
			if (handled) {
				updateFooter();
				return;
			}
		}

		// Fallback: select entire zone content (for detail panels)
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
	 * @param {Element} tableElement - The specific table element to select rows in
	 * @returns {boolean} True if selection was handled
	 */
	function selectAllTableRows(tableElement) {
		// Try VirtualTableRenderer first (most common)
		if (window.VirtualTableRenderer?.selectAllRows) {
			window.VirtualTableRenderer.selectAllRows();
			return true;
		}

		// Fall back to DataTableBehavior for non-virtual tables
		// Pass the specific table element so it selects THIS table, not first in document
		if (window.DataTableBehavior?.selectAllRows) {
			window.DataTableBehavior.selectAllRows(tableElement);
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
		if (isCtrl && (e.key === 'a' || e.key === 'A')) {
			// CRITICAL: Stop ALL event handling - browser AND VS Code webview
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			window.getSelection()?.removeAllRanges();

			// Find the active zone
			const zone = findActiveZone();

			// No zone = no selection (safe default)
			if (!zone) {
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

		navigator.clipboard
			.writeText(data)
			.catch(err => {
				console.error('KeyboardSelectionBehavior: Failed to copy to clipboard', err);
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
