/**
 * SectionCompositionBehavior - Composes sections into panel layouts.
 * Orchestrates section rendering and injects into layout templates.
 */

import type { ISection } from '../sections/ISection';
import { SectionPosition } from '../types/SectionPosition';
import { PanelLayout } from '../types/PanelLayout';
import type { SectionRenderData } from '../types/SectionRenderData';

import type { IPanelBehavior } from './IPanelBehavior';

/**
 * Behavior that composes multiple sections into layout templates.
 * Groups sections by position and injects rendered HTML into placeholders.
 *
 * This behavior is stateless and requires no initialization or cleanup.
 * The compose() method is called directly to generate HTML.
 */
export class SectionCompositionBehavior implements IPanelBehavior {
	constructor(
		private readonly sections: ReadonlyArray<ISection>,
		private readonly layout: PanelLayout = PanelLayout.SingleColumn
	) {}

	/**
	 * No initialization required for stateless composition.
	 */
	public async initialize(): Promise<void> {
		// Stateless behavior - no initialization needed
	}

	/**
	 * Composes sections into the configured layout.
	 * @param data - Data to pass to each section for rendering
	 * @returns Complete HTML with sections injected into layout
	 */
	public compose(data: SectionRenderData): string {
		const layoutTemplate = this.getLayoutTemplate();
		return this.injectSectionsIntoLayout(layoutTemplate, data);
	}

	/**
	 * Gets the appropriate layout template based on configuration.
	 */
	private getLayoutTemplate(): string {
		switch (this.layout) {
			case PanelLayout.SingleColumn:
				return this.singleColumnTemplate();
			case PanelLayout.SplitHorizontal:
				return this.splitHorizontalTemplate();
			case PanelLayout.SplitVertical:
				return this.splitVerticalTemplate();
			default:
				return this.singleColumnTemplate();
		}
	}

	/**
	 * Single column layout template.
	 * Sections stacked vertically: toolbar → header → filters → main → footer.
	 */
	private singleColumnTemplate(): string {
		return `
			<div class="panel-container">
				<div class="toolbar-section"><!-- TOOLBAR --></div>
				<div class="header-section"><!-- HEADER --></div>
				<div class="filters-section"><!-- FILTERS --></div>
				<div class="main-section"><!-- MAIN --></div>
				<div class="footer-section"><!-- FOOTER --></div>
			</div>
		`;
	}

	/**
	 * Split horizontal layout template.
	 * Main and detail sections side-by-side.
	 */
	private splitHorizontalTemplate(): string {
		return `
			<div class="panel-container split-horizontal">
				<div class="toolbar-section"><!-- TOOLBAR --></div>
				<div class="header-section"><!-- HEADER --></div>
				<div class="filters-section"><!-- FILTERS --></div>
				<div class="content-split">
					<div class="main-section"><!-- MAIN --></div>
					<div class="detail-section hidden"><!-- DETAIL --></div>
				</div>
				<div class="footer-section"><!-- FOOTER --></div>
			</div>
		`;
	}

	/**
	 * Split vertical layout template.
	 * Main and detail sections stacked vertically.
	 */
	private splitVerticalTemplate(): string {
		return `
			<div class="panel-container split-vertical">
				<div class="toolbar-section"><!-- TOOLBAR --></div>
				<div class="header-section"><!-- HEADER --></div>
				<div class="filters-section"><!-- FILTERS --></div>
				<div class="main-section"><!-- MAIN --></div>
				<div class="detail-section hidden"><!-- DETAIL --></div>
				<div class="footer-section"><!-- FOOTER --></div>
			</div>
		`;
	}

	/**
	 * Injects section HTML into layout template placeholders.
	 * @param template - Layout template with placeholders
	 * @param data - Data to pass to sections
	 * @returns Complete HTML with sections rendered
	 */
	private injectSectionsIntoLayout(template: string, data: SectionRenderData): string {
		let html = template;

		// Group sections by position
		const sectionsByPosition = this.groupSectionsByPosition();

		// Inject each position
		for (const [position, sections] of sectionsByPosition.entries()) {
			const placeholder = `<!-- ${position.toUpperCase()} -->`;
			const sectionHtml = sections.map(s => s.render(data)).join('\n');
			html = html.replace(placeholder, sectionHtml);
		}

		return html;
	}

	/**
	 * Groups sections by their position.
	 * Multiple sections can occupy the same position.
	 */
	private groupSectionsByPosition(): Map<SectionPosition, ISection[]> {
		const map = new Map<SectionPosition, ISection[]>();

		for (const section of this.sections) {
			const position = section.position;
			const sections = map.get(position);

			if (sections === undefined) {
				map.set(position, [section]);
			} else {
				sections.push(section);
			}
		}

		return map;
	}
}
