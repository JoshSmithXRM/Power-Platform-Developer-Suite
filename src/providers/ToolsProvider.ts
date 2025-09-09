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
                'Data Explorer',
                'Explore and analyze data from Dynamics 365',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.dataExplorer',
                'dataExplorer'
            ),
            new ToolItem(
                'Solution Explorer',
                'Explore and manage Dynamics 365 solutions',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.solutionExplorer',
                'solutionExplorer'
            ),
            new ToolItem(
                'Import Job Viewer',
                'View and monitor data import jobs',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.importJobViewer',
                'importJobViewer'
            ),
            new ToolItem(
                'Metadata Browser',
                'Browse and explore entity metadata',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.openMetadataBrowser',
                'metadataBrowser'
            ),
            new ToolItem(
                'Connection References Manager',
                'Manage connection references across environments',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.connectionReferences',
                'connectionReferences'
            ),
            new ToolItem(
                'Environment Variables Manager',
                'Manage environment variables and their values',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.environmentVariables',
                'environmentVariables'
            ),
            new ToolItem(
                'Plugin Trace Viewer',
                'View and analyze plugin execution traces',
                vscode.TreeItemCollapsibleState.None,
                'power-platform-dev-suite.pluginTraceViewer',
                'pluginTraceViewer'
            ),
        ];
    }
}
