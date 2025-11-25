import * as vscode from 'vscode';

import { IEnvironmentRepository } from '../../features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentListViewModelMapper } from '../../features/environmentSetup/application/mappers/EnvironmentListViewModelMapper';

/**
 * Tools tree view provider.
 * Displays available Power Platform development tools in sidebar.
 */
export class ToolsTreeProvider implements vscode.TreeDataProvider<ToolItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ToolItem | undefined | null | void> = new vscode.EventEmitter<ToolItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ToolItem): vscode.TreeItem {
		return element;
	}

	getChildren(): ToolItem[] {
		return [
			new ToolItem('Solutions', 'Browse and manage solutions', 'solutionExplorer', 'power-platform-dev-suite.solutionExplorer', 'package'),
			new ToolItem('Import Jobs', 'Monitor solution imports', 'importJobViewer', 'power-platform-dev-suite.importJobViewer', 'cloud-download'),
			new ToolItem('Connection References', 'View connection references and flows', 'connectionReferences', 'power-platform-dev-suite.connectionReferences', 'plug'),
			new ToolItem('Environment Variables', 'View environment variables', 'environmentVariables', 'power-platform-dev-suite.environmentVariables', 'symbol-variable'),
			new ToolItem('Plugin Traces', 'View and manage plugin trace logs', 'pluginTraceViewer', 'power-platform-dev-suite.pluginTraceViewer', 'bug'),
			new ToolItem('Metadata Browser', 'Browse entity metadata and attributes', 'metadataBrowser', 'power-platform-dev-suite.metadataBrowser', 'database'),
			new ToolItem('Data Explorer', 'Query data with SQL syntax', 'dataExplorer', 'power-platform-dev-suite.dataExplorer', 'search')
		];
	}
}

/**
 * Provides environments tree view data.
 * Loads from repository to maintain consistency with actual persistence layer.
 */
export class EnvironmentsTreeProvider implements vscode.TreeDataProvider<EnvironmentItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly mapper: EnvironmentListViewModelMapper
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: EnvironmentItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<EnvironmentItem[]> {
		const environments = await this.repository.getAll();

		if (environments.length === 0) {
			return [
				new EnvironmentItem('No environments configured', 'Click + to add an environment', 'placeholder', undefined)
			];
		}
		return environments.map(env => {
			const vm = this.mapper.toViewModel(env);
			return new EnvironmentItem(vm.name, vm.dataverseUrl, 'environment', vm.id);
		});
	}
}

/**
 * Tool item in tree view.
 */
class ToolItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly tooltip: string,
		public readonly contextValue: string,
		commandId: string,
		icon: string = 'tools'
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = tooltip;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon(icon);
		this.command = {
			command: commandId,
			title: label
		};
	}
}

/**
 * Environment item in tree view.
 */
class EnvironmentItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		public readonly contextValue: string,
		public readonly envId?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
		this.tooltip = `${label} - ${description}`;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('cloud');
	}
}
