import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { renderPluginTraceDetail } from '../views/pluginTraceDetailView';
import type { PluginTraceDetailViewModel } from '../../application/viewModels/PluginTraceViewModel';

/**
 * Section for plugin trace detail panel (split panel right side)
 */
export class PluginTraceDetailSection implements ISection {
	public readonly position = SectionPosition.Detail;

	private currentTrace: PluginTraceDetailViewModel | null = null;

	/**
	 * Sets the current trace to display
	 */
	public setTrace(trace: PluginTraceDetailViewModel | null): void {
		this.currentTrace = trace;
	}

	/**
	 * Gets the current trace
	 */
	public getTrace(): PluginTraceDetailViewModel | null {
		return this.currentTrace;
	}

	/**
	 * Renders the detail section
	 * All behavior is handled by PluginTraceViewerBehavior.js
	 */
	public render(_data: SectionRenderData): string {
		return renderPluginTraceDetail(this.currentTrace);
	}
}
