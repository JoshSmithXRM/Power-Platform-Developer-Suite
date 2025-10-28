import * as vscode from 'vscode';

import { AuthenticationService } from '../services/AuthenticationService';
import { MetadataBrowserPanel } from '../panels/MetadataBrowserPanel';
import { ServiceFactory } from '../services/ServiceFactory';

export class MetadataBrowserCommands {
    constructor(
        private authService: AuthenticationService,
        private context: vscode.ExtensionContext
    ) {}

    public registerCommands(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('power-platform-dev-suite.openMetadataBrowser', async () => {
                const environments = await this.authService.getEnvironments();
                if (!environments || environments.length === 0) {
                    vscode.window.showErrorMessage('Please add an environment first.');
                    return;
                }

                MetadataBrowserPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.openMetadataBrowserNew', async () => {
                const environments = await this.authService.getEnvironments();
                if (!environments || environments.length === 0) {
                    vscode.window.showErrorMessage('Please add an environment first.');
                    return;
                }

                MetadataBrowserPanel.createNew(this.context.extensionUri);
            }),

            // TEST COMMAND: Attribute Type Casting Test
            vscode.commands.registerCommand('power-platform-dev-suite.testAttributeTypeCasting', async () => {
                const environments = await this.authService.getEnvironments();
                if (!environments || environments.length === 0) {
                    vscode.window.showErrorMessage('Please add an environment first.');
                    return;
                }

                // Select environment
                const envItems = environments.map(env => ({
                    label: env.name,
                    description: env.id,
                    env: env
                }));

                const selectedEnv = await vscode.window.showQuickPick(envItems, {
                    placeHolder: 'Select environment to test'
                });

                if (!selectedEnv) {
                    return;
                }

                // Enter entity name
                const entityName = await vscode.window.showInputBox({
                    prompt: 'Enter entity logical name to test',
                    placeHolder: 'e.g., account, contact, customeraddress',
                    value: 'account'
                });

                if (!entityName) {
                    return;
                }

                try {
                    vscode.window.showInformationMessage(`Running attribute type casting test on ${entityName}. Check Output > Power Platform Developer Suite for results.`);

                    const metadataService = ServiceFactory.getMetadataService();
                    await metadataService.testAttributeTypeCasting(selectedEnv.env.id, entityName);

                    vscode.window.showInformationMessage(`Test complete! Check Output > Power Platform Developer Suite for detailed results.`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            })
        ];
    }
}
