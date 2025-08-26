import * as vscode from 'vscode';

// Services
import { ServiceFactory } from './services/ServiceFactory';

// Providers
import { EnvironmentsProvider } from './providers/EnvironmentsProvider';
import { ToolsProvider } from './providers/ToolsProvider';

// Commands
import { EnvironmentCommands } from './commands/EnvironmentCommands';
import { PanelCommands } from './commands/PanelCommands';
import { MetadataBrowserCommands } from './commands/MetadataBrowserCommands';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    // Initialize services first
    ServiceFactory.initialize(context);
    
    // Get services from factory
    const authService = ServiceFactory.getAuthService();

    // Initialize providers
    const environmentsProvider = new EnvironmentsProvider(authService);
    const toolsProvider = new ToolsProvider();

    // Register tree data providers
    vscode.window.registerTreeDataProvider('dynamics-devtools-environments', environmentsProvider);
    vscode.window.registerTreeDataProvider('dynamics-devtools-tools', toolsProvider);

    // Initialize command handlers
    const environmentCommands = new EnvironmentCommands(authService, context, environmentsProvider);
    const panelCommands = new PanelCommands(authService, context, environmentsProvider);
    const metadataBrowserCommands = new MetadataBrowserCommands(authService, context);

    // Register all commands with defensive error handling. If registration fails
    // we register a small fallback command so the user doesn't see "command not found".
    let commandDisposables: vscode.Disposable[] = [];
    try {
        commandDisposables = [
            ...environmentCommands.registerCommands(),
            ...panelCommands.registerCommands(),
            ...metadataBrowserCommands.registerCommands()
        ];
    } catch (err: any) {
        console.error('Failed to register commands during activation:', err);

        // Fallback for the metadata browser command to avoid 'command not found'
        const fallback = vscode.commands.registerCommand('dynamics-devtools.openMetadataBrowser', () => {
            vscode.window.showErrorMessage('Dynamics DevTools failed to initialize completely. Check the Extension Host logs for details.');
        });

        commandDisposables.push(fallback);
    }

    // Add all disposables to context
    context.subscriptions.push(...commandDisposables);

    console.log('Dynamics DevTools extension activated successfully!');
}

/**
 * Extension deactivation function
 */
export function deactivate() {
    console.log('Dynamics DevTools extension deactivated');
}
