/**
 * DeploymentSettingsStatusSection - Displays status and instructions for the promotion panel.
 * Shows stage-specific instructions and matching results.
 */

import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Workflow stages for deployment settings promotion.
 */
type DeploymentSettingsStage =
	| 'initial'           // No selections made
	| 'sourceSelected'    // Source env selected, waiting for solution
	| 'solutionSelected'  // Solution selected, waiting for target
	| 'targetSelected'    // Target selected, waiting for source/solution
	| 'loading'           // Loading data
	| 'matched'           // Matching complete
	| 'error';            // Error occurred

/**
 * Status data for deployment settings promotion.
 */
export interface DeploymentSettingsStatus {
	readonly stage: DeploymentSettingsStage;
	readonly connectionReferenceCount?: number;
	readonly autoMatchedCount?: number;
	readonly unmatchedCount?: number;
	readonly errorMessage?: string;
}

/**
 * Section that displays status and instructions in the main content area.
 */
export class DeploymentSettingsStatusSection implements ISection {
	public readonly position = SectionPosition.Main;

	public render(data: SectionRenderData): string {
		const status = data.customData?.['deploymentSettingsStatus'] as DeploymentSettingsStatus | undefined;

		if (!status) {
			return this.renderInitialInstructions();
		}

		switch (status.stage) {
			case 'initial':
				return this.renderInitialInstructions();
			case 'sourceSelected':
				return this.renderSourceSelected();
			case 'solutionSelected':
				return this.renderSolutionSelected();
			case 'targetSelected':
				return this.renderTargetSelected();
			case 'loading':
				return this.renderLoading();
			case 'matched':
				return this.renderMatchingResults(status);
			case 'error':
				return this.renderError(status);
			default:
				return this.renderInitialInstructions();
		}
	}

	private renderInitialInstructions(): string {
		return `
			<div class="status-container">
				<div class="status-instructions">
					<h2>Deployment Settings Promotion</h2>
					<p>Promote deployment settings between Power Platform environments with automatic connector matching.</p>
					<ol class="instructions-list">
						<li><strong>Select source environment</strong> - where your solution is configured and working</li>
						<li><strong>Select solution</strong> - the solution containing your connection references</li>
						<li><strong>Select target environment</strong> - where you want to deploy</li>
						<li>The tool will automatically match connectors between environments</li>
						<li><strong>Click "Save"</strong> to generate deployment settings file</li>
					</ol>
				</div>
			</div>
		`;
	}

	private renderSourceSelected(): string {
		return `
			<div class="status-container">
				<div class="status-progress">
					<h3>✓ Source Environment Selected</h3>
					<p>Now select a solution from the dropdown above.</p>
					<p class="status-hint">Solutions are loaded from your source environment.</p>
				</div>
			</div>
		`;
	}

	private renderSolutionSelected(): string {
		return `
			<div class="status-container">
				<div class="status-progress">
					<h3>✓ Source & Solution Selected</h3>
					<p>Now select a target environment to complete the workflow.</p>
					<p class="status-hint">The target environment is where your solution will be deployed.</p>
				</div>
			</div>
		`;
	}

	private renderTargetSelected(): string {
		return `
			<div class="status-container">
				<div class="status-progress">
					<h3>⚠ Target Selected</h3>
					<p>Please select a source environment and solution to continue.</p>
					<p class="status-hint">The workflow requires: Source → Solution → Target</p>
				</div>
			</div>
		`;
	}

	private renderLoading(): string {
		return `
			<div class="status-container">
				<div class="status-loading">
					<h3>Loading...</h3>
					<div class="loading-spinner"></div>
					<p>Fetching connection references and matching connectors...</p>
				</div>
			</div>
		`;
	}

	private renderMatchingResults(status: DeploymentSettingsStatus): string {
		const total = status.connectionReferenceCount ?? 0;

		// If we have connection references, the mapping table handles display
		// Only show status for empty state
		if (total === 0) {
			return `
				<div class="status-container">
					<div class="status-info">
						<h3>No Connection References</h3>
						<p>The selected solution has no connection references.</p>
						<p class="status-hint">Connection references are required for deployment settings.</p>
					</div>
				</div>
			`;
		}

		// Mapping table is visible - don't show redundant status
		return '';
	}

	private renderError(status: DeploymentSettingsStatus): string {
		return `
			<div class="status-container">
				<div class="status-error">
					<h3>⚠ Error</h3>
					<p>${this.escapeHtml(status.errorMessage ?? 'An unknown error occurred')}</p>
					<p class="status-hint">Try changing your selections or check the Output panel for details.</p>
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
