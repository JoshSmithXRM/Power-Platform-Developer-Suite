import * as vscode from 'vscode';
import { AuthenticationService } from '../services/AuthenticationService';
import { ToolItem } from './EnvironmentsProvider';

export class ToolsProvider implements vscode.TreeDataProvider<ToolItem> {
    private _authService: AuthenticationService;

    constructor(authService: AuthenticationService) {
        this._authService = authService;
    }

    getTreeItem(element: ToolItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ToolItem): Thenable<ToolItem[]> {
        if (!element) {
            return Promise.resolve([
                new ToolItem('Metadata Browser', 'Browse entity metadata', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.openMetadataBrowser'),
                new ToolItem('Query Data', 'Run custom queries', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.queryData'),
                new ToolItem('Solution Explorer', 'Manage solutions', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.solutionExplorer'),
                new ToolItem('Import Job Viewer', 'View solution import history', vscode.TreeItemCollapsibleState.None, 'dynamics-devtools.importJobViewer')
            ]);
        }
        return Promise.resolve([]);
    }
}
