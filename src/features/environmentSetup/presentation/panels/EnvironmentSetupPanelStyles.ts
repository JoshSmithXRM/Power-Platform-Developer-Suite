import * as vscode from 'vscode';

import type { HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';

/**
 * CSS styles for Environment Setup panel.
 */
export const ENVIRONMENT_SETUP_PANEL_CSS = `
	.form-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 24px;
	}

	.form-section {
		margin-bottom: 24px;
	}

	.form-section h2 {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 16px;
		color: var(--vscode-foreground);
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		color: var(--vscode-foreground);
	}

	.form-group input,
	.form-group select {
		width: 100%;
	}

	.help-text {
		font-size: 12px;
		color: var(--vscode-descriptionForeground);
		margin-top: 4px;
	}

	.conditional-field {
		margin-top: 16px;
	}

	input,
	select {
		font-family: var(--vscode-font-family);
		font-size: var(--vscode-font-size);
		background: var(--vscode-input-background);
		color: var(--vscode-input-foreground);
		border: 1px solid var(--vscode-input-border);
		padding: 6px 12px;
		border-radius: 2px;
		width: 100%;
		box-sizing: border-box;
	}

	input:focus,
	select:focus {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
`;

/**
 * Creates the scaffolding configuration for the Environment Setup panel.
 */
export function createEnvironmentSetupScaffoldingConfig(
	extensionUri: vscode.Uri,
	webview: vscode.Webview
): HtmlScaffoldingConfig {
	const cssUris = resolveCssModules(
		{
			base: true,
			components: ['buttons', 'inputs'],
			sections: ['action-buttons']
		},
		extensionUri,
		webview
	);

	return {
		cssUris,
		jsUris: [
			webview.asWebviewUri(
				vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'js', 'messaging.js')
			).toString(),
			webview.asWebviewUri(
				vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'js', 'behaviors', 'EnvironmentSetupBehavior.js')
			).toString()
		],
		cspNonce: getNonce(),
		title: 'Environment Setup',
		customCss: ENVIRONMENT_SETUP_PANEL_CSS
	};
}
