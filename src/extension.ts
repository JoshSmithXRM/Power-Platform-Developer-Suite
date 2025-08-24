import * as vscode from 'vscode';

// Services
import { AuthenticationService } from './services/AuthenticationService';

// Providers
import { EnvironmentsProvider } from './providers/EnvironmentsProvider';
import { ToolsProvider } from './providers/ToolsProvider';

// Commands
import { EnvironmentCommands } from './commands/environmentCommands';
import { PanelCommands } from './commands/panelCommands';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Dynamics DevTools extension is now active!');

    // Initialize services
    const authService = AuthenticationService.getInstance(context);

    // Initialize providers
    const environmentsProvider = new EnvironmentsProvider(authService);
    const toolsProvider = new ToolsProvider(authService);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('dynamics-devtools-environments', environmentsProvider);
    vscode.window.registerTreeDataProvider('dynamics-devtools-tools', toolsProvider);

    // Initialize command handlers
    const environmentCommands = new EnvironmentCommands(authService, context);
    const panelCommands = new PanelCommands(authService, context, environmentsProvider);

    // Register all commands
    const commandDisposables = [
        ...environmentCommands.registerCommands(),
        ...panelCommands.registerCommands()
    ];

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
