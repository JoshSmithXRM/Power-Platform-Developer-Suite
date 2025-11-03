import * as vscode from 'vscode';

/**
 * Extended QuickPickItem that includes an environment ID.
 * Used for environment selection in various command handlers
 * (Solution Explorer, Import Job Viewer, etc.).
 */
export interface QuickPickItemWithEnvId extends vscode.QuickPickItem {
	/**
	 * The unique identifier of the environment
	 */
	envId: string;
}
