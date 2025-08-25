import * as vscode from 'vscode';
import { AuthenticationService } from '../services/AuthenticationService';
import { EnvironmentItem, EnvironmentsProvider } from '../providers/EnvironmentsProvider';
import { EnvironmentSetupPanel } from '../panels/EnvironmentSetupPanel';

/**
 * Environment-related commands
 */
export class EnvironmentCommands {
    constructor(
        private authService: AuthenticationService, 
        private context: vscode.ExtensionContext,
        private environmentsProvider: EnvironmentsProvider
    ) { }

    /**
     * Register all environment commands
     */
    public registerCommands(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('dynamics-devtools.addEnvironment', () => {
                EnvironmentSetupPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.refreshEnvironments', () => {
                this.environmentsProvider.refresh();
            }),

            vscode.commands.registerCommand('dynamics-devtools.testConnection', async () => {
                await this.testConnection();
            }),

            vscode.commands.registerCommand('dynamics-devtools.openMaker', async (environmentItem?: EnvironmentItem) => {
                await this.openMaker(environmentItem);
            }),

            vscode.commands.registerCommand('dynamics-devtools.openDynamics', async (environmentItem?: EnvironmentItem) => {
                await this.openDynamics(environmentItem);
            }),

            vscode.commands.registerCommand('dynamics-devtools.editEnvironment', async (environmentItem?: EnvironmentItem) => {
                await this.editEnvironment(environmentItem);
            }),

            vscode.commands.registerCommand('dynamics-devtools.testEnvironmentConnection', async (environmentItem?: EnvironmentItem) => {
                await this.testEnvironmentConnection(environmentItem);
            }),

            vscode.commands.registerCommand('dynamics-devtools.removeEnvironment', async (environmentItem?: EnvironmentItem) => {
                await this.removeEnvironment(environmentItem);
            })
        ];
    }

    private async testConnection() {
        const environments = await this.authService.getEnvironments();

        if (environments.length === 0) {
            vscode.window.showWarningMessage('No environments configured. Add an environment first.');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            environments.map(env => ({
                label: env.name,
                description: env.settings.dataverseUrl,
                detail: `Auth: ${env.settings.authenticationMethod}`,
                env: env
            })),
            { placeHolder: 'Select environment to test' }
        );

        if (!selected) return;

        try {
            vscode.window.showInformationMessage('Testing connection...');
            const token = await this.authService.getAccessToken(selected.env.id);
            vscode.window.showInformationMessage(`Connection successful to ${selected.env.name}!`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Connection failed: ${error.message}`);
        }
    }

    private async openMaker(environmentItem?: EnvironmentItem) {
        if (!environmentItem) {
            vscode.window.showErrorMessage('No environment selected');
            return;
        }

        const environment = await this.authService.getEnvironment(environmentItem.envId);
        if (!environment) {
            vscode.window.showErrorMessage('Environment not found');
            return;
        }

        if (!environment.environmentId) {
            vscode.window.showErrorMessage('Environment ID not configured. Please edit the environment and provide the Environment ID to open Power Apps Maker.');
            return;
        }

        const makerUrl = `https://make.powerapps.com/environments/${environment.environmentId}`;
        vscode.env.openExternal(vscode.Uri.parse(makerUrl));
    }

    private async openDynamics(environmentItem?: EnvironmentItem) {
        if (environmentItem) {
            // Open the Dataverse URL directly
            const environment = await this.authService.getEnvironment(environmentItem.envId);
            if (environment) {
                vscode.env.openExternal(vscode.Uri.parse(environment.settings.dataverseUrl));
            } else {
                vscode.window.showErrorMessage('Environment not found');
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    }

    private async editEnvironment(environmentItem?: EnvironmentItem) {
        if (environmentItem) {
            const environment = await this.authService.getEnvironment(environmentItem.envId);
            if (environment) {
                EnvironmentSetupPanel.createOrShow(this.context.extensionUri, environment);
            } else {
                vscode.window.showErrorMessage('Environment not found');
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    }

    private async testEnvironmentConnection(environmentItem?: EnvironmentItem) {
        if (environmentItem) {
            try {
                await this.authService.getAccessToken(environmentItem.envId);
                vscode.window.showInformationMessage(`Connection test successful for ${environmentItem.label}!`);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Connection test failed for ${environmentItem.label}: ${error.message}`);
            }
        } else {
            vscode.window.showErrorMessage('No environment selected');
        }
    }

    private async removeEnvironment(environmentItem?: EnvironmentItem) {
        if (environmentItem) {
            const confirmResult = await vscode.window.showWarningMessage(
                `Are you sure you want to remove the environment "${environmentItem.label}"?`,
                { modal: true },
                'Remove'
            );

            if (confirmResult === 'Remove') {
                try {
                    await this.authService.removeEnvironment(environmentItem.envId);
                    vscode.commands.executeCommand('dynamics-devtools.refreshEnvironments');
                    vscode.window.showInformationMessage(`Environment "${environmentItem.label}" removed successfully!`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to remove environment: ${error.message}`);
                }
            }
        } else {
            await this.removeEnvironmentFromQuickPick();
        }
    }

    private async removeEnvironmentFromQuickPick() {
        const environments = await this.authService.getEnvironments();

        if (environments.length === 0) {
            vscode.window.showWarningMessage('No environments configured to remove.');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            environments.map(env => ({
                label: env.name,
                description: env.settings.dataverseUrl,
                detail: `Auth: ${env.settings.authenticationMethod}`,
                env: env
            })),
            { placeHolder: 'Select environment to remove' }
        );

        if (!selected) return;

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove "${selected.env.name}"?`,
            { modal: true },
            'Yes, Remove'
        );

        if (confirm === 'Yes, Remove') {
            try {
                await this.authService.removeEnvironment(selected.env.id);
                vscode.commands.executeCommand('dynamics-devtools.refreshEnvironments');
                vscode.window.showInformationMessage(`Environment "${selected.env.name}" removed successfully!`);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to remove environment: ${error.message}`);
            }
        }
    }
}
