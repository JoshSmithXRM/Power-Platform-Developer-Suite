import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Service for managing SQL editor documents.
 *
 * Provides functionality to open new SQL queries and load
 * existing files from disk with IntelliSense support.
 */
export class SqlEditorService implements vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];

	constructor(private readonly logger: ILogger) {}

	/**
	 * Opens a new untitled SQL document for query editing.
	 *
	 * @param initialContent - Optional initial SQL content
	 * @returns The opened text editor
	 */
	public async openNewQuery(initialContent: string = ''): Promise<vscode.TextEditor> {
		const document = await vscode.workspace.openTextDocument({
			language: 'sql',
			content: initialContent,
		});

		const editor = await vscode.window.showTextDocument(document, {
			viewColumn: vscode.ViewColumn.One,
			preserveFocus: false,
			preview: false,
		});

		this.logger.debug('Opened new SQL query editor');
		return editor;
	}

	/**
	 * Opens a file picker to load an existing SQL or FetchXML file.
	 *
	 * @returns The opened text editor, or undefined if cancelled
	 */
	public async openFileFromDisk(): Promise<vscode.TextEditor | undefined> {
		const uris = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'SQL Files': ['sql'],
				'FetchXML Files': ['xml'],
				'All Files': ['*'],
			},
			title: 'Open Query File',
		});

		const selectedUri = uris?.[0];
		if (selectedUri === undefined) {
			return undefined;
		}

		const document = await vscode.workspace.openTextDocument(selectedUri);
		const editor = await vscode.window.showTextDocument(document, {
			viewColumn: vscode.ViewColumn.One,
			preserveFocus: false,
			preview: false,
		});

		this.logger.debug('Opened query file from disk', { path: selectedUri.fsPath });
		return editor;
	}

	/**
	 * Gets the SQL content from the active editor if it's a SQL file.
	 *
	 * @returns The SQL content, or null if no SQL editor is active
	 */
	public getActiveSqlContent(): string | null {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined) {
			return null;
		}

		// Accept SQL files or untitled documents with SQL language
		const doc = editor.document;
		if (doc.languageId === 'sql') {
			return doc.getText();
		}

		return null;
	}

	/**
	 * Gets SQL content from any visible SQL editor.
	 * Useful when the panel is focused but user has SQL editor open.
	 *
	 * @returns The SQL content from the first visible SQL editor, or null
	 */
	public getVisibleSqlContent(): string | null {
		for (const editor of vscode.window.visibleTextEditors) {
			if (editor.document.languageId === 'sql') {
				return editor.document.getText();
			}
		}
		return null;
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables.length = 0;
	}
}
