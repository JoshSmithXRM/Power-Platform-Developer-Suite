import type { ResizableDetailPanelConfig } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';
import { ResizableDetailPanelSection } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';

/**
 * Section for metadata browser detail panel (resizable right panel).
 *
 * Architecture:
 * - Extends ResizableDetailPanelSection for canonical pattern
 * - Renders static structure ONCE (resize handle NEVER destroyed)
 * - Client-side MetadataBrowserBehavior.js updates content by ID
 * - Width persistence handled via IPanelStateRepository
 *
 * Pattern: docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md
 */
export class MetadataBrowserDetailSection extends ResizableDetailPanelSection {
	constructor() {
		const config: ResizableDetailPanelConfig = {
			featurePrefix: 'metadata',
			tabs: [
				{ id: 'properties', label: 'Properties', isDefault: true },
				{ id: 'rawData', label: 'Raw Data' }
			],
			closeButtonLabel: 'Close detail panel',
			resizeHandleTitle: 'Drag to resize'
		};
		super(config);
	}
}
