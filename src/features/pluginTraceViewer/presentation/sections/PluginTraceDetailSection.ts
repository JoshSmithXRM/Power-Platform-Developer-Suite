import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Section for plugin trace detail panel (split panel right side).
 *
 * Data-driven architecture:
 * - Server renders empty container only
 * - Client-side PluginTraceViewerBehavior.js handles ALL rendering (including empty state)
 * - Extension host sends ViewModel data via postMessage('updateDetailPanel')
 */
export class PluginTraceDetailSection implements ISection {
	public readonly position = SectionPosition.Detail;

	/**
	 * Renders empty detail section container.
	 * All content (including empty state) is rendered client-side by DetailPanelRenderer.js
	 */
	public render(_data: SectionRenderData): string {
		return '<div class="detail-section"></div>';
	}
}
