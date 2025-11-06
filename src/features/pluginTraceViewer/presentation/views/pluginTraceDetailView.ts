import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import type { PluginTraceDetailViewModel } from '../../application/viewModels/PluginTraceViewModel';

/**
 * Renders the detail panel for a selected plugin trace
 */
export function renderPluginTraceDetail(trace: PluginTraceDetailViewModel | null): string {
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
			</div>

			<div class="trace-detail-content">
				${renderOverviewTab(trace)}
				${renderDetailsTab(trace)}
				${renderConfigurationTab(trace)}
			</div>
		</div>
	`;
}

function renderOverviewTab(trace: PluginTraceDetailViewModel): string {
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

function renderDetailsTab(trace: PluginTraceDetailViewModel): string {
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

function renderConfigurationTab(trace: PluginTraceDetailViewModel): string {
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
 * Renders a list of related traces
 */
export function renderRelatedTracesList(traces: PluginTraceDetailViewModel[], currentTraceId: string): string {
	if (traces.length === 0) {
		return `
			<div class="related-traces-empty">
				No related traces found
			</div>
		`;
	}

	return traces.map(trace => {
		const isCurrent = trace.id === currentTraceId;
		const statusClass = trace.status.toLowerCase().includes('exception') ? 'exception' : 'success';

		return `
			<div class="related-trace-item ${isCurrent ? 'current' : ''}"
			     data-command="viewTrace"
			     data-trace-id="${escapeHtml(trace.id)}">
				<div class="related-trace-title">
					<span class="status-indicator ${statusClass}"></span>
					${escapeHtml(trace.pluginName)}
				</div>
				<div class="related-trace-meta">
					<span>${escapeHtml(trace.messageName)}</span>
					<span>Depth: ${escapeHtml(trace.depth)}</span>
					<span>${escapeHtml(trace.duration)}</span>
				</div>
			</div>
		`;
	}).join('');
}
