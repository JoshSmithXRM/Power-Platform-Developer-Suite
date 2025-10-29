import * as vscode from 'vscode';

import { AuthenticationService } from '../services/AuthenticationService';
import { EnvironmentsProvider } from '../providers/EnvironmentsProvider';
import { DataExplorerPanel } from '../panels/DataExplorerPanel';
import { SolutionExplorerPanel } from '../panels/SolutionExplorerPanel';
import { ImportJobViewerPanel } from '../panels/ImportJobViewerPanel';
import { ConnectionReferencesPanel } from '../panels/ConnectionReferencesPanel';
import { EnvironmentVariablesPanel } from '../panels/EnvironmentVariablesPanel';
import { PluginTraceViewerPanel } from '../panels/PluginTraceViewerPanel';
import { PluginRegistrationPanel } from '../panels/PluginRegistrationPanel';
import { StateDebugPanel } from '../panels/StateDebugPanel';

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
            vscode.commands.registerCommand('power-platform-dev-suite.dataExplorer', () => {
                DataExplorerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorer', () => {
                SolutionExplorerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.importJobViewer', () => {
                ImportJobViewerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.connectionReferences', () => {
                ConnectionReferencesPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.environmentVariables', () => {
                EnvironmentVariablesPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewer', () => {
                PluginTraceViewerPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.pluginRegistration', () => {
                PluginRegistrationPanel.createOrShow(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.dataExplorerNew', () => {
                DataExplorerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.solutionExplorerNew', () => {
                SolutionExplorerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.importJobViewerNew', () => {
                ImportJobViewerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.connectionReferencesNew', () => {
                ConnectionReferencesPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.environmentVariablesNew', () => {
                EnvironmentVariablesPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.pluginTraceViewerNew', () => {
                PluginTraceViewerPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.pluginRegistrationNew', () => {
                PluginRegistrationPanel.createNew(this.context.extensionUri);
            }),

            vscode.commands.registerCommand('power-platform-dev-suite.stateDebugViewer', () => {
                StateDebugPanel.createOrShow(this.context.extensionUri);
            }),

            // Note: 'power-platform-dev-suite.refreshEnvironments' is registered by EnvironmentCommands
            // to avoid duplicate command registration remove it from PanelCommands.
        ];
    }
}
