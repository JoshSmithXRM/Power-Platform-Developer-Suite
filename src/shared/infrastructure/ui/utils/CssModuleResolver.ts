/**
 * CssModuleResolver - Resolves CSS module paths to webview URIs.
 * Supports declarative CSS loading with three-tier architecture: base, components, sections.
 */

import * as vscode from 'vscode';

/**
 * Declarative CSS module loading configuration.
 * Allows panels to specify which CSS categories to load.
 */
export interface CssModulesConfig {
	readonly base?: boolean; // Load base/reset.css and base/typography.css
	readonly components?: ReadonlyArray<string>; // Component names (e.g., ['buttons', 'inputs'])
	readonly sections?: ReadonlyArray<string>; // Section names (e.g., ['datatable', 'action-buttons'])
}

/**
 * Resolves CSS module configuration to webview URIs.
 * Order: base → components → sections
 *
 * @param cssModules - Declarative CSS configuration
 * @param extensionUri - Extension root URI
 * @param webview - Webview for asWebviewUri conversion
 * @returns Array of resolved CSS URIs ready for <link> tags
 */
export function resolveCssModules(
	cssModules: CssModulesConfig,
	extensionUri: vscode.Uri,
	webview: vscode.Webview
): ReadonlyArray<string> {
	const uris: string[] = [];

	// 1. Base CSS (reset, typography, layout)
	if (cssModules.base) {
		uris.push(
			webview.asWebviewUri(
				vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'base', 'reset.css')
			).toString(),
			webview.asWebviewUri(
				vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'base', 'typography.css')
			).toString(),
			webview.asWebviewUri(
				vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'base', 'layout.css')
			).toString()
		);
	}

	// 2. Component CSS
	if (cssModules.components) {
		for (const component of cssModules.components) {
			uris.push(
				webview.asWebviewUri(
					vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'components', `${component}.css`)
				).toString()
			);
		}
	}

	// 3. Section CSS
	if (cssModules.sections) {
		for (const section of cssModules.sections) {
			uris.push(
				webview.asWebviewUri(
					vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'css', 'sections', `${section}.css`)
				).toString()
			);
		}
	}

	return uris;
}
