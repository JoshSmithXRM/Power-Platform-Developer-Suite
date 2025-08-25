import * as vscode from 'vscode';
import { ToolItem } from './EnvironmentsProvider';

export class ToolsProvider implements vscode.TreeDataProvider<ToolItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ToolItem | undefined | null | void> = new vscode.EventEmitter<ToolItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ToolItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ToolItem): Thenable<ToolItem[]> {
        if (!element) {
            return Promise.resolve(this.getTools());
        }
        return Promise.resolve([]);
    }

    private getTools(): ToolItem[] {
        return [
            new ToolItem(
                'Query Data',
                'Query and analyze data from Dynamics 365',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.queryData',
                'queryData'
            ),
            new ToolItem(
                'Solution Explorer',
                'Explore and manage Dynamics 365 solutions',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.solutionExplorer',
                'solutionExplorer'
            ),
            new ToolItem(
                'Import Job Viewer',
                'View and monitor data import jobs',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.importJobViewer',
                'importJobViewer'
            ),
            new ToolItem(
                'Metadata Browser',
                'Browse and explore entity metadata',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.openMetadataBrowser',
                'metadataBrowser'
            ),
            new ToolItem(
                'Connection References Manager',
                'Manage connection references across environments',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.connectionReferences',
                'connectionReferences'
            ),
            new ToolItem(
                'Environment Variables Manager',
                'Manage environment variables and their values',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.environmentVariables',
                'environmentVariables'
            ),
            new ToolItem(
                'Plugin Trace Viewer',
                'View and analyze plugin execution traces',
                vscode.TreeItemCollapsibleState.None,
                'dynamics-devtools.pluginTraceViewer',
                'pluginTraceViewer'
            ),
        ];
    }
}
