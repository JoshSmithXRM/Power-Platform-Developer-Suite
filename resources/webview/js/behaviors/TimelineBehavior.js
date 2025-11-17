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
	// Toggle collapse/expand for child nodes
	container.querySelectorAll('.timeline-toggle').forEach(toggle => {
		toggle.addEventListener('click', (e) => {
			e.stopPropagation();
			handleToggleChildren(e.target);
		});
	});

	// Click on header to collapse/expand
	container.querySelectorAll('.timeline-item-header').forEach(header => {
		header.addEventListener('click', (e) => {
			const toggle = header.querySelector('.timeline-toggle');
			if (toggle && toggle.textContent.trim()) {
				handleToggleChildren(toggle);
			}
		});
	});

	// Click on timeline bar to select trace
	container.querySelectorAll('.timeline-bar').forEach(bar => {
		bar.addEventListener('click', (e) => {
			e.stopPropagation();
			const traceId = bar.dataset.traceId;
			if (traceId) {
				handleTraceSelection(traceId);
			}
		});
	});
}

/**
 * Handles toggling children visibility.
 * @param {HTMLElement} toggleElement - Toggle icon element
 */
function handleToggleChildren(toggleElement) {
	const timelineItem = toggleElement.closest('.timeline-item');
	if (!timelineItem) return;

	const childrenContainer = timelineItem.querySelector(':scope > .timeline-children');
	if (!childrenContainer) return;

	const isExpanded = toggleElement.textContent === '▾';

	if (isExpanded) {
		// Collapse
		childrenContainer.style.display = 'none';
		toggleElement.textContent = '▸';
	} else {
		// Expand
		childrenContainer.style.display = 'block';
		toggleElement.textContent = '▾';
	}
}

/**
 * Handles trace selection from timeline.
 * @param {string} traceId - Trace ID to select
 */
function handleTraceSelection(traceId) {
	// Send message to extension to view this trace
	vscode.postMessage({
		command: 'viewTrace',
		data: { traceId }
	});
}

/**
 * Expands all timeline items.
 * @param {string} containerId - Container ID
 */
export function expandAll(containerId = 'timelineContainer') {
	const container = document.getElementById(containerId);
	if (!container) return;

	container.querySelectorAll('.timeline-toggle').forEach(toggle => {
		const childrenContainer = toggle.closest('.timeline-item')?.querySelector(':scope > .timeline-children');
		if (childrenContainer) {
			childrenContainer.style.display = 'block';
			toggle.textContent = '▾';
		}
	});
}

/**
 * Collapses all timeline items.
 * @param {string} containerId - Container ID
 */
export function collapseAll(containerId = 'timelineContainer') {
	const container = document.getElementById(containerId);
	if (!container) return;

	container.querySelectorAll('.timeline-toggle').forEach(toggle => {
		const childrenContainer = toggle.closest('.timeline-item')?.querySelector(':scope > .timeline-children');
		if (childrenContainer) {
			childrenContainer.style.display = 'none';
			toggle.textContent = '▸';
		}
	});
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
