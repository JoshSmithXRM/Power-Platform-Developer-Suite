/**
 * Timeline Behavior
 * Handles timeline rendering and interactions in the webview.
 */

/**
 * Renders timeline from view model data.
 * @param {Object} timelineData - Timeline view model with nodes and metadata
 * @param {string} containerId - ID of container element
 */
export function renderTimeline(timelineData, containerId = 'timelineContainer') {
	const container = document.getElementById(containerId);
	if (!container) {
		console.warn('[TimelineBehavior] Container not found:', containerId);
		return;
	}

	// Import timeline view rendering
	const timelineHtml = window.renderTimelineFromData(timelineData);
	container.innerHTML = timelineHtml;

	// Attach event listeners after rendering
	attachTimelineEventListeners(container);
}

/**
 * Attaches event listeners to timeline elements.
 * @param {HTMLElement} container - Timeline container
 */
function attachTimelineEventListeners(container) {
	// No event listeners needed - timeline items are clickable via setupTimelineClickHandlers in PluginTraceViewerBehavior
	// All timeline nodes are always visible (no collapse/expand functionality)
}

/**
 * Highlights a specific trace in the timeline.
 * @param {string} traceId - Trace ID to highlight
 * @param {string} containerId - Container ID
 */
export function highlightTrace(traceId, containerId = 'timelineContainer') {
	const container = document.getElementById(containerId);
	if (!container) return;

	// Remove existing highlights
	container.querySelectorAll('.timeline-item-highlighted').forEach(item => {
		item.classList.remove('timeline-item-highlighted');
	});

	// Find and highlight the trace
	const traceItem = container.querySelector(`.timeline-item[data-trace-id="${traceId}"]`);
	if (traceItem) {
		traceItem.classList.add('timeline-item-highlighted');
		traceItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
}
