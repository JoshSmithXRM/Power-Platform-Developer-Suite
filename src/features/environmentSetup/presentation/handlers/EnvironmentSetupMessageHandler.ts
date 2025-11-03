import * as vscode from 'vscode';

import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import {
	type SaveEnvironmentMessage,
	type TestConnectionMessage,
	type DiscoverEnvironmentIdMessage,
	type CheckUniqueNameMessage
} from '../../../../infrastructure/ui/utils/TypeGuards';
import { AuthenticationMethodType } from '../../application/types/AuthenticationMethodType';
import { VsCodeCancellationTokenAdapter } from '../../infrastructure/adapters/VsCodeCancellationTokenAdapter';

/**
 * Handles all webview messages for EnvironmentSetupPanel
 * Extracted from panel to reduce file length and improve separation of concerns
 */
export class EnvironmentSetupMessageHandler {
	constructor(
		private readonly webview: vscode.Webview,
		private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
		private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
		private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
		private readonly testConnectionUseCase: TestConnectionUseCase,
		private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
		private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
		private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
		private readonly logger: ILogger,
		private readonly getCurrentEnvironmentId: () => string | undefined,
		private readonly setCurrentEnvironmentId: (id: string) => void,
		private readonly updatePanelMapping: (oldId: string, newId: string) => void,
		private readonly disposePanel: () => void
	) {}

	public async handleLoadEnvironment(environmentId: string): Promise<void> {
		this.logger.debug('Loading environment for editing', { environmentId });

		const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

		this.webview.postMessage({
			command: 'environment-loaded',
			data: viewModel
		});
	}

	public async handleSaveEnvironment(data: SaveEnvironmentMessage['data']): Promise<void> {
		const currentEnvironmentId = this.getCurrentEnvironmentId();
		const wasNew = !currentEnvironmentId;

		this.logger.info('User initiated save for environment', {
			name: data.name,
			authMethod: data.authenticationMethod,
			isEdit: !wasNew
		});

		const request: import('../../application/useCases/SaveEnvironmentUseCase').SaveEnvironmentRequest = {
			name: data.name,
			dataverseUrl: data.dataverseUrl,
			tenantId: data.tenantId,
			authenticationMethod: data.authenticationMethod,
			publicClientId: data.publicClientId,
			preserveExistingCredentials: true
		};

		if (currentEnvironmentId !== undefined) {
			request.existingEnvironmentId = currentEnvironmentId;
		}
		if (data.powerPlatformEnvironmentId !== undefined) {
			request.powerPlatformEnvironmentId = data.powerPlatformEnvironmentId;
		}
		if (data.clientId !== undefined) {
			request.clientId = data.clientId;
		}
		if (data.clientSecret !== undefined) {
			request.clientSecret = data.clientSecret;
		}
		if (data.username !== undefined) {
			request.username = data.username;
		}
		if (data.password !== undefined) {
			request.password = data.password;
		}

		const result = await this.saveEnvironmentUseCase.execute(request);

		if (!result.success && result.errors) {
			this.logger.warn('Environment validation failed', {
				name: data.name,
				errorCount: result.errors.length
			});

			this.webview.postMessage({
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
			this.setCurrentEnvironmentId(result.environmentId);
			this.checkConcurrentEditUseCase.registerEditSession(result.environmentId);
			this.updatePanelMapping('new', result.environmentId);
		}

		this.webview.postMessage({
			command: 'environment-saved',
			data: {
				success: true,
				environmentId: result.environmentId,
				isNewEnvironment: wasNew
			}
		});

		vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');
	}

	public async handleTestConnection(data: TestConnectionMessage['data']): Promise<void> {
		const currentEnvironmentId = this.getCurrentEnvironmentId();

		this.logger.info('User initiated connection test', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Testing connection...",
			cancellable: false
		}, async () => {
			const request: import('../../application/useCases/TestConnectionUseCase').TestConnectionRequest = {
				name: data.name,
				dataverseUrl: data.dataverseUrl,
				tenantId: data.tenantId,
				authenticationMethod: data.authenticationMethod,
				publicClientId: data.publicClientId
			};

			if (currentEnvironmentId !== undefined) {
				request.existingEnvironmentId = currentEnvironmentId;
			}
			if (data.powerPlatformEnvironmentId !== undefined) {
				request.powerPlatformEnvironmentId = data.powerPlatformEnvironmentId;
			}
			if (data.clientId !== undefined) {
				request.clientId = data.clientId;
			}
			if (data.clientSecret !== undefined) {
				request.clientSecret = data.clientSecret;
			}
			if (data.username !== undefined) {
				request.username = data.username;
			}
			if (data.password !== undefined) {
				request.password = data.password;
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

			this.webview.postMessage({
				command: 'test-connection-result',
				data: result
			});
		});
	}

	public async handleDiscoverEnvironmentId(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		const currentEnvironmentId = this.getCurrentEnvironmentId();

		this.logger.info('User initiated environment ID discovery', {
			name: data.name,
			authMethod: data.authenticationMethod
		});

		let result;
		try {
			result = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID...",
				cancellable: true
			}, async (_progress, token) => {
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				const request: import('../../application/useCases/DiscoverEnvironmentIdUseCase').DiscoverEnvironmentIdRequest = {
					name: data.name,
					dataverseUrl: data.dataverseUrl,
					tenantId: data.tenantId,
					authenticationMethod: data.authenticationMethod,
					publicClientId: data.publicClientId
				};

				if (currentEnvironmentId !== undefined) {
					request.existingEnvironmentId = currentEnvironmentId;
				}
				if (data.clientId !== undefined) {
					request.clientId = data.clientId;
				}
				if (data.clientSecret !== undefined) {
					request.clientSecret = data.clientSecret;
				}
				if (data.username !== undefined) {
					request.username = data.username;
				}
				if (data.password !== undefined) {
					request.password = data.password;
				}

				const result = await this.discoverEnvironmentIdUseCase.execute(request, cancellationToken);

				return result;
			});

			if (result.success) {
				this.logger.info('Environment ID discovered successfully', {
					environmentId: result.environmentId
				});
				vscode.window.showInformationMessage(`Environment ID discovered: ${result.environmentId}`);
				this.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			} else if (result.requiresInteractiveAuth) {
				this.logger.warn('Discovery requires interactive auth', {
					name: data.name
				});
				const retry = await vscode.window.showWarningMessage(
					`Discovery failed: Service Principals typically don't have Power Platform API permissions.\n\nWould you like to use Interactive authentication just for discovery?`,
					'Use Interactive Auth',
					'Cancel'
				);

				if (retry === 'Use Interactive Auth') {
					await this.handleDiscoverEnvironmentIdWithInteractive(data);
				} else {
					vscode.window.showInformationMessage('You can manually enter the Environment ID from the Power Platform Admin Center.');
					this.webview.postMessage({
						command: 'discover-environment-id-result',
						data: result
					});
				}
			} else {
				this.logger.error('Failed to discover environment ID', {
					errorMessage: result.errorMessage
				});
				vscode.window.showErrorMessage(`Failed to discover environment ID: ${result.errorMessage}`);
				this.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			}
		} catch (error) {
			if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('Authentication cancelled'))) {
				this.logger.info('Environment ID discovery cancelled by user');
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				this.webview.postMessage({
					command: 'discover-environment-id-result',
					data: { success: false, errorMessage: 'Cancelled by user' }
				});
			} else {
				throw error;
			}
		}
	}

	private async handleDiscoverEnvironmentIdWithInteractive(data: DiscoverEnvironmentIdMessage['data']): Promise<void> {
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Discovering Power Platform Environment ID with Interactive auth...",
				cancellable: true
			}, async (_progress, token) => {
				const cancellationToken = token ? new VsCodeCancellationTokenAdapter(token) : undefined;

				const request: import('../../application/useCases/DiscoverEnvironmentIdUseCase').DiscoverEnvironmentIdRequest = {
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

				this.webview.postMessage({
					command: 'discover-environment-id-result',
					data: result
				});
			});
		} catch (error) {
			if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('Authentication cancelled'))) {
				vscode.window.showInformationMessage('Environment ID discovery cancelled');
				this.webview.postMessage({
					command: 'discover-environment-id-result',
					data: { success: false, errorMessage: 'Cancelled by user' }
				});
			} else {
				throw error;
			}
		}
	}

	public async handleDeleteEnvironment(): Promise<void> {
		const currentEnvironmentId = this.getCurrentEnvironmentId();

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

		vscode.commands.executeCommand('power-platform-dev-suite.refreshEnvironments');

		this.disposePanel();
	}

	public async handleValidateName(data: CheckUniqueNameMessage['data']): Promise<void> {
		const currentEnvironmentId = this.getCurrentEnvironmentId();

		const request: import('../../application/useCases/ValidateUniqueNameUseCase').ValidateUniqueNameRequest = {
			name: data.name
		};

		if (currentEnvironmentId !== undefined) {
			request.excludeEnvironmentId = currentEnvironmentId;
		}

		const result = await this.validateUniqueNameUseCase.execute(request);

		this.webview.postMessage({
			command: 'name-validation-result',
			data: result
		});
	}
}
