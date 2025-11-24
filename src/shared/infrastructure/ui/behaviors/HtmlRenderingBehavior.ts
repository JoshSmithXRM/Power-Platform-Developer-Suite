import * as vscode from 'vscode';

import type { DataTableConfig } from '../DataTablePanel';
import { renderDataTable } from '../views/dataTable';

import { IHtmlRenderingBehavior } from './IHtmlRenderingBehavior';

export interface HtmlCustomization {
	readonly customCss: string;
	readonly filterLogic: string;
	readonly customJavaScript: string;
}

/**
 * Implementation: HTML Rendering
 * Generates webview HTML content for data table panels.
 */
export class HtmlRenderingBehavior implements IHtmlRenderingBehavior {
	constructor(
		private readonly webview: vscode.Webview,
		private readonly extensionUri: vscode.Uri,
		private readonly config: DataTableConfig,
		private readonly customization: HtmlCustomization
	) {}

	/**
	 * Renders the complete HTML content for the data table webview.
	 *
	 * Combines the base data table template with panel-specific customizations
	 * (CSS, filter logic, and JavaScript) to generate the final HTML.
	 */
	public renderHtml(): string {
		const datatableCssUri = this.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'datatable.css')
		);

		// Generate nonce for CSP
		const nonce = this.generateNonce();

		// Get CSP source for webview URIs
		const cspSource = this.webview.cspSource;

		return renderDataTable({
			datatableCssUri: datatableCssUri.toString(),
			config: this.config,
			customCss: this.customization.customCss,
			filterLogic: this.customization.filterLogic,
			customJavaScript: this.customization.customJavaScript,
			cspSource,
			nonce
		});
	}

	/**
	 * Generates a cryptographically secure nonce for Content Security Policy.
	 * @returns A random nonce string
	 */
	private generateNonce(): string {
		const buffer = new Uint32Array(4);
		crypto.getRandomValues(buffer);
		return Array.from(buffer, num => num.toString(36)).join('');
	}
}
