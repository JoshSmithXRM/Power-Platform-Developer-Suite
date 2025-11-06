import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

/**
 * Renders the plugin trace toolbar section with trace level controls
 */
export function renderPluginTraceToolbar(traceLevel: string): string {
	const escapedLevel = escapeHtml(traceLevel);

	return `
		<div class="trace-level-section">
			<div>
				<span class="trace-level-label">Current Trace Level: </span>
				<span class="trace-level-value" id="currentTraceLevel">${escapedLevel}</span>
			</div>
			<button class="trace-level-btn" id="changeLevelBtn" data-command="changeTraceLevel">
				Change Level
			</button>
		</div>
	`;
}
