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
export function activate(context: vscode.ExtensionContext): void {

    // Initialize services first
    ServiceFactory.initialize(context);
    
    // Get services from factory
    const authService = ServiceFactory.getAuthService();
    const logger = ServiceFactory.getLoggerService();
    
    logger.info('Extension', 'Power Platform Developer Suite extension is now active!');

    // Initialize providers
    const environmentsProvider = new EnvironmentsProvider(authService);
    const toolsProvider = new ToolsProvider();

    // Register tree data providers
    vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);
    vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

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
        logger.error('Extension', 'Failed to register commands during activation', err);

        // Fallback for the metadata browser command to avoid 'command not found'
        const fallback = vscode.commands.registerCommand('power-platform-dev-suite.openMetadataBrowser', () => {
            vscode.window.showErrorMessage('Power Platform Developer Suite failed to initialize completely. Check the Extension Host logs for details.');
        });

        commandDisposables.push(fallback);
    }

    // Add all disposables to context
    context.subscriptions.push(...commandDisposables);

    logger.info('Extension', 'Power Platform Developer Suite extension activated successfully!');
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
    const logger = ServiceFactory.getLoggerService();
    logger.info('Extension', 'Power Platform Developer Suite extension deactivated');
    logger.dispose();
}
