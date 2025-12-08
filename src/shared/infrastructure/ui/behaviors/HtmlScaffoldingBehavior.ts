/**
 * HtmlScaffoldingBehavior - Wraps section HTML in full HTML document and sets webview HTML.
 * Handles HTML scaffolding (<html>, <head>, CSS, JS) and webview rendering.
 */

import type { SectionRenderData } from '../types/SectionRenderData';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';
import type { ISafePanel } from '../panels/ISafePanel';

import type { IPanelBehavior } from './IPanelBehavior';
import type { SectionCompositionBehavior } from './SectionCompositionBehavior';

/**
 * Configuration for HTML scaffolding (CSS, JS, CSP).
 * CSS URIs should be pre-resolved webview URIs.
 */
export interface HtmlScaffoldingConfig {
	readonly cssUris: ReadonlyArray<string>;
	readonly jsUris: ReadonlyArray<string>;
	readonly cspNonce: string;
	readonly title: string;
	readonly customCss?: string;
	readonly customJavaScript?: string;
}

/**
 * Behavior that wraps section composition in full HTML document.
 * Handles webview HTML rendering and re-rendering.
 */
export class HtmlScaffoldingBehavior implements IPanelBehavior {
	constructor(
		private readonly panel: ISafePanel,
		private readonly composer: SectionCompositionBehavior,
		private readonly config: HtmlScaffoldingConfig
	) {}

	/**
	 * Initializes the webview with initial HTML.
	 */
	public async initialize(): Promise<void> {
		await this.refresh({});
	}

	/**
	 * Re-renders the entire webview HTML with new data.
	 * @param data - Data to pass to sections for rendering
	 */
	public async refresh(data: SectionRenderData): Promise<void> {
		const bodyHtml = this.composer.compose(data);
		const fullHtml = this.wrapInHtmlScaffolding(bodyHtml);
		this.panel.html = fullHtml;

		// Notify webview that HTML has been updated (for re-initialization)
		await this.panel.postMessage({ command: 'htmlUpdated' });
	}

	/**
	 * Wraps body HTML in full HTML document structure.
	 * Includes <html>, <head>, CSS, JS, and CSP.
	 *
	 * CSP Security Analysis:
	 *
	 * 'unsafe-inline' is required for style-src because inline style attributes
	 * (style="...") are used throughout the codebase for:
	 * - Dynamic visibility: style="display: none" / style="display: flex"
	 * - Dynamic widths: style="width: 400px" (from user resize, validated min/max)
	 * - Dynamic positioning: style="flex: 0 0 300px" (calculated from layout)
	 *
	 * Security justification:
	 * - All values are either static strings ("none", "flex", "block") or
	 *   calculated from validated domain data (numeric widths clamped to min/max)
	 * - No user-controlled content flows into style attributes (no innerHTML injection)
	 * - Example safe usage: panel.style.width = `${Math.max(300, width)}px`
	 * - XSS tests verify proper escaping (ResizableDetailPanelSection.test.ts)
	 *
	 * Nonce usage:
	 * - script-src: Nonce required for all inline scripts (prevents XSS)
	 * - style-src: Nonce NOT used (would block all inline styles per CSP spec)
	 * - When nonce is present in style-src, 'unsafe-inline' is ignored by browsers
	 * - We removed nonce from style-src to allow these safe inline styles
	 *
	 * Future improvement: Refactor to CSS classes with JavaScript-controlled
	 * class names to eliminate 'unsafe-inline' (e.g., .panel-hidden, .panel-width-300).
	 */
	private wrapInHtmlScaffolding(bodyHtml: string): string {
		const { cssUris, jsUris, cspNonce, title, customCss, customJavaScript } = this.config;
		const cspSource = this.panel.cspSource;

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline' https://unpkg.com; script-src 'nonce-${cspNonce}'; font-src ${cspSource} https://unpkg.com; img-src ${cspSource} https: data:; connect-src 'none'; frame-src 'none';">
	<meta id="vscode-csp-nonce" content="${cspNonce}">
	<title>${escapeHtml(title)}</title>
	${cssUris.map(uri => `<link rel="stylesheet" href="${uri}">`).join('\n\t')}
	${customCss ? `<style nonce="${cspNonce}">${customCss}</style>` : ''}
</head>
<body>
${bodyHtml}
${jsUris.map(uri => `<script nonce="${cspNonce}" src="${uri}"></script>`).join('\n')}
${customJavaScript ? `<script nonce="${cspNonce}">\n${customJavaScript}\n</script>` : ''}
</body>
</html>`;
	}

}
