import * as vscode from 'vscode';
import { AuthenticationService } from '../services/AuthenticationService';

export class EnvironmentsProvider implements vscode.TreeDataProvider<EnvironmentItem | ToolItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void> = 
        new vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _authService: AuthenticationService;

    constructor(authService: AuthenticationService) {
        this._authService = authService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EnvironmentItem | ToolItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: EnvironmentItem | ToolItem): Promise<(EnvironmentItem | ToolItem)[]> {
        console.log('EnvironmentsProvider.getChildren called', element ? 'with element' : 'without element');

        if (!element) {
            const items: (EnvironmentItem | ToolItem)[] = [];

            // Add configured environments
            try {
                console.log('Getting environments from authService...');
                const environments = await this._authService.getEnvironments();
                console.log('Environments retrieved:', environments.length, environments);

                if (environments.length === 0) {
                    console.log('No environments found, showing placeholder');
                    items.push(new ToolItem('No environments configured', 'Click + to add an environment', vscode.TreeItemCollapsibleState.None, ''));
                } else {
                    console.log('Processing environments...');
                    for (const env of environments) {
                        // Extract environment ID from URL (e.g., https://org123.crm.dynamics.com -> get org123 part)
                        let environmentId = 'default';
                        try {
                            const url = new URL(env.settings.dataverseUrl);
                            const hostname = url.hostname;
                            // Extract environment ID from hostname like org123.crm.dynamics.com
                            const parts = hostname.split('.');
                            if (parts.length > 0) {
                                environmentId = parts[0];
                            }
                        } catch (error) {
                            console.warn('Could not extract environment ID from URL:', env.settings.dataverseUrl);
                        }

                        const envItem = new EnvironmentItem(env.name, env.settings.dataverseUrl, env.id, environmentId);
                        envItem.contextValue = 'environment';
                        items.push(envItem);
                        console.log('Added environment item:', env.name);
                    }
                }
            } catch (error) {
                console.error('Error loading environments for tree view:', error);
            }

            console.log('Returning items:', items.length);
            return items;
        }
        return [];
    }
}

export class EnvironmentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly envId: string,
        public readonly environmentId?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = description;
        this.tooltip = `${label} - ${description}`;
        this.contextValue = 'environment';
    }
}

export class ToolItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        commandId?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
    }
}
