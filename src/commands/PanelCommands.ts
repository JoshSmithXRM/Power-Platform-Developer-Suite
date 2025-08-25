import * as vscode from 'vscode';
import { AuthenticationService } from '../services/AuthenticationService';
import { EnvironmentsProvider } from '../providers/EnvironmentsProvider';
import { QueryDataPanel } from '../panels/QueryDataPanel';
import { SolutionExplorerPanel } from '../panels/SolutionExplorerPanel';
import { ImportJobViewerPanel } from '../panels/ImportJobViewerPanel';

/**
 * Panel-related commands
 */
export class PanelCommands {
    constructor(
        private authService: AuthenticationService,
        private context: vscode.ExtensionContext,
        private environmentsProvider: EnvironmentsProvider
    ) { }

    /**
     * Register all panel commands
     */
    public registerCommands(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('dynamics-devtools.queryData', () => {
                QueryDataPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.solutionExplorer', () => {
                SolutionExplorerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.importJobViewer', () => {
                ImportJobViewerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.queryDataNew', () => {
                QueryDataPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.solutionExplorerNew', () => {
                SolutionExplorerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.importJobViewerNew', () => {
                ImportJobViewerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('dynamics-devtools.refreshEnvironments', () => {
                this.environmentsProvider.refresh();
                vscode.window.showInformationMessage('Environments refreshed');
            })
        ];
    }
}
