/**
 * Behavior: HTML Rendering
 * Responsibility: Webview HTML generation
 */
export interface IHtmlRenderingBehavior {
	/**
	 * Renders the complete HTML for the webview.
	 * @returns HTML string
	 */
	renderHtml(): string;
}
