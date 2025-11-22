import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { InspectStorageUseCase } from '../../application/useCases/InspectStorageUseCase';
import { RevealSecretUseCase } from '../../application/useCases/RevealSecretUseCase';
import { ClearStorageEntryUseCase } from '../../application/useCases/ClearStorageEntryUseCase';
import { ClearStoragePropertyUseCase } from '../../application/useCases/ClearStoragePropertyUseCase';
import { ClearAllStorageUseCase } from '../../application/useCases/ClearAllStorageUseCase';
import { GetClearAllConfirmationMessageUseCase } from '../../application/useCases/GetClearAllConfirmationMessageUseCase';
import { PersistenceInspectorSection } from '../sections/PersistenceInspectorSection';

/**
 * Commands supported by Persistence Inspector panel.
 */
type PersistenceInspectorCommands = 'refresh' | 'revealSecret' | 'clearEntry' | 'clearProperty' | 'clearAll';

/**
 * Type guards for webview messages
 */
interface RevealSecretMessage {
	command: 'revealSecret';
	key: string;
}

interface ClearEntryMessage {
	command: 'clearEntry';
	key: string;
}

interface ClearPropertyMessage {
	command: 'clearProperty';
	key: string;
	path: string;
}

function isRevealSecretMessage(data: unknown): data is RevealSecretMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		'key' in data &&
		typeof (data as { key: unknown }).key === 'string'
	);
}

function isClearEntryMessage(data: unknown): data is ClearEntryMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		'key' in data &&
		typeof (data as { key: unknown }).key === 'string'
	);
}

function isClearPropertyMessage(data: unknown): data is ClearPropertyMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		'key' in data &&
		'path' in data &&
		typeof (data as { key: unknown }).key === 'string' &&
		typeof (data as { path: unknown }).path === 'string'
	);
}

/**
 * Presentation layer panel for Persistence Inspector using universal panel framework.
 * Delegates all logic to use cases - NO business logic here.
 *
 * **Singleton Pattern (Not Environment-Scoped)**:
 * This panel does NOT extend EnvironmentScopedPanel because it inspects ALL storage
 * across ALL environments, not just storage for a single environment. It uses a simple
 * singleton pattern (`currentPanel`) instead of the environment-scoped map pattern.
 *
 * The panel displays global storage, workspace storage, and secrets for the entire
 * extension, making it a cross-cutting diagnostic tool rather than an environment-specific
 * feature.
 */
export class PersistenceInspectorPanelComposed {
	public static readonly viewType = 'powerPlatformDevSuite.persistenceInspector';
	private static currentPanel?: PersistenceInspectorPanelComposed | undefined;

	private coordinator!: PanelCoordinator<PersistenceInspectorCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly inspectStorageUseCase: InspectStorageUseCase,
		private readonly revealSecretUseCase: RevealSecretUseCase,
		private readonly clearStorageEntryUseCase: ClearStorageEntryUseCase,
		private readonly clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		private readonly clearAllStorageUseCase: ClearAllStorageUseCase,
		private readonly getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase,
		private readonly logger: ILogger
	) {
		logger.debug('PersistenceInspectorPanelComposed: Initialized with universal framework');

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		panel.onDidDispose(() => {
			this.dispose();
		});

		void this.initializePanel();
	}

	public static createOrShow(
		extensionUri: vscode.Uri,
		inspectStorageUseCase: InspectStorageUseCase,
		revealSecretUseCase: RevealSecretUseCase,
		clearStorageEntryUseCase: ClearStorageEntryUseCase,
		clearStoragePropertyUseCase: ClearStoragePropertyUseCase,
		clearAllStorageUseCase: ClearAllStorageUseCase,
		getClearAllConfirmationMessageUseCase: GetClearAllConfirmationMessageUseCase,
		logger: ILogger
	): PersistenceInspectorPanelComposed {
		const column = vscode.ViewColumn.One;

		// If panel already exists, show it
		if (PersistenceInspectorPanelComposed.currentPanel) {
			PersistenceInspectorPanelComposed.currentPanel.panel.reveal(column);
			return PersistenceInspectorPanelComposed.currentPanel;
		}

		// Create new panel
		const panel = vscode.window.createWebviewPanel(
			PersistenceInspectorPanelComposed.viewType,
			'Persistence Inspector',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		);

		PersistenceInspectorPanelComposed.currentPanel = new PersistenceInspectorPanelComposed(
			panel,
			extensionUri,
			inspectStorageUseCase,
			revealSecretUseCase,
			clearStorageEntryUseCase,
			clearStoragePropertyUseCase,
			clearAllStorageUseCase,
			getClearAllConfirmationMessageUseCase,
			logger
		);

		return PersistenceInspectorPanelComposed.currentPanel;
	}

	private async initializePanel(): Promise<void> {
		await this.scaffoldingBehavior.refresh({});
	}

	private createCoordinator(): {
		coordinator: PanelCoordinator<PersistenceInspectorCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		const inspectorSection = new PersistenceInspectorSection();

		const actionButtons = new ActionButtonsSection(
			{
				buttons: [
					{ id: 'refresh', label: 'Refresh' },
					{ id: 'clearAll', label: 'Clear All (Non-Protected)' }
				],
				position: 'left'
			},
			SectionPosition.Toolbar
		);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, inspectorSection],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons'],
				sections: ['action-buttons']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add InputDialog component CSS
		const inputDialogCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.extensionUri,
				'resources',
				'webview',
				'css',
				'components',
				'input-dialog.css'
			)
		).toString();

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.extensionUri,
				'resources',
				'webview',
				'css',
				'features',
				'persistence-inspector.css'
			)
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, inputDialogCssUri, featureCssUri],
			jsUris: [
				// Load messaging.js first (acquires vscode API and wires up buttons)
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(
						this.extensionUri,
						'resources',
						'webview',
						'js',
						'messaging.js'
					)
				).toString(),
				// Load InputDialog component (required by behavior)
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(
						this.extensionUri,
						'resources',
						'webview',
						'js',
						'components',
						'InputDialog.js'
					)
				).toString(),
				// Load panel-specific behavior last (uses InputDialog component)
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(
						this.extensionUri,
						'resources',
						'webview',
						'js',
						'behaviors',
						'PersistenceInspectorBehavior.js'
					)
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Persistence Inspector'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<PersistenceInspectorCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		// Refresh - Load and display storage data
		this.coordinator.registerHandler(
			'refresh',
			async () => {
				await this.handleRefresh();
			},
			{ disableOnExecute: true }
		);

		// Reveal Secret - Show hidden secret value
		this.coordinator.registerHandler(
			'revealSecret',
			async (data) => {
				if (!isRevealSecretMessage(data)) {
					this.logger.warn('Invalid reveal secret data', { data });
					return;
				}
				await this.handleRevealSecret(data.key);
			},
			{ disableOnExecute: false }
		);

		// Clear Entry - Delete entire storage entry
		this.coordinator.registerHandler(
			'clearEntry',
			async (data) => {
				if (!isClearEntryMessage(data)) {
					this.logger.warn('Invalid clear entry data', { data });
					return;
				}
				await this.handleClearEntry(data.key);
			},
			{ disableOnExecute: false }
		);

		// Clear Property - Delete specific property from entry
		this.coordinator.registerHandler(
			'clearProperty',
			async (data) => {
				if (!isClearPropertyMessage(data)) {
					this.logger.warn('Invalid clear property data', { data });
					return;
				}
				await this.handleClearProperty(data.key, data.path);
			},
			{ disableOnExecute: false }
		);

		// Clear All - Delete all non-protected entries
		this.coordinator.registerHandler(
			'clearAll',
			async () => {
				await this.handleClearAll();
			},
			{ disableOnExecute: true }
		);
	}

	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing storage data');

		try {
			const viewModel = await this.inspectStorageUseCase.execute();

			this.panel.webview.postMessage({
				command: 'storageData',
				data: viewModel
			});
		} catch (error) {
			this.logger.error('Failed to refresh storage data', error);
			this.handleError(error);
		}
	}

	private async handleRevealSecret(key: string): Promise<void> {
		this.logger.info('User revealed secret', { key });

		try {
			const value = await this.revealSecretUseCase.execute(key);

			this.panel.webview.postMessage({
				command: 'secretRevealed',
				key,
				value
			});
		} catch (error) {
			this.logger.error('Failed to reveal secret', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showWarningMessage(`Unable to reveal secret: ${message}`);
		}
	}

	private async handleClearEntry(key: string): Promise<void> {
		this.logger.info('User initiated clear entry', { key });

		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			this.logger.debug('Clear entry cancelled by user', { key });
			return;
		}

		try {
			await this.clearStorageEntryUseCase.execute(key);
			this.logger.info('Storage entry cleared successfully', { key });

			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}`);
		} catch (error) {
			this.logger.error('Failed to clear storage entry', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear: ${message}`);
		}
	}

	private async handleClearProperty(key: string, path: string): Promise<void> {
		this.logger.info('User initiated clear property', { key, path });

		const confirmed = await vscode.window.showWarningMessage(
			`Are you sure you want to clear property "${path}" from "${key}"? This action cannot be undone.`,
			{ modal: true },
			'Clear'
		);

		if (confirmed !== 'Clear') {
			this.logger.debug('Clear property cancelled by user', { key, path });
			return;
		}

		try {
			await this.clearStoragePropertyUseCase.execute(key, path);
			this.logger.info('Storage property cleared successfully', { key, path });

			await this.handleRefresh();

			vscode.window.showInformationMessage(`Cleared: ${key}.${path}`);
		} catch (error) {
			this.logger.error('Failed to clear storage property', error);
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to clear property: ${message}`);
		}
	}

	private async handleClearAll(): Promise<void> {
		this.logger.info('User initiated clear all storage');

		const confirmationMessage =
			await this.getClearAllConfirmationMessageUseCase.execute();

		const confirmed = await vscode.window.showWarningMessage(
			confirmationMessage,
			{ modal: true },
			'Clear All'
		);

		if (confirmed !== 'Clear All') {
			this.logger.debug('Clear all cancelled by user');
			return;
		}

		try {
			const result = await this.clearAllStorageUseCase.execute();

			this.logger.info('Clear all completed', {
				totalCleared: result.totalCleared,
				errorCount: result.errors.length,
				hasErrors: result.hasErrors
			});

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
			this.logger.error('Failed to clear all storage', error);
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

	public dispose(): void {
		this.logger.debug('PersistenceInspectorPanelComposed: Disposing');

		if (PersistenceInspectorPanelComposed.currentPanel === this) {
			PersistenceInspectorPanelComposed.currentPanel = undefined;
		}

		this.panel.dispose();
	}
}
