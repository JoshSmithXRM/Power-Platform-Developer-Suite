import type { SectionRenderData } from '../types/SectionRenderData';
import { SectionPosition } from '../types/SectionPosition';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

import type { ISection } from './ISection';

/**
 * Configuration for resizable detail panel.
 */
export interface ResizableDetailPanelConfig {
	/**
	 * Feature prefix for ID generation (e.g., 'pluginTrace', 'metadata')
	 */
	featurePrefix: string;

	/**
	 * Tab definitions for the detail panel.
	 * Each tab must have a unique id and label.
	 */
	tabs: Array<{
		id: string;
		label: string;
		isDefault?: boolean;
	}>;

	/**
	 * Optional: Custom close button aria-label.
	 * Default: 'Close detail panel'
	 */
	closeButtonLabel?: string;

	/**
	 * Optional: Custom resize handle title.
	 * Default: 'Drag to resize'
	 */
	resizeHandleTitle?: string;
}

/**
 * Base class for resizable detail panel sections.
 *
 * Implements the canonical pattern for resizable detail panels:
 * - Static structure (rendered once, never destroyed)
 * - Targeted updates (JavaScript updates inner content by ID)
 * - One-time setup (event listeners attached once)
 * - Deferred restoration (width applied after panel shown)
 * - ID selectors (explicit and reliable)
 *
 * Pattern Documentation: docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md
 *
 * Usage:
 * ```typescript
 * export class MyFeatureDetailSection extends ResizableDetailPanelSection {
 *     constructor() {
 *         super({
 *             featurePrefix: 'myFeature',
 *             tabs: [
 *                 { id: 'overview', label: 'Overview', isDefault: true },
 *                 { id: 'details', label: 'Details' }
 *             ]
 *         });
 *     }
 * }
 * ```
 *
 * JavaScript Behavior:
 * - Use `document.getElementById('{featurePrefix}DetailPanel')` to access panel
 * - Use `document.getElementById('{featurePrefix}{Tab}Content')` to update tab content
 * - Use `document.getElementById('detailPanelResizeHandle')` for resize setup
 *
 * IMPORTANT: Never use innerHTML on the panel container itself.
 * Only update inner content containers by ID.
 */
export abstract class ResizableDetailPanelSection implements ISection {
	public readonly position = SectionPosition.Detail;
	protected readonly config: ResizableDetailPanelConfig;

	/**
	 * Creates a new resizable detail panel section.
	 * @param config - Configuration for panel structure and tabs
	 */
	constructor(config: ResizableDetailPanelConfig) {
		this.validateConfig(config);
		this.config = config;
	}

	/**
	 * Renders the complete detail panel structure.
	 *
	 * Structure:
	 * - Panel container ({featurePrefix}DetailPanel)
	 *   - Resize handle (detailPanelResizeHandle) ← NEVER destroyed
	 *   - Header (title + close button)
	 *   - Tab navigation
	 *   - Tab content containers ({featurePrefix}{Tab}Content) ← Updated by JavaScript
	 *
	 * This structure is rendered ONCE and NEVER replaced.
	 * JavaScript updates inner content containers by ID.
	 */
	public render(_data: SectionRenderData): string {
		const { featurePrefix, tabs, closeButtonLabel, resizeHandleTitle } = this.config;
		const panelId = `${featurePrefix}DetailPanel`;
		const defaultTab = tabs.find(t => t.isDefault) ?? tabs[0];

		return `
			<div id="${panelId}" class="resizable-detail-panel" style="display: none;">
				<!-- Resize Handle (NEVER destroyed - listeners persist) -->
				<div
					id="detailPanelResizeHandle"
					class="detail-panel-resize-handle"
					title="${escapeHtml(resizeHandleTitle ?? 'Drag to resize')}"
				></div>

				<!-- Header (title updated by JavaScript via detailPanelTitle) -->
				<div class="detail-panel-header">
					<span id="detailPanelTitle" class="detail-panel-title">Details</span>
					<button
						id="detailPanelClose"
						class="detail-panel-close"
						data-command="closeDetail"
						aria-label="${escapeHtml(closeButtonLabel ?? 'Close detail panel')}"
					>×</button>
				</div>

				<!-- Tab Navigation -->
				<div class="detail-tab-navigation">
					${tabs.map(tab => `
						<button
							class="detail-tab-button${tab.id === defaultTab?.id ? ' active' : ''}"
							data-tab="${tab.id}"
						>${escapeHtml(tab.label)}</button>
					`).join('')}
				</div>

				<!-- Tab Content Containers (updated by JavaScript via {featurePrefix}{Tab}Content) -->
				<div class="detail-content">
					${tabs.map(tab => `
						<div
							id="${featurePrefix}${this.capitalize(tab.id)}Content"
							class="detail-tab-panel${tab.id === defaultTab?.id ? ' active' : ''}"
							data-tab="${tab.id}"
							data-selection-zone="detail-${tab.id}"
						></div>
					`).join('')}
				</div>
			</div>
		`;
	}

	/**
	 * Validates configuration at construction time.
	 * Throws descriptive errors for invalid config.
	 */
	private validateConfig(config: ResizableDetailPanelConfig): void {
		if (!config.featurePrefix || config.featurePrefix.trim() === '') {
			throw new Error('Invalid ResizableDetailPanelSection config: featurePrefix cannot be empty');
		}

		if (!config.tabs || config.tabs.length === 0) {
			throw new Error('Invalid ResizableDetailPanelSection config: at least one tab is required');
		}

		// Validate each tab
		for (const tab of config.tabs) {
			if (!tab.id || tab.id.trim() === '') {
				throw new Error('Invalid ResizableDetailPanelSection config: tab id cannot be empty');
			}
			if (!tab.label || tab.label.trim() === '') {
				throw new Error('Invalid ResizableDetailPanelSection config: tab label cannot be empty');
			}
		}

		// Check for duplicate tab IDs
		const tabIds = config.tabs.map(t => t.id);
		const duplicates = tabIds.filter((id, index) => tabIds.indexOf(id) !== index);
		if (duplicates.length > 0) {
			throw new Error(`Invalid ResizableDetailPanelSection config: duplicate tab id "${duplicates[0]}"`);
		}

		// Check for multiple default tabs
		const defaultTabs = config.tabs.filter(t => t.isDefault);
		if (defaultTabs.length > 1) {
			throw new Error('Invalid ResizableDetailPanelSection config: only one tab can be marked as default');
		}
	}

	/**
	 * Capitalizes first letter of string (for ID generation).
	 * Example: 'overview' -> 'Overview'
	 */
	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

}
