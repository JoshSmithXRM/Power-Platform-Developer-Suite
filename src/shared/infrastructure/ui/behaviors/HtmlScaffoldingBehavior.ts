/**
 * HtmlScaffoldingBehavior - Wraps section HTML in full HTML document and sets webview HTML.
 * Handles HTML scaffolding (<html>, <head>, CSS, JS) and webview rendering.
 */

import type * as vscode from 'vscode';

import type { SectionRenderData } from '../types/SectionRenderData';
import { escapeHtml } from '../../../../infrastructure/ui/utils/HtmlUtils';

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
		private readonly webview: vscode.Webview,
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
		this.webview.html = fullHtml;

		// Notify webview that HTML has been updated (for re-initialization)
		await this.webview.postMessage({ command: 'htmlUpdated' });
	}

	/**
	 * Wraps body HTML in full HTML document structure.
	 * Includes <html>, <head>, CSS, JS, and CSP.
	 */
	private wrapInHtmlScaffolding(bodyHtml: string): string {
		const { cssUris, jsUris, cspNonce, title, customCss, customJavaScript } = this.config;
		const cspSource = this.webview.cspSource;

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${cspNonce}';">
	<title>${escapeHtml(title)}</title>
	${cssUris.map(uri => `<link rel="stylesheet" href="${uri}">`).join('\n\t')}
	${customCss ? `<style>${customCss}</style>` : ''}
</head>
<body>
${bodyHtml}
${jsUris.map(uri => `<script nonce="${cspNonce}" src="${uri}"></script>`).join('\n')}
${customJavaScript ? `<script nonce="${cspNonce}">\n${customJavaScript}\n</script>` : ''}
</body>
</html>`;
	}

}
