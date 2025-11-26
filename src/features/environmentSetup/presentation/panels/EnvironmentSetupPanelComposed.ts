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
import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase, type SaveEnvironmentRequest } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase, type TestConnectionRequest } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase, type DiscoverEnvironmentIdRequest } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase, type ValidateUniqueNameRequest } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { AuthenticationMethodType } from '../../application/types/AuthenticationMethodType';
import { VsCodeCancellationTokenAdapter } from '../../infrastructure/adapters/VsCodeCancellationTokenAdapter';
import { EnvironmentFormSection } from '../sections/EnvironmentFormSection';

import {
	isSaveEnvironmentData,
	isTestConnectionData,
	isDiscoverEnvironmentIdData,
	isValidateNameData
} from './EnvironmentSetupTypeGuards';

/**
 * Commands supported by Environment Setup panel.
 */
type EnvironmentSetupCommands =
	| 'saveEnvironment'
	| 'saveAndCloseEnvironment'
	| 'testConnection'
	| 'deleteEnvironment'
	| 'discoverEnvironmentId'
	| 'validateName';

/**
 * Presentation layer panel for Environment Setup using universal panel framework.
 *
 * **Multi-Instance Pattern (Not Environment-Scoped)**:
 * This panel does NOT extend EnvironmentScopedPanel because it allows multiple
 * concurrent edit panels (one per environment being edited). It uses a Map
 * keyed by environment ID to track multiple panel instances, enabling users to
 * edit multiple environments simultaneously without losing unsaved changes.
 *
 * This differs from EnvironmentScopedPanel which enforces single-instance-per-environment
 * for data viewing panels. Environment Setup is an editing panel that benefits from
 * allowing multiple concurrent edit sessions with proper concurrent edit detection.
 */
export class EnvironmentSetupPanelComposed {
	private static currentPanels: Map<string, EnvironmentSetupPanelComposed> = new Map();
	private coordinator!: PanelCoordinator<EnvironmentSetupCommands>;
	private scaffoldingBehavior!: HtmlScaffoldingBehavior;
	private currentEnvironmentId?: string;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
		private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		private readonly testConnectionUseCase: TestConnectionUseCase,
		private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		private readonly logger: ILogger,
		environmentId?: string
	) {
		if (environmentId !== undefined) {
			this.currentEnvironmentId = environmentId;
		}

		logger.debug('EnvironmentSetupPanelComposed: Initialized with universal framework', {
			isEdit: !!environmentId,
			environmentId: environmentId || 'new'
		});

		if (environmentId) {
			const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
			if (!canEdit.canEdit) {
				logger.warn('Concurrent edit detected', { environmentId });
				vscode.window.showWarningMessage('This environment is already being edited in another panel');
				return;
			}

			this.checkConcurrentEditUseCase.registerEditSession(environmentId);
			logger.debug('Edit session registered', { environmentId });
		}

		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		this.registerCommandHandlers();

		panel.onDidDispose(() => {
			const panelKey = this.currentEnvironmentId || 'new';
			EnvironmentSetupPanelComposed.currentPanels.delete(panelKey);
			if (this.currentEnvironmentId) {
				this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
			}
		});

		void this.initializePanel();
	}

	public static createOrShow(
		extensionUri: vscode.Uri,
		loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		saveEnvironmentUseCase: SaveEnvironmentUseCase,
		deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		testConnectionUseCase: TestConnectionUseCase,
		discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		logger: ILogger,
		environmentId?: string
	): EnvironmentSetupPanelComposed {
		const column = vscode.ViewColumn.One;

		const panelKey = environmentId || 'new';
		const existingPanel = EnvironmentSetupPanelComposed.currentPanels.get(panelKey);
		if (existingPanel) {
			existingPanel.panel.reveal(column);
			return existingPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			'environmentSetup',
			environmentId ? 'Edit Environment' : 'New Environment',
			column,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri],
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
		);

		const newPanel = new EnvironmentSetupPanelComposed(
			panel,
			extensionUri,
			loadEnvironmentByIdUseCase,
			saveEnvironmentUseCase,
			deleteEnvironmentUseCase,
			testConnectionUseCase,
			discoverEnvironmentIdUseCase,
			validateUniqueNameUseCase,
			checkConcurrentEditUseCase,
			logger,
			environmentId
		);

		EnvironmentSetupPanelComposed.currentPanels.set(panelKey, newPanel);
		return newPanel;
	}

	private async initializePanel(): Promise<void> {
		if (this.currentEnvironmentId) {
			await this.handleLoadEnvironment();
		} else {
			await this.scaffoldingBehavior.refresh({
				formData: {}
			});
		}
	}

	private createCoordinator(): { coordinator: PanelCoordinator<EnvironmentSetupCommands>; scaffoldingBehavior: HtmlScaffoldingBehavior } {
		const formSection = new EnvironmentFormSection();
		const actionButtons = new ActionButtonsSection({
			buttons: [
				{ id: 'saveEnvironment', label: 'Save' },
				{ id: 'saveAndCloseEnvironment', label: 'Save & Close' },
				{ id: 'testConnection', label: 'Test Connection' },
				{ id: 'deleteEnvironment', label: 'Delete Environment' }
			],
			position: 'right'
		}, SectionPosition.Toolbar);

		const compositionBehavior = new SectionCompositionBehavior(
			[actionButtons, formSection],
			PanelLayout.SingleColumn
		);

		// Resolve CSS module paths to webview URIs
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['action-buttons']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'environment-setup.css')
		).toString();

		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
			jsUris: [
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
				).toString(),
				this.panel.webview.asWebviewUri(
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'EnvironmentSetupBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Environment Setup'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		const coordinator = new PanelCoordinator<EnvironmentSetupCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	private registerCommandHandlers(): void {
		this.coordinator.registerHandler('saveEnvironment', async (data?: unknown) => {
			if (!isSaveEnvironmentData(data)) {
				this.logger.warn('Invalid save environment data');
				return;
			}
			await this.handleSaveEnvironment(data, false);
		}, { disableOnExecute: true });

		this.coordinator.registerHandler('saveAndCloseEnvironment', async (data?: unknown) => {
			if (!isSaveEnvironmentData(data)) {
				this.logger.warn('Invalid save environment data');
				return;
			}
			await this.handleSaveEnvironment(data, true);
		}, { disableOnExecute: true });

		// Note: disableOnExecute: false because button state is managed by the webview's
		// handleTestResult function in EnvironmentSetupBehavior.js
		this.coordinator.registerHandler('testConnection', async (data?: unknown) => {
			if (!isTestConnectionData(data)) {
				this.logger.warn('Invalid test connection data');
				return;
			}
			await this.handleTestConnection(data);
		}, { disableOnExecute: false });

		this.coordinator.registerHandler('deleteEnvironment', async () => {
			await this.handleDeleteEnvironment();
		}, { disableOnExecute: true });

		// Note: disableOnExecute: false because button state is managed by the webview's
		// handleDiscoverResult function in EnvironmentSetupBehavior.js
		this.coordinator.registerHandler('discoverEnvironmentId', async (data?: unknown) => {
			if (!isDiscoverEnvironmentIdData(data)) {
				this.logger.warn('Invalid discover environment ID data');
				return;
			}
			await this.handleDiscoverEnvironmentId(data);
		}, { disableOnExecute: false });

		this.coordinator.registerHandler('validateName', async (data?: unknown) => {
			if (!isValidateNameData(data)) {
				this.logger.warn('Invalid validate name data');
				return;
			}
			await this.handleValidateName(data);
		}, { disableOnExecute: false });
	}

	/**
	 * Loads environment data for editing.
	 */
	private async handleLoadEnvironment(): Promise<void> {
		if (!this.currentEnvironmentId) {
			return;
		}

		this.logger.debug('Loading environment for editing', { environmentId: this.currentEnvironmentId });

		const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId: this.currentEnvironmentId });

		this.panel.webview.postMessage({
			command: 'environment-loaded',
			data: viewModel
		});

		await this.scaffoldingBehavior.refresh({
			formData: viewModel as unknown as Record<string, string>
		});
	}

	/**
	 * Handles save environment command.
	 * @param data - The save environment request data
	 * @param closeAfterSave - Whether to close the panel after successful save
	 */
	private async handleSaveEnvironment(data: SaveEnvironmentRequest, closeAfterSave: boolean): Promise<void> {
		const currentEnvironmentId = this.currentEnvironmentId;
		const wasNew = !currentEnvironmentId;

		this.logger.info('User initiated save for environment', {
			name: data.name,
			authMethod: data.authenticationMethod,
			isEdit: !wasNew,
			closeAfterSave
		});

		const request: SaveEnvironmentRequest = {
			...data,
			preserveExistingCredentials: true
		};

		if (currentEnvironmentId) {
			request.existingEnvironmentId = currentEnvironmentId;
		}

		const result = await this.saveEnvironmentUseCase.execute(request);

		if (!result.success && result.errors) {
			this.logger.warn('Environment validation failed', {
				name: data.name,
				errorCount: result.errors.length
			});

			this.panel.webview.postMessage({
				command: 'environment-saved',
				data: {
					success: false,
					errors: result.errors
				}
			});
			return;
		}

		if (result.warnings && result.warnings.length > 0) {
			this.logger.warn('Environment saved with warnings', {
				environmentId: result.environmentId,
				warnings: result.warnings
			});
			vscode.window.showWarningMessage(`Environment saved with warnings: ${result.warnings.join(', ')}`);
		} else {
			this.logger.info('Environment saved successfully', {
				environmentId: result.environmentId,
				name: data.name
			});
			vscode.window.showInformationMessage('Environment saved successfully');
		}

		if (wasNew) {
			this.currentEnvironmentId = result.environmentId;
			this.checkConcurrentEditUseCase.registerEditSession(result.environmentId);

			const panel = EnvironmentSetupPanelComposed.currentPanels.get('new');
			if (panel) {
				EnvironmentSetupPanelComposed.currentPanels.delete('new');
				EnvironmentSetupPanelComposed.currentPanels.set(result.environmentId, panel);
			}
		}

		this.panel.webview.postMessage({
			command: 'environment-saved',
			data: {
				success: true,
				environmentId: result.environmentId,
				isNewEnvironment: wasNew,
				closeAfterSave
			}
		});

		void vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');

		if (closeAfterSave) {
			setTimeout(() => {
				this.panel.dispose();
			}, 500);
		}
	}

	/**
	 * Handles test connection command.
	 */
	private async handleTestConnection(data: TestConnectionRequest): Promise<void> {
		const currentEnvironmentId = this.currentEnvironmentId;

		this.logger.info('User initiated connection test', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Testing connection...",
			cancellable: false
		}, async () => {
			const request: TestConnectionRequest = {
				...data
			};

			if (currentEnvironmentId) {
				request.existingEnvironmentId = currentEnvironmentId;
			}

			const result = await this.testConnectionUseCase.execute(request);

			if (result.success) {
				this.logger.info('Connection test successful', { name: data.name });
				vscode.window.showInformationMessage('Connection test successful!');
			} else {
				this.logger.error('Connection test failed', {
					name: data.name,
					errorMessage: result.errorMessage
				});
				vscode.window.showErrorMessage(`Connection test failed: ${result.errorMessage}`);
			}

			this.panel.webview.postMessage({
				command: 'test-connection-result',
				data: result
			});
		});
	}

	/**
	 * Sends discover environment ID result to webview.
	 * Helper to ensure button state is always reset.
	 */
	private sendDiscoverResult(data: { success: boolean; environmentId?: string; cancelled?: boolean }): void {
		this.panel.webview.postMessage({
			command: 'discover-environment-id-result',
			data
		});
	}

	/**
	 * Handles discover environment ID command.
	 */
	private async handleDiscoverEnvironmentId(data: DiscoverEnvironmentIdRequest): Promise<void> {
		const currentEnvironmentId = this.currentEnvironmentId;

		this.logger.info('User initiated environment ID discovery', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		let resultSent = false;

		try {
			const result = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID...",
				cancellable: true
			}, async (_progress, token) => {
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				const request: DiscoverEnvironmentIdRequest = {
					...data
				};

				if (currentEnvironmentId) {
					request.existingEnvironmentId = currentEnvironmentId;
				}

				return await this.discoverEnvironmentIdUseCase.execute(request, cancellationToken);
			});

			if (result.success) {
				this.logger.info('Environment ID discovered successfully', {
					environmentId: result.environmentId
				});
				vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
				this.sendDiscoverResult(result);
				resultSent = true;
			} else if (result.requiresInteractiveAuth) {
				this.logger.warn('Discovery requires interactive auth', {
					name: data.name
				});
				const retry = await vscode.window.showWarningMessage(
					`Discovery failed: Service Principals typically don't have Power Platform API permissions.\n\nWould you like to use Interactive authentication just for discovery?`,
					{ modal: true },
					'Use Interactive Auth'
				);

				if (retry === 'Use Interactive Auth') {
					await this.handleDiscoverEnvironmentIdWithInteractive(data);
					resultSent = true; // Interactive handler sends its own result
				} else {
					vscode.window.showInformationMessage('You can manually enter the Environment ID from the Power Platform Admin Center.');
					this.sendDiscoverResult({ success: false, cancelled: true });
					resultSent = true;
				}
			} else {
				this.logger.error('Failed to discover environment ID', {
					errorMessage: result.errorMessage
				});
				vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
				this.sendDiscoverResult(result);
				resultSent = true;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const isCancellation = errorMessage.includes('cancelled') || errorMessage.includes('Cancelled');

			if (isCancellation) {
				this.logger.info('Environment ID discovery cancelled by user');
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				this.sendDiscoverResult({ success: false, cancelled: true });
				resultSent = true;
			} else {
				this.logger.error('Unexpected error during discovery', { error: errorMessage });
				this.sendDiscoverResult({ success: false });
				resultSent = true;
				throw error;
			}
		} finally {
			// Guarantee button reset even if something unexpected happens
			if (!resultSent) {
				this.logger.warn('Discovery completed without sending result - sending fallback');
				this.sendDiscoverResult({ success: false, cancelled: true });
			}
		}
	}

	/**
	 * Handles discover environment ID with interactive auth fallback.
	 */
	private async handleDiscoverEnvironmentIdWithInteractive(data: DiscoverEnvironmentIdRequest): Promise<void> {
		let resultSent = false;

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID with Interactive auth...",
				cancellable: true
			}, async (_progress, token) => {
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				const request: DiscoverEnvironmentIdRequest = {
					name: data.name,
					dataverseUrl: data.dataverseUrl,
					tenantId: data.tenantId,
					authenticationMethod: AuthenticationMethodType.Interactive,
					publicClientId: data.publicClientId
				};

				const result = await this.discoverEnvironmentIdUseCase.execute(request, cancellationToken);

				if (result.success) {
					vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
				} else {
					vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
				}

				this.sendDiscoverResult(result);
				resultSent = true;
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const isCancellation = errorMessage.includes('cancelled') || errorMessage.includes('Cancelled');

			if (isCancellation) {
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				this.sendDiscoverResult({ success: false, cancelled: true });
				resultSent = true;
			} else {
				this.sendDiscoverResult({ success: false });
				resultSent = true;
				throw error;
			}
		} finally {
			// Guarantee button reset even if something unexpected happens
			if (!resultSent) {
				this.sendDiscoverResult({ success: false, cancelled: true });
			}
		}
	}

	/**
	 * Handles delete environment command.
	 */
	private async handleDeleteEnvironment(): Promise<void> {
		const currentEnvironmentId = this.currentEnvironmentId;

		if (!currentEnvironmentId) {
			this.logger.warn('Delete attempted with no environment ID');
			vscode.window.showWarningMessage('No environment to delete');
			return;
		}

		this.logger.info('User initiated environment deletion', {
			environmentId: currentEnvironmentId
		});

		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to delete this environment? This action cannot be undone.',
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			this.logger.debug('Environment deletion cancelled by user');
			return;
		}

		await this.deleteEnvironmentUseCase.execute({
			environmentId: currentEnvironmentId
		});

		this.logger.info('Environment deleted successfully', {
			environmentId: currentEnvironmentId
		});

		vscode.window.showInformationMessage('Environment deleted successfully');

		void vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');

		this.panel.dispose();
	}

	/**
	 * Handles validate name command.
	 */
	private async handleValidateName(data: { name: string }): Promise<void> {
		const currentEnvironmentId = this.currentEnvironmentId;

		const request: ValidateUniqueNameRequest = {
			name: data.name
		};

		if (currentEnvironmentId) {
			request.excludeEnvironmentId = currentEnvironmentId;
		}

		const result = await this.validateUniqueNameUseCase.execute(request);

		this.panel.webview.postMessage({
			command: 'name-validation-result',
			data: result
		});
	}

}
