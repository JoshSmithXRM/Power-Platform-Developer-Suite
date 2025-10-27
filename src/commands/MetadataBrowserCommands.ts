import * as vscode from 'vscode';

import { AuthenticationService } from '../services/AuthenticationService';
import { MetadataBrowserPanel } from '../panels/MetadataBrowserPanel';

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
            })
        ];
    }
}
