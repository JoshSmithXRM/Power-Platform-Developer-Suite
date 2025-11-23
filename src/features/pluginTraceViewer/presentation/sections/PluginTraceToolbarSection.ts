import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { renderPluginTraceToolbar } from '../views/pluginTraceToolbarView';

/**
 * Section for plugin trace toolbar (trace level controls)
 */
export class PluginTraceToolbarSection implements ISection {
	public readonly position = SectionPosition.Header;

	private traceLevel = 'Loading...';

	/**
	 * Updates the current trace level display
	 */
	public setTraceLevel(level: string): void {
		this.traceLevel = level;
	}

	/**
	 * Renders the toolbar section
	 * All behavior is handled by PluginTraceViewerBehavior.js
	 */
	public render(_data: SectionRenderData): string {
		return renderPluginTraceToolbar(this.traceLevel);
	}
}
