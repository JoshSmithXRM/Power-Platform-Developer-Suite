/**
 * DeploymentSettingsStatusSection - Displays status and instructions for the promotion panel.
 * Shows instructions initially, then status after file load and matching.
 */

import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Status data for deployment settings promotion.
 */
export interface DeploymentSettingsStatus {
	readonly fileLoaded: boolean;
	readonly sourceFileName?: string;
	readonly connectionReferenceCount?: number;
	readonly environmentVariableCount?: number;
	readonly matchingComplete: boolean;
	readonly autoMatchedCount?: number;
	readonly unmatchedCount?: number;
}

/**
 * Section that displays status and instructions in the main content area.
 */
export class DeploymentSettingsStatusSection implements ISection {
	public readonly position = SectionPosition.Main;

	/**
	 * Renders status/instructions HTML.
	 */
	public render(data: SectionRenderData): string {
		const status = data.customData?.['deploymentSettingsStatus'] as DeploymentSettingsStatus | undefined;

		if (!status?.fileLoaded) {
			return this.renderInitialInstructions();
		}

		if (!status.matchingComplete) {
			return this.renderFileLoadedStatus(status);
		}

		return this.renderMatchingResults(status);
	}

	private renderInitialInstructions(): string {
		return `
			<div class="status-container">
				<div class="status-instructions">
					<h2>Deployment Settings</h2>
					<p>Manage deployment settings for Power Platform solutions. Promote settings between environments with automatic connector matching.</p>
					<ol class="instructions-list">
						<li><strong>Select target environment</strong> from the dropdown above</li>
						<li><strong>Click "Load Source File"</strong> to select your source deployment settings JSON</li>
						<li>The tool will auto-match connectors between environments</li>
						<li><strong>Click "Generate Output"</strong> to create promoted deployment settings</li>
					</ol>
				</div>
			</div>
		`;
	}

	private renderFileLoadedStatus(status: DeploymentSettingsStatus): string {
		return `
			<div class="status-container">
				<div class="status-loaded">
					<h3>Source File Loaded</h3>
					<p class="file-name">${this.escapeHtml(status.sourceFileName ?? 'Unknown file')}</p>
					<div class="status-counts">
						<div class="count-item">
							<span class="count-value">${status.connectionReferenceCount ?? 0}</span>
							<span class="count-label">Connection References</span>
						</div>
						<div class="count-item">
							<span class="count-value">${status.environmentVariableCount ?? 0}</span>
							<span class="count-label">Environment Variables</span>
						</div>
					</div>
					<p class="status-hint">Select a target environment to run connector matching...</p>
				</div>
			</div>
		`;
	}

	private renderMatchingResults(status: DeploymentSettingsStatus): string {
		const autoMatched = status.autoMatchedCount ?? 0;
		const unmatched = status.unmatchedCount ?? 0;
		const total = autoMatched + unmatched;

		const allMatched = unmatched === 0;
		const statusClass = allMatched ? 'status-success' : 'status-warning';
		const statusIcon = allMatched ? '✓' : '⚠';

		return `
			<div class="status-container">
				<div class="status-matching ${statusClass}">
					<h3>${statusIcon} Connector Matching Complete</h3>
					<div class="matching-summary">
						<div class="match-item match-success">
							<span class="match-count">${autoMatched}</span>
							<span class="match-label">Auto-matched</span>
						</div>
						${unmatched > 0 ? `
						<div class="match-item match-warning">
							<span class="match-count">${unmatched}</span>
							<span class="match-label">Need manual mapping</span>
						</div>
						` : ''}
						<div class="match-item match-total">
							<span class="match-count">${total}</span>
							<span class="match-label">Total connectors</span>
						</div>
					</div>
					${allMatched
						? '<p class="status-action">All connectors matched! Click "Generate Output" to create promoted settings.</p>'
						: '<p class="status-action">Some connectors could not be auto-matched. Manual mapping is not yet supported in this version.</p>'
					}
				</div>
			</div>
		`;
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
