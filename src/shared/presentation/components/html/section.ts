/**
 * Section view function.
 * Renders a section with title and content.
 */

import { html, raw } from '../../../../infrastructure/ui/utils/HtmlUtils';

export interface SectionProps {
	/** Section title */
	title: string;
	/** Section content (HTML string) */
	content: string;
	/** Optional CSS class */
	className?: string;
}

/**
 * Renders a section with title and content.
 *
 * @param props - Section configuration
 * @returns HTML string for section element
 *
 * @example
 * renderSection({
 *   title: 'Basic Information',
 *   content: renderFormField({ ... })
 * })
 */
export function renderSection(props: SectionProps): string {
	return html`
		<section class="${props.className || 'section'}">
			<h2>${props.title}</h2>
			${raw(props.content)}
		</section>
	`.__html;
}
