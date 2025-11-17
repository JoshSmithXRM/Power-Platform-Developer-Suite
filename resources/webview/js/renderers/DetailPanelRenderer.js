/**
 * Detail Panel Renderer
 * Frontend rendering functions for plugin trace detail panel.
 * Receives DetailViewModel from backend and generates HTML.
 */

/**
 * HTML escape utility (same as backend)
 */
function escapeHtml(text) {
	if (text === null || text === undefined) {
		return '';
	}
	const str = String(text);
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return str.replace(/[&<>"']/g, char => map[char] || char);
}

/**
 * Renders the complete detail panel.
 *
 * @param {Object|null} trace - PluginTraceDetailViewModel or null
 * @returns {string} HTML string for detail panel
 */
function renderDetailPanel(trace) {
	if (!trace) {
		return `
			<div class="trace-detail-panel">
				<div class="trace-detail-empty">
					<p>Select a trace to view details</p>
				</div>
			</div>
		`;
	}

	return `
		<div class="trace-detail-panel">
			<div class="trace-detail-header">
				<h3>Trace Details</h3>
				<button data-command="closeDetail" title="Close detail panel">×</button>
			</div>

			<div class="trace-detail-tabs">
				<button class="tab-btn active" data-tab="overview">Overview</button>
				<button class="tab-btn" data-tab="details">Details</button>
				<button class="tab-btn" data-tab="configuration">Configuration</button>
				<button class="tab-btn" data-tab="timeline">Timeline</button>
				<button class="tab-btn" data-tab="related">Related</button>
				<button class="tab-btn" data-tab="raw">Raw Data</button>
			</div>

			<div class="trace-detail-content">
				${renderOverviewTab(trace)}
				${renderDetailsTab(trace)}
				${renderConfigurationTab(trace)}
				${renderTimelineTab(trace)}
				${renderRelatedTab(trace)}
				${renderRawDataTab(trace)}
			</div>
		</div>
	`;
}

/**
 * Renders the Overview tab content.
 */
function renderOverviewTab(trace) {
	const statusClass = trace.status.toLowerCase().includes('exception') ? 'exception' : 'success';

	return `
		<div id="tab-overview" class="tab-content active">
			<div class="detail-section">
				<div class="detail-section-title">General Information</div>
				<div class="detail-grid">
					<div class="detail-label">Status:</div>
					<div class="detail-value">
						<span class="status-indicator ${statusClass}"></span>
						${escapeHtml(trace.status)}
					</div>

					<div class="detail-label">Plugin Name:</div>
					<div class="detail-value">${escapeHtml(trace.pluginName)}</div>

					<div class="detail-label">Entity:</div>
					<div class="detail-value">${escapeHtml(trace.entityName)}</div>

					<div class="detail-label">Message:</div>
					<div class="detail-value">${escapeHtml(trace.messageName)}</div>

					<div class="detail-label">Created On:</div>
					<div class="detail-value">${escapeHtml(trace.createdOn)}</div>

					<div class="detail-label">Duration:</div>
					<div class="detail-value">${escapeHtml(trace.duration)}</div>

					<div class="detail-label">Execution Mode:</div>
					<div class="detail-value">${escapeHtml(trace.mode)}</div>

					<div class="detail-label">Operation:</div>
					<div class="detail-value">${escapeHtml(trace.operationType)}</div>
				</div>
			</div>

			${trace.exceptionDetails ? `
				<div class="detail-section">
					<div class="detail-section-title">Exception Details</div>
					<div class="detail-code exception">${escapeHtml(trace.exceptionDetails)}</div>
				</div>
			` : ''}

			${trace.messageBlock ? `
				<div class="detail-section">
					<div class="detail-section-title">Message Block</div>
					<div class="detail-code">${escapeHtml(trace.messageBlock)}</div>
				</div>
			` : ''}
		</div>
	`;
}

/**
 * Renders the Details tab content.
 */
function renderDetailsTab(trace) {
	return `
		<div id="tab-details" class="tab-content">
			<div class="detail-section">
				<div class="detail-section-title">Execution Details</div>
				<div class="detail-grid">
					<div class="detail-label">Depth:</div>
					<div class="detail-value">${escapeHtml(trace.depth)}</div>

					<div class="detail-label">Stage:</div>
					<div class="detail-value">${escapeHtml(trace.stage)}</div>

					<div class="detail-label">Constructor Duration:</div>
					<div class="detail-value">${escapeHtml(trace.constructorDuration)}</div>

					<div class="detail-label">Execution Start Time:</div>
					<div class="detail-value">${escapeHtml(trace.executionStartTime)}</div>

					<div class="detail-label">Constructor Start Time:</div>
					<div class="detail-value">${escapeHtml(trace.constructorStartTime)}</div>

					<div class="detail-label">Is System Created:</div>
					<div class="detail-value">${escapeHtml(trace.isSystemCreated)}</div>

					<div class="detail-label">Created By:</div>
					<div class="detail-value code">${trace.createdBy !== 'N/A' ? escapeHtml(trace.createdBy) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Created On Behalf By:</div>
					<div class="detail-value code">${trace.createdOnBehalfBy !== 'N/A' ? escapeHtml(trace.createdOnBehalfBy) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Correlation ID:</div>
					<div class="detail-value code">${trace.correlationId !== 'N/A' ? escapeHtml(trace.correlationId) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Request ID:</div>
					<div class="detail-value code">${trace.requestId !== 'N/A' ? escapeHtml(trace.requestId) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Plugin Step ID:</div>
					<div class="detail-value code">${trace.pluginStepId !== 'N/A' ? escapeHtml(trace.pluginStepId) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Persistence Key:</div>
					<div class="detail-value code">${trace.persistenceKey !== 'N/A' ? escapeHtml(trace.persistenceKey) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Organization ID:</div>
					<div class="detail-value code">${trace.organizationId !== 'N/A' ? escapeHtml(trace.organizationId) : '<span class="empty">N/A</span>'}</div>

					<div class="detail-label">Profile:</div>
					<div class="detail-value code">${trace.profile !== 'N/A' ? escapeHtml(trace.profile) : '<span class="empty">N/A</span>'}</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders the Configuration tab content.
 */
function renderConfigurationTab(trace) {
	return `
		<div id="tab-configuration" class="tab-content">
			<div class="detail-section">
				<div class="detail-section-title">Plugin Configuration</div>
				<div class="detail-grid">
					<div class="detail-label">Configuration:</div>
					<div class="detail-value">${trace.configuration ? escapeHtml(trace.configuration) : '<span class="empty">None</span>'}</div>

					<div class="detail-label">Secure Configuration:</div>
					<div class="detail-value">${trace.secureConfiguration ? escapeHtml(trace.secureConfiguration) : '<span class="empty">None</span>'}</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders the Timeline tab placeholder.
 */
function renderTimelineTab(trace) {
	const correlationId = trace.correlationId !== 'N/A' ? escapeHtml(trace.correlationId) : '<span class="empty">N/A</span>';
	return `
		<div id="tab-timeline" class="tab-content">
			<div class="detail-section">
				<div class="detail-section-title">Correlation ID: ${correlationId}</div>
				<div id="timelineContainer" class="timeline-container">
					<div class="timeline-loading">Loading timeline...</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders the Related Traces tab.
 */
function renderRelatedTab(trace) {
	const correlationId = trace.correlationId !== 'N/A' ? escapeHtml(trace.correlationId) : '<span class="empty">N/A</span>';
	return `
		<div id="tab-related" class="tab-content">
			<div class="detail-section">
				<div class="detail-section-title">Correlation ID: ${correlationId}</div>
				<div id="relatedTracesContainer" class="related-traces-container">
					<div class="related-traces-loading">Loading related traces...</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renders the Raw Data tab.
 */
function renderRawDataTab(trace) {
	return `
		<div id="tab-raw" class="tab-content">
			<div class="detail-section">
				<div id="rawDataDisplay" class="raw-data-display">
					<!-- JSON will be injected here by webview behavior -->
				</div>
			</div>
		</div>
	`;
}

// Make functions available globally
window.DetailPanelRenderer = {
	renderDetailPanel
};
