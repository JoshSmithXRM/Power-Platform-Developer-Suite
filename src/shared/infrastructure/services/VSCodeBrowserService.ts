import * as vscode from 'vscode';

import { IBrowserService } from '../interfaces/IBrowserService';

/**
 * VS Code implementation of IBrowserService.
 * Opens URLs in the system's default external browser using VS Code API.
 */
export class VSCodeBrowserService implements IBrowserService {
	/**
	 * Opens a URL in the system's default external browser.
	 * @param url - The URL to open
	 * @throws Rethrows errors from VS Code API
	 */
	async openExternal(url: string): Promise<void> {
		await vscode.env.openExternal(vscode.Uri.parse(url));
	}
}
