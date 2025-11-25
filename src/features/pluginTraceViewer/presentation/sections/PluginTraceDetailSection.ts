import type { ResizableDetailPanelConfig } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';
import { ResizableDetailPanelSection } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';

/**
 * Section for plugin trace detail panel (resizable right panel).
 *
 * Architecture:
 * - Extends ResizableDetailPanelSection for canonical pattern
 * - Renders static structure ONCE (resize handle NEVER destroyed)
 * - Client-side PluginTraceViewerBehavior.js updates content by ID
 * - Width persistence handled via IPanelStateRepository
 *
 * Pattern: docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md
 * Migration: docs/technical-debt/PLUGIN_TRACES_DETAIL_PANEL_MIGRATION.md
 */
export class PluginTraceDetailSection extends ResizableDetailPanelSection {
	constructor() {
		const config: ResizableDetailPanelConfig = {
			featurePrefix: 'pluginTrace',
			tabs: [
				{ id: 'overview', label: 'Overview', isDefault: true },
				{ id: 'details', label: 'Details' },
				{ id: 'timeline', label: 'Timeline' },
				{ id: 'raw', label: 'Raw Data' }
			],
			closeButtonLabel: 'Close detail panel',
			resizeHandleTitle: 'Drag to resize'
		};
		super(config);
	}
}
