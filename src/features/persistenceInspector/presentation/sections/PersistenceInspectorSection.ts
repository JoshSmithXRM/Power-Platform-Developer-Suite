import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Section that renders the persistence inspector storage tree view.
 * Displays global state and secrets with interactive controls.
 * Client-side behavior is loaded from PersistenceInspectorBehavior.js
 */
export class PersistenceInspectorSection implements ISection {
	readonly position = SectionPosition.Main;

	render(_data: SectionRenderData): string {
		return `
			<div id="globalStateSection" class="section">
				<div class="section-title">Global State</div>
				<div id="globalStateEntries"></div>
			</div>

			<div id="secretsSection" class="section">
				<div class="section-title">Secrets</div>
				<div id="secretEntries"></div>
			</div>
		`;
	}
}
