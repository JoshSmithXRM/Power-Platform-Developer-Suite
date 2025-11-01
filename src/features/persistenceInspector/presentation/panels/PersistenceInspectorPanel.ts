import * as vscode from 'vscode';

import { InspectStorageUseCase } from '../../application/useCases/InspectStorageUseCase';
import { RevealSecretUseCase } from '../../application/useCases/RevealSecretUseCase';
import { ClearStorageEntryUseCase } from '../../application/useCases/ClearStorageEntryUseCase';
import { ClearStoragePropertyUseCase } from '../../application/useCases/ClearStoragePropertyUseCase';
import { ClearAllStorageUseCase } from '../../application/useCases/ClearAllStorageUseCase';
import { GetClearAllConfirmationMessageUseCase } from '../../application/useCases/GetClearAllConfirmationMessageUseCase';

/**
 * Presentation layer panel for Persistence Inspector
 * Delegates all logic to use cases - NO business logic here
 */
export class PersistenceInspectorPanel {
	public static readonly viewType = 'powerPlatformDevSuite.persistenceInspector';
	private static currentPanel?: PersistenceInspectorPanel;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly inspectStorageUseCase: InspectStorageUseCase,
		private readonly revealSecretUseCase: RevealSecretUseCase,
		private readonly clearStorageEntryUseCase: ClearStorageEntryUseCase,
		private readonly clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		private readonly clearAllStorageUseCase: ClearAllStorageUseCase,
		private readonly getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase,
		private disposables: vscode.Disposable[] = []
	) {
		// Set webview options
		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		// Set initial HTML
		this.panel.webview.html = this.getHtmlContent();

		// Handle messages from webview
		this.panel.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			null,
			this.disposables
		);

		// Handle panel disposal
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		// Load initial data
		this.handleRefresh();
	}

	public static createOrShow(
		extensionUri: vscode.Uri,
		inspectStorageUseCase: InspectStorageUseCase,
		revealSecretUseCase: RevealSecretUseCase,
		clearStorageEntryUseCase: ClearStorageEntryUseCase,
		clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		clearAllStorageUseCase: ClearAllStorageUseCase,
		getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase
	): PersistenceInspectorPanel {
		const column = vscode.ViewColumn.One;

		// If panel already exists, show it
		if (PersistenceInspectorPanel.currentPanel) {
			PersistenceInspectorPanel.currentPanel.panel.reveal(column);
			return PersistenceInspectorPanel.currentPanel;
		}

		// Create new panel
		const panel = vscode.window.createWebviewPanel(
			PersistenceInspectorPanel.viewType,
			'Persistence Inspector',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true
			}
		);

		PersistenceInspectorPanel.currentPanel = new PersistenceInspectorPanel(
			panel,
			extensionUri,
			inspectStorageUseCase,
			revealSecretUseCase,
			clearStorageEntryUseCase,
			clearStoragePropertyUseCase,
			clearAllStorageUseCase,
			getClearAllConfirmationMessageUseCase
		);

		return PersistenceInspectorPanel.currentPanel;
	}

	private async handleMessage(message: unknown): Promise<void> {
		if (!this.isWebviewMessage(message)) {
			return;
		}

		try {
			switch (message.command) {
				case 'refresh':
					await this.handleRefresh();
					break;
				case 'revealSecret':
					await this.handleRevealSecret(message.key as string);
					break;
				case 'clearEntry':
					await this.handleClearEntry(message.key as string);
					break;
				case 'clearProperty':
					await this.handleClearProperty(message.key as string, message.path as string);
					break;
				case 'clearAll':
					await this.handleClearAll();
					break;
			}
		} catch (error) {
			this.handleError(error);
		}
	}

	/**
	 * Type guard for webview messages
	 */
	private isWebviewMessage(message: unknown): message is { command: string; [key: string]: unknown } {
		return typeof message === 'object' && message !== null && 'command' in message;
	}

	private async handleRefresh(): Promise<void> {
		try {
			const viewModel = await this.inspectStorageUseCase.execute();
			this.panel.webview.postMessage({
				command: 'storageData',
				data: viewModel
			});
		} catch (error) {
			this.handleError(error);
		}
	}

	private async handleRevealSecret(key: string): Promise<void> {
		try {
			const value = await this.revealSecretUseCase.execute(key);
			this.panel.webview.postMessage({
				command: 'secretRevealed',
				key,
				value
			});
		} catch (error) {
			this.handleError(error);
		}
	}

	private async handleClearEntry(key: string): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			return;
		}

		try {
			await this.clearStorageEntryUseCase.execute(key);
			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear: ${message}`);
		}
	}

	private async handleClearProperty(key: string, path: string): Promise<void> {
		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear property "${path}" from "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			return;
		}

		try {
			await this.clearStoragePropertyUseCase.execute(key, path);
			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}.${path}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear property: ${message}`);
		}
	}

	private async handleClearAll(): Promise<void> {
		const confirmationMessage = await this.getClearAllConfirmationMessageUseCase.execute();

		const confirmed = await vscode.window.showWarningMessage(
			confirmationMessage,
			{ modal: true },
			'Clear All'
		);

		if (confirmed !== 'Clear All') {
			return;
		}

		try {
			const result = await this.clearAllStorageUseCase.execute();
			await this.handleRefresh();

			if (result.hasErrors) {
				vscode.window.showWarningMessage(
					`Cleared ${result.totalCleared} entries with ${result.errors.length} errors`
				);
			} else {
				vscode.window.showInformationMessage(
					`Successfully cleared ${result.totalCleared} entries`
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear all: ${message}`);
		}
	}

	private handleError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		this.panel.webview.postMessage({
			command: 'error',
			message
		});
	}

	private getHtmlContent(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Persistence Inspector</title>
	<style>
		body {
			padding: 20px;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
		}
		.toolbar {
			display: flex;
			gap: 10px;
			margin-bottom: 20px;
		}
		button {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 8px 16px;
			cursor: pointer;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button.danger {
			background-color: var(--vscode-errorForeground);
			color: white;
		}
		.section {
			margin-bottom: 30px;
		}
		.section-title {
			font-weight: bold;
			font-size: 16px;
			margin-bottom: 10px;
		}
		.entry {
			border: 1px solid var(--vscode-panel-border);
			padding: 10px;
			margin-bottom: 10px;
			border-radius: 4px;
		}
		.entry-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
		}
		.entry-key {
			font-weight: bold;
			font-family: var(--vscode-editor-font-family);
		}
		.entry-actions {
			display: flex;
			gap: 5px;
		}
		.entry-actions button {
			padding: 4px 8px;
			font-size: 12px;
		}
		.entry-value {
			font-family: var(--vscode-editor-font-family);
			white-space: pre-wrap;
			background-color: var(--vscode-editor-background);
			padding: 8px;
			border-radius: 4px;
			font-size: 12px;
		}
		.entry-meta {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			margin-top: 5px;
		}
		.protected {
			border-left: 3px solid var(--vscode-charts-yellow);
		}
		.secret {
			border-left: 3px solid var(--vscode-charts-red);
		}
	</style>
</head>
<body>
	<div class="toolbar">
		<button id="refreshBtn">🔄 Refresh</button>
		<button id="clearAllBtn" class="danger">🗑️ Clear All (Non-Protected)</button>
	</div>

	<div id="globalStateSection" class="section">
		<div class="section-title">Global State</div>
		<div id="globalStateEntries"></div>
	</div>

	<div id="secretsSection" class="section">
		<div class="section-title">Secrets</div>
		<div id="secretEntries"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		// Event listeners
		document.getElementById('refreshBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'refresh' });
		});

		document.getElementById('clearAllBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'clearAll' });
		});

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.command) {
				case 'storageData':
					renderStorageData(message.data);
					break;
				case 'secretRevealed':
					updateSecretValue(message.key, message.value);
					break;
				case 'error':
					alert('Error: ' + message.message);
					break;
			}
		});

		function renderStorageData(data) {
			renderEntries(data.globalStateEntries, 'globalStateEntries');
			renderEntries(data.secretEntries, 'secretEntries');
		}

		function renderEntries(entries, containerId) {
			const container = document.getElementById(containerId);
			container.innerHTML = '';

			if (entries.length === 0) {
				container.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No entries</div>';
				return;
			}

			entries.forEach(entry => {
				const entryDiv = document.createElement('div');
				entryDiv.className = 'entry';
				if (entry.isProtected) entryDiv.classList.add('protected');
				if (entry.isSecret) entryDiv.classList.add('secret');

				const header = document.createElement('div');
				header.className = 'entry-header';

				const keySpan = document.createElement('span');
				keySpan.className = 'entry-key';
				keySpan.textContent = entry.key;

				const actions = document.createElement('div');
				actions.className = 'entry-actions';

				if (entry.isSecret) {
					const toggleBtn = document.createElement('button');
					toggleBtn.id = 'toggle-' + entry.key;
					toggleBtn.textContent = 'Show';
					toggleBtn.setAttribute('data-revealed', 'false');
					toggleBtn.onclick = () => {
						const isRevealed = toggleBtn.getAttribute('data-revealed') === 'true';
						if (isRevealed) {
							// Hide the secret
							const valueDiv = document.getElementById('value-' + entry.key);
							if (valueDiv) {
								valueDiv.textContent = entry.displayValue;
							}
							toggleBtn.textContent = 'Show';
							toggleBtn.setAttribute('data-revealed', 'false');
						} else {
							// Reveal the secret
							vscode.postMessage({ command: 'revealSecret', key: entry.key });
						}
					};
					actions.appendChild(toggleBtn);
				}

				if (entry.canBeCleared) {
					const clearBtn = document.createElement('button');
					clearBtn.textContent = 'Clear';
					clearBtn.onclick = () => {
						vscode.postMessage({ command: 'clearEntry', key: entry.key });
					};
					actions.appendChild(clearBtn);
				}

				// Add "Clear Property" button for objects/arrays (non-secrets only)
				if (entry.isExpandable && !entry.isSecret && entry.canBeCleared) {
					const clearPropBtn = document.createElement('button');
					clearPropBtn.textContent = 'Clear Property';
					clearPropBtn.onclick = () => {
						const path = prompt('Enter property path to clear (e.g., settings.dataverseUrl or [0].name):');
						if (path) {
							vscode.postMessage({ command: 'clearProperty', key: entry.key, path: path });
						}
					};
					actions.appendChild(clearPropBtn);
				}

				header.appendChild(keySpan);
				header.appendChild(actions);

				const value = document.createElement('div');
				value.className = 'entry-value';
				value.id = 'value-' + entry.key;
				value.textContent = entry.displayValue;

				const meta = document.createElement('div');
				meta.className = 'entry-meta';
				meta.textContent = \`Type: \${entry.metadata.dataType} | Size: \${entry.metadata.displaySize}\` +
					(entry.isProtected ? ' | Protected' : '');

				entryDiv.appendChild(header);
				entryDiv.appendChild(value);
				entryDiv.appendChild(meta);

				container.appendChild(entryDiv);
			});
		}

		function updateSecretValue(key, value) {
			const valueDiv = document.getElementById('value-' + key);
			if (valueDiv) {
				valueDiv.textContent = value;
			}
			const toggleBtn = document.getElementById('toggle-' + key);
			if (toggleBtn) {
				toggleBtn.textContent = 'Hide';
				toggleBtn.setAttribute('data-revealed', 'true');
			}
		}

		// Request initial data
		vscode.postMessage({ command: 'refresh' });
	</script>
</body>
</html>`;
	}

	public dispose(): void {
		PersistenceInspectorPanel.currentPanel = undefined;

		this.panel.dispose();

		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
