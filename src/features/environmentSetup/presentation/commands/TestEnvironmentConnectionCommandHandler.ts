import * as vscode from 'vscode';

import { ICommandHandler } from '../../../../shared/presentation/commands/ICommandHandler';
import { TestExistingEnvironmentConnectionUseCase } from '../../application/useCases/TestExistingEnvironmentConnectionUseCase';
import { EnvironmentId } from '../../application/types/EnvironmentId';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

export interface TestEnvironmentConnectionInput {
	readonly environmentId: string;
}

/**
 * Command handler for testing existing environment connections.
 * Thin adapter: handles UI concerns only, delegates business logic to use case.
 *
 * Uses TestExistingEnvironmentConnectionUseCase which accepts EnvironmentId value object
 * instead of primitive strings, providing stronger type safety.
 */
export class TestEnvironmentConnectionCommandHandler implements ICommandHandler<TestEnvironmentConnectionInput, void> {
	constructor(
		private readonly testExistingEnvironmentConnectionUseCase: TestExistingEnvironmentConnectionUseCase,
		private readonly logger: ILogger
	) {}

	async execute(input?: TestEnvironmentConnectionInput): Promise<void> {
		if (!input?.environmentId) {
			vscode.window.showErrorMessage('No environment selected');
			return;
		}

		try {
			// Create domain value object from primitive string
			const environmentId = new EnvironmentId(input.environmentId);

			// Show progress notification (UI concern)
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Testing connection...`,
					cancellable: false
				},
				async () => {
					// Delegate to use case (business logic)
					const result = await this.testExistingEnvironmentConnectionUseCase.execute({
						environmentId
					});

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
}
