import * as vscode from 'vscode';

import { AuthenticationService } from '../services/AuthenticationService';
import { ServiceFactory } from '../services/ServiceFactory';

export class EnvironmentsProvider implements vscode.TreeDataProvider<EnvironmentItem | ToolItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void> =
        new vscode.EventEmitter<EnvironmentItem | ToolItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _authService: AuthenticationService;
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger() {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('EnvironmentsProvider');
        }
        return this._logger;
    }

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
        this.logger.debug('EnvironmentsProvider.getChildren called', { hasElement: !!element });

        if (!element) {
            const items: (EnvironmentItem | ToolItem)[] = [];

            // Add configured environments
            try {
                this.logger.debug('Getting environments from authService');
                const environments = await this._authService.getEnvironments();
                this.logger.debug('Environments retrieved', { count: environments.length });

                if (environments.length === 0) {
                    this.logger.info('No environments found, showing placeholder');
                    items.push(new ToolItem('No environments configured', 'Click + to add an environment', vscode.TreeItemCollapsibleState.None, ''));
                } else {
                    this.logger.debug('Processing environments');
                    for (const env of environments) {
                        const envItem = new EnvironmentItem(env.name, env.settings.dataverseUrl, env.id);
                        envItem.contextValue = 'environment';
                        items.push(envItem);
                        this.logger.debug('Added environment item', { name: env.name });
                    }
                }
            } catch (error) {
                this.logger.error('Error loading environments for tree view', error instanceof Error ? error : new Error(String(error)));
            }

            this.logger.debug('Returning items', { count: items.length });
            return items;
        }
        return [];
    }
}

export class EnvironmentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly envId: string
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
        commandId?: string,
        contextValue?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
        if (contextValue) {
            this.contextValue = contextValue;
        }
    }
}
