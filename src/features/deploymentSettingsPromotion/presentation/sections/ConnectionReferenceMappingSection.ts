/**
 * ConnectionReferenceMappingSection - Renders the connection references mapping table.
 *
 * Shows a two-column layout:
 * - Left: Source connection reference info (read-only)
 * - Right: Target connection selection (dropdown or manual input)
 */

import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import type {
	ConnectionReferenceMappingViewModel,
	ConnectionReferenceMappingSummary
} from '../viewModels/ConnectionReferenceMappingViewModel';
import { calculateMappingSummary } from '../viewModels/ConnectionReferenceMappingViewModel';

/**
 * Extended render data for connection reference mappings.
 */
export interface ConnectionReferenceMappingData {
	/** Array of connection reference mappings to display */
	readonly connectionReferenceMappings?: readonly ConnectionReferenceMappingViewModel[];
}

/**
 * Section that renders the connection references mapping table.
 */
export class ConnectionReferenceMappingSection implements ISection {
	public readonly position = SectionPosition.Main;

	public render(data: SectionRenderData): string {
		const mappingData = data.customData as ConnectionReferenceMappingData | undefined;
		const mappings = mappingData?.connectionReferenceMappings;

		if (!mappings || mappings.length === 0) {
			return '';
		}

		const summary = calculateMappingSummary(mappings);

		return `
			<div class="mapping-section">
				<div class="mapping-header">
					<h3>Connection References</h3>
					<span class="mapping-summary">${this.renderSummary(summary)}</span>
				</div>
				<div class="mapping-table-container">
					<table class="mapping-table">
						<thead>
							<tr>
								<th class="col-source">Source (Connection Reference)</th>
								<th class="col-target">Target (Connection)</th>
							</tr>
						</thead>
						<tbody>
							${mappings.map((m, index) => this.renderRow(m, index)).join('')}
						</tbody>
					</table>
				</div>
			</div>
		`;
	}

	private renderSummary(summary: ConnectionReferenceMappingSummary): string {
		if (summary.needsAttention === 0) {
			return `<span class="summary-ok">${summary.configured} of ${summary.total} configured</span>`;
		}
		return `<span class="summary-warning">${summary.configured} of ${summary.total} configured, ${summary.needsAttention} needs attention</span>`;
	}

	private renderRow(mapping: ConnectionReferenceMappingViewModel, index: number): string {
		const statusIcon = this.getStatusIcon(mapping);
		const statusClass = this.getStatusClass(mapping);

		return `
			<tr class="mapping-row ${statusClass}" data-index="${index}">
				<td class="col-source">
					<div class="source-info">
						<span class="status-icon">${statusIcon}</span>
						<div class="source-details">
							<div class="source-name">${this.escapeHtml(mapping.logicalName)}</div>
							<div class="source-connector">${this.escapeHtml(mapping.connectorName)}</div>
						</div>
					</div>
				</td>
				<td class="col-target">
					${this.renderTargetSelection(mapping, index)}
				</td>
			</tr>
		`;
	}

	private renderTargetSelection(mapping: ConnectionReferenceMappingViewModel, index: number): string {
		// No available connections - show manual input
		if (mapping.availableConnections.length === 0) {
			return `
				<div class="target-unmatched">
					<div class="unmatched-warning">No connections available in target</div>
					<div class="manual-input-group">
						<label for="manual-conn-${index}">ConnectionId:</label>
						<input
							type="text"
							id="manual-conn-${index}"
							class="manual-connection-input"
							data-index="${index}"
							placeholder="Enter ConnectionId manually"
							value="${this.escapeHtml(mapping.manualConnectionId)}"
						/>
					</div>
					<div class="unmatched-tip">Create this connection in the target environment first</div>
				</div>
			`;
		}

		// Determine if this is an unmatched connector (needs to show connector names)
		const isUnmatched = mapping.status === 'unmatched';
		const placeholderText = isUnmatched
			? 'Select from all target connections...'
			: 'Select connection...';

		// Has available connections - show dropdown
		const options = mapping.availableConnections.map(conn => {
			const selected = conn.id === mapping.selectedConnectionId ? 'selected' : '';
			const statusIndicator = conn.status === 'Connected' ? '●' : conn.status === 'Error' ? '○' : '◌';
			const statusColor = conn.status === 'Connected' ? 'status-connected' : conn.status === 'Error' ? 'status-error' : 'status-unknown';

			// For unmatched connectors, show connector name to help user identify the right connection
			const displayText = isUnmatched
				? `${conn.connectorName}: ${conn.displayName} (${conn.status})`
				: `${conn.displayName} (${conn.status})`;

			return `<option value="${this.escapeHtml(conn.id)}" ${selected} class="${statusColor}">
				${statusIndicator} ${this.escapeHtml(displayText)}
			</option>`;
		}).join('');

		const connectionCount = mapping.availableConnections.length;
		const countText = connectionCount === 1 ? '1 connection' : `${connectionCount} connections`;
		const countLabel = isUnmatched ? 'All target connections' : 'Available';

		return `
			<div class="target-selection ${isUnmatched ? 'cross-connector' : ''}">
				<select class="connection-dropdown" data-index="${index}" id="conn-select-${index}">
					<option value="" ${mapping.selectedConnectionId === null ? 'selected' : ''} disabled>${placeholderText}</option>
					${options}
				</select>
				<div class="connection-count">${countLabel}: ${countText}</div>
				${isUnmatched ? '<div class="cross-connector-tip">Select the equivalent connection for this connector</div>' : ''}
			</div>
		`;
	}

	private getStatusIcon(mapping: ConnectionReferenceMappingViewModel): string {
		switch (mapping.status) {
			case 'configured':
				return '✓';
			case 'multiple':
				return mapping.selectedConnectionId !== null ? '✓' : '◐';
			case 'manual':
				return mapping.manualConnectionId !== '' ? '✓' : '⚠';
			case 'unmatched':
				return '⚠';
			default:
				return '○';
		}
	}

	private getStatusClass(mapping: ConnectionReferenceMappingViewModel): string {
		switch (mapping.status) {
			case 'configured':
				return 'status-configured';
			case 'multiple':
				return mapping.selectedConnectionId !== null ? 'status-configured' : 'status-multiple';
			case 'manual':
				return mapping.manualConnectionId !== '' ? 'status-configured' : 'status-unmatched';
			case 'unmatched':
				return 'status-unmatched';
			default:
				return '';
		}
	}

	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
