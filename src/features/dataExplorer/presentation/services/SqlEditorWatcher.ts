import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Watches SQL editor changes and notifies the panel.
 *
 * Responsibilities:
 * - Track the most recently focused SQL editor
 * - Debounce document changes to avoid excessive updates
 * - Notify panel when SQL content changes (for FetchXML preview)
 */
export class SqlEditorWatcher implements vscode.Disposable {
	private static readonly DEBOUNCE_MS = 300;

	private readonly disposables: vscode.Disposable[] = [];
	private lastActiveSqlUri: vscode.Uri | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly listeners: Array<(sql: string) => void> = [];

	constructor(private readonly logger: ILogger) {
		// Track when SQL editors gain focus
		this.disposables.push(
			vscode.window.onDidChangeActiveTextEditor(editor => {
				if (editor?.document.languageId === 'sql') {
					this.lastActiveSqlUri = editor.document.uri;
					this.notifyListeners(editor.document.getText());
				}
			})
		);

		// Watch for document changes
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument(event => {
				if (event.document.languageId === 'sql') {
					this.debouncedNotify(event.document.getText());
				}
			})
		);

		this.logger.debug('SqlEditorWatcher initialized');
	}

	/**
	 * Registers a listener for SQL content changes.
	 * Used by the panel to update FetchXML preview.
	 */
	public onSqlChanged(listener: (sql: string) => void): () => void {
		this.listeners.push(listener);
		return (): void => {
			const index = this.listeners.indexOf(listener);
			if (index >= 0) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Gets the URI of the last active SQL editor.
	 */
	public getLastActiveSqlUri(): vscode.Uri | null {
		return this.lastActiveSqlUri;
	}

	/**
	 * Gets SQL content from the last active SQL editor.
	 */
	public getLastActiveSqlContent(): string | null {
		if (this.lastActiveSqlUri === null) {
			return null;
		}

		for (const doc of vscode.workspace.textDocuments) {
			if (doc.uri.toString() === this.lastActiveSqlUri.toString()) {
				return doc.getText();
			}
		}

		return null;
	}

	private debouncedNotify(sql: string): void {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.notifyListeners(sql);
		}, SqlEditorWatcher.DEBOUNCE_MS);
	}

	private notifyListeners(sql: string): void {
		for (const listener of this.listeners) {
			listener(sql);
		}
	}

	public dispose(): void {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
		}
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables.length = 0;
	}
}
