import * as vscode from 'vscode';

import { ICommandHandler } from '../../../../shared/presentation/commands/ICommandHandler';
import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { TestConnectionUseCase, TestConnectionRequest } from '../../application/useCases/TestConnectionUseCase';
import { EnvironmentFormViewModel } from '../../application/viewModels/EnvironmentFormViewModel';
import { AuthenticationMethodType } from '../../application/types/AuthenticationMethodType';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

export interface TestEnvironmentConnectionInput {
	readonly environmentId: string;
}

/**
 * Command handler for testing environment connections.
 * Thin adapter: handles UI concerns only, delegates business logic to use case.
 */
export class TestEnvironmentConnectionCommandHandler implements ICommandHandler<TestEnvironmentConnectionInput, void> {
	constructor(
		private readonly testConnectionUseCase: TestConnectionUseCase,
		private readonly loadEnvironmentUseCase: LoadEnvironmentByIdUseCase,
		private readonly logger: ILogger
	) {}

	async execute(input?: TestEnvironmentConnectionInput): Promise<void> {
		if (!input?.environmentId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		try {
			// Load environment via application layer (avoids domain imports in presentation)
			const environmentViewModel = await this.loadEnvironmentUseCase.execute({
				environmentId: input.environmentId
			});

			// Show progress notification (UI concern)
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Testing connection to ${environmentViewModel.name}...`,
					cancellable: false
				},
				async () => {
					// Delegate to use case (business logic)
					const result = await this.testConnectionUseCase.execute(
						this.buildTestConnectionRequest(environmentViewModel)
					);

					// Display result (UI concern)
					if (result.success) {
						vscode.window.showInformationMessage(
							`Connection successful! User ID: ${result.userId}`
						);
					} else {
						vscode.window.showErrorMessage(
							`Connection test failed: ${result.errorMessage || 'Unknown error'}`
						);
					}
				}
			);
		} catch (error) {
			// Error display (UI concern)
			this.logger.error('Connection test command failed', error);
			vscode.window.showErrorMessage(
				`Connection test failed: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Builds test connection request from environment view model.
	 * Use case will load credentials from storage as fallback.
	 */
	private buildTestConnectionRequest(viewModel: EnvironmentFormViewModel): TestConnectionRequest {
		const request: TestConnectionRequest = {
			existingEnvironmentId: viewModel.id,
			name: viewModel.name,
			dataverseUrl: viewModel.dataverseUrl,
			tenantId: viewModel.tenantId,
			authenticationMethod: viewModel.authenticationMethod as AuthenticationMethodType,
			publicClientId: viewModel.publicClientId
			// Note: clientSecret and password not provided - use case will load from storage
		};

		// Conditionally add optional properties to satisfy exactOptionalPropertyTypes
		if (viewModel.powerPlatformEnvironmentId) {
			request.powerPlatformEnvironmentId = viewModel.powerPlatformEnvironmentId;
		}
		if (viewModel.clientId) {
			request.clientId = viewModel.clientId;
		}
		if (viewModel.username) {
			request.username = viewModel.username;
		}

		return request;
	}
}
