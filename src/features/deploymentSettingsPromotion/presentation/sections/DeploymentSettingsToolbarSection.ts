/**
 * DeploymentSettingsToolbarSection - Custom toolbar for the Deployment Settings panel.
 *
 * Renders a unique layout with three selectors and a save button:
 * Source Environment | Solution | Target Environment | [Save]
 *
 * Uses custom element IDs to differentiate from standard selectors.
 */

import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Extended render data for the deployment settings toolbar.
 */
export interface DeploymentSettingsToolbarData {
	/** Available environments for source and target dropdowns */
	readonly environments?: ReadonlyArray<{ id: string; name: string }> | undefined;
	/** Currently selected source environment ID */
	readonly sourceEnvironmentId?: string | undefined;
	/** Currently selected solution ID */
	readonly currentSolutionId?: string | undefined;
	/** Available solutions (loaded after source env selected) */
	readonly solutions?: ReadonlyArray<{ id: string; name: string }> | undefined;
	/** Whether solution dropdown is disabled (until source env selected) */
	readonly solutionDisabled?: boolean | undefined;
	/** Currently selected target environment ID */
	readonly targetEnvironmentId?: string | undefined;
	/** Whether save button is disabled */
	readonly saveDisabled?: boolean | undefined;
}

/**
 * Section that renders the deployment settings toolbar.
 * Contains source env, solution, target env selectors and save button.
 */
export class DeploymentSettingsToolbarSection implements ISection {
	public readonly position = SectionPosition.Toolbar;

	public render(data: SectionRenderData): string {
		const toolbarData = data.customData as DeploymentSettingsToolbarData | undefined;
		const environments = toolbarData?.environments ?? [];
		const sourceEnvId = toolbarData?.sourceEnvironmentId;
		const solutions = toolbarData?.solutions ?? [];
		const currentSolutionId = toolbarData?.currentSolutionId;
		const solutionDisabled = toolbarData?.solutionDisabled ?? true;
		const targetEnvId = toolbarData?.targetEnvironmentId;
		const saveDisabled = toolbarData?.saveDisabled ?? true;

		return `
			<div class="deployment-settings-toolbar">
				${this.renderSourceEnvSelector(environments, sourceEnvId)}
				${this.renderSolutionSelector(solutions, currentSolutionId, solutionDisabled)}
				${this.renderTargetEnvSelector(environments, targetEnvId)}
				${this.renderSaveButton(saveDisabled)}
			</div>
		`;
	}

	private renderSourceEnvSelector(
		environments: ReadonlyArray<{ id: string; name: string }>,
		selectedId?: string
	): string {
		const options = this.renderEnvironmentOptions(environments, selectedId, 'Select source...');
		return `
			<div class="selector-group">
				<label for="sourceEnvSelect">Source:</label>
				<select id="sourceEnvSelect">
					${options}
				</select>
			</div>
		`;
	}

	private renderSolutionSelector(
		solutions: ReadonlyArray<{ id: string; name: string }>,
		selectedId?: string,
		disabled: boolean = true
	): string {
		const disabledAttr = disabled ? 'disabled' : '';
		let options: string;

		if (disabled && solutions.length === 0) {
			options = '<option value="">Select source first...</option>';
		} else {
			options = this.renderSelectOptions(solutions, selectedId, 'Select solution...');
		}

		return `
			<div class="selector-group">
				<label for="solutionSelect">Solution:</label>
				<select id="solutionSelect" ${disabledAttr}>
					${options}
				</select>
			</div>
		`;
	}

	private renderTargetEnvSelector(
		environments: ReadonlyArray<{ id: string; name: string }>,
		selectedId?: string
	): string {
		const options = this.renderEnvironmentOptions(environments, selectedId, 'Select target...');
		return `
			<div class="selector-group">
				<label for="targetEnvSelect">Target:</label>
				<select id="targetEnvSelect">
					${options}
				</select>
			</div>
		`;
	}

	private renderSaveButton(disabled: boolean): string {
		const disabledAttr = disabled ? 'disabled' : '';
		return `
			<div class="action-group">
				<button id="saveDeploymentSettings" class="action-button primary" ${disabledAttr}>
					Save
				</button>
			</div>
		`;
	}

	private renderEnvironmentOptions(
		environments: ReadonlyArray<{ id: string; name: string }>,
		selectedId?: string,
		placeholder: string = 'Select...'
	): string {
		const placeholderSelected = !selectedId ? 'selected' : '';
		const placeholderOption = `<option value="" ${placeholderSelected} disabled>${this.escapeHtml(placeholder)}</option>`;

		const envOptions = environments.map(env => {
			const selected = env.id === selectedId ? 'selected' : '';
			return `<option value="${this.escapeHtml(env.id)}" ${selected}>${this.escapeHtml(env.name)}</option>`;
		}).join('\n');

		return placeholderOption + '\n' + envOptions;
	}

	private renderSelectOptions(
		items: ReadonlyArray<{ id: string; name: string }>,
		selectedId?: string,
		placeholder: string = 'Select...'
	): string {
		const placeholderSelected = !selectedId ? 'selected' : '';
		const placeholderOption = `<option value="" ${placeholderSelected} disabled>${this.escapeHtml(placeholder)}</option>`;

		const itemOptions = items.map(item => {
			const selected = item.id === selectedId ? 'selected' : '';
			return `<option value="${this.escapeHtml(item.id)}" ${selected}>${this.escapeHtml(item.name)}</option>`;
		}).join('\n');

		return placeholderOption + '\n' + itemOptions;
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
