/**
 * Resizable Detail Panel Behavior (Shared)
 * Reusable behavior for right-side resizable detail panels.
 *
 * Architecture:
 * - Static structure rendered once by TypeScript section
 * - Resize handle NEVER destroyed (listeners attached once, persist forever)
 * - Content updated via targeted getElementById (fast, explicit, reliable)
 * - One-time setup guarded by flag
 *
 * Usage:
 * ```javascript
 * window.createBehavior({
 *     initialize() {
 *         this.detailPanel = new ResizableDetailPanelBehavior({
 *             featurePrefix: 'myFeature',
 *             renderTabs: {
 *                 overview: (data) => this.renderOverview(data),
 *                 raw: (data) => this.renderRawData(data)
 *             }
 *         });
 *         this.detailPanel.initialize();
 *     },
 *     handleMessage(message) {
 *         this.detailPanel.handleMessage(message);
 *     }
 * });
 * ```
 *
 * See: docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md
 */

export class ResizableDetailPanelBehavior {
	/**
	 * Creates a new detail panel behavior.
	 *
	 * @param {Object} config - Configuration
	 * @param {string} config.featurePrefix - Feature prefix for IDs (e.g., "pluginTrace")
	 * @param {Object} config.renderTabs - Tab rendering functions { tabId: (data) => htmlString }
	 * @param {Function} [config.onShow] - Optional callback when panel shown
	 * @param {Function} [config.onHide] - Optional callback when panel hidden
	 * @param {number} [config.minWidth=300] - Minimum panel width in pixels
	 * @param {number} [config.maxWidthRatio=0.8] - Maximum panel width as ratio of window width
	 */
	constructor(config) {
		this.config = config;
		this.resizeSetup = false;

		// Validate config
		if (!config.featurePrefix) {
			throw new Error('ResizableDetailPanelBehavior: featurePrefix is required');
		}
		if (!config.renderTabs || typeof config.renderTabs !== 'object') {
			throw new Error('ResizableDetailPanelBehavior: renderTabs is required');
		}

		// Default constraints
		this.minWidth = config.minWidth || 300;
		this.maxWidthRatio = config.maxWidthRatio || 0.8;
	}

	/**
	 * Initializes the detail panel behavior.
	 * Attaches event listeners to static elements.
	 * Called ONCE during webview initialization.
	 */
	initialize() {
		this.setupCloseButton();
		this.setupTabButtons();
	}

	/**
	 * Handles messages from extension host.
	 *
	 * @param {Object} message - Message from backend
	 */
	handleMessage(message) {
		switch (message.command) {
			case 'showDetailPanel':
				this.show(message.data);
				break;
			case 'hideDetailPanel':
				this.hide();
				break;
			case 'restoreDetailPanelWidth':
				this.restoreWidth(message.data.width);
				break;
		}
	}

	/**
	 * Shows detail panel with data.
	 * Updates content areas without destroying structure or listeners.
	 *
	 * @param {Object} data - Detail data (title, tab data)
	 */
	show(data) {
		const panel = this.getPanel();
		if (!panel) {
			console.error(`[${this.config.featurePrefix}] Detail panel element not found`);
			return;
		}

		// Update title
		this.updateTitle(data.title || 'Details');

		// Update all tab contents
		for (const [tabId, renderFn] of Object.entries(this.config.renderTabs)) {
			const contentId = this.getContentId(tabId);
			const contentElement = document.getElementById(contentId);

			if (!contentElement) {
				console.warn(`[${this.config.featurePrefix}] Content element not found: ${contentId}`);
				continue;
			}

			// Render tab content
			const tabData = data[tabId];
			if (tabData !== undefined) {
				const html = renderFn(tabData);
				contentElement.innerHTML = html;
			}
		}

		// Show panel
		panel.style.display = 'flex';

		// Setup resize handle (ONLY ONCE)
		this.setupResizeIfNeeded();

		// Switch to default tab
		this.switchToDefaultTab();

		// Trigger callback
		if (this.config.onShow) {
			this.config.onShow(data);
		}
	}

	/**
	 * Hides detail panel.
	 * NO cleanup needed - listeners remain attached, ready for next show.
	 */
	hide() {
		const panel = this.getPanel();
		if (panel) {
			panel.style.display = 'none';
		}

		// Trigger callback
		if (this.config.onHide) {
			this.config.onHide();
		}
	}

	/**
	 * Restores panel width from persisted state.
	 * Called by backend after panel shown.
	 *
	 * @param {number} width - Panel width in pixels
	 */
	restoreWidth(width) {
		if (!width) {
			return;
		}

		const panel = this.getPanel();
		if (!panel) {
			return;
		}

		panel.style.width = `${width}px`;
		console.log(`[${this.config.featurePrefix}] Restored detail panel width:`, width);
	}

	/**
	 * Updates panel title.
	 *
	 * @param {string} title - New title text
	 */
	updateTitle(title) {
		const titleElement = document.getElementById('detailPanelTitle');
		if (titleElement) {
			titleElement.textContent = title;
		}
	}

	/**
	 * Switches to a specific tab.
	 *
	 * @param {string} tabId - Tab ID to switch to
	 */
	switchTab(tabId) {
		// Update tab button states
		document.querySelectorAll('.detail-tab-button').forEach((btn) => {
			if (btn.dataset.detailTab === tabId) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Update tab panel visibility
		document.querySelectorAll('.detail-tab-panel').forEach((panel) => {
			if (panel.dataset.detailPanel === tabId) {
				panel.classList.add('active');
				panel.style.display = 'block';
			} else {
				panel.classList.remove('active');
				panel.style.display = 'none';
			}
		});
	}

	/**
	 * Switches to default (first) tab.
	 */
	switchToDefaultTab() {
		const firstTab = Object.keys(this.config.renderTabs)[0];
		if (firstTab) {
			this.switchTab(firstTab);
		}
	}

	/**
	 * Sets up close button click handler.
	 * Called once during initialize().
	 */
	setupCloseButton() {
		const closeButton = document.getElementById('detailPanelClose');
		if (closeButton) {
			closeButton.addEventListener('click', () => {
				this.hide();

				// Notify backend
				window.vscode.postMessage({
					command: 'closeDetailPanel',
				});
			});
		}
	}

	/**
	 * Sets up tab button click handlers.
	 * Called once during initialize().
	 */
	setupTabButtons() {
		document.querySelectorAll('.detail-tab-button').forEach((button) => {
			button.addEventListener('click', () => {
				const tabId = button.dataset.detailTab;
				this.switchTab(tabId);
			});
		});
	}

	/**
	 * Sets up resize functionality if not already setup.
	 * Guarded by flag to ensure one-time setup.
	 */
	setupResizeIfNeeded() {
		if (this.resizeSetup) {
			return;
		}

		const handle = document.getElementById('detailPanelResizeHandle');
		if (!handle) {
			console.warn(`[${this.config.featurePrefix}] Resize handle not found`);
			return;
		}

		this.setupResize(handle);
		this.resizeSetup = true;
	}

	/**
	 * Sets up resize functionality.
	 * Attaches event listeners to handle element.
	 *
	 * CRITICAL: Handle element must NEVER be destroyed/recreated.
	 * If handle is replaced, listeners are lost and resize breaks.
	 *
	 * @param {HTMLElement} handle - Resize handle element
	 */
	setupResize(handle) {
		const panel = this.getPanel();
		if (!panel) {
			console.error(`[${this.config.featurePrefix}] Cannot setup resize - panel not found`);
			return;
		}

		let isResizing = false;
		let startX = 0;
		let startWidth = 0;

		handle.addEventListener('mousedown', (e) => {
			isResizing = true;
			startX = e.clientX;
			startWidth = panel.offsetWidth;
			handle.classList.add('resizing');
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			e.preventDefault();
		});

		document.addEventListener('mousemove', (e) => {
			if (!isResizing) {
				return;
			}

			// Calculate new width (drag left = wider, drag right = narrower)
			const deltaX = startX - e.clientX;
			const maxWidth = window.innerWidth * this.maxWidthRatio;
			const newWidth = Math.max(this.minWidth, Math.min(maxWidth, startWidth + deltaX));

			panel.style.width = `${newWidth}px`;
			e.preventDefault();
		});

		document.addEventListener('mouseup', () => {
			if (!isResizing) {
				return;
			}

			isResizing = false;
			handle.classList.remove('resizing');
			document.body.style.cursor = '';
			document.body.style.userSelect = '';

			// Persist width preference via backend
			const currentWidth = panel.offsetWidth;
			window.vscode.postMessage({
				command: 'saveDetailPanelWidth',
				data: { width: currentWidth },
			});
		});

		console.log(`[${this.config.featurePrefix}] Detail panel resize setup complete`);
	}

	/**
	 * Gets panel container element.
	 *
	 * @returns {HTMLElement|null} Panel element
	 */
	getPanel() {
		const panelId = `${this.config.featurePrefix}DetailPanel`;
		return document.getElementById(panelId);
	}

	/**
	 * Gets content area ID for a tab.
	 * Convention: {featurePrefix}{TabId}Content
	 *
	 * @param {string} tabId - Tab ID
	 * @returns {string} Content element ID
	 */
	getContentId(tabId) {
		const capitalizedTabId = tabId.charAt(0).toUpperCase() + tabId.slice(1);
		return `${this.config.featurePrefix}${capitalizedTabId}Content`;
	}
}

/**
 * Escapes HTML to prevent XSS.
 * Exported for use in rendering functions.
 *
 * @param {*} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
	if (text === null || text === undefined) {
		return '';
	}
	const div = document.createElement('div');
	div.textContent = String(text);
	return div.innerHTML;
}
