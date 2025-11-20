import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import type { TimelineViewModel, TimelineNodeViewModel } from '../viewModels/TimelineViewModel';

/**
 * Renders the timeline tab showing hierarchical execution flow.
 *
 * @param timeline - Timeline view model with hierarchy and metadata
 * @returns HTML string for timeline display
 */
export function renderTimelineTab(timeline: TimelineViewModel | null): string {
	if (!timeline || timeline.nodes.length === 0) {
		return `
			<div id="tab-timeline" class="tab-content">
				<div class="timeline-empty">
					<p>No timeline data available</p>
					<p class="timeline-empty-hint">Timeline requires traces with correlation ID</p>
				</div>
			</div>
		`;
	}

	return `
		<div id="tab-timeline" class="tab-content">
			<div class="timeline-container">
				${renderTimelineHeader(timeline)}
				${renderTimelineContent(timeline.nodes)}
				${renderTimelineLegend()}
			</div>
		</div>
	`;
}

/**
 * Renders timeline header with metadata.
 */
function renderTimelineHeader(timeline: TimelineViewModel): string {
	return `
		<div class="timel			<div class="timeline-meta">
				<span><strong>Total Duration:</strong> ${escapeHtml(timeline.totalDuration)}</span>
				<span><strong>Traces:</strong> ${timeline.traceCount}</span>
			</div>
		</div>
	`;
}

/**
 * Renders timeline content with all nodes.
 */
function renderTimelineContent(nodes: readonly TimelineNodeViewModel[]): string {
	return `
		<div class="timeline-content">
			${nodes.map(node => renderTimelineNode(node)).join('')}
		</div>
	`;
}

/**
 * Renders a single timeline node (recursive).
 */
function renderTimelineNode(node: TimelineNodeViewModel): string {
	const statusClass = node.hasException ? 'exception' : 'success';
	const depthClass = `timeline-item-depth-${Math.min(node.depth, 4)}`;
	const hasChildren = node.children.length > 0;
	const toggleIcon = hasChildren ? '▾' : '';

	return `
		<div class="timeline-item ${depthClass}" data-trace-id="${escapeHtml(node.id)}" data-depth="${node.depth}">
			<div class="timeline-item-header">
				${hasChildren ? `<span class="timeline-toggle">${toggleIcon}</span>` : '<span class="timeline-toggle-spacer"></span>'}
				<span class="timeline-item-title">${escapeHtml(node.pluginName)}</span>
				<span class="timeline-item-message">${escapeHtml(node.messageName)}</span>
				${node.entityName !== 'N/A' ? `<span class="timeline-item-entity">(${escapeHtml(node.entityName)})</span>` : ''}
			</div>
			<div class="timeline-bar-container">
				<div class="timeline-bar timeline-bar-${statusClass}"
				     style="left: ${node.offsetPercent}%; width: ${node.widthPercent}%;"
				     data-trace-id="${escapeHtml(node.id)}">
					<div class="timeline-bar-fill"></div>
				</div>
				<div class="timeline-item-metadata">
					<span class="timeline-time">${escapeHtml(node.time)}</span>
					<span class="timeline-duration">${escapeHtml(node.duration)}</span>
					<span class="timeline-mode-badge">${escapeHtml(node.mode)}</span>
					${node.hasException ? '<span class="timeline-exception-indicator" title="Exception occurred">⚠</span>' : ''}
				</div>
			</div>
			${hasChildren ? renderTimelineChildren(node.children) : ''}
		</div>
	`;
}

/**
 * Renders child timeline nodes.
 */
function renderTimelineChildren(children: readonly TimelineNodeViewModel[]): string {
	return `
		<div class="timeline-children">
			${children.map(child => renderTimelineNode(child)).join('')}
		</div>
	`;
}

/**
 * Renders timeline legend.
 */
function renderTimelineLegend(): string {
	return `
		<div class="timeline-legend">
			<div class="timeline-legend-item">
				<div class="timeline-legend-bar timeline-bar-success"></div>
				<span>Success</span>
			</div>
			<div class="timeline-legend-item">
				<div class="timeline-legend-bar timeline-bar-exception"></div>
				<span>Exception</span>
			</div>
		</div>
	`;
}
